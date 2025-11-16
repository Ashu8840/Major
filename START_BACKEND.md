# 🚀 Quick Start - Backend Server

## Current Issue

Your admin panel is getting 404 errors because the **backend server is not running**.

## ✅ Solution: Start Backend Server

### Option 1: Quick Start (Recommended)

```powershell
cd backend
node server.js
```

**Keep this terminal window open!** The server must stay running.

### Option 2: Start All Servers at Once

Double-click: `start-all-servers.bat` (in root folder)

---

## ✅ Expected Output

When backend starts successfully, you should see:

```
✅ MongoDB Connected
Server running in development mode on port 5000
Listening on all network interfaces (0.0.0.0:5000)
Local: http://localhost:5000
Network: http://10.x.x.x:5000

Available routes:
  - /api/chatbot-training (Chatbot Training API)
  - /api/admin (Admin API)
  - /api/user (User API)
  ... and more
```

---

## 🔍 Verify It's Working

Open a **new PowerShell window** (keep backend running) and test:

```powershell
# Test backend health
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
    "categories": 10
  }
}
```

If you see this response, **backend is working!** ✅

---

## 📋 Full System Startup Sequence

1. **Terminal 1: Backend** (Port 5000)

   ```powershell
   cd backend
   node server.js
   ```

2. **Terminal 2: Admin Panel** (Port 5173)

   ```powershell
   cd admin
   npm run dev
   ```

3. **Terminal 3: Bot Server** (Port 5001) - Optional for now

   ```powershell
   cd Bot
   .\venv\Scripts\python.exe app.py
   ```

4. **Browser:**
   - Open: http://localhost:5173
   - Login as admin
   - Navigate to "Chatbot Training" ✨

---

## ⚡ After Backend Starts

Your admin panel should automatically work. Refresh the page:

**Before:**

```
❌ GET http://localhost:5000/api/chatbot-training 404 (Not Found)
```

**After:**

```
✅ GET http://localhost:5000/api/chatbot-training 200 (OK)
✅ Loaded 31 training items
✅ Analytics dashboard showing data
```

---

## 🎯 Next Steps

Once backend is running and admin panel loads:

1. **View Training Data:** See 31 pre-loaded Q&A pairs
2. **Add New Training:** Click "Add Training" button
3. **Test Query:** Click "Test Query" to see matching
4. **Bulk Import:** Upload JSON with multiple Q&As
5. **Export Data:** Download all training as JSON

---

## 🐛 Troubleshooting

### Port Already in Use

```powershell
# Find what's using port 5000
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

# Kill the process
Stop-Process -Id <PID> -Force
```

### MongoDB Connection Failed

Check your internet connection and `.env` file:

```
MONGO_URI=mongodb+srv://ayush:ayush@cluster0...
```

### Still Getting 404?

Make sure you're in the correct directory:

```powershell
cd "C:\Users\Ayush Tripathi\Documents\GitHub\Major\backend"
node server.js
```

---

## 📚 Documentation

- **Troubleshooting Guide:** `TROUBLESHOOTING.md` (detailed fixes)
- **System Architecture:** `CHATBOT_TRAINING_SYSTEM.md`
- **API Reference:** `CHATBOT_TRAINING_QUICKSTART.md`

---

**TL;DR:** Run `node server.js` in the `backend` folder and keep it running!
