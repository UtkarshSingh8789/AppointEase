"""Seed script to populate the database with comprehensive Indian-context sample data."""

import asyncio
import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker, create_tables, engine
from app.core.security import hash_password
from app.models.appointment import Appointment, AppointmentStatus
from app.models.availability import Availability
from app.models.availability_exception import AvailabilityException
from app.models.comment import AppointmentComment
from app.models.favorite import Favorite
from app.models.notification import Notification, NotificationType
from app.models.provider import ServiceProvider
from app.models.review import Review
from app.models.service_category import ServiceCategory
from app.models.user import User, UserRole


async def seed_database():
    """Seed the database with comprehensive Indian-context sample data."""
    print("Creating database tables...")
    await create_tables()

    async with async_session_maker() as db:
        # Check if data already exists
        result = await db.execute(select(User))
        if result.scalars().first():
            print("Database already seeded. Skipping.")
            print("\n--- Login Credentials ---")
            print_credentials()
            return

        print("Seeding database with Indian-context data...")
        today = date.today()

        # ============================================================
        # 1. Create Service Categories
        # ============================================================
        category_catalog = [
            ("Healthcare", "Medical consultations, therapy, diagnostics, and wellness services", "stethoscope", ["Pediatrics", "Physiotherapy"]),
            ("Beauty & Wellness", "Hair styling, spa treatments, yoga, and beauty services", "sparkles", ["Spa Therapy", "Makeup Artistry"]),
            ("Legal Services", "Legal consultations, contracts, compliance, and advisory services", "scale", ["Corporate Law", "Family Law"]),
            ("Education & Tutoring", "Academic tutoring, coaching, test prep, and skill development", "graduation-cap", ["Science Tutoring", "Language Coaching"]),
            ("Home Services", "Interior design, repairs, maintenance, cleaning, and household support", "home", ["Plumbing", "Electrical Repairs"]),
            ("Dental Care", "Dental consultations, orthodontics, cleaning, and oral surgery", "smile", ["Orthodontics", "Dental Hygiene"]),
            ("Mental Health", "Counselling, therapy, psychiatry, and emotional wellbeing", "brain", ["Clinical Psychology", "Stress Counselling"]),
            ("Fitness Training", "Personal training, strength coaching, pilates, and nutrition support", "dumbbell", ["Strength Training", "Pilates Coaching"]),
            ("Financial Advisory", "Tax planning, investment advice, insurance, and accounting", "wallet", ["Tax Planning", "Investment Advisory"]),
            ("Pet Care", "Veterinary care, grooming, training, and pet wellness", "paw-print", ["Veterinary Consultation", "Pet Grooming"]),
            ("Automotive Services", "Vehicle inspection, detailing, repairs, and insurance support", "car", ["Car Detailing", "Vehicle Inspection"]),
            ("Event Planning", "Wedding planning, corporate events, catering, and production", "party-popper", ["Wedding Planning", "Corporate Events"]),
            ("Photography", "Portraits, product shoots, event photography, and editing", "camera", ["Portrait Photography", "Event Photography"]),
            ("Business Consulting", "Strategy, operations, HR, process, and growth consulting", "briefcase", ["Startup Advisory", "Operations Consulting"]),
            ("Real Estate", "Property advisory, inspections, rentals, and documentation support", "building", ["Property Advisory", "Home Inspection"]),
            ("Travel Services", "Trip planning, visa support, tours, and premium itineraries", "plane", ["Visa Consulting", "Travel Planning"]),
            ("IT Support", "Device repair, cybersecurity, cloud setup, and workplace support", "laptop", ["Cybersecurity Audit", "Device Repair"]),
            ("Marketing Services", "Branding, ads, SEO, content, and campaign management", "megaphone", ["SEO Consulting", "Brand Strategy"]),
            ("Elder Care", "In-home support, nursing, companionship, and medical coordination", "heart-handshake", ["Home Nursing", "Companion Care"]),
            ("Child Care", "Babysitting, early learning, nanny support, and child activities", "baby", ["Nanny Services", "Early Learning"]),
            ("Astrology & Spiritual", "Astrology, vastu, meditation, and spiritual guidance", "sparkle", ["Vastu Consulting", "Astrology Reading"]),
            ("Government Services", "Documentation, registrations, certificates, and public service help", "landmark", ["Document Assistance", "Registration Support"]),
            ("Career Coaching", "Resume review, interview prep, mentoring, and career transitions", "target", ["Interview Coaching", "Resume Review"]),
            ("Nutrition & Diet", "Diet planning, weight management, sports nutrition, and diabetes diets", "apple", ["Weight Management", "Sports Nutrition"]),
            ("Alternative Medicine", "Ayurveda, homeopathy, naturopathy, and holistic care", "leaf", ["Ayurveda", "Homeopathy"]),
            ("Cleaning Services", "Deep cleaning, pest control, sanitization, and move-in cleaning", "spray-can", ["Deep Cleaning", "Pest Control"]),
            ("Repairs & Maintenance", "Appliance repairs, carpentry, painting, and annual maintenance", "wrench", ["Appliance Repair", "Carpentry"]),
            ("Design & Creative", "Graphic design, UI design, illustration, and creative direction", "pen-tool", ["Graphic Design", "UI Design"]),
            ("Insurance Advisory", "Health, life, vehicle, business, and claims guidance", "shield-check", ["Health Insurance", "Claims Advisory"]),
            ("Language Services", "Translation, interpretation, language tutoring, and localization", "languages", ["Translation", "Interpretation"]),
            ("Music Lessons", "Personalised music coaching across instruments and vocals for all skill levels", "music", ["Guitar Lessons", "Piano Lessons", "Vocal Training", "Drums Coaching"]),
            ("Dance Classes", "Professional dance training spanning classical, western, and fitness-based styles", "drama", ["Classical Dance", "Western Dance", "Choreography", "Zumba"]),
            ("Culinary Services", "Personal chefs, baking classes, and catering guidance for homes and events", "chef-hat", ["Personal Chef", "Baking Classes", "Catering Consultation"]),
            ("Tattoo & Piercing", "Hygienic custom tattoo, piercing, and removal services by trained artists", "pen-tool", ["Custom Tattoo", "Piercing", "Tattoo Removal"]),
            ("Wedding Services", "End-to-end bridal styling, mehndi, photography, and decor for Indian weddings", "heart", ["Bridal Styling", "Mehndi Artistry", "Wedding Photography", "Decor Planning"]),
            ("Tech Tutoring", "Hands-on coaching in modern software, data, and cloud technologies", "code", ["Web Development", "Data Science", "App Development", "Cloud Computing"]),
            ("Sports Coaching", "Personalised coaching across popular Indian sports for all age groups", "trophy", ["Cricket Coaching", "Tennis Coaching", "Swimming", "Badminton"]),
            ("Gardening & Landscaping", "Garden design, plant care, and landscaping for homes and offices", "sprout", ["Garden Design", "Plant Care", "Landscaping"]),
            ("Tailoring & Fashion", "Custom tailoring, fashion design, and alteration services for every occasion", "scissors", ["Custom Tailoring", "Fashion Design", "Alterations"]),
            ("Security Services", "Home security audits, CCTV installation, and event security support", "shield", ["Home Security Audit", "CCTV Installation", "Event Security"]),
            ("Logistics & Moving", "Reliable home relocation, office shifting, and professional packing services", "truck", ["Home Relocation", "Office Shifting", "Packing Services"]),
            ("Beauty - Nails", "Manicure, pedicure, and creative nail art by trained beauticians", "hand", ["Manicure", "Pedicure", "Nail Art"]),
            ("Skincare Specialists", "Facials, chemical peels, and acne treatments tailored to your skin type", "droplet", ["Facials", "Chemical Peels", "Acne Treatment"]),
            ("Speech Therapy", "Speech correction, stammering therapy, and accent training for all ages", "mic", ["Speech Correction", "Stammering Therapy", "Accent Training"]),
            ("Occupational Therapy", "Pediatric, rehabilitation, and hand therapy by certified occupational therapists", "activity", ["Pediatric OT", "Rehabilitation", "Hand Therapy"]),
            ("Vehicle Driving", "Structured car, two-wheeler, and defensive driving lessons by certified instructors", "steering-wheel", ["Car Driving Lessons", "Two-Wheeler Training", "Defensive Driving"]),
            ("Interior Styling", "Home staging, colour consultation, and furniture layout for beautiful spaces", "lamp", ["Home Staging", "Color Consultation", "Furniture Layout"]),
            ("Bookkeeping", "GST filing, payroll, and accounts reconciliation for small businesses", "book", ["GST Filing", "Payroll", "Accounts Reconciliation"]),
            ("Voice & Audio", "Professional voiceover, podcast editing, and audio mixing services", "headphones", ["Voiceover", "Podcast Editing", "Audio Mixing"]),
            ("Video Production", "Video editing, reels creation, and corporate film production for brands", "video", ["Video Editing", "Reels Creation", "Corporate Films"]),
            ("Handmade Crafts", "Pottery, candle making, and resin art classes led by skilled artisans", "palette", ["Pottery Classes", "Candle Making", "Resin Art"]),
            ("Yoga Specialties", "Specialised prenatal, power, and therapeutic yoga sessions by certified instructors", "flower", ["Prenatal Yoga", "Power Yoga", "Therapeutic Yoga"]),
            ("Public Speaking", "Speech writing, stage confidence, and debate coaching for students and professionals", "presentation", ["Speech Writing", "Stage Confidence", "Debate Coaching"]),
            ("Exam Prep", "Focused coaching for competitive exams including management, study-abroad, and medical entrance", "clipboard", ["GMAT Prep", "GRE Prep", "IELTS Coaching", "NEET Coaching"]),
            ("Home Appliances", "Expert servicing and repair for ACs, refrigerators, and washing machines", "plug", ["AC Servicing", "Refrigerator Repair", "Washing Machine Repair"]),
            ("Solar & Energy", "Solar installation, energy audits, and inverter setup for homes and businesses", "sun", ["Solar Installation", "Energy Audit", "Inverter Setup"]),
            ("Water Solutions", "RO servicing, water testing, and borewell consultation for clean water access", "waves", ["RO Servicing", "Water Testing", "Borewell Consultation"]),
            ("Bridal Makeup", "HD, airbrush, and engagement makeup by experienced bridal makeup artists", "brush", ["HD Makeup", "Airbrush Makeup", "Engagement Makeup"]),
            ("Senior Fitness", "Gentle chair yoga, mobility training, and balance therapy for senior citizens", "person-standing", ["Chair Yoga", "Mobility Training", "Balance Therapy"]),
            ("Digital Marketing", "Social media management, Google Ads, email marketing, and content strategy for growing brands", "trending-up", ["Social Media Management", "Google Ads", "Email Marketing", "Content Strategy"]),
        ]

        categories = [
            ServiceCategory(
                id=uuid.uuid4(),
                name=name,
                description=description,
                icon=icon,
                is_active=True,
            )
            for name, description, icon, _specializations in category_catalog
        ]

        for cat in categories:
            db.add(cat)
        await db.flush()
        print(f"  ✓ Created {len(categories)} service categories")

        # ============================================================
        # 2. Create Admin User
        # ============================================================
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@appointly.com",
            password_hash=hash_password("admin123456"),
            full_name="Rajesh Kumar (Admin)",
            phone_number="+919876543210",
            role=UserRole.ADMIN,
            is_active=True,
            is_super_admin=True,
        )
        db.add(admin_user)
        await db.flush()
        print("  ✓ Created admin user")

        # ============================================================
        # 3. Create Customer Users (10 Indian names)
        # ============================================================
        customers = [
            User(
                id=uuid.uuid4(),
                email="priya.sharma@email.com",
                password_hash=hash_password("password123"),
                full_name="Priya Sharma",
                phone_number="+919876500001",
                role=UserRole.CUSTOMER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="amit.patel@email.com",
                password_hash=hash_password("password123"),
                full_name="Amit Patel",
                phone_number="+919876500002",
                role=UserRole.CUSTOMER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="sneha.reddy@email.com",
                password_hash=hash_password("password123"),
                full_name="Sneha Reddy",
                phone_number="+919876500003",
                role=UserRole.CUSTOMER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="vikram.singh@email.com",
                password_hash=hash_password("password123"),
                full_name="Vikram Singh",
                phone_number="+919876500004",
                role=UserRole.CUSTOMER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="ananya.iyer@email.com",
                password_hash=hash_password("password123"),
                full_name="Ananya Iyer",
                phone_number="+919876500005",
                role=UserRole.CUSTOMER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="rohan.gupta@email.com",
                password_hash=hash_password("password123"),
                full_name="Rohan Gupta",
                phone_number="+919876500006",
                role=UserRole.CUSTOMER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="kavita.nair@email.com",
                password_hash=hash_password("password123"),
                full_name="Kavita Nair",
                phone_number="+919876500007",
                role=UserRole.CUSTOMER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="arjun.mehta@email.com",
                password_hash=hash_password("password123"),
                full_name="Arjun Mehta",
                phone_number="+919876500008",
                role=UserRole.CUSTOMER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="deepika.joshi@email.com",
                password_hash=hash_password("password123"),
                full_name="Deepika Joshi",
                phone_number="+919876500009",
                role=UserRole.CUSTOMER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="sanjay.verma@email.com",
                password_hash=hash_password("password123"),
                full_name="Sanjay Verma",
                phone_number="+919876500010",
                role=UserRole.CUSTOMER,
                is_active=True,
            ),
        ]

        for customer in customers:
            db.add(customer)
        await db.flush()
        print(f"  ✓ Created {len(customers)} customer users")

        # ============================================================
        # 4. Create Provider Users and Profiles
        # ============================================================
        provider_users = [
            User(
                id=uuid.uuid4(),
                email="dr.arun.kapoor@email.com",
                password_hash=hash_password("password123"),
                full_name="Dr. Arun Kapoor",
                phone_number="+919876600001",
                role=UserRole.PROVIDER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="dr.meera.shah@email.com",
                password_hash=hash_password("password123"),
                full_name="Dr. Meera Shah",
                phone_number="+919876600002",
                role=UserRole.PROVIDER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="neha.beauty@email.com",
                password_hash=hash_password("password123"),
                full_name="Neha Kapoor",
                phone_number="+919876600003",
                role=UserRole.PROVIDER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="swami.raghav@email.com",
                password_hash=hash_password("password123"),
                full_name="Swami Raghav",
                phone_number="+919876600004",
                role=UserRole.PROVIDER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="prof.suresh.iyer@email.com",
                password_hash=hash_password("password123"),
                full_name="Prof. Suresh Iyer",
                phone_number="+919876600005",
                role=UserRole.PROVIDER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="manish.tiwari@email.com",
                password_hash=hash_password("password123"),
                full_name="Manish Tiwari",
                phone_number="+919876600006",
                role=UserRole.PROVIDER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="adv.sunita.desai@email.com",
                password_hash=hash_password("password123"),
                full_name="Adv. Sunita Desai",
                phone_number="+919876600007",
                role=UserRole.PROVIDER,
                is_active=True,
            ),
            User(
                id=uuid.uuid4(),
                email="ritu.malhotra@email.com",
                password_hash=hash_password("password123"),
                full_name="Ritu Malhotra",
                phone_number="+919876600008",
                role=UserRole.PROVIDER,
                is_active=True,
            ),
        ]

        provider_name_pool = [
            "Aarav Menon", "Ishita Rao", "Kabir Bansal", "Naina Sethi",
            "Dev Malhotra", "Mira Chatterjee", "Karan Sood", "Tara Bose",
            "Vivaan Khanna", "Leela Menon", "Aditya Rao", "Megha Kapoor",
            "Nikhil Shah", "Asha Nair", "Raghav Sinha", "Dia Mehta",
            "Samar Jain", "Kiara Dutta", "Arnav Kulkarni", "Pooja Bhat",
            "Neil Fernandes", "Ira Mathur", "Yash Agarwal", "Rhea Iyer",
            "Siddharth Roy", "Anika Pillai", "Harsh Vora", "Myra Ghosh",
            "Rudra Sen", "Anjali Deshmukh", "Dhruv Bedi", "Sia Narang",
            "Varun Prakash", "Avni Chopra", "Omkar Rao", "Tisha Arora",
            "Reyansh Das", "Meenakshi Lal", "Armaan Gill", "Jiya Saxena",
            "Pranav Joshi", "Ritika Anand", "Kunal Kohli", "Pallavi Rane",
            "Ayaan Mirza", "Tanvi Shetty", "Rohan Batra", "Esha Verma",
            "Manav Suri", "Kriti Bakshi", "Akhil Nambiar", "Sara Qureshi",
            "Gaurav Thakur", "Lavanya Pai", "Ishan Walia", "Mahika Jain",
            "Parth Tandon", "Sonali Kale", "Vedant Grover", "Anvi Singh",
        ]
        provider_locations = [
            "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune",
            "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Gurugram", "Noida",
        ]
        generated_provider_specs = []
        for cat_index, (category_name, _description, _icon, specializations) in enumerate(category_catalog):
            for spec_index, specialization in enumerate(specializations):
                name = provider_name_pool[(cat_index * 2 + spec_index) % len(provider_name_pool)]
                professional_prefix = "Dr. " if category_name in {
                    "Healthcare", "Dental Care", "Mental Health", "Nutrition & Diet", "Alternative Medicine", "Pet Care"
                } else ""
                full_name = f"{professional_prefix}{name}"
                email_slug = (
                    f"{category_name}-{specialization}-{spec_index + 1}"
                    .lower()
                    .replace("&", "and")
                    .replace(" ", ".")
                    .replace(",", "")
                )
                provider_user = User(
                    id=uuid.uuid4(),
                    email=f"{email_slug}@providers.appointease.test",
                    password_hash=hash_password("password123"),
                    full_name=full_name,
                    phone_number=f"+919877{cat_index:02d}{spec_index:02d}00",
                    role=UserRole.PROVIDER,
                    is_active=True,
                )
                provider_users.append(provider_user)
                generated_provider_specs.append(
                    {
                        "user": provider_user,
                        "category": categories[cat_index],
                        "category_name": category_name,
                        "specialization": specialization,
                        "location": provider_locations[(cat_index + spec_index) % len(provider_locations)],
                        "experience_years": 4 + ((cat_index + spec_index) % 18),
                        "hourly_rate": float(900 + ((cat_index * 225 + spec_index * 175) % 4200)),
                        "rating": round(4.2 + ((cat_index + spec_index) % 8) * 0.08, 1),
                    }
                )

        for pu in provider_users:
            db.add(pu)
        await db.flush()

        providers = [
            ServiceProvider(
                id=uuid.uuid4(),
                user_id=provider_users[0].id,
                specialization="General Medicine",
                category_id=categories[0].id,  # Healthcare
                experience_years=15,
                location="Mumbai",
                profile_description="MBBS, MD (General Medicine) from AIIMS Delhi. 15 years of experience in general medicine, diabetes management, and preventive healthcare. Consulting at Kokilaben Hospital.",
                hourly_rate=2500.00,
                rating=4.8,
                total_reviews=5,
                is_verified=True,
            ),
            ServiceProvider(
                id=uuid.uuid4(),
                user_id=provider_users[1].id,
                specialization="Dermatology",
                category_id=categories[0].id,  # Healthcare
                experience_years=10,
                location="Delhi",
                profile_description="MD Dermatology from Maulana Azad Medical College. Specializes in skin care, acne treatment, hair fall solutions, and cosmetic dermatology. Available for online consultations.",
                hourly_rate=3500.00,
                rating=4.9,
                total_reviews=4,
                is_verified=True,
            ),
            ServiceProvider(
                id=uuid.uuid4(),
                user_id=provider_users[2].id,
                specialization="Hair Styling & Coloring",
                category_id=categories[1].id,  # Beauty & Wellness
                experience_years=8,
                location="Bangalore",
                profile_description="Trained at Lakme Academy with 8 years of experience. Expert in bridal makeup, hair coloring, keratin treatments, and modern styling. Featured in Femina magazine.",
                hourly_rate=1500.00,
                rating=4.7,
                total_reviews=3,
                is_verified=True,
            ),
            ServiceProvider(
                id=uuid.uuid4(),
                user_id=provider_users[3].id,
                specialization="Yoga & Meditation",
                category_id=categories[1].id,  # Beauty & Wellness
                experience_years=20,
                location="Hyderabad",
                profile_description="Certified yoga instructor with 20 years of practice. Trained at Bihar School of Yoga. Specializes in Hatha Yoga, Pranayama, and meditation for stress relief. Conducts corporate wellness programs.",
                hourly_rate=800.00,
                rating=4.9,
                total_reviews=3,
                is_verified=True,
            ),
            ServiceProvider(
                id=uuid.uuid4(),
                user_id=provider_users[4].id,
                specialization="Mathematics Tutoring",
                category_id=categories[3].id,  # Education & Tutoring
                experience_years=12,
                location="Chennai",
                profile_description="M.Sc Mathematics from IIT Madras. 12 years of teaching experience for CBSE, ICSE, and IIT-JEE preparation. Specializes in Calculus, Algebra, and Competitive Math.",
                hourly_rate=1200.00,
                rating=4.6,
                total_reviews=2,
                is_verified=True,
            ),
            ServiceProvider(
                id=uuid.uuid4(),
                user_id=provider_users[5].id,
                specialization="UPSC Coaching",
                category_id=categories[3].id,  # Education & Tutoring
                experience_years=7,
                location="Pune",
                profile_description="IAS officer (2015 batch, resigned). Now coaching UPSC aspirants with a 40% selection rate. Specializes in GS Paper II, Essay, and Interview preparation.",
                hourly_rate=2000.00,
                rating=4.8,
                total_reviews=2,
                is_verified=True,
            ),
            ServiceProvider(
                id=uuid.uuid4(),
                user_id=provider_users[6].id,
                specialization="Property Law",
                category_id=categories[2].id,  # Legal Services
                experience_years=18,
                location="Kolkata",
                profile_description="Senior Advocate at Calcutta High Court. 18 years of experience in property disputes, land acquisition, RERA compliance, and real estate documentation. Handles cases across West Bengal and Odisha.",
                hourly_rate=5000.00,
                rating=4.5,
                total_reviews=1,
                is_verified=True,
            ),
            ServiceProvider(
                id=uuid.uuid4(),
                user_id=provider_users[7].id,
                specialization="Interior Design",
                category_id=categories[4].id,  # Home Services
                experience_years=9,
                location="Ahmedabad",
                profile_description="B.Des from NID Ahmedabad. Award-winning interior designer specializing in modern Indian aesthetics, vastu-compliant designs, and sustainable materials. Completed 200+ residential projects.",
                hourly_rate=3000.00,
                rating=4.7,
                total_reviews=1,
                is_verified=True,
            ),
        ]

        for spec in generated_provider_specs:
            providers.append(
                ServiceProvider(
                    id=uuid.uuid4(),
                    user_id=spec["user"].id,
                    specialization=spec["specialization"],
                    category_id=spec["category"].id,
                    experience_years=spec["experience_years"],
                    location=spec["location"],
                    profile_description=(
                        f"{spec['user'].full_name} provides {spec['specialization'].lower()} "
                        f"under {spec['category_name']} with appointment-first service, clear pricing, "
                        "and verified professional experience across major Indian cities."
                    ),
                    hourly_rate=spec["hourly_rate"],
                    rating=spec["rating"],
                    total_reviews=0,
                    is_verified=True,
                )
            )

        for provider in providers:
            db.add(provider)
        await db.flush()
        print(f"  ✓ Created {len(providers)} service providers")

        # ============================================================
        # 5. Create Availability Slots
        # ============================================================
        availability_slots = []

        # Dr. Arun Kapoor (General Medicine) - Mon-Sat, 9 AM to 1 PM & 5 PM to 8 PM
        for day in range(6):  # Mon-Sat
            availability_slots.append(
                Availability(
                    id=uuid.uuid4(),
                    provider_id=providers[0].id,
                    day_of_week=day,
                    start_time=time(9, 0),
                    end_time=time(13, 0),
                    slot_duration_minutes=30,
                    is_active=True,
                )
            )
            availability_slots.append(
                Availability(
                    id=uuid.uuid4(),
                    provider_id=providers[0].id,
                    day_of_week=day,
                    start_time=time(17, 0),
                    end_time=time(20, 0),
                    slot_duration_minutes=30,
                    is_active=True,
                )
            )

        # Dr. Meera Shah (Dermatology) - Mon-Fri, 10 AM to 6 PM
        for day in range(5):  # Mon-Fri
            availability_slots.append(
                Availability(
                    id=uuid.uuid4(),
                    provider_id=providers[1].id,
                    day_of_week=day,
                    start_time=time(10, 0),
                    end_time=time(18, 0),
                    slot_duration_minutes=45,
                    is_active=True,
                )
            )

        # Neha Kapoor (Hair Styling) - Tue-Sun, 10 AM to 8 PM
        for day in [1, 2, 3, 4, 5, 6]:  # Tue-Sun
            availability_slots.append(
                Availability(
                    id=uuid.uuid4(),
                    provider_id=providers[2].id,
                    day_of_week=day,
                    start_time=time(10, 0),
                    end_time=time(20, 0),
                    slot_duration_minutes=60,
                    is_active=True,
                )
            )

        # Swami Raghav (Yoga) - Mon-Sat, 5 AM to 8 AM & 6 PM to 8 PM
        for day in range(6):  # Mon-Sat
            availability_slots.append(
                Availability(
                    id=uuid.uuid4(),
                    provider_id=providers[3].id,
                    day_of_week=day,
                    start_time=time(5, 0),
                    end_time=time(8, 0),
                    slot_duration_minutes=60,
                    is_active=True,
                )
            )
            availability_slots.append(
                Availability(
                    id=uuid.uuid4(),
                    provider_id=providers[3].id,
                    day_of_week=day,
                    start_time=time(18, 0),
                    end_time=time(20, 0),
                    slot_duration_minutes=60,
                    is_active=True,
                )
            )

        # Prof. Suresh Iyer (Maths) - Mon, Wed, Fri, Sat 4 PM to 9 PM
        for day in [0, 2, 4, 5]:  # Mon, Wed, Fri, Sat
            availability_slots.append(
                Availability(
                    id=uuid.uuid4(),
                    provider_id=providers[4].id,
                    day_of_week=day,
                    start_time=time(16, 0),
                    end_time=time(21, 0),
                    slot_duration_minutes=60,
                    is_active=True,
                )
            )

        # Manish Tiwari (UPSC) - Tue, Thu, Sat, Sun 9 AM to 1 PM
        for day in [1, 3, 5, 6]:  # Tue, Thu, Sat, Sun
            availability_slots.append(
                Availability(
                    id=uuid.uuid4(),
                    provider_id=providers[5].id,
                    day_of_week=day,
                    start_time=time(9, 0),
                    end_time=time(13, 0),
                    slot_duration_minutes=60,
                    is_active=True,
                )
            )

        # Adv. Sunita Desai (Property Law) - Mon-Fri, 11 AM to 5 PM
        for day in range(5):  # Mon-Fri
            availability_slots.append(
                Availability(
                    id=uuid.uuid4(),
                    provider_id=providers[6].id,
                    day_of_week=day,
                    start_time=time(11, 0),
                    end_time=time(17, 0),
                    slot_duration_minutes=60,
                    is_active=True,
                )
            )

        # Ritu Malhotra (Interior Design) - Mon-Fri, 10 AM to 6 PM
        for day in range(5):  # Mon-Fri
            availability_slots.append(
                Availability(
                    id=uuid.uuid4(),
                    provider_id=providers[7].id,
                    day_of_week=day,
                    start_time=time(10, 0),
                    end_time=time(18, 0),
                    slot_duration_minutes=90,
                    is_active=True,
                )
            )

        # Generated providers - consistent weekday availability so every new provider is bookable.
        for provider_index, provider in enumerate(providers[8:], start=8):
            start_hour = 9 + (provider_index % 4)
            for day in range(5):  # Mon-Fri
                availability_slots.append(
                    Availability(
                        id=uuid.uuid4(),
                        provider_id=provider.id,
                        day_of_week=day,
                        start_time=time(start_hour, 0),
                        end_time=time(start_hour + 4, 0),
                        slot_duration_minutes=60,
                        is_active=True,
                    )
                )

        for slot in availability_slots:
            db.add(slot)
        await db.flush()
        print(f"  ✓ Created {len(availability_slots)} availability slots")

        # ============================================================
        # 6. Create 25 Appointments (mix of statuses, past & future)
        # ============================================================
        appointments = [
            # --- COMPLETED appointments (past) - needed for reviews ---
            # Appt 0: Priya -> Dr. Arun (completed, 12 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[0].id,
                provider_id=providers[0].id,
                appointment_date=today - timedelta(days=12),
                start_time=time(9, 30),
                end_time=time(10, 0),
                status=AppointmentStatus.COMPLETED,
                notes="General health checkup and blood sugar monitoring",
            ),
            # Appt 1: Amit -> Dr. Arun (completed, 10 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[1].id,
                provider_id=providers[0].id,
                appointment_date=today - timedelta(days=10),
                start_time=time(10, 0),
                end_time=time(10, 30),
                status=AppointmentStatus.COMPLETED,
                notes="Fever and cold symptoms consultation",
            ),
            # Appt 2: Sneha -> Dr. Meera (completed, 9 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[2].id,
                provider_id=providers[1].id,
                appointment_date=today - timedelta(days=9),
                start_time=time(11, 0),
                end_time=time(11, 45),
                status=AppointmentStatus.COMPLETED,
                notes="Acne treatment follow-up",
            ),
            # Appt 3: Vikram -> Dr. Meera (completed, 8 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[3].id,
                provider_id=providers[1].id,
                appointment_date=today - timedelta(days=8),
                start_time=time(14, 0),
                end_time=time(14, 45),
                status=AppointmentStatus.COMPLETED,
                notes="Hair fall treatment consultation",
            ),
            # Appt 4: Ananya -> Neha (completed, 7 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[4].id,
                provider_id=providers[2].id,
                appointment_date=today - timedelta(days=7),
                start_time=time(11, 0),
                end_time=time(12, 0),
                status=AppointmentStatus.COMPLETED,
                notes="Bridal hair trial session",
            ),
            # Appt 5: Priya -> Neha (completed, 6 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[0].id,
                provider_id=providers[2].id,
                appointment_date=today - timedelta(days=6),
                start_time=time(14, 0),
                end_time=time(15, 0),
                status=AppointmentStatus.COMPLETED,
                notes="Hair coloring - balayage",
            ),
            # Appt 6: Rohan -> Swami Raghav (completed, 5 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[5].id,
                provider_id=providers[3].id,
                appointment_date=today - timedelta(days=5),
                start_time=time(6, 0),
                end_time=time(7, 0),
                status=AppointmentStatus.COMPLETED,
                notes="Morning yoga session - beginner level",
            ),
            # Appt 7: Kavita -> Swami Raghav (completed, 4 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[6].id,
                provider_id=providers[3].id,
                appointment_date=today - timedelta(days=4),
                start_time=time(18, 0),
                end_time=time(19, 0),
                status=AppointmentStatus.COMPLETED,
                notes="Pranayama and meditation for anxiety",
            ),
            # Appt 8: Arjun -> Prof. Suresh (completed, 11 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[7].id,
                provider_id=providers[4].id,
                appointment_date=today - timedelta(days=11),
                start_time=time(16, 0),
                end_time=time(17, 0),
                status=AppointmentStatus.COMPLETED,
                notes="IIT-JEE Calculus preparation",
            ),
            # Appt 9: Deepika -> Prof. Suresh (completed, 3 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[8].id,
                provider_id=providers[4].id,
                appointment_date=today - timedelta(days=3),
                start_time=time(17, 0),
                end_time=time(18, 0),
                status=AppointmentStatus.COMPLETED,
                notes="CBSE Class 12 Maths - Integration chapter",
            ),
            # Appt 10: Sanjay -> Manish (completed, 6 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[9].id,
                provider_id=providers[5].id,
                appointment_date=today - timedelta(days=6),
                start_time=time(9, 0),
                end_time=time(10, 0),
                status=AppointmentStatus.COMPLETED,
                notes="UPSC Prelims strategy session",
            ),
            # Appt 11: Amit -> Manish (completed, 4 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[1].id,
                provider_id=providers[5].id,
                appointment_date=today - timedelta(days=4),
                start_time=time(10, 0),
                end_time=time(11, 0),
                status=AppointmentStatus.COMPLETED,
                notes="GS Paper II - Indian Polity discussion",
            ),
            # Appt 12: Vikram -> Adv. Sunita (completed, 13 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[3].id,
                provider_id=providers[6].id,
                appointment_date=today - timedelta(days=13),
                start_time=time(11, 0),
                end_time=time(12, 0),
                status=AppointmentStatus.COMPLETED,
                notes="Property dispute consultation - ancestral property",
            ),
            # Appt 13: Kavita -> Ritu (completed, 10 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[6].id,
                provider_id=providers[7].id,
                appointment_date=today - timedelta(days=10),
                start_time=time(10, 0),
                end_time=time(11, 30),
                status=AppointmentStatus.COMPLETED,
                notes="2BHK flat interior design consultation",
            ),

            # --- CONFIRMED appointments (upcoming) ---
            # Appt 14: Priya -> Dr. Arun (confirmed, 3 days from now)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[0].id,
                provider_id=providers[0].id,
                appointment_date=today + timedelta(days=3),
                start_time=time(9, 0),
                end_time=time(9, 30),
                status=AppointmentStatus.CONFIRMED,
                notes="Follow-up for blood sugar report review",
            ),
            # Appt 15: Sneha -> Dr. Meera (confirmed, 5 days from now)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[2].id,
                provider_id=providers[1].id,
                appointment_date=today + timedelta(days=5),
                start_time=time(10, 0),
                end_time=time(10, 45),
                status=AppointmentStatus.CONFIRMED,
                notes="Skin treatment progress check",
            ),
            # Appt 16: Rohan -> Swami Raghav (confirmed, 2 days from now)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[5].id,
                provider_id=providers[3].id,
                appointment_date=today + timedelta(days=2),
                start_time=time(6, 0),
                end_time=time(7, 0),
                status=AppointmentStatus.CONFIRMED,
                notes="Advanced pranayama session",
            ),

            # --- PENDING appointments (upcoming) ---
            # Appt 17: Amit -> Neha (pending, 4 days from now)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[1].id,
                provider_id=providers[2].id,
                appointment_date=today + timedelta(days=4),
                start_time=time(15, 0),
                end_time=time(16, 0),
                status=AppointmentStatus.PENDING,
                notes="Haircut and beard styling",
            ),
            # Appt 18: Deepika -> Adv. Sunita (pending, 7 days from now)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[8].id,
                provider_id=providers[6].id,
                appointment_date=today + timedelta(days=7),
                start_time=time(14, 0),
                end_time=time(15, 0),
                status=AppointmentStatus.PENDING,
                notes="RERA compliance query for new flat purchase",
            ),
            # Appt 19: Arjun -> Ritu (pending, 10 days from now)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[7].id,
                provider_id=providers[7].id,
                appointment_date=today + timedelta(days=10),
                start_time=time(11, 0),
                end_time=time(12, 30),
                status=AppointmentStatus.PENDING,
                notes="3BHK villa interior design - initial consultation",
            ),
            # Appt 20: Sanjay -> Manish (pending, 14 days from now)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[9].id,
                provider_id=providers[5].id,
                appointment_date=today + timedelta(days=14),
                start_time=time(9, 0),
                end_time=time(10, 0),
                status=AppointmentStatus.PENDING,
                notes="UPSC Mains answer writing practice",
            ),
            # Appt 21: Ananya -> Prof. Suresh (pending, 18 days from now)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[4].id,
                provider_id=providers[4].id,
                appointment_date=today + timedelta(days=18),
                start_time=time(16, 0),
                end_time=time(17, 0),
                status=AppointmentStatus.PENDING,
                notes="Probability and Statistics for CAT preparation",
            ),

            # --- CANCELLED appointments ---
            # Appt 22: Vikram -> Dr. Arun (cancelled, was for 1 day from now)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[3].id,
                provider_id=providers[0].id,
                appointment_date=today + timedelta(days=1),
                start_time=time(17, 0),
                end_time=time(17, 30),
                status=AppointmentStatus.CANCELLED,
                notes="Routine checkup",
                cancellation_reason="Out of station due to family emergency",
            ),
            # Appt 23: Rohan -> Neha (cancelled, was for 2 days ago)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[5].id,
                provider_id=providers[2].id,
                appointment_date=today - timedelta(days=2),
                start_time=time(12, 0),
                end_time=time(13, 0),
                status=AppointmentStatus.CANCELLED,
                notes="Hair straightening",
                cancellation_reason="Provider unavailable - salon renovation",
            ),

            # --- REJECTED appointment ---
            # Appt 24: Kavita -> Dr. Meera (rejected, was for 6 days from now)
            Appointment(
                id=uuid.uuid4(),
                customer_id=customers[6].id,
                provider_id=providers[1].id,
                appointment_date=today + timedelta(days=6),
                start_time=time(16, 0),
                end_time=time(16, 45),
                status=AppointmentStatus.REJECTED,
                notes="Cosmetic procedure consultation",
                cancellation_reason="Slot already booked for another patient",
            ),
        ]

        for appt in appointments:
            db.add(appt)
        await db.flush()
        print(f"  ✓ Created {len(appointments)} appointments")

        # ============================================================
        # 7. Create 15 Reviews (only on completed appointments, 3-5 stars)
        # ============================================================
        reviews = [
            # Reviews for Dr. Arun Kapoor (provider 0)
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[0].id,
                customer_id=customers[0].id,
                provider_id=providers[0].id,
                rating=5,
                comment="Dr. Arun is extremely thorough. He spent time explaining my reports and gave practical diet advice for managing blood sugar. Highly recommended!",
            ),
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[1].id,
                customer_id=customers[1].id,
                provider_id=providers[0].id,
                rating=4,
                comment="Good consultation. The doctor was knowledgeable but the waiting time was a bit long. Medicine worked well though.",
            ),
            # Reviews for Dr. Meera Shah (provider 1)
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[2].id,
                customer_id=customers[2].id,
                provider_id=providers[1].id,
                rating=5,
                comment="My skin has improved so much after following Dr. Meera's treatment plan. She's patient and explains everything clearly. Worth every rupee!",
            ),
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[3].id,
                customer_id=customers[3].id,
                provider_id=providers[1].id,
                rating=5,
                comment="Excellent dermatologist! She identified the root cause of my hair fall and the treatment is showing results within 3 weeks.",
            ),
            # Reviews for Neha Kapoor (provider 2)
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[4].id,
                customer_id=customers[4].id,
                provider_id=providers[2].id,
                rating=5,
                comment="Neha did an amazing bridal trial! She understood exactly what I wanted. The hairstyle lasted the entire evening. Booking her for my wedding day!",
            ),
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[5].id,
                customer_id=customers[0].id,
                provider_id=providers[2].id,
                rating=4,
                comment="Beautiful balayage work. The color blending is very natural. Slightly expensive but the quality justifies it.",
            ),
            # Reviews for Swami Raghav (provider 3)
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[6].id,
                customer_id=customers[5].id,
                provider_id=providers[3].id,
                rating=5,
                comment="Swami ji's yoga sessions are transformative. Even as a complete beginner, I felt comfortable. My back pain has reduced significantly after just one session.",
            ),
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[7].id,
                customer_id=customers[6].id,
                provider_id=providers[3].id,
                rating=5,
                comment="The pranayama techniques taught by Swami Raghav have helped my anxiety tremendously. I sleep better now. Truly life-changing experience.",
            ),
            # Reviews for Prof. Suresh Iyer (provider 4)
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[8].id,
                customer_id=customers[7].id,
                provider_id=providers[4].id,
                rating=4,
                comment="Prof. Suresh makes calculus feel easy. His IIT-JEE problem solving approach is very systematic. Could use more practice problems though.",
            ),
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[9].id,
                customer_id=customers[8].id,
                provider_id=providers[4].id,
                rating=5,
                comment="Excellent teacher! He explained integration concepts so clearly that I scored 95 in my board exam. Thank you sir!",
            ),
            # Reviews for Manish Tiwari (provider 5)
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[10].id,
                customer_id=customers[9].id,
                provider_id=providers[5].id,
                rating=4,
                comment="Manish sir's UPSC strategy is very practical. He gave a clear 6-month plan. The only issue is limited slots available.",
            ),
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[11].id,
                customer_id=customers[1].id,
                provider_id=providers[5].id,
                rating=5,
                comment="Best UPSC mentor I've found. His insights on GS Paper II are invaluable. The answer writing tips alone are worth the fee.",
            ),
            # Review for Adv. Sunita Desai (provider 6)
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[12].id,
                customer_id=customers[3].id,
                provider_id=providers[6].id,
                rating=4,
                comment="Adv. Sunita is very knowledgeable about property law. She explained the legal complexities of our ancestral property case clearly. Fees are on the higher side but expertise is top-notch.",
            ),
            # Review for Ritu Malhotra (provider 7)
            Review(
                id=uuid.uuid4(),
                appointment_id=appointments[13].id,
                customer_id=customers[6].id,
                provider_id=providers[7].id,
                rating=5,
                comment="Ritu's design sense is incredible! She gave us a vastu-compliant modern design for our 2BHK that maximizes space beautifully. The 3D renders were very helpful.",
            ),
        ]

        for review in reviews:
            db.add(review)
        await db.flush()
        print(f"  ✓ Created {len(reviews)} reviews")

        # ============================================================
        # 8. Create 10 Notifications (referencing real appointments)
        # ============================================================
        notifications = [
            Notification(
                id=uuid.uuid4(),
                user_id=customers[0].id,
                type=NotificationType.APPOINTMENT_CONFIRMED,
                title="Appointment Confirmed",
                message="Your appointment with Dr. Arun Kapoor on {} at 9:00 AM has been confirmed.".format(
                    (today + timedelta(days=3)).strftime("%d %b %Y")
                ),
                link=f"/appointments/{appointments[14].id}",
                is_read=True,
            ),
            Notification(
                id=uuid.uuid4(),
                user_id=customers[2].id,
                type=NotificationType.APPOINTMENT_CONFIRMED,
                title="Appointment Confirmed",
                message="Your appointment with Dr. Meera Shah on {} at 10:00 AM has been confirmed.".format(
                    (today + timedelta(days=5)).strftime("%d %b %Y")
                ),
                link=f"/appointments/{appointments[15].id}",
                is_read=False,
            ),
            Notification(
                id=uuid.uuid4(),
                user_id=customers[1].id,
                type=NotificationType.APPOINTMENT_BOOKED,
                title="Appointment Booked",
                message="Your appointment with Neha Kapoor for haircut and beard styling has been submitted. Awaiting confirmation.",
                link=f"/appointments/{appointments[17].id}",
                is_read=False,
            ),
            Notification(
                id=uuid.uuid4(),
                user_id=provider_users[0].id,
                type=NotificationType.APPOINTMENT_BOOKED,
                title="New Appointment Request",
                message="Priya Sharma has booked an appointment on {} at 9:00 AM for blood sugar report review.".format(
                    (today + timedelta(days=3)).strftime("%d %b %Y")
                ),
                link=f"/appointments/{appointments[14].id}",
                is_read=True,
            ),
            Notification(
                id=uuid.uuid4(),
                user_id=provider_users[0].id,
                type=NotificationType.APPOINTMENT_CANCELLED,
                title="Appointment Cancelled",
                message="Vikram Singh has cancelled the appointment on {}. Reason: Out of station due to family emergency.".format(
                    (today + timedelta(days=1)).strftime("%d %b %Y")
                ),
                link=f"/appointments/{appointments[22].id}",
                is_read=False,
            ),
            Notification(
                id=uuid.uuid4(),
                user_id=customers[5].id,
                type=NotificationType.APPOINTMENT_CONFIRMED,
                title="Appointment Confirmed",
                message="Your yoga session with Swami Raghav on {} at 6:00 AM has been confirmed.".format(
                    (today + timedelta(days=2)).strftime("%d %b %Y")
                ),
                link=f"/appointments/{appointments[16].id}",
                is_read=True,
            ),
            Notification(
                id=uuid.uuid4(),
                user_id=customers[6].id,
                type=NotificationType.APPOINTMENT_REJECTED,
                title="Appointment Rejected",
                message="Your appointment with Dr. Meera Shah on {} has been rejected. Reason: Slot already booked for another patient.".format(
                    (today + timedelta(days=6)).strftime("%d %b %Y")
                ),
                link=f"/appointments/{appointments[24].id}",
                is_read=False,
            ),
            Notification(
                id=uuid.uuid4(),
                user_id=customers[0].id,
                type=NotificationType.APPOINTMENT_COMPLETED,
                title="Appointment Completed",
                message="Your appointment with Neha Kapoor has been completed. Please leave a review to help other customers!",
                link=f"/appointments/{appointments[5].id}",
                is_read=False,
            ),
            Notification(
                id=uuid.uuid4(),
                user_id=customers[9].id,
                type=NotificationType.APPOINTMENT_REMINDER,
                title="Upcoming Appointment Reminder",
                message="Reminder: You have a UPSC coaching session with Manish Tiwari on {} at 9:00 AM.".format(
                    (today + timedelta(days=14)).strftime("%d %b %Y")
                ),
                link=f"/appointments/{appointments[20].id}",
                is_read=False,
            ),
            Notification(
                id=uuid.uuid4(),
                user_id=admin_user.id,
                type=NotificationType.SYSTEM,
                title="Platform Update",
                message="New provider registrations this week: 3. Total active appointments: 25. Platform running smoothly.",
                link="/admin/dashboard",
                is_read=True,
            ),
        ]

        for notification in notifications:
            db.add(notification)
        await db.flush()
        print(f"  ✓ Created {len(notifications)} notifications")

        # ============================================================
        # 9. Create 5 Availability Exceptions (holidays, personal days)
        # ============================================================
        exceptions = [
            # Dr. Arun - Diwali holiday
            AvailabilityException(
                id=uuid.uuid4(),
                provider_id=providers[0].id,
                date=today + timedelta(days=20),
                reason="Diwali - Clinic closed",
                is_blocked=True,
            ),
            # Dr. Meera - Conference
            AvailabilityException(
                id=uuid.uuid4(),
                provider_id=providers[1].id,
                date=today + timedelta(days=12),
                reason="Attending National Dermatology Conference, AIIMS Delhi",
                is_blocked=True,
            ),
            # Neha - Personal day (half day)
            AvailabilityException(
                id=uuid.uuid4(),
                provider_id=providers[2].id,
                date=today + timedelta(days=8),
                reason="Personal commitment - available only morning",
                is_blocked=False,
                start_time=time(10, 0),
                end_time=time(13, 0),
            ),
            # Swami Raghav - Ashram retreat
            AvailabilityException(
                id=uuid.uuid4(),
                provider_id=providers[3].id,
                date=today + timedelta(days=15),
                reason="Annual silent retreat at Rishikesh Ashram",
                is_blocked=True,
            ),
            # Prof. Suresh - Republic Day
            AvailabilityException(
                id=uuid.uuid4(),
                provider_id=providers[4].id,
                date=today + timedelta(days=21),
                reason="Republic Day - National Holiday",
                is_blocked=True,
            ),
        ]

        for exc in exceptions:
            db.add(exc)
        await db.flush()
        print(f"  ✓ Created {len(exceptions)} availability exceptions")

        # ============================================================
        # 10. Create 8 Favorites (customers favoriting providers)
        # ============================================================
        favorites = [
            Favorite(
                id=uuid.uuid4(),
                customer_id=customers[0].id,
                provider_id=providers[0].id,  # Priya favorites Dr. Arun
            ),
            Favorite(
                id=uuid.uuid4(),
                customer_id=customers[0].id,
                provider_id=providers[2].id,  # Priya favorites Neha
            ),
            Favorite(
                id=uuid.uuid4(),
                customer_id=customers[2].id,
                provider_id=providers[1].id,  # Sneha favorites Dr. Meera
            ),
            Favorite(
                id=uuid.uuid4(),
                customer_id=customers[5].id,
                provider_id=providers[3].id,  # Rohan favorites Swami Raghav
            ),
            Favorite(
                id=uuid.uuid4(),
                customer_id=customers[6].id,
                provider_id=providers[3].id,  # Kavita favorites Swami Raghav
            ),
            Favorite(
                id=uuid.uuid4(),
                customer_id=customers[7].id,
                provider_id=providers[4].id,  # Arjun favorites Prof. Suresh
            ),
            Favorite(
                id=uuid.uuid4(),
                customer_id=customers[9].id,
                provider_id=providers[5].id,  # Sanjay favorites Manish
            ),
            Favorite(
                id=uuid.uuid4(),
                customer_id=customers[6].id,
                provider_id=providers[7].id,  # Kavita favorites Ritu
            ),
        ]

        for fav in favorites:
            db.add(fav)
        await db.flush()
        print(f"  ✓ Created {len(favorites)} favorites")

        # ============================================================
        # 11. Create 5 Appointment Comments
        # ============================================================
        comments = [
            # Comment on upcoming confirmed appointment (Priya -> Dr. Arun)
            AppointmentComment(
                id=uuid.uuid4(),
                appointment_id=appointments[14].id,
                user_id=customers[0].id,
                content="Doctor, should I come fasting for the blood sugar test review? Also bringing my previous reports.",
                is_internal=False,
            ),
            AppointmentComment(
                id=uuid.uuid4(),
                appointment_id=appointments[14].id,
                user_id=provider_users[0].id,
                content="Yes, please come fasting (8 hours). Bring all reports from the last 3 months. We'll review the trend.",
                is_internal=False,
            ),
            # Comment on pending appointment (Deepika -> Adv. Sunita)
            AppointmentComment(
                id=uuid.uuid4(),
                appointment_id=appointments[18].id,
                user_id=customers[8].id,
                content="I'll bring the sale deed, builder agreement, and RERA registration documents. Is there anything else needed?",
                is_internal=False,
            ),
            # Internal note by provider on pending appointment
            AppointmentComment(
                id=uuid.uuid4(),
                appointment_id=appointments[19].id,
                user_id=provider_users[7].id,
                content="Client wants vastu-compliant design. Prepare mood board with modern Indian aesthetic options before the meeting.",
                is_internal=True,
            ),
            # Comment on yoga session
            AppointmentComment(
                id=uuid.uuid4(),
                appointment_id=appointments[16].id,
                user_id=customers[5].id,
                content="Swami ji, I have a mild lower back issue. Should I avoid any specific asanas?",
                is_internal=False,
            ),
        ]

        for comment in comments:
            db.add(comment)
        await db.flush()
        print(f"  ✓ Created {len(comments)} appointment comments")

        # ============================================================
        # 12. Create Coupons (6 promo codes)
        # ============================================================
        now = datetime.now(timezone.utc)

        coupon_coupons = [
            {
                "code": "WELCOME20",
                "description": "20% off for new users - Welcome offer!",
                "discount_type": "percentage",
                "discount_value": 20.0,
                "min_order_amount": None,
                "max_discount_amount": 500.0,
                "usage_limit": None,
                "usage_count": 0,
                "per_user_limit": 1,
                "valid_from": now,
                "valid_until": now + timedelta(days=180),
                "category_id": None,
            },
            {
                "code": "SAVE10",
                "description": "Flat ₹100 off on orders above ₹500",
                "discount_type": "flat_amount",
                "discount_value": 100.0,
                "min_order_amount": 500.0,
                "max_discount_amount": None,
                "usage_limit": None,
                "usage_count": 12,
                "per_user_limit": 99,
                "valid_from": now - timedelta(days=30),
                "valid_until": now + timedelta(days=365),
                "category_id": None,
            },
            {
                "code": "DIWALI50",
                "description": "Diwali special - 50% off on healthcare, max ₹1000",
                "discount_type": "percentage",
                "discount_value": 50.0,
                "min_order_amount": None,
                "max_discount_amount": 1000.0,
                "usage_limit": None,
                "usage_count": 3,
                "per_user_limit": 1,
                "valid_from": now,
                "valid_until": now + timedelta(days=14),
                "category_id": categories[0].id,  # Healthcare
            },
            {
                "code": "LOYALTY15",
                "description": "15% off for loyal customers - use up to 3 times",
                "discount_type": "percentage",
                "discount_value": 15.0,
                "min_order_amount": None,
                "max_discount_amount": None,
                "usage_limit": None,
                "usage_count": 7,
                "per_user_limit": 3,
                "valid_from": now,
                "valid_until": now + timedelta(days=90),
                "category_id": None,
            },
            {
                "code": "WEEKEND25",
                "description": "25% off on weekend bookings, max ₹750",
                "discount_type": "percentage",
                "discount_value": 25.0,
                "min_order_amount": None,
                "max_discount_amount": 750.0,
                "usage_limit": None,
                "usage_count": 5,
                "per_user_limit": 2,
                "valid_from": now,
                "valid_until": now + timedelta(days=60),
                "category_id": None,
            },
            {
                "code": "FIRST100",
                "description": "Flat ₹200 off on your first booking - limited to 100 uses",
                "discount_type": "flat_amount",
                "discount_value": 200.0,
                "min_order_amount": None,
                "max_discount_amount": None,
                "usage_limit": 100,
                "usage_count": 34,
                "per_user_limit": 1,
                "valid_from": now - timedelta(days=15),
                "valid_until": now + timedelta(days=180),
                "category_id": None,
            },
        ]

        from app.models.coupon import Coupon, DiscountType

        seed_coupons = []
        for c in coupon_coupons:
            coupon = Coupon(
                id=uuid.uuid4(),
                code=c["code"],
                description=c["description"],
                discount_type=DiscountType(c["discount_type"]),
                discount_value=c["discount_value"],
                min_order_amount=c["min_order_amount"],
                max_discount_amount=c["max_discount_amount"],
                usage_limit=c["usage_limit"],
                usage_count=c["usage_count"],
                per_user_limit=c["per_user_limit"],
                valid_from=c["valid_from"],
                valid_until=c["valid_until"],
                is_active=True,
                category_id=c["category_id"],
                created_by=admin_user.id,
            )
            seed_coupons.append(coupon)
            db.add(coupon)
        await db.flush()
        print(f"  ✓ Created {len(seed_coupons)} coupons")

        # ============================================================
        # 13. Create Loyalty Accounts & Transactions
        # ============================================================
        from app.models.loyalty import LoyaltyAccount, LoyaltyTransaction

        loyalty_data = [
            {"points": 450, "tier": "silver"},
            {"points": 200, "tier": "bronze"},
            {"points": 500, "tier": "gold"},
            {"points": 150, "tier": "bronze"},
            {"points": 320, "tier": "silver"},
        ]

        loyalty_accounts = []
        for i, data in enumerate(loyalty_data):
            account = LoyaltyAccount(
                id=uuid.uuid4(),
                user_id=customers[i].id,
                points=data["points"],
                tier=data["tier"],
                created_at=now - timedelta(days=60),
            )
            loyalty_accounts.append(account)
            db.add(account)
        await db.flush()

        transaction_templates = [
            [
                {"points": 250, "type": "earned", "desc": "Booking completed - Dr. Arun Kapoor consultation"},
                {"points": 150, "type": "earned", "desc": "Booking completed - Neha Kapoor hair styling"},
                {"points": 50, "type": "earned", "desc": "Referral bonus - Amit Patel signed up"},
            ],
            [
                {"points": 125, "type": "earned", "desc": "Booking completed - Dr. Arun Kapoor consultation"},
                {"points": 75, "type": "earned", "desc": "Booking completed - Manish Tiwari UPSC session"},
            ],
            [
                {"points": 350, "type": "earned", "desc": "Booking completed - Dr. Meera Shah dermatology"},
                {"points": 200, "type": "earned", "desc": "Booking completed - follow-up consultation"},
                {"points": -50, "type": "redeemed", "desc": "Redeemed 50 points for ₹50 discount"},
            ],
            [
                {"points": 100, "type": "earned", "desc": "Booking completed - Dr. Meera Shah hair fall treatment"},
                {"points": 50, "type": "earned", "desc": "Profile completion bonus"},
            ],
            [
                {"points": 150, "type": "earned", "desc": "Booking completed - Neha Kapoor bridal trial"},
                {"points": 120, "type": "earned", "desc": "Booking completed - Prof. Suresh maths tutoring"},
                {"points": 50, "type": "earned", "desc": "Review bonus - left 5-star review"},
            ],
        ]

        loyalty_txns = []
        for i, txns in enumerate(transaction_templates):
            for j, txn in enumerate(txns):
                transaction = LoyaltyTransaction(
                    id=uuid.uuid4(),
                    account_id=loyalty_accounts[i].id,
                    points=txn["points"],
                    type=txn["type"],
                    description=txn["desc"],
                    created_at=now - timedelta(days=30 - (j * 10)),
                )
                loyalty_txns.append(transaction)
                db.add(transaction)
        await db.flush()
        print(f"  ✓ Created {len(loyalty_accounts)} loyalty accounts, {len(loyalty_txns)} transactions")

        # ============================================================
        # 14. Create Waitlist Entries (5 entries)
        # ============================================================
        from app.models.waitlist import WaitlistEntry, WaitlistStatus

        waitlist_entries = [
            WaitlistEntry(id=uuid.uuid4(), customer_id=customers[0].id, provider_id=providers[1].id,
                          preferred_date=today + timedelta(days=12), preferred_time_start=time(10, 0),
                          preferred_time_end=time(12, 0), status=WaitlistStatus.WAITING, created_at=now - timedelta(days=2)),
            WaitlistEntry(id=uuid.uuid4(), customer_id=customers[3].id, provider_id=providers[0].id,
                          preferred_date=today + timedelta(days=20), preferred_time_start=time(9, 0),
                          preferred_time_end=time(11, 0), status=WaitlistStatus.WAITING, created_at=now - timedelta(days=1)),
            WaitlistEntry(id=uuid.uuid4(), customer_id=customers[5].id, provider_id=providers[2].id,
                          preferred_date=today + timedelta(days=8), preferred_time_start=time(14, 0),
                          preferred_time_end=time(16, 0), status=WaitlistStatus.WAITING, created_at=now - timedelta(hours=12)),
            WaitlistEntry(id=uuid.uuid4(), customer_id=customers[7].id, provider_id=providers[3].id,
                          preferred_date=today + timedelta(days=15), preferred_time_start=time(6, 0),
                          preferred_time_end=time(7, 0), status=WaitlistStatus.WAITING, created_at=now - timedelta(hours=6)),
            WaitlistEntry(id=uuid.uuid4(), customer_id=customers[8].id, provider_id=providers[4].id,
                          preferred_date=today + timedelta(days=18), preferred_time_start=time(16, 0),
                          preferred_time_end=time(18, 0), status=WaitlistStatus.OFFERED, created_at=now - timedelta(days=3)),
        ]
        for entry in waitlist_entries:
            db.add(entry)
        await db.flush()
        print(f"  ✓ Created {len(waitlist_entries)} waitlist entries")

        # ============================================================
        # 15. Create Chat Messages (10 messages)
        # ============================================================
        from app.models.chat import ChatMessage

        chat_messages = [
            ChatMessage(id=uuid.uuid4(), appointment_id=appointments[14].id, sender_id=customers[0].id,
                        content="Namaste! I wanted to confirm - should I bring any previous reports?",
                        is_read=True, created_at=now - timedelta(hours=48)),
            ChatMessage(id=uuid.uuid4(), appointment_id=appointments[14].id, sender_id=provider_users[0].id,
                        content="Namaste! Yes, please bring your last 3 months of reports. Also come on an empty stomach if possible.",
                        is_read=True, created_at=now - timedelta(hours=47)),
            ChatMessage(id=uuid.uuid4(), appointment_id=appointments[14].id, sender_id=customers[0].id,
                        content="Sure, I'll keep 8 hours fasting. Is there parking available at the clinic?",
                        is_read=True, created_at=now - timedelta(hours=46)),
            ChatMessage(id=uuid.uuid4(), appointment_id=appointments[14].id, sender_id=provider_users[0].id,
                        content="Yes, basement parking is available. Entry from Gate 2. See you soon!",
                        is_read=True, created_at=now - timedelta(hours=45)),
            ChatMessage(id=uuid.uuid4(), appointment_id=appointments[17].id, sender_id=customers[1].id,
                        content="Hi, I booked for a haircut. Can you also do beard trimming in the same slot?",
                        is_read=True, created_at=now - timedelta(hours=24)),
            ChatMessage(id=uuid.uuid4(), appointment_id=appointments[17].id, sender_id=provider_users[2].id,
                        content="Absolutely! 1 hour is enough for both haircut and beard styling. Any specific style in mind?",
                        is_read=True, created_at=now - timedelta(hours=23)),
            ChatMessage(id=uuid.uuid4(), appointment_id=appointments[17].id, sender_id=customers[1].id,
                        content="I'm thinking a fade cut with a short beard trim. Will share a reference photo when I come.",
                        is_read=False, created_at=now - timedelta(hours=22)),
            ChatMessage(id=uuid.uuid4(), appointment_id=appointments[18].id, sender_id=customers[8].id,
                        content="Ma'am, I have all the property documents ready. Should I also get the society NOC?",
                        is_read=True, created_at=now - timedelta(hours=10)),
            ChatMessage(id=uuid.uuid4(), appointment_id=appointments[18].id, sender_id=provider_users[6].id,
                        content="Yes, please bring the society NOC, sale deed, and builder-buyer agreement. Also any correspondence with the builder.",
                        is_read=True, created_at=now - timedelta(hours=9)),
            ChatMessage(id=uuid.uuid4(), appointment_id=appointments[18].id, sender_id=customers[8].id,
                        content="Got it. I'll also bring the RERA registration certificate. Thank you!",
                        is_read=False, created_at=now - timedelta(hours=8)),
        ]
        for msg in chat_messages:
            db.add(msg)
        await db.flush()
        print(f"  ✓ Created {len(chat_messages)} chat messages")

        # ============================================================
        # 16. Create Invoices (5 invoices for completed appointments)
        # ============================================================
        from app.models.invoice import Invoice

        invoice_amounts = [2500.0, 2500.0, 3500.0, 3500.0, 1500.0]
        seed_invoices = []
        for i, amount in enumerate(invoice_amounts):
            gst_rate = 18.0
            gst_amount = round(amount * gst_rate / 100, 2)
            total_amount = round(amount + gst_amount, 2)
            invoice = Invoice(
                id=uuid.uuid4(),
                appointment_id=appointments[i].id,
                invoice_number=f"INV-2024-{1001 + i:04d}",
                customer_id=appointments[i].customer_id,
                provider_id=appointments[i].provider_id,
                amount=amount,
                gst_rate=gst_rate,
                gst_amount=gst_amount,
                total_amount=total_amount,
                status="paid" if i < 4 else "generated",
                generated_at=now - timedelta(days=12 - i),
            )
            seed_invoices.append(invoice)
            db.add(invoice)
        await db.flush()
        print(f"  ✓ Created {len(seed_invoices)} invoices")

        # ============================================================
        # 17. Create Extra Notifications (15 more)
        # ============================================================
        extra_notifications = [
            Notification(id=uuid.uuid4(), user_id=customers[0].id, type=NotificationType.APPOINTMENT_REMINDER,
                         title="Appointment Tomorrow", message="Reminder: Your appointment with Dr. Arun Kapoor is tomorrow at 9:00 AM. Don't forget to bring your reports!",
                         link=None, is_read=False, created_at=now - timedelta(hours=2)),
            Notification(id=uuid.uuid4(), user_id=customers[2].id, type=NotificationType.APPOINTMENT_REMINDER,
                         title="Appointment in 2 Days", message="Reminder: Your skin treatment follow-up with Dr. Meera Shah is in 2 days at 10:00 AM.",
                         link=None, is_read=False, created_at=now - timedelta(hours=5)),
            Notification(id=uuid.uuid4(), user_id=customers[5].id, type=NotificationType.APPOINTMENT_REMINDER,
                         title="Yoga Session Tomorrow", message="Reminder: Your advanced pranayama session with Swami Raghav is tomorrow at 6:00 AM.",
                         link=None, is_read=True, created_at=now - timedelta(hours=12)),
            Notification(id=uuid.uuid4(), user_id=customers[1].id, type=NotificationType.SYSTEM,
                         title="Welcome to AppointEase!", message="Your account has been verified. You can now book appointments with top-rated providers across India.",
                         link="/providers", is_read=True, created_at=now - timedelta(days=30)),
            Notification(id=uuid.uuid4(), user_id=customers[4].id, type=NotificationType.SYSTEM,
                         title="New Feature: Loyalty Points", message="Earn points on every booking! Redeem them for discounts on future appointments.",
                         link="/rewards", is_read=False, created_at=now - timedelta(days=5)),
            Notification(id=uuid.uuid4(), user_id=customers[6].id, type=NotificationType.SYSTEM,
                         title="Coupon Alert: DIWALI50", message="Celebrate Diwali with 50% off on healthcare appointments! Use code DIWALI50. Valid for 2 weeks only.",
                         link="/coupons", is_read=False, created_at=now - timedelta(days=1)),
            Notification(id=uuid.uuid4(), user_id=admin_user.id, type=NotificationType.SYSTEM,
                         title="Weekly Report", message="This week: 8 new bookings, 5 completed, 2 cancellations. Revenue: ₹24,500. Provider satisfaction: 4.7/5.",
                         link="/admin/dashboard", is_read=True, created_at=now - timedelta(days=1)),
            Notification(id=uuid.uuid4(), user_id=customers[7].id, type=NotificationType.APPOINTMENT_BOOKED,
                         title="Booking Submitted", message="Your interior design consultation with Ritu Malhotra has been submitted.",
                         link=None, is_read=True, created_at=now - timedelta(days=3)),
            Notification(id=uuid.uuid4(), user_id=customers[8].id, type=NotificationType.APPOINTMENT_BOOKED,
                         title="Booking Submitted", message="Your legal consultation with Adv. Sunita Desai for RERA compliance has been submitted.",
                         link=None, is_read=False, created_at=now - timedelta(days=2)),
            Notification(id=uuid.uuid4(), user_id=customers[9].id, type=NotificationType.APPOINTMENT_BOOKED,
                         title="Booking Submitted", message="Your UPSC Mains answer writing session with Manish Tiwari has been submitted.",
                         link=None, is_read=False, created_at=now - timedelta(days=4)),
            Notification(id=uuid.uuid4(), user_id=provider_users[0].id, type=NotificationType.APPOINTMENT_REMINDER,
                         title="Upcoming Appointment", message="You have an appointment with Priya Sharma tomorrow at 9:00 AM for blood sugar report review.",
                         link=None, is_read=False, created_at=now - timedelta(hours=3)),
            Notification(id=uuid.uuid4(), user_id=provider_users[2].id, type=NotificationType.APPOINTMENT_BOOKED,
                         title="New Booking Request", message="Amit Patel has requested a haircut and beard styling appointment at 3:00 PM.",
                         link=None, is_read=True, created_at=now - timedelta(days=2)),
            Notification(id=uuid.uuid4(), user_id=provider_users[3].id, type=NotificationType.APPOINTMENT_COMPLETED,
                         title="Session Completed", message="Your yoga session with Kavita Nair has been marked as completed. A review has been submitted.",
                         link=None, is_read=True, created_at=now - timedelta(days=4)),
            Notification(id=uuid.uuid4(), user_id=provider_users[5].id, type=NotificationType.SYSTEM,
                         title="Profile Views Increased", message="Your profile was viewed 45 times this week - a 30% increase! Consider adding more availability slots.",
                         link=None, is_read=False, created_at=now - timedelta(days=2)),
            Notification(id=uuid.uuid4(), user_id=provider_users[7].id, type=NotificationType.APPOINTMENT_BOOKED,
                         title="New Booking Request", message="Arjun Mehta has requested a 3BHK villa interior design consultation.",
                         link=None, is_read=False, created_at=now - timedelta(days=1)),
        ]
        for notif in extra_notifications:
            db.add(notif)
        await db.flush()
        print(f"  ✓ Created {len(extra_notifications)} extra notifications")

        # ============================================================
        # 18. BULK DATA: 50+ more appointments, reviews, notifications
        # ============================================================
        import random

        print("\n  📦 Generating bulk seed data (50+ per table)...")

        # --- 50 more appointments (mix of statuses and dates) ---
        statuses_pool = [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.PENDING,
            AppointmentStatus.CANCELLED,
        ]
        notes_pool = [
            "Regular checkup", "Follow-up consultation", "First visit",
            "Skin treatment session", "Hair coloring appointment",
            "Yoga for back pain", "Advanced meditation session",
            "IIT-JEE preparation class", "Board exam revision",
            "UPSC essay writing practice", "GS Paper discussion",
            "Property documentation review", "RERA compliance check",
            "Living room redesign", "Kitchen renovation consultation",
            "Dental cleaning", "Eye checkup", "Physiotherapy session",
            "Career counseling", "Tax planning consultation",
            "Wedding makeup trial", "Hair spa treatment",
            "Stress management session", "Weight loss consultation",
            "Blood pressure monitoring", "Diabetes management",
        ]
        cancel_reasons = [
            "Personal emergency", "Out of station", "Feeling unwell",
            "Schedule conflict", "Provider unavailable", "Rescheduling to next week",
        ]

        bulk_appointments = []
        for i in range(50):
            customer = random.choice(customers)
            provider = random.choice(providers)
            status = random.choice(statuses_pool)
            days_offset = random.randint(-30, 30)
            appt_date = today + timedelta(days=days_offset)
            hour = random.choice([9, 10, 11, 14, 15, 16, 17, 18])
            appt = Appointment(
                id=uuid.uuid4(),
                customer_id=customer.id,
                provider_id=provider.id,
                appointment_date=appt_date,
                start_time=time(hour, 0),
                end_time=time(hour, 30) if hour < 23 else time(hour, 0),
                status=status,
                notes=random.choice(notes_pool),
                cancellation_reason=random.choice(cancel_reasons) if status == AppointmentStatus.CANCELLED else None,
            )
            bulk_appointments.append(appt)
            db.add(appt)
        await db.flush()
        print(f"  ✓ Created {len(bulk_appointments)} bulk appointments")

        # --- 50 more reviews (for completed bulk appointments) ---
        review_texts = [
            "Excellent service! Highly recommended.",
            "Very professional and knowledgeable. Will visit again.",
            "Good experience overall. The provider was punctual.",
            "Amazing results! Worth every penny.",
            "Decent service but could improve on communication.",
            "Best in the city! My go-to provider now.",
            "Very patient and thorough. Explained everything clearly.",
            "Slightly expensive but quality is top-notch.",
            "Great first experience. Booking again next month.",
            "The provider really knows their craft. Impressed!",
            "Comfortable environment and friendly staff.",
            "Quick and efficient. No unnecessary waiting.",
            "Helped me understand my condition better. Thank you!",
            "Would give 6 stars if I could! Absolutely fantastic.",
            "Good value for money. Recommended to friends.",
            "Professional setup. Clean and well-maintained.",
            "The consultation was very insightful and helpful.",
            "Exceeded my expectations. Very happy with the results.",
            "Prompt service. The provider was very attentive.",
            "A bit rushed but overall satisfactory experience.",
        ]

        completed_bulk = [a for a in bulk_appointments if a.status == AppointmentStatus.COMPLETED]
        bulk_reviews = []
        for i, appt in enumerate(completed_bulk[:50]):
            review = Review(
                id=uuid.uuid4(),
                appointment_id=appt.id,
                customer_id=appt.customer_id,
                provider_id=appt.provider_id,
                rating=random.choice([4, 4, 4, 5, 5, 5, 5, 3, 5, 4]),
                comment=random.choice(review_texts),
                created_at=now - timedelta(days=random.randint(1, 25)),
            )
            bulk_reviews.append(review)
            db.add(review)
        await db.flush()
        print(f"  ✓ Created {len(bulk_reviews)} bulk reviews")

        # --- 50 more notifications (spread across all users) ---
        notif_templates = [
            (NotificationType.APPOINTMENT_REMINDER, "Upcoming Appointment", "Don't forget your appointment tomorrow. Please arrive 10 minutes early."),
            (NotificationType.APPOINTMENT_CONFIRMED, "Booking Confirmed", "Your appointment has been confirmed by the provider. See you soon!"),
            (NotificationType.APPOINTMENT_BOOKED, "New Booking", "A new appointment request has been submitted. Please review and confirm."),
            (NotificationType.APPOINTMENT_COMPLETED, "Session Complete", "Your appointment has been completed. We'd love to hear your feedback!"),
            (NotificationType.SYSTEM, "Weekly Summary", "You had 3 appointments this week. Your loyalty points balance: 450."),
            (NotificationType.SYSTEM, "New Provider Nearby", "A new healthcare provider has joined in your area. Check them out!"),
            (NotificationType.SYSTEM, "Special Offer", "Use code SAVE10 for ₹100 off your next booking. Limited time offer!"),
            (NotificationType.APPOINTMENT_REMINDER, "Reminder: Tomorrow", "Your appointment is scheduled for tomorrow. Prepare any documents needed."),
            (NotificationType.SYSTEM, "Rate Your Experience", "How was your recent appointment? Leave a review to help others."),
            (NotificationType.SYSTEM, "Achievement Unlocked!", "Congratulations! You've earned the 'Regular' badge for 5 bookings."),
        ]

        all_users = customers + provider_users + [admin_user]
        bulk_notifications = []
        for i in range(50):
            user = random.choice(all_users)
            template = random.choice(notif_templates)
            notif = Notification(
                id=uuid.uuid4(),
                user_id=user.id,
                type=template[0],
                title=template[1],
                message=template[2],
                link=None,
                is_read=random.choice([True, True, False, False, False]),
                created_at=now - timedelta(hours=random.randint(1, 720)),
            )
            bulk_notifications.append(notif)
            db.add(notif)
        await db.flush()
        print(f"  ✓ Created {len(bulk_notifications)} bulk notifications")

        # --- 50 more favorites ---
        bulk_favorites = []
        existing_favs = set()
        # Track already-seeded favorites
        for fav in favorites:
            existing_favs.add((fav.customer_id, fav.provider_id))
        attempts = 0
        while len(bulk_favorites) < 50 and attempts < 200:
            attempts += 1
            customer = random.choice(customers)
            provider = random.choice(providers)
            key = (customer.id, provider.id)
            if key in existing_favs:
                continue
            existing_favs.add(key)
            fav = Favorite(
                id=uuid.uuid4(),
                customer_id=customer.id,
                provider_id=provider.id,
            )
            bulk_favorites.append(fav)
            db.add(fav)
        await db.flush()
        print(f"  ✓ Created {len(bulk_favorites)} bulk favorites")

        # --- 50 more chat messages ---
        chat_texts_customer = [
            "Hi, I have a question about the appointment.",
            "Can I bring someone along?",
            "What should I prepare before coming?",
            "Is parking available at your location?",
            "Can we extend the session by 15 minutes?",
            "I might be 5 minutes late, is that okay?",
            "Do you accept UPI payments?",
            "Thank you for the great session!",
            "Can I get a receipt for insurance purposes?",
            "Looking forward to the appointment!",
        ]
        chat_texts_provider = [
            "Sure, no problem at all!",
            "Yes, please bring your previous reports.",
            "Parking is available in the basement.",
            "We can accommodate that, no worries.",
            "Please try to be on time if possible.",
            "Yes, we accept all digital payments.",
            "You're welcome! See you next time.",
            "I'll send the receipt via email after the session.",
            "Looking forward to helping you!",
            "Please arrive 10 minutes early for paperwork.",
        ]

        # Use confirmed/pending appointments for chat
        chat_eligible = [a for a in bulk_appointments if a.status in (AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING)]
        provider_user_map = {p.id: p.user_id for p in providers}
        bulk_chats = []
        for i in range(min(50, len(chat_eligible) * 2)):
            appt = random.choice(chat_eligible) if chat_eligible else bulk_appointments[0]
            is_customer = random.choice([True, False])
            if is_customer:
                sender_id = appt.customer_id
                content = random.choice(chat_texts_customer)
            else:
                sender_id = provider_user_map.get(appt.provider_id, provider_users[0].id)
                content = random.choice(chat_texts_provider)
            msg = ChatMessage(
                id=uuid.uuid4(),
                appointment_id=appt.id,
                sender_id=sender_id,
                content=content,
                is_read=random.choice([True, True, True, False]),
                created_at=now - timedelta(hours=random.randint(1, 200)),
            )
            bulk_chats.append(msg)
            db.add(msg)
        await db.flush()
        print(f"  ✓ Created {len(bulk_chats)} bulk chat messages")

        # --- 50 more invoices ---
        completed_for_invoices = [a for a in bulk_appointments if a.status == AppointmentStatus.COMPLETED]
        bulk_invoices = []
        for i, appt in enumerate(completed_for_invoices[:50]):
            amount = random.choice([800, 1200, 1500, 2000, 2500, 3000, 3500, 5000])
            gst_amount = round(amount * 0.18, 2)
            total = round(amount + gst_amount, 2)
            invoice = Invoice(
                id=uuid.uuid4(),
                appointment_id=appt.id,
                invoice_number=f"INV-2024-{2001 + i:04d}",
                customer_id=appt.customer_id,
                provider_id=appt.provider_id,
                amount=float(amount),
                gst_rate=18.0,
                gst_amount=gst_amount,
                total_amount=total,
                status=random.choice(["paid", "paid", "paid", "generated"]),
                generated_at=now - timedelta(days=random.randint(1, 25)),
            )
            bulk_invoices.append(invoice)
            db.add(invoice)
        await db.flush()
        print(f"  ✓ Created {len(bulk_invoices)} bulk invoices")

        # --- 50 more comments ---
        comment_texts = [
            "Please confirm the timing.",
            "I'll bring all necessary documents.",
            "Can we discuss the treatment plan?",
            "Thank you for the quick response!",
            "Is there anything I should avoid before the session?",
            "Looking forward to meeting you.",
            "Please note I have an allergy to certain medications.",
            "Can we do a video call instead?",
            "I'll be coming with my spouse for support.",
            "What's the expected duration of the session?",
        ]
        comment_eligible = [a for a in bulk_appointments if a.status in (AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING, AppointmentStatus.COMPLETED)]
        bulk_comments = []
        for i in range(min(50, len(comment_eligible))):
            appt = comment_eligible[i % len(comment_eligible)]
            comment = AppointmentComment(
                id=uuid.uuid4(),
                appointment_id=appt.id,
                user_id=appt.customer_id,
                content=random.choice(comment_texts),
                is_internal=False,
                created_at=now - timedelta(hours=random.randint(1, 300)),
            )
            bulk_comments.append(comment)
            db.add(comment)
        await db.flush()
        print(f"  ✓ Created {len(bulk_comments)} bulk comments")

        # ============================================================
        # Commit all changes
        # ============================================================
        await db.commit()
        print("\n" + "=" * 60)
        print("✅ Database seeded successfully!")
        print("=" * 60)
        print(f"\nSummary:")
        print(f"  • 1 admin user")
        print(f"  • {len(customers)} customer users")
        print(f"  • {len(providers)} service providers")
        print(f"  • {len(categories)} service categories")
        print(f"  • {len(availability_slots)} availability slots")
        print(f"  • {len(appointments) + len(bulk_appointments)} appointments ({len(appointments)} + {len(bulk_appointments)} bulk)")
        print(f"  • {len(reviews) + len(bulk_reviews)} reviews ({len(reviews)} + {len(bulk_reviews)} bulk)")
        print(f"  • {len(notifications) + len(extra_notifications) + len(bulk_notifications)} notifications")
        print(f"  • {len(exceptions)} availability exceptions")
        print(f"  • {len(favorites) + len(bulk_favorites)} favorites")
        print(f"  • {len(comments) + len(bulk_comments)} comments")
        print(f"  • {len(seed_coupons)} coupons")
        print(f"  • {len(loyalty_accounts)} loyalty accounts, {len(loyalty_txns)} transactions")
        print(f"  • {len(waitlist_entries)} waitlist entries")
        print(f"  • {len(chat_messages) + len(bulk_chats)} chat messages")
        print(f"  • {len(seed_invoices) + len(bulk_invoices)} invoices")
        print()
        print_credentials()


