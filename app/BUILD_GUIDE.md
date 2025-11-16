# Expo App Build Guide - Create Downloadable APK/IPA

This guide will help you create a downloadable mobile app using Expo EAS Build.

## Prerequisites

Before you start, make sure you have:

- ✅ Node.js installed
- ✅ Expo CLI installed globally
- ✅ An Expo account (free)
- ✅ Git installed
- ✅ Internet connection

---

## Method 1: EAS Build (Recommended - Cloud Build)

This method builds your app in the cloud and provides a download link.

### Step 1: Install EAS CLI

```powershell
npm install -g eas-cli
```

### Step 2: Login to Expo

```powershell
cd app
eas login
```

Enter your Expo account credentials. If you don't have an account:

- Go to https://expo.dev/signup
- Create a free account
- Come back and run `eas login` again

### Step 3: Configure Your Project

```powershell
eas build:configure
```

This will:

- Create/update `eas.json` (already created for you)
- Link your project to Expo
- Generate a project ID

### Step 4: Build for Android (APK)

To create a downloadable APK file:

```powershell
eas build -p android --profile preview
```

**Options:**

- `-p android` = Build for Android
- `--profile preview` = Creates APK (directly installable)

**For production build:**

```powershell
eas build -p android --profile production
```

### Step 5: Build for iOS (IPA)

To create an iOS build:

```powershell
eas build -p ios --profile production
```

**Note:** iOS builds require an Apple Developer account ($99/year)

### Step 6: Get Your Download Link

After the build completes (5-15 minutes):

1. EAS will provide a download link in the terminal
2. Or visit: https://expo.dev/accounts/[your-account]/projects/mobile/builds
3. Share the link with anyone to download the APK

**Example output:**

```
✔ Build finished
🔗 Download link: https://expo.dev/artifacts/eas/[build-id].apk
```

---

## Method 2: Local Build (Alternative - Requires Android Studio)

If you want to build locally without cloud:

### For Android APK:

1. **Install Android Studio** and set up Android SDK

2. **Install expo-dev-client:**

```powershell
cd app
npx expo install expo-dev-client
```

3. **Build locally:**

```powershell
npx expo run:android --variant release
```

4. **Find APK at:**

```
app/android/app/build/outputs/apk/release/app-release.apk
```

---

## Method 3: Expo Go App (Quick Testing - No Build Needed)

For quick testing without building:

### Step 1: Install Expo Go on Your Phone

- Android: https://play.google.com/store/apps/details?id=host.exp.exponent
- iOS: https://apps.apple.com/app/expo-go/id982107779

### Step 2: Start Development Server

```powershell
cd app
npx expo start
```

### Step 3: Scan QR Code

- A QR code will appear in terminal
- Open Expo Go app on your phone
- Scan the QR code
- App will load directly on your phone

**Limitations:**

- Requires internet connection
- Cannot be shared with others
- Not a standalone app
- Some native modules may not work

---

## Quick Start Commands

### For Android APK (Most Common):

```powershell
# Navigate to app directory
cd C:\Users\Ayush Tripathi\Documents\GitHub\Major\app

# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build APK for Android
eas build -p android --profile preview

# Wait for build to complete, then download from provided link
```

### For iOS IPA:

```powershell
# Same steps as above, then:
eas build -p ios --profile production
```

---

## Build Profiles Explained

### 1. **Preview Profile** (Best for Testing)

```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

- Creates APK (Android) - directly installable
- Quick build time
- Perfect for sharing with testers
- No Google Play Store needed

### 2. **Production Profile** (For Store)

```json
"production": {
  "android": {
    "buildType": "apk"
  }
}
```

- Creates APK or AAB (Android App Bundle for Play Store)
- Optimized and minified
- Ready for production use

### 3. **Development Profile**

```json
"development": {
  "developmentClient": true,
  "distribution": "internal"
}
```

- Creates development build with debugging tools
- Hot reload enabled
- Larger file size

---

## Configuration Files

### app.json (Updated ✅)

```json
{
  "expo": {
    "name": "mobile",
    "slug": "mobile",
    "version": "1.0.0",
    "android": {
      "package": "com.ashu8840.mobile",
      "versionCode": 1
    },
    "ios": {
      "bundleIdentifier": "com.ashu8840.mobile"
    }
  }
}
```

**Important fields:**

- `package` (Android): Unique identifier for your app
- `bundleIdentifier` (iOS): Unique identifier for iOS
- `versionCode`: Integer version (increment for updates)
- `version`: Display version (e.g., "1.0.0")

### eas.json (Created ✅)

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

---

## Sharing Your App

### Option 1: Direct Download Link (From EAS Build)

After `eas build` completes:

1. Copy the download link from terminal
2. Share link with anyone
3. Users can download APK directly
4. Users need to enable "Install from Unknown Sources" on Android

### Option 2: QR Code

1. Go to https://expo.dev/accounts/[your-account]/projects/mobile/builds
2. Click on your build
3. Share the QR code
4. Users scan and download

### Option 3: Upload to Website

1. Download APK from EAS build link
2. Upload to your website/server
3. Share direct download link
4. Example: `https://yourwebsite.com/app-release.apk`

