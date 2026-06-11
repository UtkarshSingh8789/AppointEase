# AppointEase — 50 Bugs & Improvements

> Identified from a senior engineer perspective across frontend, backend, security, UX, and data integrity. Prioritized by impact.

---

## Critical — Fix These First

| # | Area | Issue | File(s) |
|---|------|-------|---------|
| 1 | Auth | After Google/Microsoft OAuth redirect, the dashboard shows a blank page because the callback page does not reload after storing tokens in localStorage. The auth store is not re-hydrated. | `LoginPage.tsx`, auth store |
| 2 | Booking | The redeem points input field displays `0` as a static value even when the user has no points. It should show an empty string when the value is zero so the field looks clean. | `BookAppointment.tsx` |
| 3 | Booking | When a customer selects a date or time slot, the page does not scroll down to the next visible action (time picker or notes section). User misses what to do next. | `BookAppointment.tsx` |
| 4 | Admin | The User Management page shows an "Approve" button for pending providers but no "Reject" button alongside it. Admin cannot reject without going to Provider Approvals. | `UserManagement.tsx` |
| 5 | RAG | The chatbot AI (`ai_chat.py`) and the document RAG (`provider_document_rag_service.py`) both call the same Gemini API key with no rate separation. Heavy document indexing or Q&A exhausts the quota for the chatbot and vice versa. | `ai_chat.py`, `provider_document_rag_service.py` |
| 6 | Backend | `KNOWLEDGE_FILES` in `ai_chat_service.py` still references `PROJECT-PRESENTATION-DOC.md` which no longer exists (was merged into README). The file path resolves to nothing at startup. | `ai_chat_service.py` |

---

## High Priority

| # | Area | Issue | File(s) |
|---|------|-------|---------|
| 7 | MCP | MCP tool scope lists (`CUSTOMER_TOOLS`, `ADMIN_TOOLS`) exist but are never enforced. Any client knowing the tool name can call `get_platform_overview` without being an admin. | `mcp_server.py` |
| 8 | Provider Onboarding | The document/license upload step is a generic file picker. There is no dropdown to select a document type (e.g. Medical License, Bar Council Certificate) specific to the provider's chosen category. | `ProviderOnboarding.tsx` |
| 9 | Provider Onboarding | There is no proof-of-identity section (Aadhaar, PAN, Passport, etc.) in the onboarding form. Providers can be approved without any ID verification. | `ProviderOnboarding.tsx` |
| 10 | Profile | All users have the same generic avatar. There is no way to select a cartoon/illustrated avatar. The profile page has no avatar selection UI. | `Profile.tsx` |
| 11 | Admin | The Provider Approvals page has overlapping detail sections — submitted details and provider details cards render the same fields (specialization, category, experience, rate) twice in the same expanded view. | `ProviderApprovals.tsx` |
| 12 | Admin | The Provider Approvals page layout is hard to read: the RAG assistant box appears mid-card before the approve/reject controls. The approve/reject panel and the RAG box should be visually separated with clear section headings. | `ProviderApprovals.tsx` |
| 13 | Backend | `ai_chat_service.py` `KNOWLEDGE_FILES` uses `lru_cache(maxsize=1)` to load chunks. These are recomputed on every server restart and loaded into process memory. No persistence across restarts. | `ai_chat_service.py` |
| 14 | MCP | `search_providers` in `mcp_server.py` fetches all verified providers before filtering. At 165+ providers this loads everything into Python memory. DB-level filtering is not applied. | `mcp_server.py` |
| 15 | Backend | `ProviderDocumentRAGService` loads the sentence-transformer model in a module-level `_EMBEDDER = None` singleton. If two requests arrive before the model finishes loading, it can be initialized twice. | `provider_document_rag_service.py` |

---

## Medium Priority — UX & Data

