# GitHub Actions Workflow Setup

Due to OAuth token scope limitations, the GitHub Actions workflow file needs to be added via the web interface.

## Step 1: Create the Workflow File

1. Go to: https://github.com/sionsmith/zoom-meeting-notes/new/main
2. In the filename field, type: `.github/workflows/sync-zoom-recordings.yml`
3. Copy and paste the content below into the editor
4. Click "Commit new file"

## Workflow File Content

```yaml
name: Sync Zoom Recordings

on:
  # Run every 15 minutes
  schedule:
    - cron: '*/15 * * * *'

  # Allow manual trigger
  workflow_dispatch:

# Prevent concurrent runs
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
          # Fetch full history for proper git operations
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build TypeScript
        run: npm run build

      - name: Sync Zoom recordings
        env:
          ZOOM_ACCOUNT_ID: ${{ secrets.ZOOM_ACCOUNT_ID }}
          ZOOM_CLIENT_ID: ${{ secrets.ZOOM_CLIENT_ID }}
          ZOOM_CLIENT_SECRET: ${{ secrets.ZOOM_CLIENT_SECRET }}
          ZOOM_USER_ID: ${{ secrets.ZOOM_USER_ID }}
          OUTPUT_DIR: 'meeting-notes'
          ENABLE_ACTION_ITEMS: 'true'
        run: npm start

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Commit and push changes
        run: |
          # Check if there are any changes
          if [ -n "$(git status --porcelain)" ]; then
            # Count new markdown files
            NEW_FILES=$(git status --porcelain | grep "^??" | grep "\.md$" | wc -l | tr -d ' ')

            # Add all changes
            git add .

            # Create commit message
            DATE=$(date -u +"%Y-%m-%d")
            git commit -m "chore: add meeting notes for ${DATE} (${NEW_FILES} meetings)

🤖 Generated with Zoom Meeting Notes Archiver
Automated sync of Zoom cloud recordings and transcripts

Co-Authored-By: GitHub Actions <github-actions[bot]@users.noreply.github.com>"

            # Push changes
            git push

            echo "✅ Pushed ${NEW_FILES} new meeting notes"
          else
            echo "ℹ️ No new meeting notes to commit"
          fi

      - name: Upload state as artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: state-file
          path: .state.json
          retention-days: 7
```

## Step 2: Configure GitHub Secrets

Go to: https://github.com/sionsmith/zoom-meeting-notes/settings/secrets/actions

Add the following secrets:
- `ZOOM_ACCOUNT_ID` - Your Zoom Account ID
- `ZOOM_CLIENT_ID` - Your Zoom Client ID
- `ZOOM_CLIENT_SECRET` - Your Zoom Client Secret
- `ZOOM_USER_ID` - (Optional) User ID or "me"

## Step 3: Enable Workflow Permissions

1. Go to: https://github.com/sionsmith/zoom-meeting-notes/settings/actions
2. Under "Workflow permissions", select:
   - ✅ **Read and write permissions**
3. Click "Save"

## Step 4: Run the Workflow

1. Go to: https://github.com/sionsmith/zoom-meeting-notes/actions
2. Select "Sync Zoom Recordings" workflow
3. Click "Run workflow"
4. Click the green "Run workflow" button

---

**Note**: The workflow will automatically run every 15 minutes once set up.
