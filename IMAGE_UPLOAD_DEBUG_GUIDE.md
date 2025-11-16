# Image Upload Debugging Guide

## Overview

This guide explains the image upload flow and debugging steps for the mobile diary entry feature.

## Changes Made

### 1. Mobile App - Enhanced Logging (`app/services/api.ts`)

- Added detailed logging in `buildEntryFormData` to show image details
- Added logging in `createDiaryEntry` to confirm image is being sent
- Logs show: uri, name, type of image being uploaded

### 2. Mobile App - Image Picker Feedback (`app/screens/NewEntryScreen.tsx`)

- Added detailed logging when image is selected
- Shows: uri, fileName, width, height, fileSize
- Added success alert when image is selected
- Enhanced submit logging to track image upload

### 3. Backend - Enhanced Logging (`backend/controllers/entryController.js`)

- Added comprehensive debug logging in `createEntry`
- Shows: body fields, file info (fieldname, originalname, mimetype, size, path)
- Logs Cloudinary upload process
- Logs media record creation

### 4. Backend - Improved Multer Config (`backend/routes/entryRoutes.js`)

- Added automatic uploads directory creation
- Added 5MB file size limit
- Enhanced logging in multer middleware
- Shows: destination, filename, fileFilter calls

### 5. Backend - Route Middleware Logging

- Added detailed logging in POST /api/entries route
- Shows: body fields, file presence, file details
- Helps track if file reaches the route handler

