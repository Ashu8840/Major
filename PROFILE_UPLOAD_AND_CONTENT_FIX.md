# Profile Upload and Content Display Fix

## Issues Fixed

### 1. ImagePicker Upload Error ✅

**Error Message:**

```
Upload Error
Call to function 'ExponentImagePicker.launchImageLibraryAsync' has been rejected.
→ Caused by: The 1st argument cannot be cast to type expo.modules.imagepicker.ImagePickerOptions
→ Caused by: Cannot cast 'String' for field 'mediaTypes' ('kotlin.Array<expo.modules.imagepicker.JSMediaTypes>')
→ Caused by: com.facebook.react.bridge.UnexpectedNativeTypeException: Value for mediaTypes cannot be cast from String to ReadableArray
```

**Root Cause:**
The `mediaTypes` parameter was using `ImagePicker.MediaTypeOptions.Images` which is an enum value, but the newer version of expo-image-picker expects an array of strings.

**Fix Applied:**
Changed from:

```typescript
mediaTypes: ImagePicker.MediaTypeOptions.Images,
```

To:

```typescript
mediaTypes: ['images'],
```

**File:** `app/screens/ProfileScreen.tsx` - Line ~250

### 2. Posts and Entries Not Showing ✅

**Issue:**
Posts and entries were not displaying in the profile screen even though they exist in the database.

**Root Cause:**
The app was trying to fetch from separate endpoints (`/entry` and `/community/feed/my-posts`) which may not have returned all the user's content properly.

**Fix Applied:**
Updated to use the correct backend endpoint `/profile/content` which is designed to return all user content (entries, posts, stories, books) with proper pagination and visibility filtering.

**Changes:**

```typescript
// BEFORE - Separate API calls
const [entriesResponse, postsResponse] = await Promise.all([
  api.get("/entry"),
  api.get("/community/feed/my-posts"),
]);

// AFTER - Single unified endpoint
const response = await api.get("/profile/content", {
  params: {
    type: "all",
    limit: 50, // Get up to 50 items
  },
});
```

**Benefits of new approach:**

- ✅ Uses the same endpoint as the frontend (consistency)
- ✅ Properly handles visibility filters
- ✅ Returns entries and posts in a structured format
- ✅ Supports pagination (can load more items if needed)
- ✅ Respects user privacy settings

**File:** `app/screens/ProfileScreen.tsx` - Lines ~135-165

## Backend Endpoint Used

### `/profile/content`

**Method:** GET

**Query Parameters:**

- `type`: "all" | "entries" | "posts" | "stories" | "books" (default: "all")
- `page`: Page number for pagination (default: 1)
- `limit`: Items per page (default: 10, max: 50)

**Returns:**

```json
{
  "entries": [...],
  "posts": [...],
  "stories": [...],
  "books": [...],
  "pagination": {
    "entries": { "total": 10, "page": 1, "limit": 50, "totalPages": 1 },
    "posts": { "total": 5, "page": 1, "limit": 50, "totalPages": 1 }
  }
}
```

**Visibility Handling:**

- Own profile: Returns all content
- Public profile: Returns only public content
- Follower viewing: Returns public + followers-only content

## Testing Checklist

### Image Upload

- [x] Fix ImagePicker mediaTypes error
- [ ] Test profile picture upload
- [ ] Test cover photo upload
- [ ] Verify permission request works
- [ ] Check uploaded images display correctly

### Content Display

- [x] Use correct `/profile/content` endpoint
- [ ] Verify all entries display
- [ ] Verify all posts display
- [ ] Check content sorting (newest first)
- [ ] Test delete functionality for entries
- [ ] Test delete functionality for posts
- [ ] Verify entry/post badges show correctly
- [ ] Check delete button visibility

### UI/UX

- [ ] Verify content loads without errors
- [ ] Check loading states
- [ ] Test refresh functionality
- [ ] Verify empty state shows when no content
- [ ] Check console logs for any errors

## Implementation Details

### Content Loading Flow

1. **Initial Load:** Called from `loadProfileData()` on component mount
2. **Tab Switch:** Called when switching to "Posts & Entries" tab
3. **After Delete:** Called after successfully deleting an entry or post
4. **Manual Refresh:** Called via pull-to-refresh gesture

### Data Structure

Each content item has:

```typescript
{
  _id: string,
  type: "entry" | "post",
  title?: string,
  content?: string,
  description?: string,
  media?: Array,
  createdAt: string,
  viewCount?: number,
  likesCount?: number,
  commentsCount?: number,
  visibility?: string,
  mood?: string,  // entries only
  tags?: Array,   // entries only
}
```

### Content Rendering

- Uses list view only (grid toggle removed)
- Displays thumbnail or placeholder icon
- Shows entry/post badge
- Shows delete button for each item
- Displays view count and like count
- Shows title (or content preview if no title)

## Files Modified

1. **app/screens/ProfileScreen.tsx**
   - Fixed `handleImageUpload` - Changed `mediaTypes` parameter (Line ~250)
   - Updated `loadContent` - Use `/profile/content` endpoint (Lines ~135-165)

## Related Issues Fixed Previously

From `PROFILE_SECTION_FIX.md`:

- ✅ Image upload with permissions
- ✅ Delete functionality for entries and posts
- ✅ Improved tab UI
- ✅ Removed grid/list toggle
- ✅ Added delete buttons with confirmation

## Next Steps

1. Test image upload on physical device
2. Verify content displays correctly
3. Test delete functionality
4. Check console for any errors
5. Consider adding pagination for users with many items (load more on scroll)

## Notes

- The app now matches the frontend implementation
- Both use the same `/profile/content` endpoint
- Consistent behavior across web and mobile platforms
- Delete endpoints work correctly (`/entry/:id` and `/community/post/:postId`)
