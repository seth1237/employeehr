# AI Meeting System - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js/React)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  MeetingList     │  │ MeetingInterface │  │  MeetingReport   │      │
│  │                  │  │                  │  │                  │      │
│  │ - Calendar view  │  │ - Video/audio UI │  │ - Tabbed report  │      │
│  │ - Create meeting │  │ - Controls       │  │ - Summary        │      │
│  │ - Status badges  │  │ - Transcript     │  │ - Key points     │      │
│  │ - Export reports │  │ - Recording      │  │ - Action items   │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│           │                     │                      │                 │
└───────────┼─────────────────────┼──────────────────────┼─────────────────┘
            │                     │                      │
            │ API Calls           │ API Calls            │ API Calls
            │                     │                      │
┌───────────▼─────────────────────▼──────────────────────▼─────────────────┐
│                        BACKEND (Express/Node.js)                          │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                      Meeting Routes                                 │  │
│  │  POST   /api/meetings              - Create meeting                │  │
│  │  GET    /api/meetings              - List meetings                 │  │
│  │  PUT    /api/meetings/:id/start    - Start meeting                 │  │
│  │  PUT    /api/meetings/:id/end      - End & process                 │  │
│  │  POST   /api/meetings/:id/process-ai - Process with AI             │  │
│  │  GET    /api/meetings/:id/report   - Get report                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    Meeting Controller                               │  │
│  │                                                                     │  │
│  │  - createMeeting()          - Scheduling logic                     │  │
│  │  - startMeeting()           - Session management                   │  │
│  │  - endMeeting()             - Completion trigger                   │  │
│  │  - processWithAI()          - AI orchestration                     │  │
│  │  - processMeetingWithAIAsync() - Background processing             │  │
│  │  - getMeetingReport()       - Report retrieval                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    AI Meeting Service                               │  │
│  │                                                                     │  │
│  │  ┌──────────────────┐                                              │  │
│  │  │ transcribeAudio()│ ──────► OpenAI Whisper API                   │  │
│  │  └──────────────────┘         (Audio → Text)                       │  │
│  │                                                                     │  │
│  │  ┌──────────────────┐                                              │  │
│  │  │ analyzeMeeting() │ ──────► OpenAI GPT-4 API                     │  │
│  │  └──────────────────┘         (Extract insights)                   │  │
│  │                                                                     │  │
│  │  ┌──────────────────────────┐                                      │  │
│  │  │ generateMeetingReport()  │ ──────► OpenAI GPT-4 API             │  │
│  │  └──────────────────────────┘         (Create HTML)                │  │
│  │                                                                     │  │
│  │  ┌──────────────────────────────┐                                  │  │
│  │  │ createTasksFromActionItems() │ ──────► Task Model               │  │
│  │  └──────────────────────────────┘         (Auto-create)            │  │
│  │                                                                     │  │
│  │  ┌──────────────────────────────────┐                              │  │
│  │  │ sendMeetingReportsToAttendees()  │ ──────► Email Service        │  │
│  │  └──────────────────────────────────┘         (Send reports)       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                         Database (MongoDB)                          │  │
│  │                                                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │  │
│  │  │   Meeting    │  │     Task     │  │     User     │             │  │
│  │  │              │  │              │  │              │             │  │
│  │  │ - transcript │  │ - is_ai_gen  │  │ - email      │             │  │
│  │  │ - summary    │  │ - meeting_id │  │ - name       │             │  │
│  │  │ - key_points │  │ - ai_reminder│  │ - org_id     │             │  │
│  │  │ - actions    │  │ - ai_source  │  │              │             │  │
│  │  │ - ai_status  │  │              │  │              │             │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐   │
│  │  OpenAI Whisper │    │   OpenAI GPT-4  │    │  Email Service   │   │
│  │                 │    │                 │    │                  │   │
│  │ - Transcription │    │ - Analysis      │    │ - SMTP           │   │
│  │ - Multi-lang    │    │ - Summarization │    │ - Templates      │   │
│  │ - High accuracy │    │ - JSON output   │    │ - Attachments    │   │
│  └─────────────────┘    └─────────────────┘    └──────────────────┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Meeting Creation Flow
```
User → [Create Meeting Form] → POST /api/meetings
    → Meeting Controller → MongoDB
    → Send Invitations → Email Service
    → Return meeting ID
```

### 2. Meeting Start Flow
```
User → [Start Meeting Button] → PUT /api/meetings/:id/start
    → Update status to "in-progress"
    → Start recording
    → Enable video/audio streams
```

