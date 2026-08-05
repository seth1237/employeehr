# AI-Powered Meeting System Documentation

## Overview
The Meeting System is a comprehensive solution that provides video/audio calling capabilities within the application, with integrated AI for real-time transcription, analysis, and automated task creation.

## Features

### 1. **Real-Time Meeting Interface**
- Video and audio calling support
- Live participant view
- Screen sharing capabilities
- Meeting controls (mute, video on/off, end call)
- Real-time transcript display

### 2. **AI Transcription**
- Automatic audio-to-text transcription using OpenAI Whisper
- Support for multiple languages
- Real-time or post-meeting transcription
- Transcript storage and searchability

### 3. **AI Analysis**
- Automatic meeting summary generation
- Key points extraction (3-5 main discussion points)
- Sentiment analysis (positive/neutral/negative)
- Topic identification
- Action item detection and extraction

### 4. **Automated Task Creation**
- AI identifies action items from meeting discussions
- Automatically creates tasks for assigned team members
- Tasks marked with `is_ai_reminder` flag
- Links tasks back to source meeting
- Sets priorities based on context
- Suggests due dates from discussion context

### 5. **Meeting Reports**
- Comprehensive HTML reports generated after each meeting
- Sent automatically to all attendees
- Includes:
  - Executive summary
  - Key discussion points
  - Action items with assignments
  - Full transcript
  - Meeting sentiment
  - Attendance tracking

### 6. **Integration Points**
- Seamless integration with existing task management system
- Email notifications for all participants
- Calendar integration
- User management and permissions

---

## Architecture

### Backend Components

#### Models
1. **Meeting Model** (`/server/src/models/Meeting.ts`)
   - Core meeting data structure
   - Attendee tracking with RSVP status
   - AI processing status tracking
   - Transcript and analysis storage
   - Action items with task linkage

2. **Task Model** (Updated)
   - Added AI-specific fields:
     - `is_ai_generated`: Boolean flag for AI-created tasks
     - `meeting_id`: Reference to source meeting
     - `is_ai_reminder`: Special flag for AI reminders
     - `ai_source`: Description of AI source

#### Services
1. **AIMeetingService** (`/server/src/services/aiMeetingService.ts`)
   - **transcribeAudio()**: Converts audio to text using OpenAI Whisper
   - **analyzeMeeting()**: Extracts insights using Claude/GPT
   - **generateMeetingReport()**: Creates HTML reports
   - **createTasksFromActionItems()**: Automated task creation
   - **sendMeetingReportsToAttendees()**: Email distribution

#### Controllers
**MeetingController** (`/server/src/controllers/meetingController.ts`)
- `createMeeting`: Schedule new meetings
- `startMeeting`: Begin a meeting session
- `endMeeting`: End session and trigger AI processing
- `processWithAI`: Async AI analysis pipeline
- `getMeetingReport`: Retrieve processed reports
- `uploadTranscript`: Manual transcript upload
- `getMeetings`: List meetings with filters
- `deleteMeeting`: Remove meetings

#### Routes
**Meeting Routes** (`/server/src/routes/meeting.routes.ts`)
```
POST   /api/meetings                  - Create meeting
GET    /api/meetings                  - List meetings
GET    /api/meetings/upcoming         - Get upcoming meetings
GET    /api/meetings/:id              - Get meeting details
PUT    /api/meetings/:id/start        - Start meeting
PUT    /api/meetings/:id/end          - End meeting
POST   /api/meetings/:id/process-ai   - Process with AI
GET    /api/meetings/:id/report       - Get report
DELETE /api/meetings/:id              - Delete meeting
```

### Frontend Components

#### 1. **MeetingInterface** (`/components/meetings/meeting-interface.tsx`)
- Full-screen meeting UI
- Video/audio controls
- Live transcript display
- Meeting start/end management
- Real-time recording indicator
- Post-meeting report modal

#### 2. **MeetingList** (`/components/meetings/meeting-list.tsx`)
- Meeting calendar/list view
- Create meeting dialog
- Upcoming vs completed meeting sections
- AI processing status indicators
- Report download functionality

#### 3. **MeetingReport** (`/components/meetings/meeting-report.tsx`)
- Tabbed interface for report sections
- Summary, key points, actions, transcript views
- Visual sentiment indicators
- Action item tracking
- Task creation status

---

## Setup Instructions

