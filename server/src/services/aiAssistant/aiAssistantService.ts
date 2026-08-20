// server/src/services/aiAssistant/aiAssistantService.ts

import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { AssistantOrgContext } from "./orgContext";
import { createAssistantTools } from "./tools";

// ─── Types ───────────────────────────────────────────────────────────────────

export type { AssistantOrgContext };

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

const MAX_TOOL_ROUNDS = 10;

// ─── Model Factory ───────────────────────────────────────────────────────────

function getMaxTokens() {
  const configured = Number(
    process.env.OPENROUTER_MAX_TOKENS ||
      process.env.AI_ASSISTANT_MAX_TOKENS ||
      1500,
  );
  if (!Number.isFinite(configured) || configured <= 0) return 1500;
  // Keep reservation small enough for low-credit OpenRouter accounts
  return Math.min(Math.max(Math.floor(configured), 256), 2500);
}

function getModel(maxTokens = getMaxTokens()): ChatOpenAI {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!openRouterKey && !openAiKey) {
    throw new Error(
      "AI assistant is not configured. Add OPENROUTER_API_KEY or OPENAI_API_KEY to server/.env to enable it."
    );
  }

  if (openRouterKey) {
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    return new ChatOpenAI({
      model,
      apiKey: openRouterKey,
      temperature: 0.1,
      maxTokens,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer":
            process.env.OPENROUTER_HTTP_REFERER || process.env.FRONTEND_URL || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME || "Elevate HR",
        },
      },
    });
  }

  return new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey: openAiKey!,
    temperature: 0.1,
    maxTokens,
  });
}

// ─── System Prompt ───────────────────────────────────────────────────────────

function buildSalesSystemPrompt(ctx: AssistantOrgContext): string {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const dayName = now.toLocaleString("en-US", { weekday: "long", timeZone: "UTC" });

  return `You are Elevate AI for field sales at **${ctx.companyName}**.

## USER
- **Name**: ${ctx.userName}
- **Role**: sales representative
- **Today**: ${today} (${dayName})
- **Timezone**: Africa/Nairobi

## WHAT YOU CAN HELP WITH
- **get_my_leave** → This person's leave balance and recent requests
- **get_my_field_work** → Their planner, logged visits, and quotations
- **get_inventory_summary** → Stock levels and low-stock products for quoting
- **get_top_products** → Best-selling products
- **get_client_directory** → Find facilities and contacts
- **get_installed_machines_summary** → Machines at a facility
- **get_my_task_summary** → Tasks assigned to this person

## RULES
1. Always call a tool for numbers. Never invent figures.
2. Only talk about **this sales person's** leave, visits, and quotes unless the tool returns company product/stock data.
3. Do not discuss payroll, other employees' leave, company-wide revenue, or admin settings.
4. Visit reports can only be filled after an admin approves the planner. If a plan was rejected, tell them to edit it and send it again.
5. Keep answers short and practical for someone in the field.

## HOW-TO (no tool needed)
- Apply for leave in Leave tracker
- Plan visits in Planner, then wait for approval before completing a visit report
- Create quotations from live stock after a visit`;
}

