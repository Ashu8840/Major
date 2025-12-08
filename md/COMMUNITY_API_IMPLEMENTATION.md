# Community Page API Implementation Fix

## Current Issues

1. **API endpoints returning 404** - Backend routes exist but may not be properly mounted
2. **Data structure mismatch** - Frontend expects different field names than backend provides
3. **Suggested users showing 0** - This is correct behavior (excludes current user and followed users)
4. **Total users count showing 0** - Need to use insights API for accurate count
5. **Post composer needs to be tab-specific** - Only show in Posts tab, hide in Insights tab

## Backend Route Check

Ensure these routes are properly mounted in `server.js`:

```javascript
// In server.js, make sure this line exists:
app.use("/api/community", require("./routes/communityRoutes"));
```

## Required API Fixes

### 1. Fix API Response Structure

The backend returns:

- **Trending**: `Array` of `{ hashtag, count, posts }`
- **Users**: `Array` of `{ _id, username, displayName, bio, profileImage, followersCount }`
- **Insights**: `{ totalPosts, totalUsers, totalLikes, newUsersToday }`

### 2. Frontend Data Mapping

```javascript
// Trending hashtags - use 'hashtag' not 'tag'
hashtag.hashtag (not hashtag.tag)

// Suggested users - use 'profileImage' not 'profilePicture'
user.profileImage (not user.profilePicture)

// Insights - use actual API data
communityInsights.totalUsers (not suggestedUsers.length)
```

## Implementation Steps

### Step 1: Start Backend Server

```bash
cd "c:\Users\Ayush Tripathi\Documents\GitHub\Major\backend"
npm run server
```

### Step 2: Check Server Console

Look for these messages:

```
Server running on port 5000
MongoDB connected: <connection string>
Environment check:
- JWT_SECRET: ✓ Loaded
```

### Step 3: Test API Endpoints

Open browser dev tools and check:

- `GET /api/community/feed` - Should return posts array
- `GET /api/community/trending` - Should return hashtags array
- `GET /api/community/suggested-users` - Should return users array
- `GET /api/community/insights` - Should return stats object

### Step 4: Verify Authentication

Make sure user is logged in:

- Check localStorage for auth token
- Verify JWT token is valid
- Check if AuthContext has user data

## Frontend Fixes Applied

### 1. Correct API Endpoints

```javascript
// Fixed API calls
api.get("/community/feed?sort=${sortBy}"); // ✅ Correct
api.get("/community/trending"); // ✅ Correct
api.get("/community/suggested-users"); // ✅ Correct
api.get("/community/insights"); // ✅ Correct
```

### 2. Proper Data Handling

```javascript
// Handle backend response structure
setTrendingHashtags(hashtagsRes.data || []); // Direct array
setSuggestedUsers(usersRes.data || []); // Direct array
setCommunityInsights(insightsRes.data); // Object with stats
```

### 3. Correct Field Names

```javascript
// Trending hashtags
hashtag.hashtag; // ✅ (not hashtag.tag)
hashtag.count; // ✅

// Suggested users
user.profileImage; // ✅ (not user.profilePicture)
user.displayName; // ✅
user.followersCount; // ✅
```

### 4. Tab-Specific Content

```javascript
// Post composer only in Posts tab
{
  activeTab === "posts" && (
    <>
      {/* Post Composer */}
      <div>...</div>

      {/* Posts Feed */}
      <div>...</div>
    </>
  );
}

// Insights without post composer
{
  activeTab === "insights" && (
    <div className="space-y-6">
      {/* Community Stats */}
      {/* Top Posts */}
      {/* Recent Activity */}
    </div>
  );
}
```

### 5. Real Data Display

```javascript
// Use insights API for accurate counts
totalUsers: {
  communityInsights.totalUsers;
} // Real user count
totalPosts: {
  communityInsights.totalPosts;
} // Real post count
totalLikes: {
  communityInsights.totalLikes;
} // Real likes count

// Suggested users shows available users to follow (excludes current + followed)
suggestedUsers.length; // May be less than total users (this is correct)
```

## Debugging Steps

### 1. Check Console Logs

The frontend now logs API responses:

```javascript
console.log("API Responses:", {
  posts,
  hashtags,
  users,
  insights,
});
```

### 2. Check Network Tab

- All API calls should return 200 status
- No 404 or 401 errors
- Response data should match expected structure

### 3. Check Error States

- Red status indicator = API error
- Error banner shows specific error message
- Retry button allows recovery

## Expected Results After Fix

✅ **Trending Topics**: Shows actual trending hashtags from posts
✅ **Suggested Users**: Shows users available to follow (excludes current user)  
✅ **Community Insights**: Shows real total user count (3 users as expected)
✅ **Posts Tab**: Shows post composer + posts feed
✅ **Insights Tab**: Shows analytics without post composer
✅ **Error Handling**: Clear error messages and retry functionality

## Verification Checklist

- [ ] Backend server is running on port 5000
- [ ] All API endpoints return 200 status
- [ ] JWT authentication is working
- [ ] Community insights shows totalUsers: 3
- [ ] Suggested users shows available users (may be less than 3)
- [ ] Trending hashtags shows actual data from posts
- [ ] Post composer only appears in Posts tab
- [ ] Insights tab shows stats without post composer
- [ ] Error states are handled gracefully

The issue is likely that the backend server needs to be started for the API calls to work properly.
