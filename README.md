# Picsart Magic Flow Webhook Automation Tests

Automated test suite for validating Picsart Magic Flow Webhooks. This project tests webhook endpoints by fetching CMS schemas and submitting workflow requests, then generates a visual HTML report of the results.

## Prerequisites

- **Node.js** >= 20.0.0 (required for native `fetch` support)
- **npm** or **yarn**

## Installation

```bash
npm install
```

## Configuration

### Set API Token

Set the `PICSART_API_TOKEN` environment variable with your Bearer token:

```bash
# Linux / macOS
export PICSART_API_TOKEN="your-api-token-here"

# Or create a .env file
echo "PICSART_API_TOKEN=your-api-token-here" > .env
```

### Configure Placeholder Assets (Optional)

If you need to customize the test assets, edit `PLACEHOLDER_ASSETS` in `src/config/webhooks.ts`:

```typescript
export const PLACEHOLDER_ASSETS = {
  image: {
    url: 'https://your-cdn.com/test-image.jpg',
  },
  video: {
    url: 'https://your-cdn.com/test-video.mp4',
  },
  text: {
    value: 'Your custom prompt text',
  },
};
```

## Running Tests

### Web Interface (Recommended)

The easiest way to run tests is through the web interface:

```bash
# Start the web server
npm run server

# Open in browser
open https://webhook-checks-ui.vercel.app
```

Or open the standalone HTML file:

```bash
# Open the standalone tester
open webhook-tester.html
```

The web interface provides:

- 🚀 One-click button to run all webhook tests
- 📊 Real-time progress monitoring
- 📈 Live statistics (total, passed, failed, duration)
- 🎨 Visual results with image previews
- 🔍 Filter results by status (all/passed/failed)
- 📝 Live execution logs

### Command Line Mode

### Two Running Modes

**Note:** Tests run with a concurrency of 50 webhooks in parallel by default for faster execution.

The test suite supports **two modes**:

#### 1. API Mode (Default) - Fetch all webhooks from API

Fetches all flowIds from `https://api-cms.gen.ai/api/flow-landings` and tests them:

```bash
# Run with API mode (default)
npm test

# Or explicitly
npm run test:api
```

#### 2. Manual Mode - Test specific webhook IDs

Pass specific webhook IDs via the `WEBHOOK_IDS` environment variable:

```bash
# Single webhook
WEBHOOK_IDS="webhook-id-1" npm test

# Multiple webhooks (comma-separated)
WEBHOOK_IDS="webhook-id-1,webhook-id-2,webhook-id-3" npm test

# Example with real IDs
WEBHOOK_IDS="69314bdfe9637d9ac5140f33,69315262b5bc5942e3edd5aa" npm test
```

### Quick Commands

```bash
# Run all tests (API mode - fetches webhooks from API)
npm test

# Run tests with specific webhooks (manual mode)
WEBHOOK_IDS="id1,id2,id3" npm test

# Watch mode (development)
npm run test:watch
```

## Output

### Console Output

The test suite logs:

- Mode indicator (API or Manual)
- Progress for each webhook with slug/ID
- JSON summary mapping `webhookId` → results
- Final pass/fail counts

Example:

```
🔧 MANUAL MODE: Testing 3 specified webhook IDs

🔍 [webhook-slug] Fetching CMS schema for webhookId: example-webhook-id-1
   ✓ Schema fetched: 2 items
   📤 Submitting magic flow webhook...
   ✓ Job submitted: job-id-123
   ⏳ Waiting for job to complete...
   ✓ Job completed with 1 results
   ✅ image: https://cdn.picsart.com/result-image.jpg

============================================================
📈 WEBHOOK RESULTS: 2 passed, 1 failed out of 3 total
============================================================
```

### HTML Reports

Each test run automatically generates a **dated HTML report** with a timestamp:

```
./artifacts/test-YYYYMMDD-HHMMSS.html
```

**Index Page**: View all test history at `./artifacts/index.html`

Reports include:

- Summary of passed/failed tests
- For each webhook:
  - **Slug** and **Title** (when available from API)
  - **Flow Type** badge (image/video)
  - Status badge (Passed/Failed)
  - **Image previews** with thumbnails
  - **Video previews** that play on hover
  - Duration and error details
  - Expandable execution logs for failed tests

**History Tracking**:

- Each test run creates a new dated report
- Index page lists all reports with timestamps
- Auto-refreshes every 30 seconds
- Click "View History" button in web interface to see all reports

## Project Structure

```
├── src/
│   ├── api/
│   │   └── client.ts          # API helper functions
│   ├── config/
│   │   └── webhooks.ts        # Configuration and placeholder assets
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── utils/
│       └── htmlReport.ts      # HTML report generator
├── tests/
│   ├── magicFlowWebhooks.spec.ts  # Main test file
│   └── setup.ts               # Test setup
├── artifacts/                  # Generated reports (gitignored)
│   └── webhook-results.html
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## API Endpoints

### Flow Landings API (for fetching webhook IDs)

- **GET** `https://api-cms.gen.ai/api/flow-landings`
  - Returns all flow landings with flowIds, slugs, titles, and schemas

### CMS Schema

- **GET** `https://api-cms.gen.ai/api/flows-content/schema/{webhookId}`
  - Fetches the CMS schema for a webhook
  - Returns types of inputs required (image, video, text)

### Workflow Submit

- **POST** `https://api.picsart.com/workflows/magic-flow-webhook/submit`
  - Submits a workflow request with constructed params
  - Returns a job ID for polling

### Job Result

- **GET** `https://api.picsart.com/workflows/magic-flow-webhook/{jobId}/result`
  - Polls for job completion
  - Returns processed results with CDN URLs

## Error Handling

- If one webhook fails, the suite continues testing others
- Failed webhooks are marked in the report with error details and logs
- The overall test summarizes pass/fail counts

## Troubleshooting

### "PICSART_API_TOKEN environment variable is not set"

Make sure you've exported the token before running tests:

```bash
export PICSART_API_TOKEN="your-token"
npm test
```

### HTTP 401 / 403 Errors

Your API token may be invalid or expired. Verify the token and try again.

### Network Errors

Ensure you have network access to `api.picsart.com` and `api-cms.gen.ai`.

### Long Running Tests

Some webhooks (especially video generation) can take several minutes. The default timeout is 30 minutes for all webhooks combined.

## License

Internal use only - Picsart
