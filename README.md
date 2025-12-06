# Zoom to Markdown

Automatically archive your Zoom cloud recordings and AI Companion summaries as formatted Markdown files. Perfect for integrating meeting notes with Claude Desktop, code context, and AI-powered development workflows.

<div align="center">

[![GitHub Release](https://img.shields.io/github/v/release/sionsmith/zoom-to-markdown?label=version)](https://github.com/sionsmith/zoom-to-markdown/releases)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Zoom%20to%20Markdown-blue?logo=github)](https://github.com/marketplace/actions/zoom-to-markdown)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

## Features

- **Automatic Zoom Integration** - Fetches cloud recordings and AI Companion summaries directly from your Zoom account
- **Markdown Formatting** - Converts summaries into clean, readable Markdown files with YAML frontmatter
- **Claude Desktop Ready** - Formatted specifically for use with Claude Desktop's context and knowledge integration
- **Smart Action Items** - Automatically extracts next steps and assigns ownership from meeting summaries
- **Structured Archives** - Organized output by date (`YYYY/MM/DD/meeting-title.md`) for easy discovery
- **GitHub Action** - Runs automatically on schedule or triggered manually
- **State Management** - Tracks processed meetings to prevent duplicates
- **Secure** - All data stays in your private repository with secure OAuth credential management

## Quick Start

### Prerequisites

- GitHub repository with Actions enabled
- Zoom account with **AI Companion** enabled (for meeting summaries)
- Zoom **Server-to-Server OAuth** app credentials

### 1. Create Zoom API Credentials

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/develop/create)
2. Click **Create** then select **Server-to-Server OAuth**
3. Fill in app details:
   - **App Name**: `Meeting Notes Archiver`
   - **Company Name**: Your organization
4. Copy these credentials (you'll need them later):
   - `Account ID`
   - `Client ID`
   - `Client Secret`
5. **Add required scopes** under the Scopes tab:
   - `meeting_summary:read:admin` - Read AI Companion summaries
   - `report:read:meeting:admin` - List past meetings
6. Click **Activate** to enable the app

### 2. Add GitHub Secrets

Add the following secrets to your repository (`Settings > Secrets and variables > Actions > New repository secret`):

| Secret Name | Description |
|-------------|-------------|
| `ZOOM_ACCOUNT_ID` | Your Zoom app's Account ID |
| `ZOOM_CLIENT_ID` | Your Zoom app's Client ID |
| `ZOOM_CLIENT_SECRET` | Your Zoom app's Client Secret |
| `ZOOM_USER_ID` | Your Zoom email address (e.g., `you@company.com`) |

### 3. Add Workflow File

Create `.github/workflows/zoom-sync.yml` in your repository:

```yaml
name: Sync Zoom Meeting Notes

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Sync Zoom Meetings
        uses: sionsmith/zoom-to-markdown@v1
        with:
          zoom-account-id: ${{ secrets.ZOOM_ACCOUNT_ID }}
          zoom-client-id: ${{ secrets.ZOOM_CLIENT_ID }}
          zoom-client-secret: ${{ secrets.ZOOM_CLIENT_SECRET }}
          zoom-user-id: ${{ secrets.ZOOM_USER_ID }}
          output-dir: 'meetings'

      - name: Commit and Push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          if [ -n "$(git status --porcelain)" ]; then
            git commit -m "Sync Zoom meetings $(date +'%Y-%m-%d')"
            git push
          fi
```

### 4. Enable Workflow Permissions

1. Go to **Settings** > **Actions** > **General**
2. Under **Workflow permissions**, select **Read and write permissions**
3. Click **Save**

### 5. Run the Workflow

1. Go to the **Actions** tab
2. Select **Sync Zoom Meeting Notes**
3. Click **Run workflow**

The first run will sync all meetings from the last 5 months!

## Output Format

Markdown files are organized by date:

```
meetings/
├── 2024/
│   └── 12/
│       ├── 06/
│       │   └── team-standup-abc123.md
│       ├── 05/
│       │   └── product-planning-def456.md
│       └── 04/
│           └── engineering-sync-ghi789.md
```

Each file includes:

```markdown
---
title: Team Standup
meeting_id: '12345678'
uuid: abc123def456
start_time: '2024-12-06T15:00:00Z'
duration: 1800
host: john@company.com
participants:
  - john@company.com
  - jane@company.com
---

# Team Standup

**Date:** December 6, 2024
**Time:** 3:00 PM UTC
**Duration:** 30 minutes
**Host:** john@company.com

## Participants
- john@company.com (Host)
- jane@company.com

## Action Items
> Note: Action items are automatically extracted from Zoom AI Companion

- [ ] John to finalize Q4 budget by Dec 10
- [ ] Jane to schedule client kickoff meetings
- [ ] Team to review product roadmap before next meeting

## Summary

The team discussed Q4 priorities and upcoming client deliverables...

## Full Transcript

**Budget Discussion:**
The team reviewed the Q4 budget allocation...
```

## Usage with Claude Desktop

This action is designed to work seamlessly with Claude Desktop:

1. **Add to Context** - Drag and drop Markdown files into Claude Desktop's context window
2. **Reference in Code** - Include relevant meeting notes when discussing implementation decisions
3. **Search Meetings** - Claude can search your meetings directory for relevant context
4. **Track Decisions** - Connect meeting decisions with code context for consistency

## Configuration Options

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `zoom-account-id` | Yes | - | Zoom Account ID from OAuth app |
| `zoom-client-id` | Yes | - | Zoom Client ID from OAuth app |
| `zoom-client-secret` | Yes | - | Zoom Client Secret from OAuth app |
| `zoom-user-id` | Yes | - | Your Zoom email address |
| `output-dir` | No | `meeting-notes` | Output directory for files |
| `enable-action-items` | No | `true` | Extract action items from summaries |

### Schedule Examples

```yaml
# Every hour during work hours (9 AM - 5 PM UTC), Monday-Friday
schedule:
  - cron: '0 9-17 * * 1-5'

# Once daily at 9 AM UTC
schedule:
  - cron: '0 9 * * *'

# Every 2 hours
schedule:
  - cron: '0 */2 * * *'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **No meetings synced** | Ensure Zoom AI Companion is enabled and meetings have summaries generated |
| **Authentication errors** | Verify all 4 secrets are correctly set and OAuth app is activated |
| **Missing scopes error** | Add `meeting_summary:read:admin` and `report:read:meeting:admin` scopes |
| **Git push fails** | Enable "Read and write permissions" in repository Actions settings |
| **Old meetings missing** | Zoom API only returns meetings from the last 6 months |

## Security

- Credentials stored securely in GitHub Secrets
- All meeting data stays in YOUR repository
- No data sent to third parties
- Uses OAuth 2.0 for Zoom authentication
- Open source - audit the code yourself

## Requirements

- Zoom account with **AI Companion** enabled
- Zoom **Server-to-Server OAuth** app (not JWT - deprecated)
- GitHub repository with Actions enabled
- Meetings must have AI summaries generated

## Contributing

Contributions welcome! Please fork the repository, create a feature branch, and submit a pull request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [Open an Issue](https://github.com/sionsmith/zoom-to-markdown/issues)
- [Discussions](https://github.com/sionsmith/zoom-to-markdown/discussions)

---

Built by [Sion Smith](https://github.com/sionsmith)
