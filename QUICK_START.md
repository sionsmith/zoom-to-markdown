# Quick Start Guide

## What Just Got Built

✅ **Complete Zoom Meeting Notes Archiver** - Production-ready TypeScript application

### Core Features Implemented
- 🔐 Zoom OAuth Server-to-Server authentication
- 📥 Zoom Cloud Recordings API client with pagination
- 📝 VTT/SRT transcript parser
- ✅ Pattern-based action item extraction
- 📄 Markdown generator with YAML frontmatter
- 💾 State management for tracking processed recordings
- 📁 Date-based folder organization (YYYY/MM/DD)
- 🤖 GitHub Actions workflow (runs every 15 minutes)

### Project Structure
```
zoom-meeting-notes/
├── src/                       # TypeScript source code
│   ├── services/             # API clients and state management
│   │   ├── zoom-auth.ts      # OAuth authentication
│   │   ├── zoom-api.ts       # Zoom API client
│   │   └── state-manager.ts  # State persistence
│   ├── parsers/              # Data parsing
│   │   ├── transcript-parser.ts  # VTT/SRT parser
│   │   └── action-items.ts       # Action item extractor
│   ├── generators/           # Output generation
│   │   └── markdown.ts       # Markdown file generator
│   ├── utils/                # Utilities
│   │   ├── config.ts         # Configuration loader
│   │   ├── logger.ts         # GitHub Actions logging
│   │   ├── filesystem.ts     # File operations
│   │   └── sanitize.ts       # String sanitization
│   ├── types/                # TypeScript definitions
│   │   └── index.ts
│   └── index.ts              # Main orchestrator
├── .github/workflows/
│   └── sync-zoom-recordings.yml  # GitHub Actions workflow
├── dist/                     # Compiled JavaScript (built)
├── docs/                     # Documentation
│   └── Meeting Summary Archiver prd.md
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── LICENSE
```

## Next Steps

### 1. Set Up Zoom OAuth App

1. Go to https://marketplace.zoom.us/develop/create
2. Create **Server-to-Server OAuth** app
3. Add scopes:
   - `recording:read:admin` (or `recording:read:meeting`)
   - `user:read:admin` (optional)
4. Copy credentials: Account ID, Client ID, Client Secret
5. **Activate** the app

### 2. Configure GitHub

1. **Initialize git repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Zoom Meeting Notes Archiver"
   ```

2. **Create GitHub repository** and push:
   ```bash
   git remote add origin https://github.com/yourusername/zoom-meeting-notes.git
   git branch -M main
   git push -u origin main
   ```

3. **Add GitHub Secrets**:
   - Go to repository Settings → Secrets and variables → Actions
   - Add secrets:
     - `ZOOM_ACCOUNT_ID`
     - `ZOOM_CLIENT_ID`
     - `ZOOM_CLIENT_SECRET`
     - `ZOOM_USER_ID` (optional, default: "me")

4. **Enable workflow permissions**:
   - Settings → Actions → General → Workflow permissions
   - Select: **Read and write permissions**

### 3. Test Locally (Optional)

```bash
# Create .env file
cp .env.example .env

# Edit .env with your Zoom credentials
nano .env

# Run the sync
npm start
```

### 4. Verify GitHub Actions

1. Go to **Actions** tab in GitHub
2. Workflow will run automatically every 15 minutes
3. Or click **Run workflow** to trigger manually

## Expected Output

Meeting notes will be saved to:
```
meeting-notes/
  2025/
    11/
      13/
        team-standup-abc123def456.md
        q4-planning-xyz789ghi012.md
```

Each file includes:
- YAML frontmatter with metadata
- Participant list
- Extracted action items (with confidence scores)
- Full timestamped transcript

## Troubleshooting

### Build fails
```bash
npm run build
# Check for TypeScript errors
```

### No recordings fetched
- Verify Zoom credentials in `.env` or GitHub Secrets
- Check that Cloud Recording is enabled in Zoom
- Ensure Auto-transcription is enabled
- Check GitHub Actions logs

### Action items not extracted
- Action items use pattern matching (keywords like "TODO", "action item", "will do")
- Accuracy improves with explicit language in meetings
- Check confidence scores in generated markdown

## Testing the Setup

Run a test Zoom meeting:
1. Record a Zoom meeting with Cloud Recording enabled
2. Say phrases like "action item: John to send the report by Friday"
3. End meeting and wait for processing (~5-10 minutes)
4. Wait for next GitHub Action run (every 15 min)
5. Check `meeting-notes/` directory for new file

## Key Configuration

Edit these in `.env` or GitHub Secrets:
- `ENABLE_ACTION_ITEMS=true` - Enable/disable action item extraction
- `MAX_RECORDINGS_PER_RUN=100` - Limit recordings processed per run
- `OUTPUT_DIR=meeting-notes` - Change output directory

## Security Notes

- ✅ OAuth credentials stored in GitHub Secrets
- ✅ No sensitive data logged
- ✅ State file (`.state.json`) tracks processed recordings
- ✅ Idempotent operations (safe to re-run)

## Support

- 📖 Full docs: See [README.md](README.md)
- 📋 PRD: See [docs/Meeting Summary Archiver prd.md](docs/Meeting%20Summary%20Archiver%20prd.md)
- 🐛 Issues: Open GitHub issue
- 💡 Feature requests: Open GitHub discussion

---

**Built with ❤️ - Ready for production use!**
