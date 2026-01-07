# Magic Flow Webhook Tester - Usage Guide

## 🎯 Quick Start

### Option 1: Web Interface (Recommended) ⭐

The easiest way to test webhooks with a beautiful UI:

```bash
# 1. Start the server
npm run server

# 2. Open in browser
open https://webhook-checks-ui.vercel.app
```

Or use the standalone HTML file:

```bash
open webhook-tester.html
```

### Option 2: Command Line

```bash
# Run all webhook tests
npm test

# Run specific webhooks
WEBHOOK_IDS="id1,id2,id3" npm test
```

---

## 🌐 Web Interface Features

### Main Interface (`webhook-tester.html`)

**Features:**

- 🚀 **One-Click Testing**: Run all webhooks with a single button click
- 📊 **Real-Time Progress**: Live progress bar and status updates
- 📈 **Live Statistics**:
  - Total webhooks tested
  - Passed/Failed counts
  - Test duration
- 🎨 **Visual Results**:
  - Image previews for successful tests
  - Detailed error messages for failures
- 🔍 **Smart Filtering**: Filter by All/Passed/Failed
- 📝 **Live Logs**: Real-time execution logs with timestamps
- 🎯 **Responsive Design**: Works on desktop and mobile

**How to Use:**

1. Open `webhook-tester.html` in your browser
2. Click "🚀 Run All Webhook Tests"
3. Watch real-time progress
4. View results with image previews
5. Filter results as needed
6. Click "🗑️ Clear Results" to reset

### Built-in Server Interface

The server at `https://webhook-checks-ui.vercel.app` includes:

- Single webhook testing
- All webhook testing (via `/api/test-all`)
- Server-Sent Events (SSE) for real-time updates

---

## 🔧 API Endpoints

### 1. Test Single Webhook

```bash
POST https://webhook-checks-ui.vercel.app/api/test
Content-Type: application/json

{
  "webhookId": "your-webhook-id"
}
```

**Response:**

```json
{
  "success": true,
  "results": [
    {
      "type": "image",
      "url": "https://cdn.picsart.com/..."
    }
  ],
  "logs": ["Fetching schema...", "Job completed..."]
}
```

### 2. Test All Webhooks (SSE Stream)

```bash
POST https://webhook-checks-ui.vercel.app/api/test-all
```

**Response:** Server-Sent Events stream with:

- `init`: Total webhook count
- `progress`: Current progress updates
- `result`: Individual test results
- `complete`: Final summary
- `error`: Any errors

---

## 📊 Understanding Results

### Success Result

```json
{
  "webhookId": "abc123",
  "slug": "my-webhook",
  "title": "My Webhook",
  "status": "success",
  "results": [
    {
      "type": "image",
      "url": "https://cdn.picsart.com/result.jpg"
    }
  ]
}
```

### Failed Result

```json
{
  "webhookId": "abc123",
  "slug": "my-webhook",
  "title": "My Webhook",
  "status": "failed",
  "error": "HTTP 402 - Not enough credits"
}
```

---

## 🎨 Web Interface Screenshots

### Dashboard

- Clean, modern dark theme
- Real-time statistics cards
- Progress bar with percentage
- Live log stream

### Results View

- Grid layout for easy scanning
- Status badges (Passed/Failed)
- Image previews for visual verification
- Clickable URLs to view full results
- Error messages for debugging

---

## ⚙️ Configuration

### Environment Variables

```bash
# Required
export PICSART_API_TOKEN="your-token-here"

# Optional
export CONCURRENCY="50"  # Number of parallel tests (default: 50)
```

### Customizing Test Assets

Edit `src/config/webhooks.ts`:

```typescript
export const PLACEHOLDER_ASSETS = {
  image: {
    url: 'https://your-cdn.com/test-image.jpg',
  },
  video: {
    url: 'https://your-cdn.com/test-video.mp4',
  },
  text: {
    value: 'Your custom prompt',
  },
};
```

---

## 🚀 Advanced Usage

### Running with Custom Concurrency

```bash
# Test 20 webhooks in parallel
CONCURRENCY=20 npm test
```

### Testing Specific Webhooks

```bash
# Single webhook
WEBHOOK_IDS="webhook-id-1" npm test

# Multiple webhooks
WEBHOOK_IDS="id1,id2,id3" npm test
```

### Generating HTML Reports

After running `npm test`, check:

```
./artifacts/webhook-results.html
```

---

## 🐛 Troubleshooting

### Server Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process
kill -9 <PID>

# Restart server
npm run server
```

### API Token Issues

```bash
# Verify token is set
echo $PICSART_API_TOKEN

# Set token
export PICSART_API_TOKEN="your-token"
```

### Connection Errors

- Ensure server is running: `npm run server`
- Check browser console for errors (F12)
- Verify API token has sufficient credits

### TypeScript Errors

```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Tips & Best Practices

1. **Use Web Interface for Development**: Easier to debug with visual feedback
2. **Use CLI for CI/CD**: Automated testing in pipelines
3. **Monitor Credits**: Check your Picsart account credits before large test runs
4. **Adjust Concurrency**: Lower concurrency if hitting rate limits
5. **Save Results**: HTML reports are saved in `./artifacts/` folder
6. **Filter Results**: Use filters to quickly find failed tests

---

## 🔗 Quick Links

- **Web Interface**: https://webhook-checks-ui.vercel.app
- **Standalone Tester**: `webhook-tester.html`
- **API Documentation**: See `README.md`
- **Source Code**: `src/` directory
- **Test Specs**: `tests/magicFlowWebhooks.spec.ts`

---

## 📞 Support

For issues or questions:

1. Check the logs in the web interface
2. Review error messages in results
3. Verify API token and credits
4. Check network connectivity

---

**Happy Testing! 🎨✨**
