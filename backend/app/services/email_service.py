"""Async SMTP email service with HTML templates for AppointEase."""

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Async email service using aiosmtplib.

    Sends HTML emails via SMTP when configured. Falls back to logging
    the email content when SMTP credentials are not provided, so the
    application never crashes due to email delivery issues.
    """

    def __init__(self) -> None:
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USER
        self.password = settings.SMTP_PASS
        self.from_email = settings.EMAIL_FROM

    @property
    def is_configured(self) -> bool:
        """Check whether SMTP is configured with host and credentials."""
        return bool(self.host and self.username and self.password)

    async def send_email(self, to: str, subject: str, html_body: str) -> bool:
        """Send an HTML email.

        Args:
            to: Recipient email address.
            subject: Email subject line.
            html_body: HTML content of the email.

        Returns:
            True if the email was sent (or logged) successfully, False on error.
        """
        if not self.is_configured:
            logger.info(
                "SMTP not configured — logging email instead. "
                "To: %s | Subject: %s",
                to,
                subject,
            )
            logger.debug("Email body:\n%s", html_body)
            return True

        try:
            message = MIMEMultipart("alternative")
            message["From"] = self.from_email
            message["To"] = to
            message["Subject"] = subject
            message.attach(MIMEText(html_body, "html"))

            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                start_tls=True,
            )
            logger.info("Email sent successfully to %s: %s", to, subject)
            return True
        except Exception as exc:
            logger.error(
                "Failed to send email to %s: %s — %s",
                to,
                subject,
                str(exc),
            )
            return False

    # ------------------------------------------------------------------
    # Convenience methods with branded HTML templates
    # ------------------------------------------------------------------

    async def send_appointment_confirmation(
        self,
        user_email: str,
        user_name: str,
        provider_name: str,
        date: str,
        time: str,
    ) -> bool:
        """Send an appointment confirmation email."""
        subject = "Your Appointment is Confirmed — AppointEase"
        html_body = self._render_template(
            title="Appointment Confirmed",
            greeting=f"Hi {user_name},",
            body=f"""
                <p>Your appointment has been confirmed. Here are the details:</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr>
                        <td style="padding:8px 12px;background:#f0f4ff;font-weight:600;border-radius:4px 0 0 0;">Provider</td>
                        <td style="padding:8px 12px;background:#f0f4ff;border-radius:0 4px 0 0;">{provider_name}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px;font-weight:600;">Date</td>
                        <td style="padding:8px 12px;">{date}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px;background:#f0f4ff;font-weight:600;border-radius:0 0 0 4px;">Time</td>
                        <td style="padding:8px 12px;background:#f0f4ff;border-radius:0 0 4px 0;">{time}</td>
                    </tr>
                </table>
                <p>If you need to reschedule or cancel, please visit your dashboard.</p>
            """,
        )
        return await self.send_email(user_email, subject, html_body)

    async def send_appointment_reminder(
        self,
        user_email: str,
        user_name: str,
        provider_name: str,
        date: str,
        time: str,
    ) -> bool:
        """Send an appointment reminder email."""
        subject = "Reminder: Upcoming Appointment — AppointEase"
        html_body = self._render_template(
            title="Appointment Reminder",
            greeting=f"Hi {user_name},",
            body=f"""
                <p>This is a friendly reminder about your upcoming appointment:</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr>
                        <td style="padding:8px 12px;background:#f0f4ff;font-weight:600;">Provider</td>
                        <td style="padding:8px 12px;background:#f0f4ff;">{provider_name}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px;font-weight:600;">Date</td>
                        <td style="padding:8px 12px;">{date}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px;background:#f0f4ff;font-weight:600;">Time</td>
                        <td style="padding:8px 12px;background:#f0f4ff;">{time}</td>
                    </tr>
                </table>
                <p>Please arrive a few minutes early. See you soon!</p>
            """,
        )
        return await self.send_email(user_email, subject, html_body)

    async def send_password_reset(
        self,
        user_email: str,
        user_name: str,
        reset_link: str,
    ) -> bool:
        """Send a password reset email with a secure link."""
        subject = "Reset Your Password — AppointEase"
        html_body = self._render_template(
            title="Password Reset",
            greeting=f"Hi {user_name},",
            body=f"""
                <p>We received a request to reset your password. Click the button below to choose a new one:</p>
                <div style="text-align:center;margin:24px 0;">
                    <a href="{reset_link}"
                       style="display:inline-block;padding:12px 32px;background:#4f46e5;color:#ffffff;
                              text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
                        Reset Password
                    </a>
                </div>
                <p style="font-size:13px;color:#6b7280;">
                    If you didn't request this, you can safely ignore this email.
                    This link will expire in 1 hour.
                </p>
            """,
        )
        return await self.send_email(user_email, subject, html_body)

    async def send_welcome_email(
        self,
        user_email: str,
        user_name: str,
    ) -> bool:
        """Send a welcome email to a newly registered user."""
        subject = "Welcome to AppointEase!"
        html_body = self._render_template(
            title="Welcome!",
            greeting=f"Hi {user_name},",
            body="""
                <p>Thanks for joining <strong>AppointEase</strong>. We're excited to have you on board!</p>
                <p>Here's what you can do next:</p>
                <ul style="padding-left:20px;line-height:1.8;">
                    <li>Browse available service providers</li>
                    <li>Book your first appointment</li>
                    <li>Set up your profile and preferences</li>
                </ul>
                <p>If you have any questions, our support team is always here to help.</p>
            """,
        )
        return await self.send_email(user_email, subject, html_body)

    async def send_appointment_cancelled(
        self,
        user_email: str,
        user_name: str,
        cancelled_by: str,
        date: str,
        time: str,
    ) -> bool:
        """Send appointment cancellation email."""
        subject = "Appointment Cancelled — AppointEase"
        html_body = self._render_template(
            title="Appointment Cancelled",
            greeting=f"Hi {user_name},",
            body=f"""
                <p>Your appointment has been cancelled by <strong>{cancelled_by}</strong>.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr>
                        <td style="padding:8px 12px;background:#fef2f2;font-weight:600;">Date</td>
                        <td style="padding:8px 12px;background:#fef2f2;">{date}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px;font-weight:600;">Time</td>
                        <td style="padding:8px 12px;">{time}</td>
                    </tr>
                </table>
                <p>You can book a new appointment from your dashboard.</p>
            """,
        )
        return await self.send_email(user_email, subject, html_body)

    async def send_appointment_rescheduled(
        self,
        user_email: str,
        user_name: str,
        rescheduled_by: str,
        new_date: str,
        new_time: str,
    ) -> bool:
        """Send appointment rescheduled email."""
        subject = "Appointment Rescheduled — AppointEase"
        html_body = self._render_template(
            title="Appointment Rescheduled",
            greeting=f"Hi {user_name},",
            body=f"""
                <p>Your appointment has been rescheduled by <strong>{rescheduled_by}</strong>.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr>
                        <td style="padding:8px 12px;background:#f0f4ff;font-weight:600;">New Date</td>
                        <td style="padding:8px 12px;background:#f0f4ff;">{new_date}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px;font-weight:600;">New Time</td>
                        <td style="padding:8px 12px;">{new_time}</td>
                    </tr>
                </table>
                <p>Please check your dashboard for the latest appointment details.</p>
            """,
        )
        return await self.send_email(user_email, subject, html_body)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _render_template(title: str, greeting: str, body: str) -> str:
        """Wrap email content in a branded HTML template."""
        return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                       style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 32px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                                AppointEase
                            </h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:32px;">
                            <h2 style="margin:0 0 8px;font-size:20px;color:#1f2937;">{title}</h2>
                            <p style="margin:0 0 16px;color:#374151;font-size:15px;">{greeting}</p>
                            <div style="color:#374151;font-size:15px;line-height:1.6;">
                                {body}
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:16px 32px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;font-size:12px;color:#9ca3af;">
                                &copy; 2024 AppointEase. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""


# Module-level singleton for easy import
email_service = EmailService()
