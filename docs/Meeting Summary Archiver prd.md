# Product Requirements Document: Zoom Meeting Notes Archiver

## Objective
Build an automated tool that polls the Zoom Cloud Recordings API to retrieve completed meeting recordings with transcripts, formats them as Markdown with extracted metadata and action items, organizes them by date-based folder structure, and commits all updates to a GitHub repository using GitHub Actions.

---

## Functional Requirements

### 1. Polling for Zoom Cloud Recordings
- Poll the Zoom Cloud Recordings API (`GET /users/{userId}/recordings`) periodically (configurable: 5-15 minutes) for new completed recordings.
- Use query parameters: `from` and `to` date range, with `page_size` and `next_page_token` for pagination.
- Track the last successfully processed recording timestamp to avoid duplicates.
- Filter for recordings with `status: "completed"` and transcript availability.
- Authenticate using OAuth 2.0 (Server-to-Server OAuth app recommended).

### 2. Markdown Generation & Processing
- For each completed recording, download the VTT/SRT transcript file (from `recording_files` array where `file_type: "TRANSCRIPT"`).
- Parse transcript to extract:
  - **Meeting metadata**: Topic (title), Start time, Duration, Host, Participants list (from `participant_audio_files` if available)
  - **Full transcript**: Convert VTT/SRT to readable Markdown format with speaker labels and timestamps
  - **AI-extracted insights** (optional enhancement): Use LLM or keyword matching to identify:
    - Action items (phrases like "TODO", "action item", "follow up", etc.)
    - Key decisions
    - Questions raised
- Generate a structured Markdown file with YAML frontmatter for metadata.
- Use a consistent Markdown template for file formatting.

### 3. Folder Organization
- Store Markdown files under a root directory (`/meeting-notes/`).
- Organize by year, month, day based on the recording's `start_time`:
  - `/meeting-notes/2025/11/13/team-standup-98765432.md`
- Filename format: `{sanitized-topic}-{meeting-uuid}.md`
  - `sanitized-topic`: Lowercase, spaces to hyphens, max 50 chars
  - `meeting-uuid`: Zoom's unique meeting UUID for guaranteed uniqueness
- Store recording metadata (download URLs, file sizes) in optional companion `.meta.json` file.

### 4. GitHub Integration (GitHub Actions)
- Implement as a TypeScript/Node.js GitHub Action (using `actions/setup-node`).
- Scheduled workflow runs (e.g., every 15 minutes via `schedule: cron`).
- Each workflow run:
  - Fetches new recordings from Zoom API (using date range since last successful run).
  - Downloads transcript files and generates Markdown.
  - Adds new Markdown files to the repository.
  - Creates git commit with message: `chore: add meeting notes for {date} ({count} meetings)`
  - Pushes to repository using `GITHUB_TOKEN` (auto-provided) or custom PAT.
  - Updates state file (`.github/workflows/state.json`) with last processed timestamp.
- Provides structured logging using GitHub Actions annotations for errors/warnings.
- Implements workflow concurrency control to prevent overlapping runs.

### 5. Error Handling and Edge Cases
- **API Failures**: Exponential backoff retry (3 attempts max) for network/server errors (5xx).
- **Rate Limiting**: Detect 429 responses, respect `Retry-After` header, queue requests.
- **Missing Transcripts**: Skip recordings without transcript files, log warning with meeting UUID.
- **Duplicate Detection**: Use meeting UUID as unique identifier, skip if Markdown file already exists.
- **Partial Failures**: Continue processing remaining recordings if one fails; report summary at end.
- **OAuth Token Expiry**: Detect 401 responses, attempt token refresh before retry.
- **Pagination**: Handle `next_page_token` properly to retrieve all recordings in date range.
- **Recordings Still Processing**: Skip recordings with `status != "completed"`, re-check on next run.
- **Large Transcripts**: Handle transcripts >100MB gracefully (consider truncation or external storage).

---

## Non-functional Requirements

- **Language**: TypeScript with Node.js 20 LTS for maintainability and type safety.
- **Security**:
  - Store Zoom OAuth credentials in GitHub Secrets (`ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_ACCOUNT_ID`).
  - Never log sensitive data (tokens, API keys).
  - Use Server-to-Server OAuth (no user interaction required).
