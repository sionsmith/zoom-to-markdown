# Zoom Meeting Notes Archiver

🤖 **A GitHub Action to automatically archive Zoom AI Companion meeting summaries as Markdown files**

Perfect for teams who want to maintain a searchable archive of their Zoom meetings with AI-generated summaries, action items, and discussion topics - all stored securely in their private GitHub repository.

<div align="center">

[![GitHub Release](https://img.shields.io/github/v/release/sionsmith/zoom-meeting-notes?label=version)](https://github.com/sionsmith/zoom-meeting-notes/releases)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Zoom%20Meeting%20Notes-blue?logo=github)](https://github.com/marketplace/actions/zoom-meeting-notes-archiver)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/sionsmith/zoom-meeting-notes?style=social)](https://github.com/sionsmith/zoom-meeting-notes)

[![CI](https://github.com/sionsmith/zoom-meeting-notes/actions/workflows/ci.yml/badge.svg)](https://github.com/sionsmith/zoom-meeting-notes/actions/workflows/ci.yml)
[![CodeQL](https://github.com/sionsmith/zoom-meeting-notes/actions/workflows/codeql.yml/badge.svg)](https://github.com/sionsmith/zoom-meeting-notes/actions/workflows/codeql.yml)

</div>

## Features

- 🤖 **AI Companion Summaries**: Leverages Zoom AI Companion for high-quality meeting summaries
- ✅ **Smart Action Items**: Automatically extracts next steps and assigns ownership
- 📝 **Beautiful Markdown**: Clean, searchable markdown files with proper formatting
- 📁 **Organized Structure**: Date-based folders (`YYYY/MM/DD/filename.md`)
- 🔄 **Automated Sync**: Runs on schedule (default: hourly, Mon-Fri)
- 🔒 **Secure**: All data stays in your private repository
- 🚀 **Zero Maintenance**: Set it and forget it
- 📊 **State Management**: Only processes new meetings, prevents duplicates
- 📅 **Historical Sync**: Fetches meetings from the last 5 months on first run

## Quick Start

### 1. Create a Zoom Server-to-Server OAuth App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/develop/create)
2. Click **Create** → **Server-to-Server OAuth**
3. Fill in app details:
   - **App Name**: `Meeting Notes Archiver`
   - **Description**: `Automated meeting notes sync`
   - **Company Name**: Your organization name
4. Copy these credentials (you'll need them later):
   - `Account ID`
   - `Client ID`
   - `Client Secret`
5. **Add required scopes**:
   - `meeting_summary:read:admin` - Read AI Companion summaries
   - `report:read:meeting:admin` - List past meetings
6. Click **Activate** the app

### 2. Create a Private GitHub Repository

```bash
# Create a new private repository for your meeting notes
gh repo create my-meeting-notes --private --clone
cd my-meeting-notes

# Initialize with a README
echo "# Meeting Notes" > README.md
git add README.md
git commit -m "Initial commit"
git push -u origin main
```

### 3. Add GitHub Secrets

Go to your private repo's **Settings** → **Secrets and variables** → **Actions**, and add:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `ZOOM_ACCOUNT_ID` | `xxxxx` | From Zoom OAuth app |
| `ZOOM_CLIENT_ID` | `xxxxx` | From Zoom OAuth app |
| `ZOOM_CLIENT_SECRET` | `xxxxx` | From Zoom OAuth app |
| `ZOOM_USER_ID` | `your.email@company.com` | Your Zoom email address |

### 4. Create Workflow File

Create `.github/workflows/sync-zoom.yml` in your private repo:

```yaml
name: Sync Zoom Meeting Notes

on:
  # Run every hour during work hours (9 AM - 5 PM UTC), Monday-Friday
  schedule:
    - cron: '0 9-17 * * 1-5'

  # Allow manual trigger
  workflow_dispatch:

concurrency:
  group: zoom-sync
  cancel-in-progress: false

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Sync Zoom meeting notes
        uses: sionsmith/zoom-meeting-notes@v1
        with:
          zoom-account-id: ${{ secrets.ZOOM_ACCOUNT_ID }}
          zoom-client-id: ${{ secrets.ZOOM_CLIENT_ID }}
          zoom-client-secret: ${{ secrets.ZOOM_CLIENT_SECRET }}
          zoom-user-id: ${{ secrets.ZOOM_USER_ID }}
          output-dir: 'meeting-notes'
          enable-action-items: 'true'

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Commit and push meeting notes
        run: |
          if [ -n "$(git status --porcelain)" ]; then
            NEW_FILES=$(git status --porcelain | grep "^??" | grep "\.md$" | wc -l | tr -d ' ')
            git add .
            git commit -m "chore: sync meeting notes - $(date -u +'%Y-%m-%d %H:%M UTC')

            📝 Added ${NEW_FILES} new meeting summaries
            🤖 Automated by Zoom Meeting Notes Archiver"
            git push
            echo "✅ Pushed ${NEW_FILES} new meeting notes"
          else
            echo "ℹ️ No new meeting notes to commit"
          fi
```

### 5. Enable Workflow Permissions

In your private repo:
1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select:
   - ✅ **Read and write permissions**
3. Click **Save**

### 6. Run the Workflow

**First run (manual):**
1. Go to **Actions** tab in your private repo
2. Select **Sync Zoom Meeting Notes** workflow
3. Click **Run workflow** → **Run workflow**

The action will sync all meetings from the last 5 months!

**Automatic runs:**
- The workflow will run every hour (9 AM - 5 PM UTC) on weekdays by default
- Customize the schedule in your workflow file (see examples below)

## Output Example

Meeting notes are saved with this structure:

```
my-meeting-notes/
├── meeting-notes/
│   ├── 2025/
│   │   ├── 11/
│   │   │   ├── 14/
│   │   │   │   ├── q4-planning-abc123.md
│   │   │   │   └── customer-demo-def456.md
│   │   │   └── 15/
│   │   │       └── team-standup-ghi789.md
```

Each file contains:

```markdown
---
title: Q4 Planning Meeting
meeting_id: '12345678'
uuid: abc123def456
start_time: '2025-11-14T15:00:00Z'
duration: 3600
host: john@company.com
participants:
  - john@company.com
  - jane@company.com
---
# Q4 Planning Meeting

**Date:** November 14, 2025
**Time:** 3:00 PM UTC
**Duration:** 1 hour
**Host:** john@company.com

## Participants
- john@company.com (Host)
- jane@company.com

## Action Items
> ⚠️ Note: Action items are automatically extracted from Zoom AI Companion

- [ ] John to finalize Q4 budget by Nov 20
- [ ] Jane to schedule client kickoff meetings
- [ ] Team to review product roadmap before next meeting

## Full Transcript

**[00:00:00] Budget Discussion:**
The team reviewed the Q4 budget allocation...

**[00:15:00] Client Projects:**
Discussion of upcoming client engagements...
```

## Configuration Options

### Action Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `zoom-account-id` | ✅ Yes | - | Zoom Account ID |
| `zoom-client-id` | ✅ Yes | - | Zoom Client ID |
| `zoom-client-secret` | ✅ Yes | - | Zoom Client Secret |
| `zoom-user-id` | ✅ Yes | - | Zoom User ID (email) |
| `output-dir` | No | `meeting-notes` | Output directory |
| `enable-action-items` | No | `true` | Extract action items |

### Schedule Customization

Customize when the action runs by editing the `schedule` section:

```yaml
# Every hour, 24/7
schedule:
  - cron: '0 * * * *'

# Every 2 hours, Monday-Friday
schedule:
  - cron: '0 */2 * * 1-5'

# Every 30 minutes during work hours (9 AM - 5 PM UTC)
schedule:
  - cron: '*/30 9-17 * * 1-5'

# Once per day at 9 AM UTC
schedule:
  - cron: '0 9 * * *'

# Multiple times per day (9 AM, 1 PM, 5 PM UTC)
schedule:
  - cron: '0 9 * * 1-5'
  - cron: '0 13 * * 1-5'
  - cron: '0 17 * * 1-5'
```

Use [crontab.guru](https://crontab.guru/) to build custom schedules.

## Requirements

- ✅ Zoom account with **AI Companion** enabled
- ✅ Zoom **Server-to-Server OAuth** app with required scopes
- ✅ GitHub repository (private recommended)
- ✅ GitHub Actions enabled

## Troubleshooting

### No meetings are synced

**Check:**
1. Zoom OAuth app has required scopes: `meeting_summary:read:admin` and `report:read:meeting:admin`
2. Zoom AI Companion is enabled for your account
3. Meetings were held in the last 5 months (Zoom API limitation)
4. Meetings have AI summaries generated (check in Zoom web portal)

### GitHub Actions failing

**Check:**
1. All 4 GitHub secrets are set correctly
2. Workflow permissions are set to "Read and write permissions"
3. Review workflow logs in GitHub Actions tab

### Wrong timezone

The cron schedule uses UTC. To convert to your timezone:
- **EST/EDT**: Subtract 5 hours from UTC (9 AM UTC = 4 AM EST)
- **PST/PDT**: Subtract 8 hours from UTC (9 AM UTC = 1 AM PST)
- **CET/CEST**: Add 1 hour to UTC (9 AM UTC = 10 AM CET)

## Local Development

Want to test locally before setting up GitHub Actions?

```bash
# Clone this repo
git clone https://github.com/sionsmith/zoom-meeting-notes.git
cd zoom-meeting-notes

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your Zoom credentials
nano .env

# Build and run
npm run build
npm start
```

## Security & Privacy

- ✅ All meeting data stays in YOUR private GitHub repository
- ✅ No data is sent to third parties
- ✅ Secrets are stored securely in GitHub Secrets
- ✅ Open source code - audit it yourself!
- ✅ Uses OAuth 2.0 for Zoom authentication (no password storage)

## Limitations

- 📅 Zoom Reports API only allows fetching meetings from the last **6 months**
- 🤖 Only meetings with **Zoom AI Companion summaries** are processed
- 📝 AI summaries depend on Zoom's AI Companion being enabled for your account

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- 📖 [Documentation](https://github.com/sionsmith/zoom-meeting-notes/wiki)
- 🐛 [Report Issues](https://github.com/sionsmith/zoom-meeting-notes/issues)
- 💬 [Discussions](https://github.com/sionsmith/zoom-meeting-notes/discussions)

## Credits

Built with ❤️ by [Sion Smith](https://github.com/sionsmith)

Powered by:
- [Zoom API](https://developers.zoom.us/)
- [GitHub Actions](https://github.com/features/actions)
- [TypeScript](https://www.typescriptlang.org/)
