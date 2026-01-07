# 🔧 Vercel Deployment - Complete Fix

## ✅ Your Local Server Works Perfectly!

The API works locally (tested successfully), so the issue is with Vercel deployment configuration.

---

## 🎯 Quick Fix Steps

### Step 1: Check Vercel Build Logs

1. Go to: https://vercel.com/dashboard
2. Click on your project: `webhook-checks-ui`
3. Click on the latest deployment
4. Look for **Build Logs** and **Function Logs**
5. Check for errors (red text)

**Common Errors:**
- Module not found
- Cannot find package
- TypeScript compilation failed
- Timeout during build

---

### Step 2: Verify Environment Variables

In Vercel Dashboard:
1. Settings → Environment Variables
2. Check: `PICSART_API_TOKEN` is set
3. Make sure it's enabled for: Production, Preview, Development

---

### Step 3: Update Vercel Configuration

Your `vercel.json` should look like this:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ]
}
```

---

### Step 4: Check Package.json

Ensure all dependencies are listed:

```json
{
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.19.27",
    "@vercel/node": "^3.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 🔍 Debugging the Issue

### Test Health Endpoint

I created a simple health check endpoint. After deploying, test it:

```bash
curl https://webhook-checks-ui.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "API is running",
  "timestamp": "2026-01-07T18:45:00.000Z",
  "env": {
    "hasApiToken": true,
    "nodeVersion": "v20.x.x"
  }
}
```

**If this works:** API is running, but test-all has issues
**If this fails:** Vercel can't execute any functions

---

## 🚨 Common Vercel Issues & Fixes

### Issue 1: "Cannot find module"

**Fix:** Add all source files to deployment

Update `.vercelignore` - remove these lines if present:
```
# Remove or comment out:
# src/
# api/
```

### Issue 2: ESM/CommonJS Conflicts

**Fix:** Ensure consistent module system

Check `package.json`:
```json
{
  "type": "module"  // This might cause issues
}
```

Try removing `"type": "module"` temporarily for Vercel.

### Issue 3: TypeScript Compilation

**Fix:** Vercel needs to compile TypeScript

Ensure `tsconfig.json` includes api folder:
```json
{
  "include": ["src/**/*", "api/**/*"]
}
```

### Issue 4: Function Timeout (Vercel Hobby: 10s)

**Fix:** For long-running tests, you need Vercel Pro

**Or:** Return immediately and poll separately:
```typescript
// Instead of SSE streaming (which times out)
// Return a job ID and poll for updates
```

---

## 🎯 Recommended Deployment Strategy

### Option A: Keep Current Setup (SSE)

**Requirements:**
- Vercel Pro (60s timeout)
- Or reduce webhooks per call

**Pros:**
- Real-time updates
- Current UI works as-is

**Cons:**
- Needs Pro tier for > 5 webhooks
- May timeout on Hobby tier

### Option B: Switch to Job-Based (Works on Hobby)

**Change API to:**
1. POST /api/test-all → Returns job ID immediately
2. GET /api/job/:id → Poll for status
3. Frontend polls every 2 seconds

**Pros:**
- Works on Hobby tier
- No timeout issues

**Cons:**
- Requires code changes
- Slightly more complex

---

## 🔧 Quick Fixes to Try

### Fix 1: Simplify vercel.json

```json
{
  "version": 2
}
```

That's it! Vercel auto-detects everything.

### Fix 2: Add build output config

```json
{
  "version": 2,
  "buildCommand": "npm install",
  "outputDirectory": "."
}
```

### Fix 3: Ensure files are committed

```bash
git add api/
git add vercel.json
git commit -m "Add API routes"
git push
```

---

## 🎯 Test Locally with Vercel CLI

This simulates Vercel environment:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Run locally (simulates Vercel)
vercel dev

# Test
curl -X POST http://localhost:3000/api/test-all \
  -H "Content-Type: application/json" \
  -d '{"webhookIds":["6931ce48369313fbac36ac0d"]}'
```

If this works but production doesn't → Check Vercel dashboard for deployment errors.

---

## 📋 Deployment Checklist

```
□ All files committed to git
□ api/ folder is in root directory
□ vercel.json is in root directory
□ package.json has @vercel/node
□ PICSART_API_TOKEN set in Vercel dashboard
□ Latest code pushed to git
□ Vercel redeployed automatically or manually
□ Check deployment logs for errors
□ Test /api/health endpoint first
□ Then test /api/test-all
```

---

## 🚀 Deploy Commands

```bash
# Commit everything
git add .
git commit -m "Fix Vercel API routes"
git push

# Or manual deploy
vercel --prod

# Check status
vercel ls

# View logs
vercel logs
```

---

## 📞 What to Share if Still Not Working

1. **Vercel Build Logs** - Copy/paste any errors
2. **Function Logs** - From Vercel dashboard
3. **Health endpoint result:**
   ```bash
   curl https://webhook-checks-ui.vercel.app/api/health
   ```
4. **Deployment status** - Screenshot from Vercel dashboard

---

**Your local server works perfectly! The issue is Vercel-specific. Check the deployment logs and try the health endpoint first!** 🔍