def print_credentials():
    """Print all login credentials for testing."""
    print("\n" + "=" * 60)
    print("🔑 LOGIN CREDENTIALS")
    print("=" * 60)
    print("\n--- Admin ---")
    print("  admin@appointly.com / admin123456")
    print("\n--- Customers (password: password123) ---")
    print("  priya.sharma@email.com      - Priya Sharma")
    print("  amit.patel@email.com        - Amit Patel")
    print("  sneha.reddy@email.com       - Sneha Reddy")
    print("  vikram.singh@email.com      - Vikram Singh")
    print("  ananya.iyer@email.com       - Ananya Iyer")
    print("  rohan.gupta@email.com       - Rohan Gupta")
    print("  kavita.nair@email.com       - Kavita Nair")
    print("  arjun.mehta@email.com       - Arjun Mehta")
    print("  deepika.joshi@email.com     - Deepika Joshi")
    print("  sanjay.verma@email.com      - Sanjay Verma")
    print("\n--- Providers (password: password123) ---")
    print("  dr.arun.kapoor@email.com    - Dr. Arun Kapoor (General Medicine, Mumbai, ₹2500/hr)")
    print("  dr.meera.shah@email.com     - Dr. Meera Shah (Dermatology, Delhi, ₹3500/hr)")
    print("  neha.beauty@email.com       - Neha Kapoor (Hair Styling, Bangalore, ₹1500/hr)")
    print("  swami.raghav@email.com      - Swami Raghav (Yoga & Meditation, Hyderabad, ₹800/hr)")
    print("  prof.suresh.iyer@email.com  - Prof. Suresh Iyer (Maths Tutoring, Chennai, ₹1200/hr)")
    print("  manish.tiwari@email.com     - Manish Tiwari (UPSC Coaching, Pune, ₹2000/hr)")
    print("  adv.sunita.desai@email.com  - Adv. Sunita Desai (Property Law, Kolkata, ₹5000/hr)")
    print("  ritu.malhotra@email.com     - Ritu Malhotra (Interior Design, Ahmedabad, ₹3000/hr)")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_database())
