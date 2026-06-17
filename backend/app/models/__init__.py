"""SQLAlchemy ORM models."""

from app.models.user import User, UserRole
from app.models.service_category import ServiceCategory
from app.models.provider import ServiceProvider
from app.models.integration import Integration
from app.models.availability import Availability
from app.models.appointment import Appointment, AppointmentStatus
from app.models.notification import Notification, NotificationType
from app.models.review import Review
from app.models.favorite import Favorite
from app.models.availability_exception import AvailabilityException
from app.models.comment import AppointmentComment
from app.models.audit_log import AuditLog
from app.models.password_reset import PasswordResetToken
from app.models.waitlist import WaitlistEntry, WaitlistStatus
from app.models.loyalty import LoyaltyAccount, LoyaltyTransaction
from app.models.chat import ChatMessage
from app.models.invoice import Invoice
from app.models.coupon import Coupon, DiscountType
from app.models.coupon_usage import CouponUsage
from app.models.achievement import Achievement, AchievementCategory, RequirementType, UserAchievement
from app.models.provider_document import ProviderDocument, ProviderDocumentChunk

__all__ = [
    "User",
    "UserRole",
    "ServiceCategory",
    "ServiceProvider",
    "Availability",
    "Appointment",
    "AppointmentStatus",
    "Notification",
    "NotificationType",
    "Review",
    "Favorite",
    "AvailabilityException",
    "AppointmentComment",
    "AuditLog",
    "PasswordResetToken",
    "WaitlistEntry",
    "WaitlistStatus",
    "LoyaltyAccount",
    "LoyaltyTransaction",
    "ChatMessage",
    "Invoice",
    "Coupon",
    "DiscountType",
    "CouponUsage",
    "Achievement",
    "AchievementCategory",
    "RequirementType",
    "UserAchievement",
    "ProviderDocument",
    "ProviderDocumentChunk",
]
