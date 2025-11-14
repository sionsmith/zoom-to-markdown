# Zoom Meeting Notes Archiver

Automated tool to archive Zoom AI Companion meeting summaries as Markdown files in GitHub. Runs on GitHub Actions to fetch all your meetings, sync AI-generated summaries with action items, and commit meeting notes to your repository.

## Features

- 🤖 **AI Companion Summaries**: Uses Zoom AI Companion meeting summaries (not just transcripts!)
- 🔄 **Automated Polling**: GitHub Actions runs every 15 minutes to fetch new meetings
- 📝 **Markdown Generation**: Converts AI summaries to beautifully formatted Markdown
- ✅ **Action Item Extraction**: Automatically extracts next steps from AI summaries
- 📁 **Date-Based Organization**: Files organized in `YYYY/MM/DD/` folder structure
- 🔒 **Secure**: Uses OAuth 2.0 Server-to-Server authentication
- 🚀 **Idempotent**: Safe to re-run, prevents duplicates
- 📊 **State Management**: Tracks processed meetings to avoid re-processing
- 📅 **Historical Sync**: Fetches all meetings from beginning of 2025 onwards

## Output Example

Meeting notes are saved as:
```
meeting-notes/
  2025/
    11/
      13/
        q4-planning-team-abc123def456.md
```

Each Markdown file includes:
- YAML frontmatter with metadata
- Participant list
- Automatically extracted action items
- Full timestamped transcript