| # | Area | Issue | File(s) |
|---|------|-------|---------|
| 16 | Booking | The `Continue to Confirmation` button at step 2 (Details) is at the bottom of the card but may be below the fold on mobile. User does not notice it. | `BookAppointment.tsx` |
| 17 | Booking | The `pointsToRedeem` state is initialized to `0` (integer) but the input `onChange` uses `Number(e.target.value \|\| 0)`. If the user clears the field, the value snaps to `0` immediately instead of allowing the empty string. | `BookAppointment.tsx` |
| 18 | Availability | `AvailabilityService.get_available_slots` is called inside the MCP server directly. If the DB is slow, the MCP request blocks. No timeout or fallback. | `mcp_server.py`, `availability_service.py` |
| 19 | Search | Provider search in MCP (`search_providers`) and in the chatbot (`AIChatRetrievalService.search_providers`) are two separate implementations with different scoring logic. Results differ for the same query. Should share one implementation. | `mcp_server.py`, `ai_chat_service.py` |
| 20 | Admin | `get_reports()` in `admin.py` calculates monthly data by subtracting `i * 30` days from today, which is inaccurate for months with different lengths. Month-boundary queries will miss or double-count records. | `admin.py` |
| 21 | Backend | `ProviderDocumentRAGService.reindex_provider` deletes all existing chunks before re-indexing. If re-indexing fails mid-way, the provider has zero chunks and the admin gets no warning. | `provider_document_rag_service.py` |
| 22 | Backend | `_chunk_text` in `provider_document_rag_service.py` always uses `max_chars=1100, overlap=180` regardless of document type. A one-page certificate is chunked the same way as a 10-page resume. | `provider_document_rag_service.py` |
| 23 | Backend | `AIChatRetrievalService.is_booking_intent` uses exact token matching over ~5 hardcoded phrases. It misses natural phrasing like "set up a consultation", "I'd like to see a doctor", "get an appointment". | `ai_chat_service.py` |
| 24 | Performance | `_get_user_context()` in `ai_chat.py` runs 6–9 separate `SELECT COUNT` queries sequentially. All counts for a single user's context could be batched into one query per status using `GROUP BY`. | `ai_chat.py` |
| 25 | Security | JWT access tokens are stored in `localStorage` which is accessible to any JavaScript on the page (XSS risk). The `REFRESH_TOKEN_EXPIRE_DAYS=7` refresh token is also in localStorage. Should be in httpOnly cookies. | Auth store, `auth.py` |

---

## Medium Priority — Missing Validations

| # | Area | Issue | File(s) |
|---|------|-------|---------|
| 26 | Forms | There is no input validation on phone number fields (any string is accepted). Backend receives and stores malformed phone numbers. | `RegisterPage.tsx`, `Profile.tsx` |
| 27 | Forms | The onboarding `hourly_rate` field accepts negative values in the frontend (only `min={0}` on the backend schema). A provider can submit `rate = -100`. | `ProviderOnboarding.tsx` |
| 28 | Forms | Review comment text area has no minimum length validation. Empty or single-character reviews can be submitted. | Review form |
| 29 | Backend | `create_appointment` does not validate that `appointment_date` is in the future. A customer can book a date in the past (today minus one year). | `appointments.py` |
| 30 | Backend | `cancel_appointment` does not validate that the appointment being cancelled belongs to the requesting customer. An `is_owner` check is needed. | `appointments.py` |

---

## Low Priority — Polish & Performance