### 1. Environment Variables
Add to `/server/.env`:

```bash
# AI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Optional: Alternative transcription services
DEEPGRAM_API_KEY=your-deepgram-key
ASSEMBLYAI_API_KEY=your-assemblyai-key
```

### 2. Install Dependencies

Backend:
```bash
cd server
pnpm install openai @anthropic-ai/sdk
```

Frontend:
```bash
cd ..
pnpm install date-fns
```

### 3. Update Server Index
Add meeting routes to your main server file:

```typescript
import meetingRoutes from './routes/meeting.routes'

// Register routes
app.use('/api/meetings', meetingRoutes)
```

### 4. Database Migration
The system uses existing MongoDB models. Ensure your database is running:
```bash
# Meeting and Task collections will be auto-created on first use
```

---

## Usage Guide

### For Organizers

#### Creating a Meeting
1. Navigate to Meetings page
2. Click "Schedule Meeting"
3. Fill in details:
   - Title
   - Description
   - Date & Time
   - Duration
   - Type (video/audio/in-person)
4. Add attendees (automatic invitation emails sent)
5. Submit

#### Starting a Meeting
1. Click "Start Meeting" when ready
2. Allow camera/microphone permissions
3. Participants join via link
4. Recording starts automatically

#### Ending a Meeting
1. Click "End Meeting" button
2. System automatically:
   - Stops recording
   - Uploads audio/transcript
   - Triggers AI processing
   - Sends reports to attendees

### For Attendees

#### Joining a Meeting
1. Receive invitation email
2. Click meeting link
3. Join at scheduled time
4. Accept/decline invitation

#### Post-Meeting
1. Receive AI-generated report via email
2. View assigned action items in Tasks
3. Tasks marked as "AI Reminder"
4. Download full transcript from meeting page

---

## AI Processing Pipeline

### Step-by-Step Flow

1. **Meeting Ends**
   - Recording stops
   - Audio uploaded to server

2. **Transcription** (1-2 minutes)
   - Audio sent to OpenAI Whisper
   - Text transcript generated
   - Transcript saved to database

3. **Analysis** (30-60 seconds)
   - Transcript sent to Claude/GPT
   - Summary generated
   - Key points extracted
   - Action items identified
   - Sentiment analyzed

4. **Task Creation** (5-10 seconds)
   - For each action item:
     - Find assigned user by email
     - Create task with details
     - Link to meeting
     - Set as AI reminder

5. **Report Generation** (10-20 seconds)
   - HTML report created
   - Personalized for each attendee
   - Email sent to all participants

6. **Completion**
   - Meeting status: "completed"
   - Report available in UI
   - Tasks visible in task list

**Total Time:** 2-3 minutes from meeting end to report delivery

---

## API Examples

### Create a Meeting
```typescript
POST /api/meetings
{
  "title": "Q4 Planning",
  "description": "Quarterly planning session",
  "scheduled_at": "2025-12-25T10:00:00Z",
  "duration_minutes": 60,
  "meeting_type": "video",
  "attendees": [
    { "user_id": "user123", "status": "invited" },
    { "user_id": "user456", "status": "invited" }
  ]
}
```

### Process with AI
```typescript
POST /api/meetings/:id/process-ai
{
  "audioUrl": "https://storage/recording.wav",
  "transcript": "Optional pre-transcribed text..."
}
```

### Get Meeting Report
```typescript
GET /api/meetings/:id/report

Response:
{
  "success": true,
  "data": {
    "summary": "The team discussed...",
    "keyPoints": ["Point 1", "Point 2"],
    "actionItems": [
      {
        "description": "Update documentation",
        "assigned_to": "john@example.com",
        "due_date": "2025-12-30",
        "task_id": "task123"
      }
    ],
    "sentiment": "positive",
    "transcript": "Full transcript text..."
  }
}
```

---

## Frontend Integration Example