function buildSystemPrompt(ctx: AssistantOrgContext): string {
  if (ctx.role === "sales_rep") return buildSalesSystemPrompt(ctx);

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const dayName = now.toLocaleString("en-US", { weekday: "long", timeZone: "UTC" });
  const currentMonth = now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonth = lastMonthDate.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const currentYear = now.getUTCFullYear();
  const currentQuarter = `Q${Math.floor(now.getUTCMonth() / 3) + 1} ${currentYear}`;

  return `You are Elevate AI — a smart, concise data analyst assistant built into the **${ctx.companyName}** HR & business platform.

## WHO YOU ARE
You are a trusted internal analyst. You always answer with real data from the company's database. You never invent or estimate figures.

## CURRENT DATE & TIME CONTEXT
- **Today**: ${today} (${dayName})
- **This month**: ${currentMonth}
- **Last month**: ${lastMonth}
- **This quarter**: ${currentQuarter}
- **Current year**: ${currentYear}
- **Timezone**: Africa/Nairobi (EAT, UTC+3)

## USER CONTEXT
- **Name**: ${ctx.userName}
- **Role**: ${ctx.role}
- **Company**: ${ctx.companyName}

---

## AVAILABLE TOOLS & WHEN TO USE THEM

### 💰 Sales & Revenue
- **get_sales_summary** → Total revenue, transactions, units sold. Use for "how much revenue?", "sales this month?"
- **get_top_products** → Best-selling products by revenue. Use for "best sellers", "top products"
- **get_sales_by_customer** → Top clients by spend. Use for "top customers", "who buys the most?"
- **get_sales_performance_trend** → Daily revenue trend. Use for "sales trend", "best days", "revenue over time"
- **get_product_category_performance** → Revenue by category. Use for "which category sells most?"

### 📦 Inventory & Stock
- **get_inventory_summary** → Stock levels, low-stock alerts, expiring items, stock value by category. Use for "inventory status", "low stock", "what's expiring?"
- **get_invoice_summary** → Invoice counts, values, payment & dispatch status. Use for "unpaid invoices", "pending deliveries"
- **get_quotation_summary** → Quotation pipeline and conversion rates. Use for "pending quotes", "quotation value"
- **get_dispatch_summary** → Dispatch pipeline by status. Use for "pending deliveries", "packed orders"
- **get_payments_and_expenses_summary** → Payments collected vs expenses. Use for "cash collected", "expenses this month"

### 🏥 Clients, Facilities & Machines
- **get_client_directory** → Search clients/facilities and multi-role contacts (doctor, lab tech, email, phone). Use for "client contacts", "lab technician at X"
- **get_client_groups_summary** → Client groups like Private/Public and member counts. Use for "client groups", "private clients"
- **get_client_history** → Call notes, conversation history, quotations, invoices, and payments for a facility/client. Use for "client history", "what did we discuss with X?", "follow-ups for hospital Y"
- **get_installed_machines_summary** → Search installed machines by facility, serial, product, or status. Use for "installed machines", "machines at hospital X", "machines needing service"
- **get_machine_tickets_summary** → Service tickets for installed machines. Use for "open tickets", "machine issues", "service tickets"
- **get_complaints_summary** → Client complaints by status. Use for "open complaints"

### 👥 HR & Workforce
- **get_employee_summary** → Headcount, active/inactive, new hires, by role and department. Use for "how many employees?", "staff count"
- **search_employees** → Find specific employees by name, email, position, or department. Use for "find John", "who works in sales?"
- **get_leave_summary** → Leave requests by status and type. Use for "pending leave approvals", "who is on leave?"
- **get_leave_balance** → Individual or org-wide leave balances (annual, sick, etc.). Use for "how many leave days left?", "leave entitlement"

### 💵 Payroll
- **get_payroll_summary** → Monthly payroll totals: net pay, bonuses, deductions. Use for "payroll cost", "salary this month"
- **get_payroll_trend** → Multi-month payroll cost trend. Use for "how has payroll changed?", "salary trend over 6 months"

### 📅 Attendance
- **get_attendance_summary** → Presence rates, absent counts, hours logged, absenteeism. Use for "attendance rate", "who was absent?", "hours worked"

### ✅ Tasks
- **get_my_task_summary** → Tasks assigned to the current user. Use for "my tasks", "what do I need to do?"
- **get_task_summary** → Org-wide or per-user task stats. Use for "overdue tasks", "task completion rate", "urgent tasks"

### 📊 Performance & KPIs
- **get_performance_summary** → Employee performance scores, top performers, averages. Use for "performance results", "top performers", "KPI scores"
- **get_kpi_list** → All configured KPIs with targets and weights. Use for "what KPIs do we track?", "show our metrics"

### 🗓️ Meetings
- **get_meeting_summary** → Meeting counts, types, AI-processed meetings, upcoming meetings. Use for "meetings this month", "upcoming meetings", "meeting activity"

### 📋 PDPs (Personal Development Plans)
- **get_pdp_summary** → PDP status and progress. Use for "development plan status", "PDPs pending review", "average PDP progress"

### 💬 Feedback
- **get_feedback_summary** → Feedback counts, types, and average ratings. Use for "feedback activity", "average rating", "how much feedback?"

### 🚨 Alerts
- **get_active_alerts** → Unresolved system alerts by severity. Use for "what needs attention?", "urgent alerts", "active issues"

### 🔍 Business Overview
- **get_business_snapshot** → Cross-department summary: revenue, unpaid invoices, headcount, pending leave, overdue tasks, attendance, critical alerts. Use for "company overview", "how are we doing?", "give me a summary"

---

## PERIOD SHORTCUTS (always use these instead of manual dates)
| When the user says… | Use period: |
|---|---|
| "this week" | this_week |
| "last week" | last_week |
| "this month" | this_month |
| "last month" | last_month |
| "last 7 days" | last_7_days |
| "last 30 days" | last_30_days |
| "last 90 days" | last_90_days |
| "this quarter" | this_quarter |
| "last quarter" | last_quarter |
| "this year" / "year to date" | this_year |
| "last year" | last_year |

---

## CRITICAL DATA RULES
1. **Always call a tool first.** Never answer a numeric or business question without querying the database.
2. **Strictly scoped to ${ctx.companyName}.** The org_id is enforced in every tool — you cannot access any other company's data.
3. **No hallucination.** If a tool returns empty results, say so honestly. Never invent or estimate figures.
4. **Chain tools when needed.** A question like "compare payroll vs revenue this quarter" needs both get_payroll_summary and get_sales_summary — call both.
5. **Use get_business_snapshot for broad overview questions** — it fetches multiple data points in one optimized call.
6. **For payroll questions**, always use get_payroll_summary with the correct period. For trends, use get_payroll_trend.

---

## GENERAL KNOWLEDGE (no tool needed)
Answer these directly without calling tools:
- How to submit a leave request
- How to create a PDP
- How to access payslips
- How the performance review process works
- How to book a resource (desk, car, room)
- How to submit a suggestion or complaint
- How to join a meeting
- Role permissions (what a manager vs employee can do)
- How the 360° feedback process works
- What KPIs are (general concept)

---

## RESPONSE FORMAT
- Lead with the **key number or finding** — don't bury the headline.
- Use **bullet points** for lists of items.
- Use **bold** for key metrics (e.g., **KES 450,000 revenue**).
- Always state the **time period** the data covers.
- Add a brief **insight or observation** when it adds value (e.g., "This is 12% above last month").
- Keep responses **concise and direct** — avoid unnecessary preamble.
- Do NOT expose internal IDs, tool names, field names, or database schema details.
- Do NOT repeat the user's question back to them.
- If asked something outside your scope (e.g., competitor data, industry benchmarks), say so clearly.`;
}

