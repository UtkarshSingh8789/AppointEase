"""Add 10x more data to the existing database and set provider avatar URLs."""

import asyncio
import random
import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker, engine
from app.core.security import hash_password
from app.models.appointment import Appointment, AppointmentStatus
from app.models.invoice import Invoice
from app.models.loyalty import LoyaltyAccount
from app.models.notification import Notification, NotificationType
from app.models.provider import ServiceProvider
from app.models.review import Review
from app.models.service_category import ServiceCategory
from app.models.user import User, UserRole

# Provider avatar URLs from Unsplash (HD professional photos)
PROVIDER_AVATARS = [
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1614289371518-722f2615943d?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
]

CUSTOMER_AVATARS = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=face',
]

REVIEW_COMMENTS = [
    "Excellent service! Very professional and punctual. Highly recommend.",
    "Great experience. The provider was knowledgeable and helpful.",
    "Very satisfied with the consultation. Will book again.",
    "Professional approach and clear communication throughout.",
    "Good service but had to wait a bit. Overall positive experience.",
    "Outstanding! Exceeded my expectations in every way.",
    "Thorough and detailed consultation. Very impressed.",
    "Friendly and professional. Made me feel comfortable.",
    "Excellent value for money. Very knowledgeable provider.",
    "Quick and efficient service. No unnecessary delays.",
    "Very patient and explained everything clearly.",
    "Top-notch service. Would definitely recommend to friends.",
    "Prompt, professional, and courteous. Five stars!",
    "Really helpful and went above and beyond expectations.",
    "Smooth booking process and great service delivery.",
    "Knowledgeable and experienced. Solved my problem quickly.",
    "Very attentive to details. Great follow-up as well.",
    "Wonderful experience from start to finish.",
    "Reliable and trustworthy. Will be a regular customer.",
    "Impressive expertise. Clearly passionate about their work.",
]

CANCELLATION_REASONS = [
    "Schedule conflict",
    "Emergency came up",
    "Found another provider",
    "Feeling unwell",
    "Travel plans changed",
    "Work meeting conflict",
]