### 3. Meeting End & AI Processing Flow
```
User → [End Meeting Button] → PUT /api/meetings/:id/end
    ↓
Stop recording → Upload audio → Process with AI
    ↓
┌─────────────────────────────────────────────┐
│  AI Processing Pipeline (Async)             │
│                                              │
│  Step 1: Transcribe Audio                   │
│    Audio file → Whisper API → Text          │
│    Time: 30-90 seconds                       │
│                                              │
│  Step 2: Analyze Transcript                 │
│    Text → GPT-4 → JSON Analysis             │
│    Extract:                                  │
│      - Summary                               │
│      - Key points                            │
│      - Action items                          │
│      - Sentiment                             │
│    Time: 10-30 seconds                       │
│                                              │
│  Step 3: Create Tasks                       │
│    For each action item:                     │
│      - Find user by email                    │
│      - Create task document                  │
│      - Mark as AI reminder                   │
│      - Link to meeting                       │
│    Time: 5-10 seconds                        │
│                                              │
│  Step 4: Generate Report                    │
│    Analysis → GPT-4 → HTML Report           │
│    Time: 10-20 seconds                       │
│                                              │
│  Step 5: Send Reports                       │
│    For each attendee:                        │
│      - Personalize report                    │
│      - Send email                            │
│    Time: 5-10 seconds                        │
│                                              │
│  Total Time: 2-3 minutes                     │
└─────────────────────────────────────────────┘
    ↓
Update meeting status → "completed"
    ↓
Notify frontend → Show report
```

### 4. Report View Flow
```
User → [View Report] → GET /api/meetings/:id/report
    → Meeting Controller → MongoDB
    → Return:
        - Summary
        - Key points
        - Action items (with task IDs)
        - Transcript
        - Processing status
```

## Component Interactions

```
MeetingList Component
    ├─ Displays all meetings
    ├─ Shows AI processing status
    ├─ Triggers meeting creation
    └─ Navigates to interface/report

MeetingInterface Component
    ├─ Manages video/audio streams
    ├─ Controls recording
    ├─ Displays live transcript
    ├─ Triggers AI processing on end
    └─ Shows post-meeting modal

MeetingReport Component
    ├─ Renders analysis results
    ├─ Shows task creation status
    ├─ Displays sentiment
    ├─ Allows transcript download
    └─ Links to created tasks
```

## Security Layers

```
Request Flow with Security:

User Request
    ↓
[Auth Middleware] ─────► Verify JWT token
    ↓
[Org Middleware] ──────► Check organization access
    ↓
[Tenant Isolation] ────► Ensure tenant separation
    ↓
[Rate Limiter] ────────► Prevent abuse
    ↓
[Input Sanitization] ──► Clean input data
    ↓
Controller Logic
    ↓
Database
```

## AI Integration Points

```
┌──────────────────────────────────────────┐
│        OpenAI Integration                │
├──────────────────────────────────────────┤
│                                           │
│  Whisper API (Transcription)             │
│  ├─ Input: Audio file (WAV/MP3/WebM)     │
│  ├─ Output: Text transcript              │
│  ├─ Cost: $0.006/minute                  │
│  └─ Speed: 30-90 seconds                 │
│                                           │
│  GPT-4 API (Analysis)                    │
│  ├─ Input: Transcript text               │
│  ├─ Output: JSON structured data         │
│  ├─ Cost: ~$0.01/meeting                 │
│  └─ Speed: 10-30 seconds                 │
│                                           │
│  GPT-4 API (Report Generation)           │
│  ├─ Input: Analysis + metadata           │
│  ├─ Output: HTML report                  │
│  ├─ Cost: ~$0.005/report                 │
│  └─ Speed: 10-20 seconds                 │
│                                           │
└──────────────────────────────────────────┘
```

## Task Creation Flow

```
Action Items from AI
    ↓
For each action item:
    ↓
Find user by email ──► User Model
    ↓
Create Task ─────────► Task Model
    │                   ├─ title: action description
    │                   ├─ assigned_to: user_id
    │                   ├─ is_ai_generated: true
    │                   ├─ meeting_id: meeting_id
    │                   ├─ is_ai_reminder: true
    │                   ├─ ai_source: "Meeting action item"
    │                   ├─ priority: from AI
    │                   └─ due_date: from AI/default
    ↓
Update Meeting ──────► Add task_id to action_item
    ↓
Send Notification ───► User email/notification
```

This visual representation should help understand how all the pieces fit together!
