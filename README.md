# AppointEase — Appointment Scheduling Platform

> A production-ready, enterprise-level appointment scheduling platform inspired by Cal.com. Built with React (TypeScript) frontend and FastAPI (Python) backend.

---

## Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Getting Started](#5-getting-started)
6. [External Integrations](#6-external-integrations)
7. [MCP Server](#7-mcp-server)
8. [AI Chatbot](#8-ai-chatbot)
9. [Demo Credentials](#9-demo-credentials)
10. [Bug Fixes & Known Issues](#10-bug-fixes--known-issues)
11. [Platform Enhancements (V2 Roadmap)](#11-platform-enhancements-v2-roadmap)
12. [Usability Fixes](#12-usability-fixes)
13. [Features Overview](#13-features-overview)
14. [Business Rules](#14-business-rules)
15. [API Reference](#15-api-reference)
16. [Database Design](#16-database-design)
17. [Team Division Guide](#17-team-division-guide)
18. [Future Scope](#18-future-scope)
19. [License](#19-license)

---

## 1. What This App Does

AppointEase is a full booking ecosystem — not just a calendar app. It connects customers, service providers, and admins in one platform:

- **Customers** search for providers, book appointments, pay online, track history, earn rewards, and use an AI chatbot.
- **Providers** manage their profile, availability, appointments, reviews, and earnings after admin approval.
- **Admins** approve providers, manage users, monitor the platform, view analytics, and run reports.

---

## 2. Tech Stack

### Frontend
| Tool | Purpose |
|------|---------|
| React 18 + TypeScript | UI and type safety |
| React Router v6 | Client-side routing |
| Zustand | Auth, theme, notification state |
| Tailwind CSS | Responsive utility-first styling |
| Axios | HTTP API calls |
| React Hook Form + Zod | Forms and validation |
| Framer Motion | Animations |
| Lucide React | Icons |
| date-fns / Day.js | Date formatting |
| React Hot Toast | Notifications |

### Backend
| Tool | Purpose |
|------|---------|
| FastAPI (Python 3.11+) | API framework |
| SQLAlchemy ORM | Database layer |
| PostgreSQL | Primary database |
| Alembic | Schema migrations |
| Pydantic v2 | Request/response validation |
| JWT (access + refresh) | Authentication |
| bcrypt | Password hashing |
| Uvicorn | ASGI server |
| Redis | Rate limiting + caching |

### Infrastructure
| Tool | Purpose |
|------|---------|
| Docker + Docker Compose | Containerization |
| Nginx | Reverse proxy |

### External Integrations
| Service | Purpose |
|---------|---------|
| Razorpay | Payments |
| Google OAuth | Social login |
| Google Calendar | Calendar links |
| Gemini 2.5 Flash | Primary AI model |
| Grok (xAI) | Fallback AI model |
| Cloudinary | File uploads |

---

## 3. Architecture

```
Browser / Frontend (React + TypeScript)
        |
        |  Axios API calls
        v
FastAPI Backend
  - authentication
  - booking logic
  - provider logic
  - admin logic
  - AI chatbot
        |
        v
PostgreSQL Database
        |
        +--> Redis (rate limiting, caching)
        +--> Razorpay
        +--> Google OAuth / Google Calendar
        +--> Gemini or Grok AI
        +--> Cloudinary
```

The backend is the source of truth for payment amounts, appointment status, provider approval, cancellation rules, refund logic, and chatbot account data. This prevents the UI from showing incorrect results.

---

## 4. Project Structure

```
appointment-scheduling-platform/
├── frontend/                 # React TypeScript App
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── appointments/
│   │   │   ├── auth/
│   │   │   ├── calendar/
│   │   │   ├── chat/
│   │   │   ├── layout/
│   │   │   ├── mcp/
│   │   │   ├── notifications/
│   │   │   ├── onboarding/
│   │   │   ├── providers/
│   │   │   ├── reviews/
│   │   │   ├── schedule/
│   │   │   ├── search/
│   │   │   └── ui/
│   │   ├── pages/            # Route-level pages
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API service layer
│   │   ├── store/            # Zustand state management
│   │   ├── types/            # TypeScript interfaces
│   │   ├── utils/            # Helper utilities
│   │   └── layouts/          # Layout components
│   ├── Dockerfile
│   └── package.json
├── backend/                  # FastAPI Python App
│   ├── app/
│   │   ├── routers/          # API route handlers
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   ├── core/             # Config, security, database
│   │   ├── middleware/       # Rate limiter, error handler
│   │   └── utils/            # Shared utilities
│   ├── alembic/              # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── .kiro/agents/             # Kiro subagents (token-optimized)
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
└── README.md
```

---

## 5. Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Quick Start (Docker)

```bash
# Start all services
docker-compose up -d --build

# Seed demo data (first run only)
docker exec appointment_backend python seed.py
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| Health Check | http://localhost:8000/health |
| MCP Server | http://localhost:8001/mcp |
| Nginx Proxy | http://localhost |

### Common Commands

```bash
# Stop all services
docker-compose down

# View logs
docker-compose logs -f
docker-compose logs -f backend   # specific service

# Full rebuild
docker-compose down -v
docker system prune -f
docker-compose up --build

# Database shell
docker exec -it appointment_db psql -U postgres -d appointment_db

# Redis CLI
docker exec -it appointment_redis redis-cli
```

### Local Development

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Backend won't start | `docker-compose logs backend` → rebuild if needed |
| Port in use | `lsof -i :8000` then `kill -9 <PID>` |
| DB connection error | `docker-compose down -v && docker-compose up` |
| pgvector error | Set `ENABLE_PGVECTOR=false` in `.env` (uses JSON storage by default) |

---

## 6. External Integrations

The platform runs fully without any API keys. All integrations are optional:

### Email (SMTP)
```bash
# backend/.env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASS=<app-password>
```
Without config, emails are logged to console and the password-reset token is returned in the API response. For testing use [Mailtrap](https://mailtrap.io) (free, 100 emails/month).

### Razorpay Payments
```bash
# backend/.env
RAZORPAY_KEY_ID=rzp_test_<key>
RAZORPAY_KEY_SECRET=<secret>

# frontend/.env
VITE_RAZORPAY_KEY_ID=rzp_test_<key>
```

### Google OAuth
```bash
# backend/.env — add redirect URI http://localhost:8000/api/auth/google/callback in GCP
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
```

### AI Chatbot (Gemini / Grok)
```bash
# backend/.env — Gemini is primary, Grok is fallback
GEMINI_API_KEY=<key>
GROK_API_KEY=<key>
```

### Cloudinary (File Uploads)
```bash
# backend/.env
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
```

---

## 7. MCP Server

The project includes a read-only Model Context Protocol server. It exposes safe tools that give AI clients structured access to live AppointEase data — providers, availability, appointments, and platform metrics — without any write access.

### How MCP is actually used in this project

The MCP server is **not just a demo**. It powers three real workflows:

**1. AI Chatbot provider search and slot lookup**
When a customer asks the AI assistant "Book a doctor in Delhi", the chatbot calls:
- `search_providers` — to find matching verified providers from live DB
- `get_provider_availability` — to fetch real available slots for a date
- `get_customer_summary` — to retrieve the customer's loyalty points and appointment context

The flow: `React chat widget → POST /api/mcp-tools/providers → MCP tool → PostgreSQL → structured response → chatbot reply`

**2. Role-scoped dashboard context**
Every dashboard loads live context via the MCP bridge:
- Customers: `get_customer_summary` for appointment counts, loyalty tier, wallet
- Providers: `get_provider_dashboard` for schedule, revenue, ratings, pending requests  
- Admins: `get_admin_dashboard` for platform totals, top providers, approval queue

**3. MCP Inspector & external AI clients**
External AI agents (Claude, GPT-4 with tools, custom agents) can connect to `http://localhost:8001/mcp` and call tools directly. The tool catalog is discoverable via `list_available_tools`. Role scoping limits which tools each caller can see.

### Available MCP Tools

| Tool | Role | Purpose |
|------|------|---------|
| `health_check` | public | DB connectivity check |
| `list_categories` | public | All active service categories |
| `search_providers` | public | Semantic provider search |
| `get_provider_details` | public | Full provider profile |
| `get_provider_availability` | public | Available slots for a date |
| `search_project_knowledge` | public | Platform docs search |
| `get_customer_summary` | customer | Appointments, loyalty, invoices |
| `get_recent_appointments` | customer/provider | Last N appointments |
| `get_provider_dashboard` | provider | Schedule, revenue, ratings |
| `get_platform_overview` | admin | Platform-wide metrics |
| `get_admin_dashboard` | admin | Top providers, approvals, revenue |
| `admin_search_user` | admin | Find user by name/email |
| `admin_get_user_detail` | admin | Full user detail |

### Run with Docker
```bash
docker-compose up --build mcp
```
MCP endpoint: `http://localhost:8001/mcp`

### Run Locally
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql+asyncpg://postgres:<password>@localhost:5432/appointment_db"
python -m app.mcp_server
```

### Inspect with MCP Inspector
```bash
npx -y @modelcontextprotocol/inspector
# Connect to: http://localhost:8001/mcp
```

### Super Admin Document RAG

Provider onboarding documents are reviewed by super admins via an AI assistant that answers questions grounded in indexed document chunks.

```
POST /api/admin/providers/{provider_id}/document-ai/reindex   — index docs
POST /api/admin/providers/{provider_id}/document-ai/ask       — ask a question
```

The RAG assistant uses a **separate API key** (`GEMINI_RAG_API_KEY`) from the chatbot (`GEMINI_API_KEY`) to prevent document indexing and Q&A from exhausting the chatbot's quota. Falls back to `GEMINI_API_KEY` then `GROK_API_KEY` if not set.

Embeddings are stored as JSON in PostgreSQL by default. Set `ENABLE_PGVECTOR=true` to use a real vector index with a pgvector-enabled Postgres image.

---

## 8. AI Chatbot

The chatbot is a context-augmented AI assistant. It retrieves live user account data from PostgreSQL and combines it with the user's question before sending to an LLM.

### How It Works

1. User sends a message.
2. Backend reads the current logged-in user's role.
3. Backend builds a role-specific context from the database.
4. Backend constructs a system prompt with platform knowledge.
5. Backend sends: user message + conversation history + retrieved context + system prompt to the model.
6. Model returns a reply with role-aware quick-action suggestions.

### Context Fetched Per Role

| Role | Data Retrieved |
|------|---------------|
| Customer | Total/upcoming/pending/completed/cancelled appointments, loyalty points, tier, invoice count |
| Provider | Profile, all appointment counts, avg rating, review count, total revenue |
| Admin | Total users, customers, appointments, active providers, categories, platform revenue, avg rating |

### LLM Configuration

- **Primary**: Gemini 2.5 Flash — `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- **Fallback**: Grok — `https://api.x.ai/v1/chat/completions`

Role security ensures customers cannot access admin data, providers cannot access admin panels, and admins can see everything.

---

## 9. Demo Credentials

Run `backend/seed.py` to create demo users.

### Admin
| Email | Password |
|-------|----------|
| admin@appointly.com | admin123456 |

### Customers (password: `password123`)
| Name | Email |
|------|-------|
| Priya Sharma | priya.sharma@email.com |
| Amit Patel | amit.patel@email.com |
| Sneha Reddy | sneha.reddy@email.com |
| Vikram Singh | vikram.singh@email.com |
| Ananya Iyer | ananya.iyer@email.com |
| Rohan Gupta | rohan.gupta@email.com |
| Kavita Nair | kavita.nair@email.com |
| Arjun Mehta | arjun.mehta@email.com |
| Deepika Joshi | deepika.joshi@email.com |
| Sanjay Verma | sanjay.verma@email.com |

### Providers (password: `password123`)
| Name | Email | Profile |
|------|-------|---------|
| Dr. Arun Kapoor | dr.arun.kapoor@email.com | General Medicine, Mumbai, ₹2500/hr |
| Dr. Meera Shah | dr.meera.shah@email.com | Dermatology, Delhi, ₹3500/hr |
| Neha Kapoor | neha.beauty@email.com | Hair Styling, Bangalore, ₹1500/hr |
| Swami Raghav | swami.raghav@email.com | Yoga & Meditation, Hyderabad, ₹800/hr |
| Prof. Suresh Iyer | prof.suresh.iyer@email.com | Maths Tutoring, Chennai, ₹1200/hr |
| Manish Tiwari | manish.tiwari@email.com | UPSC Coaching, Pune, ₹2000/hr |
| Adv. Sunita Desai | adv.sunita.desai@email.com | Property Law, Kolkata, ₹5000/hr |
| Ritu Malhotra | ritu.malhotra@email.com | Interior Design, Ahmedabad, ₹3000/hr |

Additional generated provider accounts follow pattern `<category>-<specialization>-<number>@providers.appointease.test`, all with password `password123`.

---

## 10. Bug Fixes & Known Issues

### Already Implemented
- [x] Razorpay checkout modal on BookAppointment page
- [x] Payment verification endpoint (`/api/payments/verify`)
- [x] Appointment created after payment success
- [x] OAuth callback tokens stored in localStorage
- [x] Reschedule button on appointment detail page
- [x] Dark mode persistence via localStorage
- [x] Rate limiting on all endpoints via RateLimitMiddleware

### Requires External Config
- [ ] Google OAuth: Add `http://localhost/api/auth/google/callback` to redirect URIs in GCP
- [ ] Microsoft OAuth: Change app to "Multitenant + personal accounts" in Azure Portal
- [ ] Email: Verify SMTP credentials in backend `.env`
- [ ] Gemini API: Monitor quota at https://ai.google.dev (free: 1500 req/day)

### High Priority (Business-Critical)

| # | Area | Issue |
|---|------|-------|
| 1 | Payment | Razorpay modal not opening on BookAppointment |
| 2 | Payment | No payment verification after Razorpay success |
| 3 | Payment | Invoice not auto-generated after payment |
| 4 | Wallet | Wallet balance not deductible during booking |
| 5 | Wallet | Promo code redemption not tracked in wallet |
| 6 | Booking | No email confirmation after booking |
| 7 | Booking | Double-booking possible with simultaneous requests |
| 8 | Provider | New provider gets full access before admin approval |
| 9 | Provider | Cannot set different slot durations per day |
| 10 | Admin | No way to view individual user's full activity |

### Medium Priority (UX & Data Integrity)

| # | Area | Issue |
|---|------|-------|
| 11 | Auth | OAuth callback doesn't store tokens in localStorage |
| 12 | Auth | No "Stay logged in" functionality |
| 13 | Auth | Password reset email not actually sent |
| 14 | Search | No text highlighting in search results |
| 15 | Search | No "Recently Viewed Providers" section |
| 16–20 | Booking/Reviews | Reminders, recurring bookings, review responses |
| 21–30 | Data | Stats mismatches, stale ratings, timezone issues, plain-text chat |

### Low Priority (Performance & Security)

| # | Area | Issue |
|---|------|-------|
| 41–45 | Performance | No lazy load, no image optimization, no service worker, no Redis cache usage, N+1 queries |
| 46–48 | SEO/A11y | Missing meta tags, aria-describedby, low color contrast |
| 49–50 | Security | No rate limit on AI chat, JWT in localStorage instead of httpOnly cookie |

**Sprint order**: Items 1–10 → 11–20 → 21–30 → 31–50

---

## 11. Platform Enhancements (V2 Roadmap)

### Business & Revenue
| # | Enhancement |
|---|-------------|
| 1 | Subscription billing for providers (₹999/month via Razorpay recurring) |
| 2 | Commission model (5–10% platform cut per completed appointment) |
| 3 | Featured provider listings (paid placement) |
| 4 | Cancellation fee policy (charge customers who cancel within 2 hours) |
| 5 | Automated refund workflow when provider cancels |
| 6 | Multi-service providers (multiple services at different rates) |
| 7 | Package deals (5/10-session bundles at discounted rates) |
| 8 | Referral program (₹100 credit per referred user who books) |
| 9 | Provider analytics dashboard (conversion rate, peak hours, revenue trends) |
| 10 | Dynamic pricing (peak/off-peak rates per time slot) |

### Customer Experience
| # | Enhancement |
|---|-------------|
| 11 | Appointment reminders — push + email 24h and 1h before |
| 12 | Recurring bookings (weekly/monthly in one click) |
| 13 | Instant booking (auto-confirm for verified providers) |
| 14 | Provider comparison (side-by-side rate, rating, availability) |
| 15 | Booking history export (PDF/CSV) |
| 16 | Smart recommendations (ML-based on booking history) |
| 17 | Real-time chat (live messaging before/after booking) |
| 18 | Video consultation (integrated video calls) |
| 19 | Multi-language support (Hindi, Tamil, Telugu, Bengali) |
| 20 | WCAG 2.1 AA compliance |

### Provider Experience
| # | Enhancement |
|---|-------------|
| 21 | Staff management (multiple staff, individual calendars) |
| 22 | Auto-accept rules (conditions to auto-confirm bookings) |
| 23 | Buffer time between appointments (15–30 min gap) |
| 24 | Service duration flexibility (30/45/60 min per service) |
| 25 | Client notes (private notes on customers) |
| 26 | No-show tracking (flag repeat offenders) |
| 27 | Bulk availability update (set entire month at once) |
| 28 | Holiday calendar integration (auto-block national holidays) |
| 29 | Revenue reports with GST breakdown for tax filing |
| 30 | Auto-send review request 24h after completed appointment |

### Admin & Operations
| # | Enhancement |
|---|-------------|
| 31 | Provider verification workflow with document review |
| 32 | Dispute resolution (customer raises dispute, admin mediates) |
| 33 | Platform-wide search across all entities |
| 34 | Automated weekly email digest to admin |
| 35 | Fraud detection (flag mass cancellations, fake reviews) |
| 36 | Content moderation (auto-flag inappropriate reviews) |
| 37 | SLA monitoring (track provider response times) |
| 38 | Bulk user actions (select multiple users for bulk operations) |
| 39 | Custom email templates from dashboard |
| 40 | System health dashboard (API response times, error rates, uptime) |

### Technical & Security
| # | Enhancement |
|---|-------------|
| 41 | JWT in httpOnly cookies (move from localStorage — XSS protection) |
| 42 | Two-factor authentication (OTP via SMS/email) |
| 43 | API versioning (`/api/v1/` prefix) |
| 44 | Proper Alembic migration files for all schema changes |
| 45 | Automated unit tests for critical flows |
| 46 | CDN for static assets (CloudFront/Cloudflare) |
| 47 | WebSocket notifications (real-time push, replace polling) |
| 48 | Database connection pooling optimization |
| 49 | Structured JSON logs with request tracing (correlation IDs) |
| 50 | CI/CD pipeline (GitHub Actions) |

**Implementation timeline**:
- Week 1–2: Items 11, 13, 23, 24, 31
- Week 3–4: Items 1, 2, 5, 12, 30
- Month 2: Items 41, 42, 44, 45, 50
- Month 3: Items 16, 17, 18, 21, 47

---

## 12. Usability Fixes

These are polish-only improvements to existing features — no new APIs or schema changes needed. Estimated effort: 1–4 hours each.

### UI/UX Polish (1–15)
| # | Fix | Page |
|---|-----|------|
| 1 | Loading shimmer on provider cards | Find Providers |
| 2 | "No slots available" message | Book Appointment |
| 3 | "Clear all filters" button | Find Providers |
| 4 | Appointment count badge on sidebar link | Customer Sidebar |
| 5 | Hover tooltip on truncated provider names | Provider Cards |
| 6 | Provider's next available date on card | Find Providers |
| 7 | Confirmation toast for favorites add/remove | Favorites |
| 8 | "You" label on own messages in comments | Appointment Detail |
| 9 | Pull-to-refresh on mobile appointment lists | My Appointments |
| 10 | Time elapsed since notification ("2h ago") | Notifications |
| 11 | Keyboard shortcut hint (Cmd+K) near search | Header |
| 12 | Total count in "My Appointments" header | My Appointments |
| 13 | Animation on appointment status change | Appointment Detail |
| 14 | Provider response time on profile | Provider Detail |
| 15 | "Copy appointment ID" button | Appointment Detail |

### Data Display & Consistency (16–30)
| # | Fix | Page |
|---|-----|------|
| 16 | Consistent date format "Jun 4, 2026" | All pages |
| 17 | "Today" / "Tomorrow" / "Yesterday" for recent dates | Appointments |
| 18 | Appointment duration alongside time slot | Booking & Detail |
| 19 | Provider's total completed appointments | Provider Detail |
| 20 | "Member since [date]" on profiles | Profile |
| 21 | Loyalty tier progress bar | Customer Dashboard |
| 22 | Invoice download status | Invoices |
| 23 | "Last active" timestamp for providers | Admin Users |
| 24 | Appointment notes in provider request list | Provider Requests |
| 25 | Cancellation reason in appointment list | My Appointments |
| 26 | Provider's working hours on profile | Provider Detail |
| 27 | "X people viewing" for popular providers | Provider Detail |
| 28 | Total savings from coupons in wallet | Wallet |
| 29 | Appointment history count on provider cards | Find Providers |
| 30 | Provider review response rate | Provider Detail |

### Form & Input (31–40)
| # | Fix | Page |
|---|-----|------|
| 31 | Auto-focus first input on all forms | All forms |
| 32 | Password strength indicator | Register |
| 33 | "Show password" toggle on register | Register |
| 34 | Real-time phone number format validation | Profile/Register |
| 35 | Pre-fill booking notes with common templates | Book Appointment |
| 36 | Character count on text areas | Booking, Reviews |
| 37 | Human-readable date below date picker | Book Appointment |
| 38 | Disable past time slots for today | Book Appointment |
| 39 | "Select all" / "Deselect all" for availability days | Availability |
| 40 | Inline form validation (not just on submit) | All forms |

### Navigation & Flow (41–50)
| # | Fix | Page |
|---|-----|------|
| 41 | Breadcrumb "Back to [page]" on detail pages | All detail pages |
| 42 | Restore scroll position on back navigation | Provider Listings |
| 43 | "Book again" on completed appointment | Appointment Detail |
| 44 | "You have X pending requests" banner | Provider Dashboard |
| 45 | Quick-action buttons on appointment cards | My Appointments |
| 46 | Navigate to appointment on notification click | Notifications |
| 47 | "View all" links on dashboard sections | Customer Dashboard |
| 48 | Empty state with action for providers with no availability | Provider Availability |
| 49 | "Share profile" button on provider detail | Provider Detail |
| 50 | Redirect authenticated users from login/register to dashboard | Login/Register |

---

## 13. Features Overview

### Authentication & Authorization
- JWT authentication with access/refresh tokens
- Role-based access control: Customer, Provider, Admin
- Google OAuth social login
- Secure bcrypt password hashing

### Customer Features
- Browse and filter service providers by category, location, availability
- Book appointments with real-time slot availability
- Pay via Razorpay; wallet refund on cancellation
- Reschedule or cancel with fee logic
- Appointment history, reviews, favorites
- Loyalty points, rewards, achievements
- Coupons and wallet management
- AI chatbot for help and navigation

### Service Provider Features
- Onboarding with admin approval flow
- Profile with specialization, bio, and documents
- Configurable availability (daily/weekly)
- Accept/manage appointment requests
- Daily and weekly schedule views
- Revenue and rating analytics

### Admin Features
- User and provider management (activate/deactivate)
- Provider approval/rejection workflow
- Platform-wide appointment monitoring
- Service category management
- Analytics dashboard with charts
- Audit log for all admin actions
- Broadcast notifications to users

### Scheduling Engine
- Real-time availability checking
- Double-booking prevention
- Configurable slot durations
- Buffer time support
- Availability exception dates

---

## 14. Business Rules

- Booking is paid — appointments are confirmed only after successful payment.
- Prices are calculated in the backend (base + GST − loyalty/coupon discounts).
- Provider access requires admin approval.
- Provider cancellation → full refund to customer wallet.
- Customer cancellation → ₹50 fee deducted, remainder refunded to wallet.
- Rescheduling is blocked after completion or cancellation.
- Completed appointments unlock reviews and loyalty points.
- Loyalty points are revoked if appointment is cancelled post-completion.

---

## 15. API Reference

Full interactive docs: http://localhost:8000/docs

Key API groups:

| Group | Endpoints |
|-------|-----------|
| Auth | register, login, refresh token, profile, Google OAuth |
| Customers | list providers, view provider, book, reschedule, cancel, appointments, reviews, favorites, wallet, invoices |
| Providers | create profile, manage availability, view appointments, update profile, earnings, schedule |
| Admin | list/activate/deactivate users, provider approvals, categories, appointments, reports, audit logs, broadcasts |
| AI | send message, role-aware response with suggestions |
| Payments | Razorpay order, verify payment, handle refund |

---

## 16. Database Design

The database stores: users, provider profiles, availability schedules, appointments, notifications, reviews, invoices, loyalty accounts, achievements, favorites, coupons, waitlist entries, audit logs, and payment records.

Every booking and refund is tied back to stored records, ensuring accurate history, payment tracking, refund calculation, and admin reporting.

---

## 17. Team Division Guide

### Member 1 — Auth, Landing, Customer Booking
- Login, registration, Google OAuth, protected routes
- Customer dashboard, provider browsing, booking flow
- **Demo**: Register → search provider → book appointment → show payment

### Member 2 — Provider Module & Scheduling
- Provider onboarding, pending approval page
- Availability management, schedule calendar, provider appointments
- **Demo**: Register as provider → pending approval → dashboard → availability

### Member 3 — Admin Panel, Analytics, User Control
- Admin dashboard, user management, provider approvals
- Categories, appointments, reports, audit logs, broadcasts
- **Demo**: Admin dashboard → user management → approve provider → reports

### Member 4 — AI Chatbot, Payments, Wallet, Rewards, Notifications
- AI chatbot, Razorpay payment flow, refund logic
- Wallet, loyalty points, achievements, notifications, invoices
- **Demo**: Ask chatbot → wallet/rewards → invoice → notification panel

---

## 18. Future Scope

- Vector search for chatbot (pgvector + embeddings)
- Advanced AI memory across sessions
- Push notifications (mobile/web)
- Mobile app (React Native)
- Video meeting integration
- Smarter recommendation engine
- Richer provider verification checks
- Analytics exports (PDF/CSV)
- CI/CD and automated testing coverage

---

## 19. License

MIT
