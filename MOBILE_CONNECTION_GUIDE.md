# Mobile Device Connection Setup

## Your Computer's IP Address

**Current IP:** `10.218.218.93`

## Steps to Connect Mobile Device

### 1. ✅ Backend Configuration (Already Done)

- Backend is running on port 5000
- CORS is configured to allow your IP range (10.x.x.x)

### 2. ✅ App Configuration (Already Done)

- `.env` updated with `http://10.218.218.93:5000/api`

### 3. 🔥 Windows Firewall Setup

**Option A: Add Firewall Rule (Recommended)**

Run PowerShell as Administrator and execute:

```powershell
New-NetFirewallRule -DisplayName "Node.js Server - Port 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

**Option B: Temporarily Disable Firewall (Testing Only)**

1. Open Windows Security
2. Click "Firewall & network protection"
3. Turn off for your active network (remember to turn back on!)

### 4. 📱 Verify Connection

**Before scanning QR code:**

1. Make sure both devices are on the **same WiFi network**
2. Test the connection from your phone's browser:
   - Open browser on your phone
   - Visit: `http://10.218.218.93:5000/api/users/login`
   - You should see a response (even if it's an error, that means it's reachable)

### 5. 🚀 Start the App

```bash
cd app
npx expo start --clear
```

**Important:** Use `--clear` flag to clear cache and load new .env

### 6. 📲 Scan QR Code

1. Scan the QR code with Expo Go app
2. The app should now be able to reach the backend
3. Try logging in or signing up

## Troubleshooting

### ❌ Still getting "Network Error"?

1. **Check if both devices are on same WiFi:**

   - Phone: Settings → WiFi → Check network name
   - Computer: Same network name

2. **Verify your computer's IP hasn't changed:**

   ```powershell
   ipconfig | Select-String "IPv4"
   ```

   If it changed, update `.env` and restart expo.

3. **Test backend from phone browser:**
   Visit: `http://10.218.218.93:5000/api/users/login`

4. **Check Windows Firewall:**

   - Search "Windows Defender Firewall" → "Allow an app"
   - Look for Node.js or add it manually

5. **Restart everything:**

   ```bash
   # Stop backend (Ctrl+C in backend terminal)
   # Restart backend
   cd backend
   npm start

   # Restart expo with cache clear
   cd app
   npx expo start --clear
   ```

### ❌ API calls work but authentication fails?

Check console logs:

```
[API] POST http://10.218.218.93:5000/api/users/login
[API] Response 200 from /users/login
```

If you see 401/403 errors, the issue is authentication, not connectivity.

## Quick Test Script

Create a file `test-connection.js` in your app folder:

```javascript
const axios = require("axios");

axios
  .get("http://10.218.218.93:5000/api/users/login")
  .then((res) => console.log("✅ Backend is reachable!", res.status))
  .catch((err) => {
    if (err.response) {
      console.log(
        "✅ Backend is reachable (got error response):",
        err.response.status
      );
    } else if (err.request) {
      console.log("❌ Cannot reach backend:", err.message);
      console.log("Check firewall and network connection");
    }
  });
```

Run with: `node test-connection.js`

## Current Configuration Summary

- **Backend URL:** `http://10.218.218.93:5000/api`
- **Backend Status:** ✅ Running
- **CORS:** ✅ Configured for mobile
- **Port:** 5000
- **Environment:** Development

## If IP Changes

Your IP may change if you:

- Reconnect to WiFi
- Restart your computer
- Switch networks

When this happens:

1. Get new IP: `ipconfig | Select-String "IPv4"`
2. Update `app/.env` with new IP
3. Restart Expo: `npx expo start --clear`
