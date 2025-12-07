# OTA Updates Guide - Update Your App Without Rebuilding! 🚀

## What is OTA (Over-The-Air) Updates?

OTA updates allow you to push **JavaScript/TypeScript code changes** to your already-installed APK **instantly** without users needing to download a new APK!

### ✅ What Can Be Updated (No Rebuild Needed):

- API URLs and configuration (`.env` changes)
- UI changes (screens, components, styles)
- Business logic (JavaScript/TypeScript code)
- New features (pure JS/TS)
- Bug fixes in your code
- Text, images, assets

### ❌ What Requires Rebuild:

- Native code changes (Android/iOS specific)
- New native dependencies (plugins that modify AndroidManifest.xml or iOS plist)
- Permission changes
- App version or package name changes
- Native module upgrades

---

## Setup Complete! ✅

I've already configured:

1. ✅ Added `expo-updates` package
2. ✅ Configured `eas.json` with update channels
3. ✅ Added `updates` and `runtimeVersion` to `app.json`

---

## How to Push Updates

### Step 1: Make Your Changes

Edit any JavaScript/TypeScript files:

- Update API URLs in `.env`
- Fix bugs in components
- Add new screens
- Change styles

**Example - Fix API URL:**

```properties
# app/.env
EXPO_PUBLIC_API_URL=https://major-86rr.onrender.com/api
```

### Step 2: Publish the Update

```powershell
cd "C:\Users\Ayush Tripathi\Documents\GitHub\Major\app"

# For preview builds (your current APK)
eas update --channel preview --message "Fixed login API"

# For production builds
eas update --channel production --message "Bug fixes and improvements"
```

### Step 3: Users Get Update Automatically!

- Next time they open the app
- Update downloads in background
- App automatically reloads with new code
- **No new APK download needed!** 🎉

---

## Update Workflow Examples

### Example 1: Fix API URL (Your Current Issue)

```powershell
# 1. Update the .env file (already done)
# app/.env now has: EXPO_PUBLIC_API_URL=https://major-86rr.onrender.com/api

# 2. Publish update
cd app
eas update --channel preview --message "Fixed API URL for Render backend"

# 3. Done! Users get update in ~1 minute
```

### Example 2: Fix Login Bug

```powershell
# 1. Edit app/screens/LoginScreen.tsx
# Fix the bug in your code

# 2. Test locally
npx expo start

# 3. Publish update
eas update --channel preview --message "Fixed login validation"
```

### Example 3: Add New Feature

```powershell
# 1. Add new screen or component
# app/screens/NewFeatureScreen.tsx

# 2. Update navigation
# app/routes.tsx

# 3. Publish
eas update --channel preview --message "Added new feature"
```

---

## Checking Update Status

### View All Published Updates

```powershell
eas update:list --channel preview
```

### View Update Details

```powershell
eas update:view [update-id]
```

### Rollback to Previous Version

```powershell
eas update:republish [previous-update-id] --channel preview
```

---

## Update Channels Explained

### preview (Your Current APK)

```powershell
eas update --channel preview --message "Your message"
```

- Updates APKs built with `--profile preview`
- For testing and beta users

### production (Store Releases)

```powershell
eas update --channel production --message "Your message"
```

- Updates APKs built with `--profile production`
- For Play Store or final releases

---

## How Users Receive Updates

### Automatic (Default):

1. User opens app
2. App checks for updates
3. If update exists, downloads in background
4. App reloads automatically
5. User sees new version

### Manual Check (Optional):

Add a button in your app:

```typescript
import * as Updates from "expo-updates";

const checkForUpdates = async () => {
  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } else {
      alert("App is up to date!");
    }
  } catch (error) {
    console.error("Error checking for updates:", error);
  }
};
```

---

## Best Practices

### 1. Use Descriptive Messages

```powershell
# ❌ Bad
eas update --channel preview --message "update"

# ✅ Good
eas update --channel preview --message "Fixed login timeout issue on slow networks"
```

