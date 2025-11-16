# Quick Start - Build Your Expo App

## 🚀 Fastest Way to Create Downloadable APK

### Step 1: Install EAS CLI

```powershell
npm install -g eas-cli
```

### Step 2: Navigate and Login

```powershell
cd "C:\Users\Ayush Tripathi\Documents\GitHub\Major\app"
eas login
```

### Step 3: Configure (First Time Only)

```powershell
eas build:configure
```

### Step 4: Build Android APK

```powershell
eas build -p android --profile preview
```

**⏱️ Wait 5-15 minutes** → You'll get a download link!

---

## 📱 Alternative: Use the Helper Script

Just double-click: **`build-app.bat`**

It provides a menu:

1. Install EAS CLI
2. Login to Expo
3. Configure Project
4. Build Android APK (Preview) ← Use this for testing
5. Build Android APK (Production)
6. Build iOS (Production)
7. View Builds Online
8. Start Development Server
9. Exit

---

## 📥 Download Your APK

After build completes:

- Copy the link from terminal
- Example: `https://expo.dev/artifacts/eas/abc123.apk`
- Download and install on Android phone
- Share link with others

---

## ⚠️ Important Notes

### First Time Setup:

1. Create Expo account at https://expo.dev/signup
2. Install EAS CLI: `npm install -g eas-cli`
3. Login: `eas login`
4. Configure: `eas build:configure`

### Android Installation:

- Enable "Install from Unknown Sources" in phone settings
- Settings → Security → Unknown Sources → Enable
- Then install the APK

### Build Limits:

- **Free:** 30 builds per month
- **Paid ($29/mo):** Unlimited builds

---

## 🔄 Making Updates

### Update Version in app.json:

```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

### Rebuild:

```powershell
eas build -p android --profile preview
```

---

## 📚 Full Documentation

See **BUILD_GUIDE.md** for complete instructions, troubleshooting, and advanced options.

---

## 🎯 What You Need

- ✅ Expo account (free)
- ✅ Internet connection
- ✅ 5-15 minutes for build
- ✅ Android phone for testing

---

## 🆘 Help

**Build fails?**

```powershell
cd app
rm -rf node_modules
npm install
eas build -p android --profile preview
```

**Not logged in?**

```powershell
eas login
```

**Need support?**

- Read: BUILD_GUIDE.md
- Visit: https://docs.expo.dev/build/setup/
- Ask: https://forums.expo.dev/

---

**That's it! Your app will be downloadable in minutes!** 🎉
