"""Seed AI-specific data so every AI feature has visible results on the frontend."""

import asyncio
import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker, create_tables
from app.core.security import hash_password
from app.models.appointment import Appointment, AppointmentStatus
from app.models.invoice import Invoice
from app.models.provider import ServiceProvider
from app.models.review import Review
from app.models.user import User, UserRole


AI_SUMMARIES = [
    "Session with the provider covered the primary concern thoroughly; follow-up recommended in 2 weeks to assess progress.",
    "Comprehensive consultation completed. Provider advised lifestyle adjustments and a follow-up session in 4 weeks.",
    "Treatment plan discussed and initiated. Patient advised to monitor symptoms and return if condition worsens.",
    "Productive session — key topics addressed. Provider recommends booking a follow-up within 10–14 days.",
    "Initial assessment completed successfully. Next steps include home exercises and a review appointment next month.",
]


async def seed_ai_data():
    print("Seeding AI-specific data...")
    await create_tables()

    async with async_session_maker() as db:

        # ── 1. Set ai_summary on completed appointments ───────────────────────
        result = await db.execute(
            select(Appointment)
            .where(
                Appointment.status == AppointmentStatus.COMPLETED,
                Appointment.ai_summary.is_(None),
            )
            .limit(30)
        )
        completed = result.scalars().all()
        for i, appt in enumerate(completed):
            appt.ai_summary = AI_SUMMARIES[i % len(AI_SUMMARIES)]
        await db.flush()
        print(f"  ✓ Set ai_summary on {len(completed)} completed appointments")

        # ── 2. Create high-cancellation users for fraud detection ─────────────
        existing = await db.execute(select(User).where(User.email == "fraud.test1@appointease.test"))
        if not existing.scalar_one_or_none():
            fraud_users = []
            for i in range(3):
                fu = User(
                    id=uuid.uuid4(),
                    email=f"fraud.test{i+1}@appointease.test",
                    password_hash=hash_password("password123"),
                    full_name=f"Suspicious User {i+1}",
                    phone_number=f"+9199990000{i:02d}",
                    role=UserRole.CUSTOMER,
                    is_active=True,
                    created_at=datetime.now(timezone.utc) - timedelta(days=90),
                )
                fraud_users.append(fu)
                db.add(fu)
            await db.flush()

            # Get first available provider
            prov_r = await db.execute(select(ServiceProvider).limit(1))
            provider = prov_r.scalar_one_or_none()
            if provider:
                today = date.today()
                for fu in fraud_users:
                    # 8 appointments, 7 cancelled = 87.5% cancellation rate
                    for j in range(8):
                        status = AppointmentStatus.CANCELLED if j < 7 else AppointmentStatus.COMPLETED
                        appt = Appointment(
                            id=uuid.uuid4(),
                            customer_id=fu.id,
                            provider_id=provider.id,
                            appointment_date=today - timedelta(days=j * 5 + 10),
                            start_time=time(10, 0),
                            end_time=time(11, 0),
                            status=status,
                            cancellation_reason="Changed my mind" if status == AppointmentStatus.CANCELLED else None,
                            created_at=datetime.now(timezone.utc) - timedelta(days=j * 5 + 15),
                        )
                        db.add(appt)
            await db.flush()
            print(f"  ✓ Created {len(fraud_users)} high-cancellation users for fraud detection")

        # ── 3. Create churn-risk users (registered but inactive 60+ days) ─────
        existing_churn = await db.execute(select(User).where(User.email == "churn.risk1@appointease.test"))
        if not existing_churn.scalar_one_or_none():
            for i in range(4):
                cu = User(
                    id=uuid.uuid4(),
                    email=f"churn.risk{i+1}@appointease.test",
                    password_hash=hash_password("password123"),
                    full_name=f"Inactive Customer {i+1}",
                    phone_number=f"+9188880000{i:02d}",
                    role=UserRole.CUSTOMER,
                    is_active=True,
                    created_at=datetime.now(timezone.utc) - timedelta(days=90 + i * 15),
                )
                db.add(cu)
            await db.flush()
            print("  ✓ Created 4 churn-risk users (no bookings after 60+ days)")

        # ── 4. Bulk invoices to make revenue forecast meaningful ──────────────
        inv_r = await db.execute(select(Invoice).limit(1))
        has_invoices = inv_r.scalar_one_or_none()
        if not has_invoices:
            prov_r = await db.execute(select(ServiceProvider).limit(1))
            provider = prov_r.scalar_one_or_none()
            cust_r = await db.execute(select(User).where(User.role == UserRole.CUSTOMER).limit(1))
            customer = cust_r.scalar_one_or_none()
            if provider and customer:
                for w in range(12):
                    for d_off in range(3):
                        amount = float(1500 + (w * 200 + d_off * 300) % 4000)
                        gst = round(amount * 0.18, 2)
                        appt = Appointment(
                            id=uuid.uuid4(),
                            customer_id=customer.id,
                            provider_id=provider.id,
                            appointment_date=date.today() - timedelta(weeks=w, days=d_off),
                            start_time=time(10, 0),
                            end_time=time(11, 0),
                            status=AppointmentStatus.COMPLETED,
                        )
                        db.add(appt)
                        await db.flush()
                        inv = Invoice(
                            id=uuid.uuid4(),
                            appointment_id=appt.id,
                            customer_id=customer.id,
                            provider_id=provider.id,
                            invoice_number=f"INV-AI-{w:03d}{d_off}",
                            amount=amount,
                            gst_rate=18.0,
                            gst_amount=gst,
                            total_amount=round(amount + gst, 2),
                            status="paid",
                            generated_at=datetime.now(timezone.utc) - timedelta(weeks=w, days=d_off),
                        )
                        db.add(inv)
                await db.flush()
                print("  ✓ Created historical invoices for revenue forecasting")

        # ── 5. Ensure high-demand category data for supply-demand gaps ────────
        # The existing appointments + providers already give ratio data.
        # Just print a note.
        result = await db.execute(select(ServiceProvider).limit(5))
        sample_providers = result.scalars().all()
        print(f"  ✓ {len(sample_providers)} providers available for supply-demand analysis")

        await db.commit()
        print("\n✅ AI seed data complete!")
        print("   • ai_summary set on completed appointments → Appointment Detail shows AI summary")
        print("   • Fraud detection users → Admin Dashboard fraud alerts populated")
        print("   • Churn risk users → Admin Dashboard churn panel populated")
        print("   • Historical invoices → Revenue forecast chart populated")
        print("   • All AI endpoints (#9–#55) now have seed data to display")


if __name__ == "__main__":
    asyncio.run(seed_ai_data())
