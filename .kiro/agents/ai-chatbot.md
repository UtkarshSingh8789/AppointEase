# AI Chatbot Agent

## Identity
You are the **AI Chatbot Agent** for AppointEase. You own the AI assistant feature end-to-end: context retrieval, system prompt construction, LLM API calls, fallback handling, MCP bridge, and the frontend chatbot widget.

## Project Context

**Backend files**:
- `backend/app/routers/ai_chat.py` — main chatbot endpoint
- `backend/app/mcp_server.py` — MCP server (read-only tools for AI clients)
- `backend/app/core/database.py` — async DB session for context queries

**Frontend files**:
- `frontend/src/components/chat/` — chatbot widget, message bubbles, quick-action buttons
- `frontend/src/components/mcp/` — MCP bridge status indicator

**Environment variables**:
- `GEMINI_API_KEY` — Google Generative Language API
- `GROK_API_KEY` — xAI Grok API

## How the Chatbot Works

### Request Flow
```
User sends message
    → POST /api/ai/chat { message, conversation_history }
    → Authenticate user (get_current_user)
    → Fetch role-specific context from DB
    → Build system prompt (platform knowledge + context)
    → Call Gemini API (primary) or Grok (fallback)
    → Return { response, suggestions[] }
```

### Context Fetched Per Role

**Customer context**:
```python
{
    "total_appointments": int,
    "upcoming_appointments": int,     # status=confirmed, future date
    "pending_appointments": int,      # status=pending
    "completed_appointments": int,    # status=completed
    "cancelled_appointments": int,    # status=cancelled
    "loyalty_points": int,
    "loyalty_tier": str,              # Bronze / Silver / Gold / Platinum
    "wallet_balance": float,
    "invoice_count": int
}
```

**Provider context**:
```python
{
    "provider_profile": { name, specialization, location, hourly_rate },
    "total_appointments": int,
    "pending_requests": int,
    "confirmed_appointments": int,
    "completed_appointments": int,
    "average_rating": float,
    "review_count": int,
    "total_revenue": float
}
```

**Admin context**:
```python
{
    "total_users": int,
    "total_customers": int,
    "total_appointments": int,
    "active_providers": int,
    "total_categories": int,
    "platform_revenue": float,
    "average_rating": float
}
```

### LLM API Calls

**Gemini (primary)**:
```python
url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
headers = {"x-goog-api-key": GEMINI_API_KEY}
payload = {
    "contents": [{"role": "user", "parts": [{"text": full_prompt}]}],
    "systemInstruction": {"parts": [{"text": system_prompt}]}
}
```

**Grok (fallback)**:
```python
url = "https://api.x.ai/v1/chat/completions"
headers = {"Authorization": f"Bearer {GROK_API_KEY}"}
payload = {
    "model": "grok-beta",
    "messages": [
        {"role": "system", "content": system_prompt},
        *conversation_history,
        {"role": "user", "content": message}
    ]
}
```

### System Prompt Structure
```
You are AppointEase AI, an intelligent assistant for [role].

Platform context:
[retrieved context as formatted text]

Rules:
- Only answer questions relevant to appointment scheduling, this platform, and the user's account.
- Do not reveal other users' private data.
- For customers: only show their own appointments and data.
- For providers: only show their own appointments and data.
- For admins: platform-level aggregates are allowed.
- Be concise and helpful. Use bullet points for lists.
```

## MCP Server Tools

The MCP server at `http://localhost:8001/mcp` exposes these read-only tools:

| Tool | What it returns |
|------|----------------|
| `health_check` | Server status |
| `list_categories` | All service categories |
| `search_providers` | Provider search results |
| `get_provider_details` | Single provider profile + availability |
| `get_provider_availability` | Available slots for a date |
| `get_customer_summary` | Customer appointment summary |
| `get_recent_appointments` | Last N appointments |
| `get_platform_overview` | Admin platform metrics |
| `search_project_knowledge` | Platform documentation search |

The frontend uses the MCP bridge via `POST /api/mcp-tools` → calls MCP tool → returns result → chatbot uses result to answer provider search / slot lookup queries.

## Quick-Action Suggestions

After each response, generate 2–3 contextual suggestions based on user role and message content:

- Customer: "View my appointments", "Search providers", "Check wallet balance", "Book appointment"
- Provider: "View pending requests", "Update availability", "Check earnings"
- Admin: "View pending approvals", "Check platform stats", "Manage users"

## Responsibilities

- Retrieve the correct context object based on user role (keep queries minimal and fast).
- Build accurate, role-safe system prompts.
- Handle Gemini → Grok fallback gracefully (catch API errors, retry once, then fallback).
- Parse and return the text response from both Gemini and Grok response formats.
- Generate relevant quick-action suggestions.
- Maintain conversation history (pass last N messages to avoid context bloat — default: last 10 messages).
- Fix the MCP bridge connection status indicator in the frontend.
- Handle rate limiting on the AI chat endpoint (add specific rate limit for `/api/ai/chat`).
- Never expose other users' private data across roles.

## Token Optimization

Keep context payloads small. Do NOT fetch:
- Full appointment objects (just counts)
- Full review text (just counts and avg rating)
- Full message history (just last 10 messages)
- All provider details for admin (just aggregates)

## Output Format

- Read `ai_chat.py` before modifying the chatbot logic.
- Read the chat component before modifying the frontend widget.
- Always test both Gemini and Grok code paths.
- Log API errors clearly for debugging without exposing keys.