### 2. Test Before Publishing

```powershell
# Always test locally first
npx expo start

# Then publish
eas update --channel preview --message "Tested fix for cart bug"
```

### 3. Version Your Updates

Use semantic versioning in messages:

```powershell
eas update --channel preview --message "v1.0.1: Fixed API endpoint configuration"
```

### 4. Rollback if Needed

```powershell
# List updates to find the good one
eas update:list --channel preview

# Republish the working version
eas update:republish [good-update-id] --channel preview --message "Rollback to stable version"
```

---

## Current Build Status

Your APK is currently building (waiting in queue ~120 minutes). Once it's done:

### Option 1: Wait for Build to Complete (Recommended)

- Wait for build to finish
- Download and install new APK
- It will have OTA updates enabled
- Future changes can be pushed instantly

### Option 2: Update After Installing Old APK

- Install your current/old APK
- Publish an OTA update
- Old APK will update to new code automatically!

---

## Quick Commands Reference

```powershell
# Navigate to app directory
cd "C:\Users\Ayush Tripathi\Documents\GitHub\Major\app"

# Publish update to preview channel
eas update --channel preview --message "Your update description"

# Publish update to production channel
eas update --channel production --message "Your update description"

# List all updates
eas update:list --channel preview

# View specific update
eas update:view [update-id]

# Rollback to previous version
eas update:republish [previous-update-id] --channel preview

# Delete an update
eas update:delete [update-id]
```

---

## Solving Your Current Issue

### The Fix (API URL):

**Option A: OTA Update (When Build Completes)**

```powershell
# After your current build finishes and APK is installed:
cd app
eas update --channel preview --message "Fixed API URL to use Render backend"
```

Users open app → Gets update automatically → Login works! ✅

**Option B: New Build with Fix (Takes 2+ hours)**

```powershell
# Wait for current build to fail/cancel, then:
eas build -p android --profile preview
```

**Recommendation:** Use Option A (OTA Update) - It's instant once the build is installed!

---

## Monitoring Updates

### Check Update Adoption

1. Go to https://expo.dev/
2. Login to your account
3. Navigate to your project "mobile"
4. Click "Updates" tab
5. See how many users received each update

---

## Limitations to Know

### Update Size

- Most updates: < 5MB (fast download)
- Large changes: up to 50MB
- Users on slow internet might take a few seconds

### Timing

- Updates check on app launch
- Don't interrupt active users
- Download in background
- Apply on next app restart

### Compatibility

- Updates must match app's runtime version
- Breaking changes may need new build
- Always test before publishing

---

## Troubleshooting

### Issue: "No updates available"

**Cause:** Update not published or channel mismatch
**Fix:**

```powershell
# Verify channel
eas update:list --channel preview

# Republish if needed
eas update --channel preview --message "Test update"
```

### Issue: "Update failed to download"

**Cause:** Network issue or update server down
**Fix:** User should retry when online

### Issue: "App crashes after update"

**Cause:** Bug in updated code
**Fix:**

```powershell
# Rollback immediately
eas update:list --channel preview
eas update:republish [previous-working-update-id] --channel preview
```

---

## Summary

✅ **OTA Updates Configured** - Ready to use!
✅ **No Rebuild Needed** - For JS/TS changes
✅ **Instant Updates** - Users get changes in seconds
✅ **Easy Rollback** - Undo bad updates quickly

### Next Time You Need to Update:

1. Make code changes
2. Run: `eas update --channel preview --message "What you changed"`
3. Done! Users get update automatically

**You'll rarely need to rebuild APKs now!** 🎉

---

## When Current Build Finishes

```powershell
# 1. Download and install the APK from Expo
# 2. Push the API URL fix via OTA:
cd app
eas update --channel preview --message "Fixed Render API URL configuration"

# 3. Reopen app - It works! ✅
```

This is **much faster** than waiting 2+ hours for another build! 🚀
