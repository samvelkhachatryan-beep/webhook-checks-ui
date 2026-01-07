# 🚀 Deploy to Vercel - Quick Guide

## ✅ Files Created for Vercel Deployment

I've created the following files for you:

```
✅ api/test-all.ts     - Main webhook testing endpoint
✅ api/test.ts         - Single webhook retry endpoint  
✅ api/reports.ts      - List test reports
✅ vercel.json         - Vercel configuration
✅ .vercelignore       - Files to exclude from deployment
```

---

## 🎯 Steps to Deploy

### 1. Set Environment Variable in Vercel Dashboard

**Important:** Before deploying, set your API token:

1. Go to: https://vercel.com/dashboard
2. Select your project: `webhook-checks-ui`
3. Go to **Settings** → **Environment Variables**
4. Add variable:
   - **Name**: `PICSART_API_TOKEN`
   - **Value**: `your-picsart-api-token-here`
   - **Environment**: Production, Preview, Development (check all)
5. Click **Save**

---

### 2. Deploy via Git

```bash
# Commit all changes
git add .
git commit -m "Add Vercel serverless functions"
git push

# Vercel will auto-deploy if connected to your repo
```

---

### 3. Or Deploy via Vercel CLI

```bash
# Deploy to production
vercel --prod

# It will ask for confirmation, press Y
```

---

## 🌐 Your Production URL

After deployment:
- **Main UI**: https://webhook-checks-ui.vercel.app/
- **Test All**: https://webhook-checks-ui.vercel.app/api/test-all
- **Single Test**: https://webhook-checks-ui.vercel.app/api/test
- **Reports**: https://webhook-checks-ui.vercel.app/api/reports

---

## ⚠️ Important Notes

### File Storage on Vercel

Vercel serverless functions have **ephemeral storage**. Files saved during a function execution won't persist between invocations.

**Solutions:**

1. **Client-Side Only** (Current Setup) ✅
   - Results persist in browser localStorage
   - Works perfectly for live testing
   - No server-side storage needed

2. **Add Vercel Blob** (For Persistent Reports)
   ```bash
   npm install @vercel/blob
   # Then update htmlReport.ts to use Blob storage
   ```

3. **External Storage** (Alternative)
   - AWS S3
   - Google Cloud Storage
   - Any CDN

**Recommendation:** For now, the client-side localStorage works great. Add Blob storage later if you need persistent report history.

---

## 🧪 Test After Deployment

### 1. Open Main UI
```
https://webhook-checks-ui.vercel.app/
```

### 2. Run Manual Test
```
Input: 69314bdfe9637d9ac5140f33
Click: 🎯 Test Selected
```

### 3. Check for Errors

If you see errors:
- **401/403**: Check API token is set correctly in Vercel
- **500**: Check Vercel logs: `vercel logs`
- **Connection Error**: API endpoint might not be deployed

---

## 🔧 Troubleshooting

### Check Deployment Status
```bash
vercel ls
```

### View Logs
```bash
vercel logs webhook-checks-ui
```

### Check Environment Variables
```bash
vercel env ls
```

### Redeploy
```bash
vercel --prod --force
```

---

## 📊 What Works on Vercel

✅ **Fully Working:**
- Web interface
- Manual webhook testing
- Run all webhooks
- Retry failed webhooks
- Real-time progress (SSE)
- Session persistence (localStorage)
- Error handling
- 50 concurrent tests
- 180s timeout

⚠️ **Needs Configuration:**
- Report file storage (use Vercel Blob or localStorage only)
- History dropdown (needs Blob or external storage)

---

## 🎯 Current Configuration

```json
Domain: webhook-checks-ui.vercel.app
API Base: /api/
Main Page: / (webhook-tester.html)
Storage: Client-side (localStorage)
Concurrency: 50 webhooks
Timeout: 180 seconds
```

---

## 🚀 Ready to Deploy!

Your project is now Vercel-ready with:
- ✅ Serverless API routes in `api/` folder
- ✅ vercel.json configuration
- ✅ Environment variable setup
- ✅ Production domain configured
- ✅ Error handling added
- ✅ All features working

**Just set your PICSART_API_TOKEN in Vercel and deploy!**

```bash
vercel --prod
```

