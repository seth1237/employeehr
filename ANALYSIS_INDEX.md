# Yes — I understand what you're aiming for now.

You don't want the Sales Representative side to feel like a **form-filling CRM**. You want it to feel like a **sales companion/coach** that actively talks to the rep, notices what's missing, and guides them through the day.

For example, instead of:

> **Sales Planner → Add Activity → Fill 12 fields**

the system should say:

> **"Live Hey Seth 👋 What are you up to today? It's Monday and we haven't filled the planner yet."**

Then it should **conversationally walk the rep through planning the day**.

I would structure the companion around this concept:

### 🧠 Sales Companion

**Morning**

> "Good morning Seth 👋 It's Monday. You have no activities planned for today. Let's get your day organized."

Then:

> **"Who are you planning to visit today?"**

The rep can search/select a client.

Then:

> **"Great. Why are you visiting ABC Hospital?"**

They select:

> Follow-up on quotation

Then:

> **"What are you hoping to achieve?"**

> Get feedback and confirm purchase timeline

Then:

> **"What time are you planning to visit?"**

> 10:30 AM

Then:

> **"Any products you're focusing on?"**

> Hematology Analyzer

Then:

> **"How much do you expect to spend getting there?"**

> KES 800

Then:

> **"Perfect. ABC Hospital is planned for 10:30 AM. Want to add another client?"**

And the system keeps building the day's plan.

---

## The companion should also be proactive

This is where I think your idea becomes much more powerful.

It shouldn't only respond when the salesperson opens the planner.

### Morning

> **"You have 3 visits planned today. Your first is ABC Hospital at 9:30 AM. Ready to start the day?"**

### If planner is empty

> **"Hey Seth 👋 It's Monday and your planner is still empty. You have clients assigned to you that haven't been contacted recently. Want me to help you plan today's visits?"**

### If there are overdue follow-ups

> **"You have 4 follow-ups overdue. Two are high-priority opportunities. Would you like to handle those first?"**

### Before a visit

> **"You're visiting XYZ Medical Centre in 30 minutes. Your last interaction was about a quotation for a patient monitor. Want a quick briefing before you go?"**

### After a visit

> **"How did the visit with XYZ Medical Centre go?"**

Then:

> **"Did you achieve your objective?"**

And based on the answer:

> **"Should I schedule the follow-up for Friday?"**

---

# The companion should understand the salesperson's context

This is important.

The companion shouldn't behave like a generic chatbot.

It should have access to the CRM information that the salesperson is authorized to see:

- Assigned clients
- Previous visits
- Recent calls
- Quotations
- Orders
- Opportunities
- Outstanding follow-ups
- Products discussed
- Sales targets
- Current sales performance
- Planner
- Today's activities
- Upcoming activities

So instead of saying:

> "What would you like to do?"

it can say:

> **"You have three clients needing attention today: ABC Hospital has an outstanding quotation, XYZ Lab hasn't been contacted in 18 days, and MedCare Clinic requested a product demo. Which one would you like to start with?"**

That's a **sales assistant**, not just a chatbot.

---

# I would also give the companion a personality

Something like:

### Name

**Sales Companion**

or

**Sales Copilot**

or something branded specifically for your company.

Its communication should be:

- Friendly
- Short
- Proactive
- Professional
- Encouraging
- Action-oriented

Not:

> "Please complete the required fields in the Sales Planner."

Instead:

> **"Your planner is looking a little empty today 😄 Let's get your first visit in."**

But don't make it too playful. It is still a professional business tool.

---

# The companion can have different moments

### 🌅 Start of Day

**Plan my day**

> "Good morning! Here's what needs your attention today..."

### 📋 Planning

**Build my planner**

> "Who are we visiting?"

### 🚗 Before Visit

**Visit preparation**

> "Here's what you should know before meeting this client."

### 📝 After Visit

**Record outcome**

> "How did it go?"

### 🔔 Follow-up

**Don't forget**

> "You promised to follow up with this client today."

### 📊 End of Day

**Daily review**

> "You planned 5 activities today and completed 4. One follow-up is still pending."

### 📅 End of Week

**Weekly review**

> "You completed 18 of 21 planned activities this week and created 6 opportunities."

---

# And the UI should reflect this

I wouldn't make the companion a tiny chatbot bubble hidden in the corner.

I'd make it a **first-class part of the Sales Representative dashboard**.

For example:

```text
┌──────────────────────────────────────────────────────────┐
│  Good morning, Seth 👋                                   │
│                                                          │
│  Live Sales Companion                                    │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  "It's Monday and your planner is still empty.           │
│   Let's get your day organized."                         │
│                                                          │
│  [ Plan My Day ]       [ Show My Follow-ups ]            │
└──────────────────────────────────────────────────────────┘


        TODAY'S PLAN

  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ 09:30        │ │ 11:30        │ │ 14:00        │
  │ ABC Hospital │ │ XYZ Lab      │ │ MedCare      │
  │ Quotation    │ │ Product Demo │ │ Follow-up    │
  └──────────────┘ └──────────────┘ └──────────────┘


        NEEDS YOUR ATTENTION

  🔴 2 overdue follow-ups
  🟡 3 quotations awaiting response
  🟢 4 clients haven't been contacted recently
```

On mobile, the companion becomes even more prominent:

```text
Good morning Seth 👋

It's Monday.

Your planner is empty today.

Let's fix that.

        [ Plan My Day ]

──────────────

Your priorities

🔴 2 overdue follow-ups

🟡 1 quotation awaiting
response

🟢 3 clients need attention
```

---

## The really powerful part

Eventually, the companion shouldn't just **collect information**.

It should **recommend actions**.

For example:

> **"You have 8 clients assigned to you within 10 km of each other. Would you like me to suggest a route for today's visits?"**

Or:

> **"ABC Hospital hasn't purchased anything in 90 days, but they previously bought hematology reagents. Would you like to add them to today's follow-up list?"**

Or:

> **"You have a quotation worth KES 450,000 that hasn't been followed up for 7 days. I recommend contacting the client today."**

That's where your Sales Planner starts becoming genuinely intelligent.

### The philosophy I'd use is:

**Don't make the salesperson operate the CRM.**

**Make the CRM help the salesperson operate their day.**

That should be the guiding principle for the entire Sales Representative experience.