# Quick Setup Guide - AI Meeting System

## Prerequisites
- Node.js 18+
- MongoDB running
- OpenAI API key

## Installation Steps

### 1. Install Backend Dependencies
```bash
cd server
pnpm install openai @anthropic-ai/sdk
```

### 2. Configure Environment
Add to `server/.env`:
```bash
OPENAI_API_KEY=your-key-here
```

### 3. Register Routes
The meeting routes are already added to `server/src/index.ts`

### 4. Install Frontend Dependencies
```bash
cd ..
pnpm install date-fns
```

### 5. Start Services

Backend:
```bash
cd server
pnpm dev
```

Frontend:
```bash
cd ..
pnpm dev
```

### 6. Access the System
Navigate to: `http://localhost:3000/employee/meetings`

## First Meeting

1. Click "Schedule Meeting"
2. Fill in details:
   - Title: "Test Meeting"
   - Date/Time: Any future time
   - Duration: 30 minutes
   - Type: Video

3. Click "Create Meeting"

4. Start the meeting when ready

5. End meeting - AI processing starts automatically

6. Wait 2-3 minutes for report

## Testing AI Features

### Manual Transcript Test
You can test without audio by providing a transcript:

```bash
curl -X POST http://localhost:5010/api/meetings/:id/process-ai \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "We discussed the Q4 targets. John agreed to finish the documentation by Friday. Sarah will review the code by Wednesday. We need to increase sales by 20%."
  }'
```

Expected result:
- Summary generated
- 2-3 key points extracted
- 2 tasks created for John and Sarah
- Report sent to attendees

## Troubleshooting

### "OpenAI API key not found"
- Check `.env` file exists in `server/` directory
- Ensure `OPENAI_API_KEY=...` is set
- Restart server after adding

### "Failed to transcribe audio"
- Check audio format (WAV, MP3, WebM supported)
- Max file size: 25MB
- Try providing transcript directly instead

### "User not found for email"
- Ensure meeting attendees have accounts
- Check email matches exactly
- AI uses email to find users

### Tasks not created
- Check server logs: `cd server && pnpm dev`
- Verify action items in meeting report
- Ensure users exist with matching emails

## API Testing with Postman/Thunder Client

### 1. Create Meeting
```
POST http://localhost:5010/api/meetings
Headers:
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json
Body:
{
  "title": "Team Sync",
  "scheduled_at": "2025-12-25T10:00:00Z",
  "duration_minutes": 60,
  "meeting_type": "video",
  "attendees": []
}
```

### 2. Get Meetings
```
GET http://localhost:5010/api/meetings
Headers:
  Authorization: Bearer YOUR_TOKEN
```

### 3. Process with AI
```
POST http://localhost:5010/api/meetings/:id/process-ai
Headers:
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json
Body:
{
  "transcript": "Meeting transcript here..."
}
```

### 4. Get Report
```
GET http://localhost:5010/api/meetings/:id/report
Headers:
  Authorization: Bearer YOUR_TOKEN
```

## Next Steps

1. **Add WebRTC** for real video calling
2. **Integrate Calendar** (Google, Outlook)
3. **Add Recording** storage (S3, CloudFlare R2)
4. **Customize AI Prompts** for your needs
5. **Add Webhooks** for external integrations

## Support
- Documentation: `/DOCUMENTATIONS/AI_MEETING_SYSTEM.md`
- Server logs: Check terminal running `pnpm dev`
- Frontend errors: Check browser console

## Production Checklist

Before deploying:
- [ ] Add proper error handling
- [ ] Implement rate limiting for AI calls
- [ ] Set up audio/video storage (S3)
- [ ] Configure email templates
- [ ] Add recording consent UI
- [ ] Implement data retention policy
- [ ] Add GDPR compliance features
- [ ] Set up monitoring/logging
- [ ] Load test AI processing
- [ ] Secure API keys properly