See [example output](docs/Meeting%20Summary%20Archiver%20prd.md#output-example) for more details.

## Prerequisites

- **Zoom Account** with Cloud Recording enabled
- **GitHub Repository** to store meeting notes
- **Node.js 20+** for local development (optional)

## Setup Instructions

### 1. Create Zoom Server-to-Server OAuth App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/develop/create)
2. Click **Create** → **Server-to-Server OAuth**
3. Fill in app details:
   - **App Name**: Zoom Meeting Notes Archiver
   - **Description**: Automated meeting notes archiver
   - **Company Name**: Your name/company
4. Copy credentials:
   - `Account ID`
   - `Client ID`
   - `Client Secret`
5. Add scopes:
   - `recording:read:admin` (or `recording:read:meeting` for user-level)
   - `user:read:admin` (optional, for user info)
6. **Activate** the app

### 2. Enable Zoom Cloud Recording & Transcription

1. Go to [Zoom Settings](https://zoom.us/profile/setting)
2. Navigate to **Recording** tab
3. Enable:
   - ✅ **Cloud Recording**
   - ✅ **Audio Transcript** (under Advanced cloud recording settings)
4. Save changes

### 3. Configure GitHub Repository

1. **Fork or clone** this repository

2. **Add GitHub Secrets**:
   - Go to repository **Settings** → **Secrets and variables** → **Actions**
   - Add the following secrets:
     - `ZOOM_ACCOUNT_ID`: Your Zoom Account ID
     - `ZOOM_CLIENT_ID`: Your Zoom Client ID
     - `ZOOM_CLIENT_SECRET`: Your Zoom Client Secret
     - `ZOOM_USER_ID` (optional): Specific user ID or "me" (default)

3. **Enable GitHub Actions**:
   - Go to **Actions** tab
   - Enable workflows if prompted

4. **Set repository permissions**:
   - Go to **Settings** → **Actions** → **General**
   - Under **Workflow permissions**, select:
     - ✅ **Read and write permissions**

### 4. Run the Workflow

The workflow runs automatically every 15 minutes. To trigger manually:

1. Go to **Actions** tab
2. Select **Sync Zoom Recordings** workflow
3. Click **Run workflow**

## Local Development

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/zoom-meeting-notes.git
cd zoom-meeting-notes

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Zoom credentials
nano .env
```

### Build & Run

```bash
# Build TypeScript
npm run build

# Run sync
npm start

# Or run in development mode (with auto-reload)
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Configuration

All configuration is done via environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ZOOM_ACCOUNT_ID` | Yes | - | Zoom Account ID from OAuth app |
| `ZOOM_CLIENT_ID` | Yes | - | Zoom Client ID from OAuth app |
| `ZOOM_CLIENT_SECRET` | Yes | - | Zoom Client Secret from OAuth app |
| `ZOOM_USER_ID` | No | `me` | User ID to fetch recordings from |
| `OUTPUT_DIR` | No | `meeting-notes` | Directory for output files |
| `ENABLE_ACTION_ITEMS` | No | `true` | Enable action item extraction |
| `MAX_RECORDINGS_PER_RUN` | No | `100` | Max recordings to process per run |

## Project Structure

```
zoom-meeting-notes/
├── src/
│   ├── services/
│   │   ├── zoom-auth.ts       # OAuth authentication
│   │   ├── zoom-api.ts        # Zoom API client
│   │   └── state-manager.ts   # State persistence
│   ├── parsers/
│   │   ├── transcript-parser.ts  # VTT/SRT parser
│   │   └── action-items.ts       # Action item extractor
│   ├── generators/
│   │   └── markdown.ts        # Markdown generator
│   ├── utils/
│   │   ├── config.ts          # Configuration loader
│   │   ├── logger.ts          # Structured logging
│   │   ├── filesystem.ts      # File operations
│   │   └── sanitize.ts        # String sanitization
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   └── index.ts               # Main orchestrator
├── .github/
│   └── workflows/
│       └── sync-zoom-recordings.yml  # GitHub Action
├── docs/
│   └── Meeting Summary Archiver prd.md
├── package.json
├── tsconfig.json
└── README.md
```

## How It Works

1. **GitHub Actions** triggers every 15 minutes
2. **Zoom API** is polled for new recordings with transcripts
3. **State file** (`.state.json`) tracks which recordings were already processed
4. For each new recording:
   - Download VTT/SRT transcript
   - Parse transcript into segments
   - Extract action items using pattern matching
   - Generate Markdown with YAML frontmatter
   - Save to date-based folder structure
5. **Git commit** all new files
6. **Push** to repository

## Troubleshooting

### No recordings are being fetched

- Verify Zoom credentials in GitHub Secrets
- Check that Cloud Recording is enabled in Zoom settings
- Ensure transcription is enabled
- Check GitHub Actions logs for errors

### Action items not being extracted

- Action item extraction uses keyword patterns
- Accuracy improves when speakers explicitly mention "action item", "TODO", etc.
- Consider enabling LLM processing for better accuracy (see PRD)

### Workflow fails with authentication error

- Verify OAuth app is **activated** in Zoom Marketplace
- Check that all required scopes are added
- Regenerate client secret if needed

### Duplicate files being created

- The tool uses meeting UUID for uniqueness
- Check `.state.json` file is being persisted
- Ensure workflow has write permissions

## Known Limitations

- ⚠️ **AI Companion summaries are NOT available via API** (as of Jan 2025)
  - This is a known limitation - feature requested on Zoom forums
  - The tool uses transcript parsing as an alternative
- ⚠️ Recordings must have **auto-transcription enabled**
- ⚠️ Transcript files expire based on Zoom retention settings
- ⚠️ Participant list may be incomplete (API limitation)

## Roadmap

- [ ] LLM-based action item extraction (Claude/GPT integration)
- [ ] Smart summary generation (since Zoom AI Companion API not available)
- [ ] Email notifications for new meeting notes
- [ ] Search interface for historical meetings
- [ ] Support for on-premise Zoom installations
- [ ] Integration with project management tools (Jira, Linear, etc.)

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/zoom-meeting-notes/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/zoom-meeting-notes/discussions)
- **Zoom API Docs**: [developers.zoom.us](https://developers.zoom.us/docs/api/)

---

**Made with ❤️ for better meeting documentation**
