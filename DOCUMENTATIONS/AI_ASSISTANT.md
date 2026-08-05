# AI Data Assistant (MongoDB + LangChain + OpenRouter)

## What it does

Authenticated users get a **floating chat** (bottom-right) that answers questions about **their company only**:

- Sales: units sold, revenue, top products (by date range)
- Inventory: stock levels, low-stock alerts
- Invoices & quotations
- HR (admin/manager): headcount, leave requests

The assistant uses **LangChain tool calling**: the model chooses tools, each tool runs a **MongoDB query filtered by `org_id` from the JWT** (never from user text).

## Architecture

```
Next.js (AiAssistantChat)
    → POST /api/ai-assistant/chat  (Bearer JWT)
        → AiAssistantService (LangChain + OpenRouter)
            → Tools → Mongoose (org_id scoped)
```

- **Primary data**: MongoDB Atlas (existing `MONGODB_URI`)
- **LLM**: OpenRouter (`OPENROUTER_API_KEY`) — OpenAI-compatible API
- **Orchestration**: LangChain `@langchain/openai` + tools

## Local setup

1. Add to `server/.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_APP_NAME=Elevate HR
```

2. Restart the backend (`cd server && npm run dev`).

3. Log in to admin, employee, or manager UI — open the chat bubble.

## Production / server deploy

Set the same variables in your host environment (Railway, VPS, etc.). Use your public app URL for `OPENROUTER_HTTP_REFERER`.

Recommended models on OpenRouter: `openai/gpt-4o-mini`, `anthropic/claude-3-haiku`, `google/gemini-flash-1.5`.

## Multi-tenant safety

| Control | Implementation |
|--------|----------------|
| Tenant ID | Taken from JWT `org_id` only |
| Tools | Every query includes `{ org_id: ctx.orgId }` |
| HR tools | Blocked for plain `employee` role |
| History | Last 12 turns; no cross-tenant data in prompt |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ai-assistant/status` | Whether API key is configured |
| POST | `/api/ai-assistant/chat` | `{ message, history? }` → `{ answer, toolsUsed? }` |

## Example questions

- How many products did we sell last month?
- What was our total sales revenue this month?
- Which products are low on stock?
- How many invoices did we create last month?
- How many active employees do we have? (admin/HR/manager)

## Files

| Path | Role |
|------|------|
| `server/src/services/aiAssistant/tools.ts` | MongoDB query tools |
| `server/src/services/aiAssistant/aiAssistantService.ts` | LangChain + OpenRouter loop |
| `server/src/routes/aiAssistant.routes.ts` | Routes |
| `components/ai/ai-assistant-chat.tsx` | Floating UI |
| `lib/api.ts` | `aiAssistantApi` |
