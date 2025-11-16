# 🔧 Chatbot Training System - Troubleshooting Guide

## Current Issue: 404 Not Found Errors

### Problem

Admin panel showing errors:

```
GET http://localhost:5000/api/chatbot-training?page=1&limit=20 404 (Not Found)
GET http://localhost:5000/api/chatbot-training/analytics 404 (Not Found)
```

### Root Cause

**Backend server is not running on port 5000**

---

## ✅ Quick Fix (3 Steps)

### Step 1: Start Backend Server

```powershell
cd backend
node server.js
```

**Expected Output:**

```
✅ MongoDB Connected
Server running in development mode on port 5000
Listening on all network interfaces (0.0.0.0:5000)
Local: http://localhost:5000
Network: http://10.x.x.x:5000
```

### Step 2: Start Admin Panel

```powershell
cd admin
npm run dev
```

**Expected Output:**

```
VITE v5.x.x ready in X ms
➜  Local:   http://localhost:5173/
```

### Step 3: Access Admin Panel

1. Open browser: http://localhost:5173
2. Login as admin
3. Click "Chatbot Training" in sidebar (✨ sparkle icon)
4. Should see 31 training items loaded

---

## 🚀 Even Faster: Use the Batch File

Double-click: `start-all-servers.bat`

This will automatically start:

- ✅ Backend Server (Port 5000)
- ✅ Admin Panel (Port 5173)
- ✅ Bot Server (Port 5001)

---

## 🔍 Verification Checklist

### 1. Check Backend is Running

```powershell
# PowerShell command
Invoke-RestMethod -Uri "http://localhost:5000/api/chatbot-training/analytics"
```

**Expected Response:**

```json
{
  "success": true,
  "analytics": {
    "totalItems": 31,
    "activeItems": 31,
    "totalUsage": 0,
    "avgSuccessRate": 0,
    "byCategory": {...}
  }
}
```

### 2. Check Admin Panel Config

File: `admin/src/lib/apiClient.js`

```javascript
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
```

✅ This is correct - matches backend port

### 3. Check Backend Routes

File: `backend/server.js` (Line 234)

```javascript
app.use("/api/chatbot-training", chatbotTrainingRoutes);
```

✅ Routes are registered

### 4. Check Database

```powershell
# Should show 31 training items
cd backend
node -e "require('./config/db')(); const CT = require('./models/ChatbotTraining'); CT.find().then(d => console.log('Count:', d.length)).then(() => process.exit())"
```

---

## 📋 System Architecture

```
┌─────────────────┐
│  Admin Panel    │  Port 5173
│  (React/Vite)   │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│ Backend Server  │  Port 5000
│ (Node/Express)  │
└────────┬────────┘
         │ MongoDB
         ↓
┌─────────────────┐
│   MongoDB Atlas │
│ (Cluster0)      │
└─────────────────┘
```

---

## 🐛 Common Issues

### Issue 1: Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Fix:**

```powershell
# Find process using port 5000
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object OwningProcess

# Kill the process (replace PID with actual number)
Stop-Process -Id <PID> -Force

# Or restart backend on different port
$env:PORT=5001; node server.js
```

### Issue 2: MongoDB Connection Failed

**Error:** `MongooseServerSelectionError`

**Fix:**

1. Check internet connection
2. Verify `.env` file has correct MONGO_URI
3. Check MongoDB Atlas whitelist (allow all IPs: 0.0.0.0/0)

### Issue 3: Admin Authentication Failed

**Error:** `401 Unauthorized`

**Fix:**

1. Clear browser localStorage: `localStorage.clear()`
2. Re-login to admin panel
3. Verify you're using admin account (check `backend/scripts/createAdmin.js`)

### Issue 4: Routes Not Found After Starting Server

**Error:** `404 Not Found` even though server is running

**Fix:**

```powershell
# Stop server (Ctrl+C)
# Clear node cache
rm -Recurse -Force node_modules\.cache

# Restart server
node server.js
```

---

## 📊 Test API Endpoints Manually

### 1. Get All Training Data

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
}
Invoke-RestMethod -Uri "http://localhost:5000/api/chatbot-training?page=1&limit=20" -Headers $headers
```

### 2. Get Analytics

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
}
Invoke-RestMethod -Uri "http://localhost:5000/api/chatbot-training/analytics" -Headers $headers
```

### 3. Test Query (Public - No Auth)

```powershell
$body = @{
    question = "How do I create a diary entry?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/chatbot-training/query" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### 4. Add Training Data

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
    "Content-Type" = "application/json"
}
$body = @{
    question = "How do I enable dark mode?"
    answer = "Go to Settings > Appearance > Theme > Select Dark Mode"
    category = "features"
    priority = 7
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/chatbot-training" `
    -Method Post `
    -Headers $headers `
    -Body $body
```

---

## 🎯 Success Indicators

When everything is working correctly, you should see:

### Backend Console:

```
✅ MongoDB Connected
✅ Server running in development mode on port 5000
✅ Chatbot training routes registered
```

### Admin Panel Console:

```
✅ Loaded 31 training items
✅ Analytics: { totalItems: 31, activeItems: 31 }
✅ Categories: 10 total
```

### Browser Network Tab:

```
✅ GET /api/chatbot-training?page=1&limit=20 → 200 OK
✅ GET /api/chatbot-training/analytics → 200 OK
```

---

## 📚 Related Documentation

- **System Architecture:** `CHATBOT_TRAINING_SYSTEM.md`
- **Quick Start Guide:** `CHATBOT_TRAINING_QUICKSTART.md`
- **Seed Data Script:** `backend/scripts/seedChatbotTraining.js`

---

## 💡 Pro Tips

1. **Keep Terminals Open:** Don't close backend/admin/bot terminal windows
2. **Check Logs:** If errors occur, check server console for detailed logs
3. **Hot Reload:** Admin panel has hot reload - changes apply instantly
4. **Database Seeding:** Already done (31 items), but you can re-run:
   ```powershell
   cd backend
   node scripts/seedChatbotTraining.js
   ```

---

## 🆘 Still Not Working?

If you've tried all the above and still facing issues:

1. **Restart Everything:**

   ```powershell
   # Close all terminal windows
   # Delete node_modules and reinstall
   cd backend
   rm -Recurse -Force node_modules
   npm install

   cd ../admin
   rm -Recurse -Force node_modules
   npm install
   ```

2. **Check System Requirements:**

   - Node.js v18+ installed
   - MongoDB Atlas accessible
   - Ports 5000, 5001, 5173 available

3. **Review Error Logs:**
   - Backend console for API errors
   - Browser DevTools Console for frontend errors
   - Network tab for request/response details

---

**Last Updated:** November 8, 2025  
**System Version:** 1.0.0  
**Status:** ✅ All components implemented and tested