async def seed_more_data():
    """Add significantly more data to the existing database."""
    print("Adding more data to the database...")

    async with async_session_maker() as db:
        # Get existing data
        providers_result = await db.execute(select(ServiceProvider))
        providers = providers_result.scalars().all()

        customers_result = await db.execute(
            select(User).where(User.role == UserRole.CUSTOMER)
        )
        customers = customers_result.scalars().all()

        if not providers or not customers:
            print("ERROR: No existing providers or customers found. Run seed.py first.")
            return

        print(f"  Found {len(providers)} providers and {len(customers)} customers")

        # ============================================================
        # 1. Set avatar URLs for ALL provider users
        # ============================================================
        provider_user_ids = [p.user_id for p in providers]
        for i, user_id in enumerate(provider_user_ids):
            avatar_url = PROVIDER_AVATARS[i % len(PROVIDER_AVATARS)]
            await db.execute(
                update(User).where(User.id == user_id).values(avatar_url=avatar_url)
            )
        print(f"  ✓ Set avatar URLs for {len(provider_user_ids)} provider users")

        # Set avatar URLs for some customers too
        for i, customer in enumerate(customers[:len(CUSTOMER_AVATARS)]):
            await db.execute(
                update(User).where(User.id == customer.id).values(
                    avatar_url=CUSTOMER_AVATARS[i % len(CUSTOMER_AVATARS)]
                )
            )
        print(f"  ✓ Set avatar URLs for {min(len(customers), len(CUSTOMER_AVATARS))} customers")

        # ============================================================
        # 2. Create 50 more customer users
        # ============================================================
        new_customer_names = [
            "Aditya Sharma", "Pooja Gupta", "Rahul Verma", "Neha Singh",
            "Karthik Rajan", "Divya Nair", "Suresh Kumar", "Meghna Patel",
            "Varun Reddy", "Isha Malhotra", "Nitin Joshi", "Swati Desai",
            "Akash Mehta", "Riya Kapoor", "Gaurav Sinha", "Pallavi Iyer",
            "Mohit Agarwal", "Shruti Bose", "Rajat Khanna", "Anita Rao",
            "Vishal Tiwari", "Nandini Shah", "Saurabh Mishra", "Priyanka Das",
            "Abhishek Jain", "Kavya Menon", "Tarun Saxena", "Simran Kaur",
            "Harsh Pandey", "Anjali Thakur", "Deepak Yadav", "Ritika Arora",
            "Manish Chauhan", "Sonali Bhatt", "Pankaj Dubey", "Komal Sethi",
            "Ashish Rawat", "Tanuja Pillai", "Vivek Bansal", "Madhuri Kulkarni",
            "Sandeep Gill", "Bhavna Chopra", "Rakesh Sood", "Jyoti Fernandes",
            "Alok Bhatia", "Namrata Hegde", "Tushar Wagh", "Aparna Nambiar",
            "Hemant Grover", "Shilpa Tandon",
        ]

        new_customers = []
        for i, name in enumerate(new_customer_names):
            email_slug = name.lower().replace(" ", ".").replace(".", ".", 1)
            customer = User(
                id=uuid.uuid4(),
                email=f"{email_slug}.{i}@customers.appointease.test",
                password_hash=hash_password("password123"),
                full_name=name,
                phone_number=f"+91987800{i:04d}",
                role=UserRole.CUSTOMER,
                is_active=True,
                avatar_url=CUSTOMER_AVATARS[i % len(CUSTOMER_AVATARS)] if i < 20 else None,
            )
            new_customers.append(customer)
            db.add(customer)

        await db.flush()
        all_customers = customers + new_customers
        print(f"  ✓ Created {len(new_customers)} new customers (total: {len(all_customers)})")

        # ============================================================
        # 3. Create ~700 more appointments (spread across providers)
        # ============================================================
        today = date.today()
        statuses = [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.PENDING,
            AppointmentStatus.CANCELLED,
        ]
        time_slots = [
            time(9, 0), time(9, 30), time(10, 0), time(10, 30),
            time(11, 0), time(11, 30), time(12, 0), time(14, 0),
            time(14, 30), time(15, 0), time(15, 30), time(16, 0),
            time(16, 30), time(17, 0), time(17, 30), time(18, 0),
        ]

        new_appointments = []
        for i in range(700):
            provider = providers[i % len(providers)]
            customer = all_customers[i % len(all_customers)]

            # Spread appointments over last 90 days and next 30 days
            day_offset = (i * 7 + i % 13) % 120 - 90
            appt_date = today + timedelta(days=day_offset)

            # Skip if customer is the provider's user
            if customer.id == provider.user_id:
                continue

            slot = time_slots[i % len(time_slots)]
            end_slot = time(slot.hour, slot.minute + 30) if slot.minute == 0 else time(slot.hour + 1, 0)

            status = statuses[i % len(statuses)]
            # Future appointments should be pending or confirmed
            if day_offset > 0 and status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
                status = AppointmentStatus.CONFIRMED

            cancellation_reason = None
            if status == AppointmentStatus.CANCELLED:
                cancellation_reason = CANCELLATION_REASONS[i % len(CANCELLATION_REASONS)]

            appt = Appointment(
                id=uuid.uuid4(),
                customer_id=customer.id,
                provider_id=provider.id,
                appointment_date=appt_date,
                start_time=slot,
                end_time=end_slot,
                status=status,
                notes=f"Appointment for {provider.specialization}" if i % 3 == 0 else None,
                cancellation_reason=cancellation_reason,
                created_at=datetime.now(timezone.utc) - timedelta(days=max(0, -day_offset + 5)),
            )
            new_appointments.append(appt)
            db.add(appt)

        await db.flush()
        print(f"  ✓ Created {len(new_appointments)} new appointments")

        # ============================================================
        # 4. Create ~350 more reviews
        # ============================================================
        completed_appts = [a for a in new_appointments if a.status == AppointmentStatus.COMPLETED]
        new_reviews = []
        for i, appt in enumerate(completed_appts[:350]):
            rating = [4.0, 4.5, 5.0, 5.0, 4.0, 3.5, 5.0, 4.5, 4.0, 5.0][i % 10]
            review = Review(
                id=uuid.uuid4(),
                appointment_id=appt.id,
                customer_id=appt.customer_id,
                provider_id=appt.provider_id,
                rating=rating,
                comment=REVIEW_COMMENTS[i % len(REVIEW_COMMENTS)],
                created_at=datetime.now(timezone.utc) - timedelta(days=max(0, 90 - i)),
            )
            new_reviews.append(review)
            db.add(review)

        await db.flush()
        print(f"  ✓ Created {len(new_reviews)} new reviews")

        # ============================================================
        # 5. Update provider ratings based on actual reviews
        # ============================================================
        for provider in providers:
            result = await db.execute(
                select(func.avg(Review.rating), func.count(Review.id)).where(
                    Review.provider_id == provider.id
                )
            )
            row = result.one()
            avg_rating = float(row[0]) if row[0] else provider.rating
            total_reviews = row[1] or 0
            await db.execute(
                update(ServiceProvider)
                .where(ServiceProvider.id == provider.id)
                .values(rating=round(avg_rating, 1), total_reviews=total_reviews)
            )
        print(f"  ✓ Updated ratings for {len(providers)} providers")

        # ============================================================
        # 6. Create invoices for completed appointments
        # ============================================================
        new_invoices = []
        for i, appt in enumerate(completed_appts[:300]):
            # Get provider hourly rate
            provider = next((p for p in providers if p.id == appt.provider_id), None)
            if not provider or not provider.hourly_rate:
                continue

            amount = provider.hourly_rate * 0.5  # 30-min slot
            gst_rate = 18.0
            gst_amount = amount * gst_rate / 100
            total = amount + gst_amount

            invoice = Invoice(
                id=uuid.uuid4(),
                appointment_id=appt.id,
                customer_id=appt.customer_id,
                provider_id=appt.provider_id,
                invoice_number=f"INV-{2024}{i+100:05d}",
                amount=amount,
                gst_rate=gst_rate,
                gst_amount=round(gst_amount, 2),
                total_amount=round(total, 2),
                status="paid" if i % 4 != 0 else "generated",
                generated_at=datetime.now(timezone.utc) - timedelta(days=max(0, 90 - i)),
            )
            new_invoices.append(invoice)
            db.add(invoice)

        await db.flush()
        print(f"  ✓ Created {len(new_invoices)} invoices")

        # ============================================================
        # 7. Create loyalty accounts for customers
        # ============================================================
        existing_loyalty = await db.execute(select(LoyaltyAccount.user_id))
        existing_loyalty_ids = {row[0] for row in existing_loyalty.all()}

        new_loyalty = []
        tiers = ["bronze", "bronze", "silver", "silver", "gold", "platinum"]
        for i, customer in enumerate(all_customers):
            if customer.id in existing_loyalty_ids:
                continue
            points = (i * 47 + 100) % 2000
            tier = tiers[min(points // 400, len(tiers) - 1)]
            loyalty = LoyaltyAccount(
                id=uuid.uuid4(),
                user_id=customer.id,
                points=points,
                tier=tier,
            )
            new_loyalty.append(loyalty)
            db.add(loyalty)

        await db.flush()
        print(f"  ✓ Created {len(new_loyalty)} loyalty accounts")

        # ============================================================
        # 8. Create notifications
        # ============================================================
        notification_types = [
            (NotificationType.APPOINTMENT_BOOKED, "New Appointment", "You have a new appointment booking."),
            (NotificationType.APPOINTMENT_CONFIRMED, "Appointment Confirmed", "Your appointment has been confirmed."),
            (NotificationType.APPOINTMENT_COMPLETED, "Appointment Completed", "Your appointment has been completed. Please leave a review!"),
            (NotificationType.SYSTEM, "Welcome!", "Welcome to AppointEase. Start booking appointments today."),
        ]

        new_notifications = []
        for i, customer in enumerate(all_customers[:30]):
            ntype, title, message = notification_types[i % len(notification_types)]
            notif = Notification(
                id=uuid.uuid4(),
                user_id=customer.id,
                type=ntype,
                title=title,
                message=message,
                is_read=i % 3 == 0,
                created_at=datetime.now(timezone.utc) - timedelta(hours=i * 2),
            )
            new_notifications.append(notif)
            db.add(notif)

        await db.flush()
        print(f"  ✓ Created {len(new_notifications)} notifications")

        # Commit all changes
        await db.commit()
        print("\n✅ Successfully added more data to the database!")
        print(f"   - {len(new_customers)} new customers")
        print(f"   - {len(new_appointments)} new appointments")
        print(f"   - {len(new_reviews)} new reviews")
        print(f"   - {len(new_invoices)} new invoices")
        print(f"   - {len(new_loyalty)} loyalty accounts")
        print(f"   - Avatar URLs set for all providers")


if __name__ == "__main__":
    asyncio.run(seed_more_data())
