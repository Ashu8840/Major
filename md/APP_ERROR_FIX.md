# 🔧 React Native App - Error Fix Guide

## 🐛 Errors Identified

### 1. Metro Bundler Error

```
Error: ENOENT: no such file or directory, open 'InternalBytecode.js'
```

**Cause:** Metro bundler cache corruption

### 2. Authentication Errors

```
ERROR [API] Error 401 from /entries/mine {"message": "Not authorized, token failed"}
ERROR [API] Error 401 from /users/profile {"message": "Not authorized, token failed"}
```

**Cause:** Invalid or expired authentication token

---

## ✅ Solution 1: Fix Metro Bundler Cache

### Quick Fix (Recommended):

```powershell
cd app
npx expo start --clear
```

### If Still Failing:

```powershell
# Stop all Metro processes
taskkill /F /IM node.exe /T

# Delete cache directories
rd /s /q .expo
rd /s /q node_modules\.cache
rd /s /q %TEMP%\metro-*
rd /s /q %TEMP%\react-*

# Restart with clean cache
npx expo start --clear
```

### Or Use the Batch File:

```powershell
.\clear-app-cache.bat
```

---

## ✅ Solution 2: Fix Authentication Token

The 401 errors mean your authentication token is invalid. This happens when:

1. Token expired (backend tokens expire after some time)
2. Backend was redeployed (invalidates old tokens)
3. User logged out on another device

### Fix: Re-login to the App

**On Android/iOS Device:**

1. Open the Diaryverse app
2. If already logged in, logout:
   - Go to **Profile** → **Settings** → **Logout**
3. Login again with your credentials
4. New token will be issued by Render backend

**Clear App Storage (If Logout Doesn't Work):**

**Android:**

1. Long press app icon → **App Info**
2. **Storage** → **Clear Storage** → **Clear All Data**
3. Reopen app and login

**iOS:**

1. Delete and reinstall the app
2. Or go to Settings → General → iPhone Storage → Diaryverse → Delete App

---

## 🧪 Test After Fix

### Test 1: Metro Bundler

After clearing cache, you should see:

```
✓ Metro running on port 8081
✓ Bundled successfully
✓ No InternalBytecode.js errors
```

### Test 2: Authentication

After re-login, you should see:

```
LOG [API] Response 200 from /users/profile
LOG [API] Response 200 from /entries/mine
LOG [API] Response 200 from /analytics/overview
```

**No 401 errors!** ✅

---

## 🔍 Why This Happened

### InternalBytecode.js Error:

- Metro bundler creates temporary files for code transformation
- Sometimes these get corrupted or deleted while app is running
- Common after:
  - System crashes
  - Force-closing Metro
  - Disk cleanup tools
  - Antivirus interference

### 401 Token Errors:

- Backend deployed on Render uses JWT tokens
- Tokens expire for security (usually 7-30 days)
- When backend redeploys, JWT secret might change
- Old tokens become invalid

---

## 📋 Step-by-Step Fix Checklist

### Phase 1: Clear Metro Cache

- [ ] Stop Metro bundler (Ctrl+C in terminal)
- [ ] Close all Expo Dev Tools windows
- [ ] Run `npx expo start --clear`
- [ ] Wait for "Bundled successfully"
- [ ] Verify no InternalBytecode errors in console

### Phase 2: Fix Authentication

- [ ] Open app on device/emulator
- [ ] Logout from app (Profile → Settings → Logout)
- [ ] Close app completely
- [ ] Reopen app
- [ ] Login with valid credentials
- [ ] Check console shows "Response 200" (not 401)

### Phase 3: Verify Working

- [ ] Navigate to Home screen
- [ ] See your diary entries load
- [ ] Profile picture displays
- [ ] No red error messages
- [ ] Analytics data loads

---

## 🚀 Complete Reset (Nuclear Option)

If issues persist after above fixes:

### 1. Clean Everything

```powershell
cd app

# Delete cache
rd /s /q .expo
rd /s /q node_modules\.cache
rd /s /q node_modules

# Reinstall dependencies
npm install

# Clear Metro
npx expo start --clear
```

### 2. Reset App Data

**Android:**

```
Settings → Apps → Diaryverse → Storage → Clear All Data
```

**iOS:**

```
Delete app → Reinstall from Expo Go
```

### 3. Fresh Login

1. Open app
2. Create new account OR
3. Login with existing account
4. Fresh token will be issued

---

## 🛡️ Prevent Future Issues

### Metro Cache:

1. **Always use `--clear` flag** when Metro acts weird:

   ```powershell
   npx expo start --clear
   ```

2. **Don't force-close Metro** - Use Ctrl+C gracefully

3. **Exclude from antivirus:**
   - Add `app/.expo/` to antivirus exclusions
   - Add `node_modules/` to exclusions

### Authentication:

1. **Logout properly** when switching accounts
2. **Re-login periodically** if app shows auth errors
3. **Check backend is up** before debugging app:
   ```powershell
   Invoke-RestMethod -Uri "https://major-86rr.onrender.com/api/users/health"
   ```

---

## 🔧 Quick Commands Reference

### Clear Metro Cache:

```powershell
npx expo start --clear
```

### Kill Metro Processes:

```powershell
taskkill /F /IM node.exe /T
```

### Delete Expo Cache:

```powershell
rd /s /q app\.expo
```

### Check Backend Health:

```powershell
curl https://major-86rr.onrender.com/api/users/health
```

### Fresh Start:

```powershell
cd app
npx expo start --clear --reset-cache
```

---

## 📱 App-Specific Fixes

### If App Won't Start:

```powershell
# Clear everything
cd app
rd /s /q .expo
rd /s /q node_modules
npm install
npx expo start --clear
```

### If Login Screen Doesn't Appear:

1. Clear app storage on device
2. Reinstall app
3. Check network connection
4. Verify backend URL in `.env`:
   ```
   EXPO_PUBLIC_API_URL=https://major-86rr.onrender.com/api
   ```

### If API Calls Fail:

1. Check internet connection
2. Check Render backend is awake (cold start = 30-60s)
3. Try in browser: https://major-86rr.onrender.com
4. Check app console for actual error messages

---

## 🎯 Current Status

After following this guide:

**Before:**

```
❌ InternalBytecode.js error (Metro crash)
❌ 401 Unauthorized errors
❌ Profile not loading
❌ Entries not loading
```

**After:**

```
✅ Metro bundler running clean
✅ 200 OK responses from API
✅ Profile loads correctly
✅ Entries display properly
✅ Analytics working
```

---

## 📚 Related Documentation

- **Backend Setup:** `RENDER_CONFIGURATION.md`
- **App Configuration:** `app/.env`
- **API Documentation:** Backend API docs
- **Troubleshooting:** `TROUBLESHOOTING.md`

---

## 🆘 Still Not Working?

### Debug Checklist:

1. **Metro console** - Look for actual error (not just InternalBytecode)
2. **App console** - Check what API endpoint is failing
3. **Network tab** - Verify requests going to correct URL
4. **Render logs** - Check if backend is responding

### Common Issues:

**"Cannot connect to Metro"**

- Metro not running on port 8081
- Run: `npx expo start`

**"Network request failed"**

- Backend sleeping (Render cold start)
- Wait 60 seconds, refresh app

**"Invalid credentials"**

- Wrong email/password
- Create new account or reset password

**"Token expired"**

- Logout and login again
- Fresh token will be issued

---

**Last Updated:** November 17, 2025  
**Status:** ✅ Solutions provided for both errors