| # | Area | Issue | File(s) |
|---|------|-------|---------|
| 31 | UI | `UserManagement.tsx` hardcodes dark mode only for some elements. `text-gray-900` class used without `dark:text-gray-100` counterpart on several elements. | `UserManagement.tsx` |
| 32 | UI | `ProviderApprovals.tsx` has a duplicate `dark:text-gray-100` and `dark:bg-gray-800` on the Card but the inner confirmation section uses hardcoded `bg-white`. Breaks dark mode. | `ProviderApprovals.tsx` |
| 33 | Performance | `_load_knowledge_chunks` in `ai_chat_service.py` uses `@lru_cache(maxsize=1)`. If README is updated while the server is running, the cache never refreshes. Should use a file-hash-based cache key. | `ai_chat_service.py` |
| 34 | Performance | `list_pending_providers` in `admin.py` calls `get_pending_providers()` which returns full provider data including all documents. At scale, sending all document metadata on every admin page load is wasteful. | `admin.py`, `admin_service.py` |
| 35 | UI | The `BookAppointment` page shows all four steps always visible (Date, Time, Details, Confirm) even before completing earlier steps. There is no visual lock/disabled state on steps 2–3 when step 1 isn't done. | `BookAppointment.tsx` |
| 36 | Backend | `broadcast_notification` in `admin.py` loops over users and calls `create_notification` one by one. For 1000+ users this is extremely slow. Should use a bulk insert. | `admin.py` |
| 37 | Backend | `get_reports` in `admin.py` has a duplicate `from app.models.invoice import Invoice` import inside the function body (already imported at the top of the file). | `admin.py` |
| 38 | Backend | `ai_chat.py` has no rate limit applied to `POST /api/ai-chat`. The global RateLimitMiddleware may not be tight enough for an endpoint that calls external paid APIs. AI quota exhaustion is a real risk. | `ai_chat.py`, `rate_limiter.py` |
| 39 | Backend | `_generate_llm_reply` in `ai_chat.py` raises a bare `HTTPException(503)` when neither Gemini nor Grok is configured, instead of gracefully falling back to retrieval-only mode. | `ai_chat.py` |
| 40 | DB | There are no DB-level unique constraints on `(provider_id, appointment_date, start_time)` in the appointments table. The double-booking prevention is only in application logic. A concurrent request can bypass it. | `appointment.py` model, Alembic migration needed |

---

## Low Priority — SEO, A11y, DX

| # | Area | Issue | File(s) |
|---|------|-------|---------|
| 41 | A11y | Icon-only buttons (close, expand, minimize) in the Provider Approvals card have no `aria-label`. Screen readers will announce "button" with no context. | `ProviderApprovals.tsx` |
| 42 | A11y | The `TimeSlotPicker` renders slots as `<button>` elements without `aria-pressed` or `aria-selected` to communicate the selected state to screen readers. | `TimeSlotPicker` component |
| 43 | DX | `BookAppointment.tsx` contains inline Razorpay window type cast `(window as any).Razorpay`. Should be extracted to a typed helper `getWindowRazorpay()` with a proper type declaration. | `BookAppointment.tsx` |
| 44 | DX | `ai_chat.py` imports `re` inside the function body of `classify_intent()` instead of at the module top level. | `ai_chat.py` |
| 45 | DX | `admin.py` `get_reports()` is a 100-line function doing 8+ DB queries inline. Should be extracted to `AdminService.get_reports()` to maintain the service-layer pattern used elsewhere. | `admin.py` |
| 46 | SEO | The `LandingPage.tsx` has no `<meta>` tags for description, og:title, or og:image. Social sharing shows a blank preview. | `LandingPage.tsx` |
| 47 | Config | `ENABLE_PGVECTOR=false` is the default in `.env.example`. Every fresh deployment silently uses slow linear scan instead of the vector index. Default should be `true` with a clear note. | `.env.example` |
| 48 | Config | `KNOWLEDGE_FILES` tuple in `ai_chat_service.py` still has the path for `PROJECT-PRESENTATION-DOC.md` which was merged into README. Silently skipped (file doesn't exist), but still clutters logs. | `ai_chat_service.py` |
| 49 | Docker | `docker-compose.yml` does not specify healthchecks for the `backend` or `db` services. The `mcp` and `frontend` containers can start before the DB is ready, causing startup errors. | `docker-compose.yml` |
| 50 | Tests | There are zero automated tests in the project. No `pytest` tests for critical flows: payment verification, double-booking prevention, provider approval, loyalty point deduction. A single broken migration can silently break these. | `backend/tests/` (missing) |

---

## Sprint Order

**Sprint 1**: #1 (OAuth blank page), #2 (points field 0), #3 (booking scroll), #4 (reject button), #5 (RAG/chat API split), #6 (missing knowledge file)

**Sprint 2**: #7 (MCP enforcement), #8 (document type dropdown), #9 (identity proof), #10 (avatar picker), #11/#12 (approval page layout), #25 (JWT security)

**Sprint 3**: #26–#30 (input validations), #29 (past date booking), #38 (AI rate limit), #40 (DB unique constraint)

**Sprint 4**: #41–#50 (polish, a11y, DX, tests)