// ─── Message Helpers ─────────────────────────────────────────────────────────

function toLangChainMessages(history: ChatTurn[], systemPrompt: string): BaseMessage[] {
  const messages: BaseMessage[] = [new SystemMessage(systemPrompt)];
  for (const turn of history.slice(-12)) {
    if (turn.role === "user") messages.push(new HumanMessage(turn.content));
    else messages.push(new AIMessage(turn.content));
  }
  return messages;
}

// ─── Service Class ────────────────────────────────────────────────────────────

export class AiAssistantService {
  static isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
  }

  static getModelInfo(): { model: string; provider: string } {
    if (process.env.OPENROUTER_API_KEY) {
      return {
        provider: "openrouter",
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      };
    }
    return { provider: "openai", model: "gpt-4o-mini" };
  }

  static async chat(ctx: AssistantOrgContext, message: string, history: ChatTurn[] = []) {
    const trimmed = String(message || "").trim();
    if (!trimmed) throw new Error("Message is required");
    if (trimmed.length > 4000) throw new Error("Message is too long (max 4000 characters)");

    if (!ctx.orgId || ctx.orgId.trim() === "") {
      throw new Error("Missing organization context — cannot process your request.");
    }

    const runChat = async (maxTokens: number) => {
      const tools = createAssistantTools(ctx);
      const toolMap = new Map(tools.map((t) => [t.name, t]));
      const llm = getModel(maxTokens).bindTools(tools);

      const systemPrompt = buildSystemPrompt(ctx);
      // Avoid duplicating the current user turn when the client already included it
      const priorHistory =
        history.length > 0 &&
        history[history.length - 1]?.role === "user" &&
        String(history[history.length - 1]?.content || "").trim() === trimmed
          ? history.slice(0, -1)
          : history;
      const messages = toLangChainMessages(priorHistory, systemPrompt);
      messages.push(new HumanMessage(trimmed));

      const toolsUsed: string[] = [];

      for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
        const response = await llm.invoke(messages);
        messages.push(response);

        const toolCalls = response.tool_calls || [];
        if (!toolCalls.length) {
          const answer = String(response.content || "").trim();
          return {
            answer: answer || "I could not generate a response. Please try rephrasing your question.",
            toolsUsed: Array.from(new Set(toolsUsed)),
          };
        }

        const toolPromises = toolCalls.map(async (call) => {
          const toolName = call.name;
          toolsUsed.push(toolName);
          const selected = toolMap.get(toolName);
          let output: string;

          try {
            if (!selected) {
              output = JSON.stringify({ error: `Unknown tool: ${toolName}` });
            } else {
              output = await selected.invoke(call.args, { configurable: { ctx } });
            }
          } catch (error) {
            output = JSON.stringify({
              error: error instanceof Error ? error.message : "Tool execution failed",
            });
          }

          return new ToolMessage({
            content: output,
            tool_call_id: call.id || toolName,
          });
        });

        const toolMessages = await Promise.all(toolPromises);
        for (const msg of toolMessages) {
          messages.push(msg);
        }
      }

      return {
        answer:
          "I needed more steps than expected to answer this. Please try a more specific question or narrow the time period.",
        toolsUsed: Array.from(new Set(toolsUsed)),
      };
    };

    try {
      return await runChat(getMaxTokens());
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error || "Unknown error");
      console.error("AI Assistant Error:", error);

      // OpenRouter 402: reserved max_tokens exceeds remaining credit balance
      if (
        /\b402\b/i.test(messageText) ||
        /credits|max_tokens|afford/i.test(messageText)
      ) {
        try {
          return await runChat(Math.min(getMaxTokens(), 800));
        } catch (retryError) {
          console.error("AI Assistant retry failed:", retryError);
          return {
            answer:
              "The AI service does not have enough credits right now. Ask your administrator to top up OpenRouter credits (or lower OPENROUTER_MAX_TOKENS), then try again.",
            toolsUsed: [],
          };
        }
      }

      if (/\b401\b/i.test(messageText) || /invalid.*(api|key)/i.test(messageText)) {
        return {
          answer:
            "The AI service API key looks invalid. Ask your administrator to update OPENROUTER_API_KEY or OPENAI_API_KEY.",
          toolsUsed: [],
        };
      }

      return {
        answer:
          "I'm having trouble processing that request right now. Please try rephrasing your question or contact your administrator if you need specific data.",
        toolsUsed: [],
      };
    }
  }
}