### Option 4: Google Play Store (For Public Release)

1. Build with `--profile production`
2. Create Google Play Console account ($25 one-time fee)
3. Upload AAB file to Play Store
4. Submit for review
5. Published apps appear in Play Store

---

## Troubleshooting

### Issue: "Not logged in"

```powershell
eas login
```

Enter your Expo credentials.

### Issue: "Project not configured"

```powershell
eas build:configure
```

### Issue: "Android package name already exists"

Change the package name in app.json:

```json
"android": {
  "package": "com.yourname.uniqueappname"
}
```

### Issue: Build fails with dependencies error

```powershell
cd app
rm -rf node_modules
npm install
eas build -p android --profile preview
```

### Issue: "Unable to install APK on phone"

1. Enable "Install from Unknown Sources" in Android settings
2. Go to Settings → Security → Unknown Sources → Enable
3. Try installing again

---

## Build Time and Cost

### EAS Build (Cloud):

- **Free Tier:**
  - 30 builds per month
  - Shared build queue
  - Build time: 5-15 minutes
- **Paid Tier ($29/month):**
  - Unlimited builds
  - Priority queue
  - Faster builds

### Local Build:

- **Cost:** Free
- **Time:** Depends on your computer (5-30 minutes)
- **Requires:** Android Studio or Xcode installed

---

## Complete Example Workflow

### Build Android APK and Share:

```powershell
# Step 1: Navigate to app directory
cd "C:\Users\Ayush Tripathi\Documents\GitHub\Major\app"

# Step 2: Install EAS CLI (if not installed)
npm install -g eas-cli

# Step 3: Login
eas login
# Enter: username@example.com
# Enter: your-password

# Step 4: Configure (first time only)
eas build:configure
# Press Enter to confirm

# Step 5: Build APK
eas build -p android --profile preview
# Select: Generate new keystore (if first time)
# Wait 5-15 minutes

# Step 6: Get download link
# Copy link from terminal output
# Example: https://expo.dev/artifacts/eas/abc123.apk

# Step 7: Share link or download and test
# Send link to testers
# Or download and install on your phone
```

---

## Updating Your App

When you make changes and want to rebuild:

### Update Version Numbers:

**app.json:**

```json
{
  "expo": {
    "version": "1.0.1", // Increment display version
    "android": {
      "versionCode": 2 // Increment integer version
    }
  }
}
```

### Rebuild:

```powershell
cd app
eas build -p android --profile preview
```

### Over-The-Air (OTA) Updates:

For small changes without rebuilding:

```powershell
eas update --branch production --message "Bug fixes"
```

Users will get updates automatically when they open the app.

---

## Recommended Workflow

### For Testing (Use This First):

```powershell
eas build -p android --profile preview
```

- Fast builds
- Direct APK download
- Easy to share with testers
- No store approval needed

### For Production (When Ready to Publish):

```powershell
eas build -p android --profile production
```

- Optimized build
- Smaller file size
- Ready for Play Store

### For Development:

```powershell
npx expo start
```

- Instant updates
- Hot reload
- Use Expo Go app
- No build needed

---

## Additional Resources

- **Expo Documentation:** https://docs.expo.dev/build/setup/
- **EAS Build Guide:** https://docs.expo.dev/build/introduction/
- **Expo Dashboard:** https://expo.dev/
- **Community Forum:** https://forums.expo.dev/

---

## Summary - Quick Steps

1. **Install EAS CLI:**

   ```powershell
   npm install -g eas-cli
   ```

2. **Login:**

   ```powershell
   cd app
   eas login
   ```

3. **Configure:**

   ```powershell
   eas build:configure
   ```

4. **Build APK:**

   ```powershell
   eas build -p android --profile preview
   ```

5. **Download and Share:**
   - Copy link from terminal
   - Download APK from link
   - Share with testers or install on your phone

**That's it! Your app is now downloadable!** 📱✨

---

## Next Steps

After your first successful build:

1. ✅ Test the APK on physical Android device
2. ✅ Share with beta testers
3. ✅ Collect feedback
4. ✅ Fix bugs and rebuild
5. ✅ When ready, submit to Google Play Store

For Play Store submission:

- Change build type to `aab` in eas.json for production
- Create app listing in Google Play Console
- Upload AAB file
- Fill in store details (description, screenshots, etc.)
- Submit for review (usually takes 1-3 days)

Good luck with your app! 🚀