### Meeting Page Component
```typescript
'use client'

import { useState, useEffect } from 'react'
import { MeetingList } from '@/components/meetings/meeting-list'
import { MeetingInterface } from '@/components/meetings/meeting-interface'
import { MeetingReport } from '@/components/meetings/meeting-report'

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([])
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'meeting' | 'report'

  const fetchMeetings = async () => {
    const res = await fetch('/api/meetings')
    const data = await res.json()
    setMeetings(data.data)
  }

  const createMeeting = async (data) => {
    await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    fetchMeetings()
  }

  const startMeeting = async (id) => {
    await fetch(`/api/meetings/${id}/start`, { method: 'PUT' })
  }

  const endMeeting = async (id, transcript) => {
    await fetch(`/api/meetings/${id}/end`, {
      method: 'PUT',
      body: JSON.stringify({ transcript })
    })
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  return (
    <div>
      {view === 'list' && (
        <MeetingList
          meetings={meetings}
          currentUserId="user123"
          onCreateMeeting={createMeeting}
          onSelectMeeting={(m) => {
            setSelectedMeeting(m)
            setView(m.status === 'completed' ? 'report' : 'meeting')
          }}
          onDownloadReport={async (id) => {
            // Download logic
          }}
        />
      )}
      
      {view === 'meeting' && selectedMeeting && (
        <MeetingInterface
          meeting={selectedMeeting}
          currentUserId="user123"
          onStartMeeting={startMeeting}
          onEndMeeting={endMeeting}
        />
      )}
      
      {view === 'report' && selectedMeeting && (
        <MeetingReport
          title={selectedMeeting.title}
          summary={selectedMeeting.ai_summary}
          keyPoints={selectedMeeting.key_points}
          actionItems={selectedMeeting.action_items}
          transcript={selectedMeeting.transcript}
          processingStatus={selectedMeeting.ai_processing_status}
        />
      )}
    </div>
  )
}
```

---

## Advanced Features

### Custom AI Prompts
Modify the analysis prompt in `AIMeetingService`:

```typescript
const prompt = `You are an expert meeting analyst...
[Customize for your specific needs]
- Focus on technical discussions
- Extract risk factors
- Identify blockers
etc.
`
```

### Alternative Transcription Services

#### Using Deepgram
```typescript
import { Deepgram } from '@deepgram/sdk'

const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY)
const response = await deepgram.transcription.preRecorded({
  url: audioUrl
})
```

#### Using AssemblyAI
```typescript
import { AssemblyAI } from 'assemblyai'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY
})
const transcript = await client.transcripts.create({
  audio_url: audioUrl
})
```

### WebRTC Integration
For real-time calling, integrate a WebRTC solution:

- **Simple:** Daily.co, Twilio Video
- **Custom:** PeerJS, Socket.io + WebRTC
- **Enterprise:** Jitsi, BigBlueButton

---

## Security Considerations

1. **Authentication**
   - All endpoints protected by auth middleware
   - Tenant isolation enforced
   - Only organizers can delete meetings

2. **Data Privacy**
   - Transcripts encrypted at rest
   - GDPR compliance for recordings
   - Option to disable AI processing

3. **API Keys**
   - Store in environment variables
   - Never commit to version control
   - Rotate regularly

4. **Permissions**
   - Role-based access to meetings
   - Recording consent from participants
   - Data retention policies

---

## Troubleshooting

### Common Issues

**AI Processing Stuck**
- Check OpenAI API key validity
- Verify API quota limits
- Check server logs for errors

**Transcription Fails**
- Ensure audio format is supported (WAV, MP3, WebM)
- Check file size limits (< 25MB for Whisper)
- Verify audio quality

**Tasks Not Created**
- Verify user emails match in database
- Check action item format from AI
- Review task creation logs

**Reports Not Sent**
- Check email configuration
- Verify SMTP settings
- Check email service logs

---

## Performance Optimization

1. **Async Processing**
   - All AI operations run asynchronously
   - Non-blocking meeting end flow

2. **Caching**
   - Cache meeting reports
   - Store processed transcripts

3. **Batch Operations**
   - Batch task creation
   - Batch email sending

4. **Rate Limiting**
   - Implement API rate limits
   - Queue large transcription jobs

---

## Roadmap

### Planned Features
- [ ] Real-time collaborative notes
- [ ] Meeting recording playback
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Integration with calendar apps (Google, Outlook)
- [ ] AI meeting summaries via Slack/Teams
- [ ] Voice commands during meetings
- [ ] Automatic meeting minutes formatting
- [ ] Searchable meeting archive
- [ ] Meeting templates for recurring formats

---

## Support

For issues or questions:
- Check logs in `/server/logs`
- Review error messages in UI
- Contact: seth@astermedsupplies.co.ke

---

## License
Proprietary - Elevate HR Platform
