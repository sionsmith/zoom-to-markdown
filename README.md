# Zoom to Markdown - Convert Zoom Meeting Recordings to Markdown

> A GitHub Action that automatically converts Zoom cloud recordings and AI meeting summaries into searchable Markdown files. Build a knowledge base from your meetings.

<div align="center">

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Zoom%20to%20Markdown-blue?logo=github&style=for-the-badge)](https://github.com/marketplace/actions/zoom-to-markdown)
[![GitHub Release](https://img.shields.io/github/v/release/sionsmith/zoom-to-markdown?style=for-the-badge&logo=github)](https://github.com/sionsmith/zoom-to-markdown/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

**[Get Started](#quick-start)** | **[View on Marketplace](https://github.com/marketplace/actions/zoom-to-markdown)** | **[Report Bug](https://github.com/sionsmith/zoom-to-markdown/issues)**

</div>

---

## Why Zoom to Markdown?

**Stop losing valuable meeting insights.** Zoom recordings sit in the cloud, hard to search and reference. This action automatically:

- Converts Zoom AI Companion summaries to **searchable Markdown files**
- Extracts **action items** and assigns ownership automatically
- Organizes meetings by date in your **Git repository**
- Creates a **searchable knowledge base** from your meetings
- Works with **Claude Desktop**, Obsidian, Notion, and any Markdown tool

Perfect for engineering teams, product managers, and anyone who wants meeting notes integrated with their development workflow.

---

## Features

| Feature | Description |
|---------|-------------|
| **Zoom API Integration** | Connects directly to Zoom's API to fetch cloud recordings and AI summaries |
| **Markdown Export** | Clean Markdown files with YAML frontmatter for metadata |
| **Action Item Extraction** | Automatically identifies and extracts next steps from meetings |
| **Date Organization** | Files organized as `YYYY/MM/DD/meeting-title.md` |
| **Duplicate Prevention** | State management ensures meetings are only processed once |
| **Historical Sync** | First run fetches up to 5 months of meeting history |
| **Claude Desktop Ready** | Formatted for AI assistant context and knowledge integration |
| **Secure & Private** | All data stays in YOUR repository - no third-party storage |

---

## How It Works

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Zoom      │────▶│  GitHub Action  │────▶│  Your Repository │
│  Meetings   │     │  (This Action)  │     │   /meetings/*.md │
└─────────────┘     └─────────────────┘     └──────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ AI Summaries  │
                    │ Action Items  │
                    │ Participants  │
                    └───────────────┘
```

1. **Schedule** - Action runs on your defined schedule (daily, hourly, etc.)
2. **Fetch** - Connects to Zoom API and retrieves AI Companion summaries
3. **Convert** - Transforms summaries into structured Markdown
4. **Commit** - Saves files to your repository with Git

---

## Quick Start

### Prerequisites

- Zoom account with [AI Companion](https://www.zoom.com/en/ai-assistant/) enabled
- GitHub repository with Actions enabled
- 5 minutes to set up

### Step 1: Create Zoom OAuth App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/develop/create)
2. Click **Create** → **Server-to-Server OAuth**
3. Name your app (e.g., `Meeting Notes Sync`)
4. Copy your credentials:
   - `Account ID`
   - `Client ID`
   - `Client Secret`
5. Add scopes under **Scopes** tab:
   - `meeting_summary:read:admin`
   - `report:read:meeting:admin`
6. Click **Activate**

### Step 2: Add GitHub Secrets

Go to your repository **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Value |
|--------|-------|
| `ZOOM_ACCOUNT_ID` | Your Zoom Account ID |
| `ZOOM_CLIENT_ID` | Your Zoom Client ID |
| `ZOOM_CLIENT_SECRET` | Your Zoom Client Secret |
| `ZOOM_USER_ID` | Your Zoom email (e.g., `you@company.com`) |

### Step 3: Create Workflow

Create `.github/workflows/zoom-sync.yml`:

```yaml
name: Sync Zoom Meetings

on:
  schedule:
    - cron: '0 9 * * 1-5'  # 9 AM UTC, Monday-Friday
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - name: Sync Zoom Meetings
        uses: sionsmith/zoom-to-markdown@v1
        with:
          zoom-account-id: ${{ secrets.ZOOM_ACCOUNT_ID }}
          zoom-client-id: ${{ secrets.ZOOM_CLIENT_ID }}
          zoom-client-secret: ${{ secrets.ZOOM_CLIENT_SECRET }}
          zoom-user-id: ${{ secrets.ZOOM_USER_ID }}

      - name: Commit Changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          git diff --staged --quiet || git commit -m "Sync Zoom meetings $(date +'%Y-%m-%d')"
          git push
```

### Step 4: Run It

1. Go to **Actions** tab
2. Select **Sync Zoom Meetings**
3. Click **Run workflow**

Your first sync will import up to 5 months of meeting history!

---

## Output Example

### File Structure

```
meetings/
├── 2024/
│   └── 12/
│       ├── 06/
│       │   ├── sprint-planning-abc123.md
│       │   └── client-kickoff-def456.md
│       └── 05/
│           └── team-standup-ghi789.md
```

### Markdown Output

```markdown
---
title: Sprint Planning
meeting_id: '12345678'
start_time: '2024-12-06T10:00:00Z'
duration: 3600
host: sarah@company.com
participants:
  - sarah@company.com
  - mike@company.com
  - lisa@company.com
---

# Sprint Planning

**Date:** December 6, 2024
**Duration:** 60 minutes
**Host:** sarah@company.com

## Participants
- sarah@company.com (Host)
- mike@company.com
- lisa@company.com

## Action Items

- [ ] Mike to complete API integration by Friday
- [ ] Lisa to review design mockups
- [ ] Sarah to schedule stakeholder demo

## Summary

The team reviewed sprint goals and assigned tasks for the upcoming two-week cycle...

## Discussion Notes

**API Integration:**
Mike presented the current progress on the REST API...
```

---

## Use Cases

### Engineering Teams
- Archive sprint planning and retrospective notes
- Track technical decisions and their context
- Build searchable documentation from design discussions

### Product Managers
- Document feature requirements from stakeholder meetings
- Track customer feedback sessions
- Maintain decision logs with full context

### With Claude Desktop
- Drag meeting files into Claude for instant context
- Ask questions about past meetings and decisions
- Connect meeting notes with code implementation

### With Obsidian/Notion
- Import Markdown files into your knowledge base
- Link meetings to projects and tasks
- Full-text search across all meetings

---

## Configuration

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `zoom-account-id` | Yes | - | Zoom Account ID |
| `zoom-client-id` | Yes | - | Zoom Client ID |
| `zoom-client-secret` | Yes | - | Zoom Client Secret |
| `zoom-user-id` | Yes | - | Zoom user email address |
| `output-dir` | No | `meeting-notes` | Output directory |
| `enable-action-items` | No | `true` | Extract action items |

### Schedule Examples

```yaml
# Every weekday at 9 AM UTC
- cron: '0 9 * * 1-5'

# Every hour during business hours
- cron: '0 9-17 * * 1-5'

# Daily at midnight
- cron: '0 0 * * *'

# Every 6 hours
- cron: '0 */6 * * *'
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No meetings synced | Enable Zoom AI Companion in your Zoom settings |
| Authentication failed | Verify secrets are correct and OAuth app is activated |
| Missing scopes error | Add both required scopes to your Zoom OAuth app |
| Git push fails | Enable "Read and write permissions" in Actions settings |
| Meetings older than 6 months | Zoom API limitation - only recent meetings available |

---

## Security

- **Private by design** - All data stays in your repository
- **No third-party storage** - Direct Zoom-to-GitHub pipeline
- **Secure credentials** - Uses GitHub Secrets encryption
- **OAuth 2.0** - Industry-standard authentication
- **Open source** - Audit the code yourself

---

## Requirements

- Zoom account with **AI Companion** enabled
- Zoom **Server-to-Server OAuth** app
- GitHub repository with **Actions** enabled
- Meetings must have AI summaries generated (automatic with AI Companion)

---

## Related Projects

Looking for similar tools? Check out:
- [Zoom API Documentation](https://developers.zoom.us/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Claude Desktop](https://claude.ai/download)

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- [Report a Bug](https://github.com/sionsmith/zoom-to-markdown/issues)
- [Request a Feature](https://github.com/sionsmith/zoom-to-markdown/issues)
- [Discussions](https://github.com/sionsmith/zoom-to-markdown/discussions)

---

<div align="center">

**Built by [Sion Smith](https://github.com/sionsmith)**

If this project helps you, consider giving it a star!

[![GitHub stars](https://img.shields.io/github/stars/sionsmith/zoom-to-markdown?style=social)](https://github.com/sionsmith/zoom-to-markdown)

</div>
