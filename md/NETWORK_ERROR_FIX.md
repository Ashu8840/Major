# 🔧 MOBILE NETWORK ERROR - COMPLETE FIX GUIDE

## ❌ Current Problem

Your mobile app shows `Network Error` when trying to reach the backend:

```
ERROR [API] Error Network from /ai/prompts Network Error
ERROR [API] Error Network from /users/profile Network Error
```

The app **IS** trying to connect to the right URL: `http://10.218.218.93:5000/api`
But the connection is being **blocked**.

---

## ✅ STEP-BY-STEP FIX

### Step 1: Add Windows Firewall Rule (REQUIRED)

**Run PowerShell as Administrator** and execute:

```powershell
New-NetFirewallRule -DisplayName "Node.js Major Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow -Profile Private,Public
```

Or simply run:

```powershell
.\fix-firewall.ps1
```

**Why this is needed:** Windows Firewall blocks incoming connections by default. Your phone is trying to connect FROM external device TO your computer.

---

### Step 2: Verify Both Devices on Same WiFi

1. On your **phone**: Open WiFi settings, check network name
2. On your **computer**: Check WiFi connection
3. **MUST BE THE SAME NETWORK NAME**

**Common Issue:** Phone on mobile data or different WiFi network

---

### Step 3: Test Connection from Phone Browser

On your phone, open any browser (Chrome, Safari) and visit:

```
http://10.218.218.93:5000/api/users/login
```

**Expected result:** You should see JSON response (even if it's an error message)
**If you see nothing/timeout:** Firewall is blocking OR not on same WiFi

---

### Step 4: Restart Expo with Tunnel (Alternative Solution)

If firewall fix doesn't work, use Expo's tunnel mode:

```powershell
cd app
npx expo start --tunnel
```

This creates a public URL that works on ANY network (no WiFi required!).

---

## 🔍 Troubleshooting

### Issue: "Connection Refused" or "Network Error"

**Solutions (try in order):**

1. ✅ Add firewall rule (Step 1)
2. ✅ Check same WiFi (Step 2)
3. ✅ Test from browser (Step 3)
4. ✅ Use tunnel mode (Step 4)

### Issue: IP Address Changed

If your computer's IP changes (happens after restart/network change):

```powershell
# Get new IP
ipconfig | Select-String "IPv4"

# Update .env with new IP
# Edit app/.env and change the IP address
```

Then restart Expo:

```powershell
cd app
npx expo start --clear
```

### Issue: Backend Not Running

Check if backend is running:

```powershell
cd backend
npm start
```

You should see:

```
Server running in development mode on port 5000
MongoDB Connected: ...
```

---

## 📱 Testing Checklist

Before testing on phone:

- [ ] Backend running (see "Server running in development mode on port 5000")
- [ ] Firewall rule added (run fix-firewall.ps1 as Admin)
- [ ] Both devices on same WiFi network
- [ ] Expo server running (npx expo start)
- [ ] Phone connected to Expo (scan QR code)

If ALL checked and still not working:

- [ ] Try tunnel mode: `npx expo start --tunnel`

---

## 🎯 Quick Test

### From Your Phone Browser:

Visit: `http://10.218.218.93:5000/api/users/login`

**Good (Backend reachable):**

```json
{ "message": "Method not allowed" }
```

or any JSON response

**Bad (Blocked):**

- Page timeout
- "Cannot connect"
- "ERR_CONNECTION_REFUSED"

---

## 🚀 Current Status

✅ Backend is running on port 5000
✅ MongoDB connected
✅ .env configured with correct IP (10.218.218.93)
✅ App is trying to connect to correct URL

⚠️ **MISSING: Windows Firewall rule**
This is the #1 reason for network errors on physical devices.

---

## 💡 Why This Happens

When you use **localhost** or **emulator**, everything works because:

- Localhost = same machine = no firewall
- Emulator = same machine = no firewall

When you use **physical device**, you need:

- Computer's actual IP address (10.218.218.93) ✅ DONE
- Firewall rule to allow incoming connections ⚠️ NEEDS FIX
- Same WiFi network ⚠️ VERIFY

---

## 🔥 FASTEST FIX

**Right-click PowerShell → Run as Administrator**, then:

```powershell
New-NetFirewallRule -DisplayName "Node.js Major Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

That's it! Try the app again.

---

## 🆘 Still Not Working?

If you've done everything and still getting Network Error:

1. **Try Tunnel Mode** (works on ANY network):

   ```powershell
   cd app
   npx expo start --tunnel
   ```

2. **Check Windows Defender Firewall**:

   - Open Windows Security
   - Firewall & network protection
   - Allow an app through firewall
   - Make sure "Node.js" is checked for Private AND Public networks

3. **Temporarily disable firewall** (for testing only):

   ```powershell
   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
   ```

   Then test. If it works, you know it's firewall. Re-enable after:

   ```powershell
   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
   ```

---

## ✨ Success Indicators

You'll know it's working when:

1. ✅ Phone browser can load `http://10.218.218.93:5000/api/users/login`
2. ✅ App loads without Network Error
3. ✅ You see API request logs in Expo console
4. ✅ Backend shows incoming requests

---

**Next Step:** Run `fix-firewall.ps1` as Administrator, then test the app!