## Image Upload Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User selects image via ImagePicker                           │
│    - Returns asset with uri, fileName, dimensions, size         │
│    - Logs: [ImagePicker] Selected image: {...}                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. handleSubmit called with imageUri                            │
│    - Logs: [handleSubmit] Submitting entry with image: {...}    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. createDiaryEntry builds FormData                             │
│    - buildEntryFormData appends image object                    │
│    - Logs: [buildEntryFormData] Adding image to FormData: {...} │
│    - Logs: [createDiaryEntry] Sending FormData with image: true │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. axios POST to /api/entries with multipart/form-data          │
│    - Headers: Content-Type: multipart/form-data                 │
│    - Logs: [API] POST http://IP:5000/api/entries                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Backend route receives request                               │
│    - Multer processes multipart data                            │
│    - Logs: Multer fileFilter called for: [filename]             │
│    - Logs: Multer filename generated: [filename]                │
│    - Logs: === ENTRY ROUTE MIDDLEWARE ===                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. createEntry controller processes request                     │
│    - Logs: === CREATE ENTRY DEBUG ===                           │
│    - If req.file exists: uploads to Cloudinary                  │
│    - Creates Media model record                                 │
│    - Saves entry with media reference                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Success response sent back                                   │
│    - Entry with populated media                                 │
│    - Alert: "Entry saved... Image uploaded successfully!"       │
└─────────────────────────────────────────────────────────────────┘
```

## Debugging Steps

### Step 1: Test Image Picker

1. Open mobile app
2. Navigate to New Entry
3. Tap "Choose from library" button
4. Select an image
5. **Expected Logs:**
   ```
   [ImagePicker] Selected image: {
     uri: "file:///...",
     fileName: "...",
     width: ...,
     height: ...,
     fileSize: ...
   }
   ```
6. **Expected UI:** Alert saying "Image selected"
7. **Expected State:** Image preview shown in form

### Step 2: Test Submit with Image

1. Fill in title and content
2. Ensure image is selected
3. Tap "Publish now"
4. **Expected Logs (Mobile):**
   ```
   [handleSubmit] Submitting entry with image: { hasImage: true, ... }
   [buildEntryFormData] Adding image to FormData: { uri, name, type }
   [createDiaryEntry] Sending FormData with image: true
   [API] POST http://10.x.x.x:5000/api/entries
   ```

### Step 3: Check Backend Logs

1. Watch backend console during submit
2. **Expected Logs (Backend):**
   ```
   Multer fileFilter called for: [filename] [mimetype]
   Multer filename generated: entry-[timestamp].jpg
   === ENTRY ROUTE MIDDLEWARE ===
   File received: YES
   File details: { fieldname: 'image', ... }
   === CREATE ENTRY DEBUG ===
   File info: { originalname, mimetype, size, path }
   Uploading image to Cloudinary: uploads/entry-[timestamp].jpg
   Cloudinary upload successful: https://...
   Media record saved: [id]
   ```

### Step 4: Verify Success

1. Entry should save successfully
2. Alert should say "Image uploaded successfully!"
3. Diary screen should show entry with image
4. Backend uploads/ directory should have new file

## Common Issues and Solutions

### Issue 1: Image not selected

**Symptom:** No image preview, no logs from ImagePicker
**Solution:**

- Check permission granted: should show Alert if denied
- Verify ImagePicker.requestMediaLibraryPermissionsAsync() returns granted
- Try different image from library

### Issue 2: Image selected but not sent

**Symptom:** Image preview shows, but backend logs "No file"
**Solution:**

- Check mobile logs for FormData building
- Verify imageUri is not null in handleSubmit
- Check axios logs show POST request sent
- Verify FormData format: { uri, name, type }

### Issue 3: Backend receives no file

**Symptom:** Mobile sends, but backend logs "File received: NO"
**Solution:**

- Check multer middleware is attached to route
- Verify field name is "image" (matches formData.append("image", ...))
- Check Content-Type header is multipart/form-data
- Verify multer fileFilter accepts the mime type

### Issue 4: Cloudinary upload fails

**Symptom:** File received, but Cloudinary error
**Solution:**

- Check .env has CLOUDINARY\_\* variables
- Verify cloudinary.js config is correct
- Check file path is accessible: uploads/entry-\*.jpg
- Check Cloudinary quota/limits

### Issue 5: Media model save fails

**Symptom:** Cloudinary succeeds, but Media.save() error
**Solution:**

- Check Media model schema
- Verify owner field is set to req.user.\_id
- Check all required fields are provided

## Testing Checklist

- [ ] Image picker opens and allows selection
- [ ] Image preview appears in form
- [ ] Submit button works with image
- [ ] Mobile logs show image details
- [ ] Backend receives file
- [ ] Cloudinary upload succeeds
- [ ] Media record created
- [ ] Entry saved with media reference
- [ ] Success alert shows
- [ ] Diary list shows entry with image
- [ ] Image displays correctly in entry detail

## React Native FormData Format

React Native requires files in FormData to be formatted as:

```javascript
formData.append("image", {
  uri: "file:///path/to/image.jpg",  // Local file URI
  name: "image.jpg",                  // File name with extension
  type: "image/jpeg",                 // MIME type
} as any);
```

This is different from web FormData which uses File/Blob objects.

## File Upload Configuration

**Mobile:**

- Field name: `"image"`
- Format: `{ uri, name, type }`
- Header: `Content-Type: multipart/form-data`

**Backend:**

- Multer field: `upload.single("image")`
- Destination: `uploads/`
- Max size: 5MB
- Allowed types: jpg, jpeg, png, gif, webp
- Cloudinary folder: `diary_entries`

## Next Steps if Still Not Working

1. **Check Network:**

   - Verify mobile can reach backend (test with simple GET)
   - Check .env has correct IP
   - Ensure backend is running

2. **Test without image:**

   - Submit entry without image
   - Should succeed
   - Confirms basic flow works

3. **Check file system permissions:**

   - Backend uploads/ directory writable
   - Mobile app has photo library permission

4. **Try different image:**

   - Use smaller image (< 1MB)
   - Try different format (PNG vs JPEG)
   - Use camera instead of library

5. **Review error messages:**
   - Check mobile console for axios errors
   - Check backend console for multer/cloudinary errors
   - Check response status codes

## Support

If image upload still doesn't work after following this guide:

1. Share mobile console logs
2. Share backend console logs
3. Share error messages/alerts
4. Specify device/OS (Android/iOS)
5. Specify image details (size, format)
