# 🚀 Vercel Deployment Guide

## Quick Deploy

### 1. Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
# From project root
vercel

# Or for production
vercel --prod
```

---

## Environment Variables

### Required Environment Variable

Set your Picsart API token in Vercel:

```bash
# Option 1: Via CLI
vercel env add PICSART_API_TOKEN

# Option 2: Via Vercel Dashboard
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add: PICSART_API_TOKEN = your-token-here
4. Save and redeploy
```

---

## Project Structure for Vercel

```
/
├── api/
│   ├── test-all.ts      # POST /api/test-all (run webhooks)
│   ├── test.ts          # POST /api/test (single webhook)
│   └── reports.ts       # GET /api/reports (list history)
├── src/
│   ├── api/client.ts    # Shared API logic
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities
├── webhook-tester.html  # Main UI (served as /)
├── vercel.json          # Vercel configuration
└── package.json         # Dependencies
```

---

## File Storage on Vercel

**Note:** Vercel serverless functions have ephemeral file systems. Test reports saved during a function execution won't persist.

### Solutions:

#### Option 1: Use Vercel Blob Storage (Recommended)
```bash
npm install @vercel/blob
```

Update `src/utils/htmlReport.ts` to save to Vercel Blob instead of local filesystem.

#### Option 2: Use External Storage
- AWS S3
- Google Cloud Storage
- Cloudinary
- Any CDN with API

#### Option 3: Keep Local Storage for UI State
- Results persist in browser localStorage
- Reports only saved during local development
- Production just shows live results

**Current Setup:** Uses localStorage for client-side persistence, so results work even without server-side file storage.

---

## Vercel Configuration

### `vercel.json`

```json
{
  "version": 2,
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 300
    }
  },
  "rewrites": [
    {
      "source": "/",
      "destination": "/webhook-tester.html"
    }
  ]
}
```

**Note:** 
- Vercel automatically handles TypeScript compilation for `/api` folder
- `npm install` runs automatically (no buildCommand needed)
- `webhook-tester.html` is served as a static file
- Functions get 1024MB memory and 300s (5 min) timeout

---

## API Endpoints

Once deployed, your endpoints will be:

```
Main UI:
https://webhook-checks-ui.vercel.app/

API Endpoints:
https://webhook-checks-ui.vercel.app/api/test-all   (POST)
https://webhook-checks-ui.vercel.app/api/test       (POST)
https://webhook-checks-ui.vercel.app/api/reports    (GET)
```

---

## Testing After Deployment

### 1. Test Main UI
```bash
open https://webhook-checks-ui.vercel.app
```

### 2. Test API Endpoints

#### Test All Webhooks:
```bash
curl -X POST https://webhook-checks-ui.vercel.app/api/test-all \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Test Single Webhook:
```bash
curl -X POST https://webhook-checks-ui.vercel.app/api/test \
  -H "Content-Type: application/json" \
  -d '{"webhookId":"69314bdfe9637d9ac5140f33"}'
```

#### Get Reports:
```bash
curl https://webhook-checks-ui.vercel.app/api/reports
```

---

## Troubleshooting

### "PICSART_API_TOKEN environment variable is not set"

Set the environment variable in Vercel:
```bash
vercel env add PICSART_API_TOKEN
# Enter your token when prompted
vercel --prod
```

### "Module not found" errors

Make sure all dependencies are in `package.json`:
```bash
npm install
```

### API returns 404

Check that:
1. `api/` folder is in project root
2. Files are named correctly (test-all.ts, test.ts, reports.ts)
3. Vercel build succeeded without errors

### Timeout errors

Vercel has a 10-second timeout for Hobby tier, 60 seconds for Pro.
For long-running tests, consider:
- Using Pro tier
- Breaking into smaller batches
- Using background jobs

---

## Features That Work on Vercel

✅ Run all webhooks (streaming)
✅ Manual webhook testing
✅ Retry failed webhooks
✅ Session persistence (localStorage)
✅ Real-time progress
✅ Error handling
✅ Continuous concurrency (50)

⚠️ File-based reports need Vercel Blob or external storage

---

## Local Development

To run locally:
```bash
npm run server
open http://localhost:3000
```

For Vercel:
```bash
vercel dev
open http://localhost:3000
```

---

## Deploy Commands

```bash
# Preview deployment (dev)
vercel

# Production deployment
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs
```

---

**Your domain:** `webhook-checks-ui.vercel.app`

Ready to deploy! 🚀