- **Performance**: Process up to 100 recordings per run within 5-minute execution time limit.
- **Reliability**: Idempotent operations (safe to re-run, won't create duplicates).
- **Documentation**:
  - Comprehensive README with setup instructions.
  - Zoom App creation guide.
  - Example Markdown output.
  - Troubleshooting section.
- **Extensibility**: Modular architecture to support additional Zoom features (smart recordings, AI summaries when API becomes available).
- **Monitoring**: GitHub Actions workflow status badges, failure notifications via GitHub Actions.

---

## Output Example

### Folder Structure
```
/meeting-notes/
  2025/
    11/
      13/
        q4-planning-team-abc123def456.md
        q4-planning-team-abc123def456.meta.json
        sales-pipeline-review-xyz789ghi012.md
        sales-pipeline-review-xyz789ghi012.meta.json
```

### Example Markdown File (`q4-planning-team-abc123def456.md`)
```markdown
---
title: "Q4 Planning Team Meeting"
meeting_id: "98765432101"
uuid: "abc123def456"
start_time: "2025-11-13T14:00:00Z"
duration: 3600
host: "jane.doe@company.com"
participants:
  - "Jane Doe"
  - "John Smith"
  - "Alice Johnson"
recording_count: 2
transcript_available: true
---

# Q4 Planning Team Meeting

**Date:** November 13, 2025
**Time:** 2:00 PM - 3:00 PM UTC
**Duration:** 60 minutes
**Host:** jane.doe@company.com

## Participants
- Jane Doe (Host)
- John Smith
- Alice Johnson

## Action Items
> ⚠️ Note: Action items are automatically extracted and may require verification.

- [ ] John to finalize Q4 budget proposal by Nov 20
- [ ] Alice to schedule follow-up with marketing team
- [ ] Jane to send deck to leadership by EOW

## Key Discussion Points
- Q4 revenue targets and projections
- Resource allocation for new projects
- Timeline for product launch

## Full Transcript

**[00:00:15] Jane Doe:**
Good afternoon everyone. Let's get started with our Q4 planning session.

**[00:00:22] John Smith:**
Thanks Jane. I have the budget numbers ready to review...

**[00:15:43] Alice Johnson:**
I think we should prioritize the marketing campaign for the new product launch...

[... transcript continues ...]

---

*This meeting note was automatically generated from Zoom Cloud Recording.*
*Meeting UUID: abc123def456*
```


---

## User Stories

- As an engineer/manager, I can view all historical meeting summaries, organized by date.
- As a compliance team member, I can search and audit meeting records.
- As a developer, I can reuse this workflow for other APIs/platforms.

---

## Success Criteria

- ✅ Completed Zoom recordings with transcripts processed within 30 minutes of completion.
- ✅ Meeting notes organized in date-based folders (`/meeting-notes/YYYY/MM/DD/`) without duplicates.
- ✅ All new meeting notes committed to GitHub automatically with descriptive commit messages.
- ✅ Action items automatically extracted from transcripts with >80% accuracy.
- ✅ Workflow logs all API calls, processing steps, errors, and git operations.
- ✅ Zero data loss: All recordings are processed exactly once (idempotent).
- ✅ Failed runs can be safely retried without creating duplicates.

---

## Technical Implementation Notes

### Zoom API Endpoints Used
- `GET /users/{userId}/recordings` - List all cloud recordings for a user
- `GET /meetings/{meetingId}/recordings` - Get specific meeting recording details
- OAuth 2.0 Server-to-Server authentication

### Zoom Recording Data Structure
```json
{
  "uuid": "abc123def456",
  "id": 98765432101,
  "topic": "Q4 Planning Team Meeting",
  "start_time": "2025-11-13T14:00:00Z",
  "duration": 60,
  "recording_files": [
    {
      "file_type": "TRANSCRIPT",
      "download_url": "https://zoom.us/...",
      "file_extension": "VTT"
    }
  ]
}
```

### Known Limitations
- ⚠️ **AI Companion summaries are NOT available via API** (as of Jan 2025) - feature requested but not implemented
- ⚠️ Recordings must have **Auto-transcription enabled** in Zoom account settings
- ⚠️ Transcript files expire after retention period (configurable in Zoom settings)
- ⚠️ API rate limits: 10 requests/second, adjust polling frequency accordingly

---

## Optional Enhancements (Phase 2)

### AI-Powered Action Item Extraction
Since Zoom AI Companion summaries are not yet available via API, implement local AI processing:

**Option 1: LLM-based (Claude/GPT)**
- Send transcript to Claude API with prompt: "Extract action items, decisions, and questions from this meeting transcript"
- Requires API key and additional cost per meeting
- Higher accuracy (~90-95%)

**Option 2: Rule-based Pattern Matching**
- Regex patterns for keywords: "action item", "TODO", "will do", "responsible for", "by [date]"
- Free, fast, but lower accuracy (~70-80%)
- Good starting point

**Option 3: Hybrid Approach**
- Use pattern matching to identify candidate sentences
- Run only candidates through LLM for classification
- Cost-effective balance of speed and accuracy

### Future: Native AI Companion Integration
- Monitor Zoom Developer Forum for API availability
- When released, replace VTT parsing with native summary API
- Maintain backward compatibility with existing Markdown files

---

## References

- [Zoom Cloud Recordings API Documentation](https://developers.zoom.us/docs/api/meetings/)
- [Zoom OAuth Server-to-Server Guide](https://developers.zoom.us/docs/internal-apps/s2s-oauth/)
- [GitHub Actions Scheduling Documentation](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [VTT/SRT Transcript Format Specification](https://www.w3.org/TR/webvtt1/)
- [Zoom Developer Forum: AI Companion API Request](https://devforum.zoom.us/t/add-api-to-retrieve-meeting-summary-and-other-contents-from-ai-companion/98726)
