# 🔧 Marketplace Books API - Fix & Debug Guide

## 🐛 Issue Reported

Books are not showing in the marketplace section of the mobile app, despite having 1 book available.

## ✅ Changes Made

### 1. Enhanced Error Logging - Mobile App

**File:** `app/screens/MarketplaceScreen.tsx`

**Added detailed console logging:**

- Request parameters
- Full response data structure
- Books count
- Error details

**Before:**

```typescript
const response = await api.get("/marketplace/books", { params });
setBooks(response.data.books || []);
```

**After:**

```typescript
console.log("[Marketplace] Fetching books with params:", params);
const response = await api.get("/marketplace/books", { params });
console.log("[Marketplace] Response:", JSON.stringify(response.data, null, 2));

const booksData = response.data?.books || response.data || [];
console.log("[Marketplace] Books count:", booksData.length);
setBooks(booksData);
```

### 2. Enhanced Error Logging - Frontend Web

**File:** `frontend/src/pages/Marketplace.jsx`

**Added similar logging to web version:**

```javascript
console.log("[Marketplace] Fetching books with params:", params);
const data = await getMarketplaceBooks(params);
console.log("[Marketplace] Response data:", data);

const booksData = data?.books || data || [];
console.log("[Marketplace] Books count:", booksData.length);
setBooks(booksData);
```

### 3. Improved Error Messages

Both mobile and web now show specific API error messages instead of generic ones.

---

## 🔍 Debug Process

### Step 1: Check Backend API

```powershell
# Test if backend returns books
Invoke-RestMethod -Uri "https://major-86rr.onrender.com/api/marketplace/books"
```

**Expected Response:**

```json
{
  "books": [
    {
      "_id": "...",
      "title": "Your Book Title",
      "author": {...},
      "seller": {...},
      "cover": {...},
      "price": 0,
      "genre": "fiction",
      "status": "published"
    }
  ],
  "meta": {
    "count": 1
  }
}
```

### Step 2: Check Mobile App Console

After the changes, open your app and check the console:

**Look for:**

```
[Marketplace] Fetching books with params: { sort: 'trending' }
[Marketplace] Response: { books: [...], meta: {...} }
[Marketplace] Books count: 1
```

### Step 3: Check Frontend Console

Open web marketplace and check browser console (F12):

**Look for:**

```
[Marketplace] Fetching books with params: { sort: 'trending' }
[Marketplace] Response data: { books: [...], meta: {...} }
[Marketplace] Books count: 1
```

---

## 🎯 Common Issues & Fixes

### Issue 1: Backend Returns Empty Array

**Symptom:**

```
[Marketplace] Books count: 0
```

**Possible Causes:**

1. **Book status is not "published"**
   ```javascript
   // Check in MongoDB or backend
   db.marketplacebooks.find({ status: { $ne: "published" } });
   ```
2. **Book belongs to inactive seller**

   ```javascript
   // Check seller status
   db.marketplacesellers.find({ status: { $ne: "active" } });
   ```

3. **Filters are too restrictive**
   - Try without genre filter
   - Try without price filter
   - Try without search query

**Fix:**

```javascript
// In MongoDB, update book status
db.marketplacebooks.updateOne(
  { _id: ObjectId("your-book-id") },
  { $set: { status: "published" } }
);

// Update seller status
db.marketplacesellers.updateOne(
  { _id: ObjectId("your-seller-id") },
  { $set: { status: "active" } }
);
```

### Issue 2: API Returns 401 Unauthorized

**Symptom:**

```
[Marketplace] Error: 401 Unauthorized
```

**Cause:** Token expired or invalid

**Fix:** Logout and login again to get fresh token

### Issue 3: API Returns 500 Internal Server Error

**Symptom:**

```
[Marketplace] Error: 500 Internal Server Error
```

**Possible Causes:**

1. MongoDB connection issue
2. Missing population data (author/seller not found)
3. Corrupted book data

**Fix:** Check backend logs on Render dashboard

### Issue 4: Response Structure Mismatch

**Symptom:**

```
[Marketplace] Books count: undefined
```

**Cause:** API response structure changed

**Fix:** Check if response is:

- `response.data.books` (correct)
- `response.data` (direct array)
- `response.books` (wrong structure)

---

## 📊 Verification Checklist

### Backend Verification:

- [ ] Book exists in database
- [ ] Book status is "published"
- [ ] Seller exists and is "active"
- [ ] Book has required fields (title, price, genre)
- [ ] API route is registered: `GET /api/marketplace/books`
- [ ] No errors in backend logs

### Frontend Verification:

- [ ] API call uses correct endpoint
- [ ] Response data is parsed correctly
- [ ] Books array is set to state
- [ ] Books are rendered in UI
- [ ] No console errors

### Mobile App Verification:

- [ ] API URL is correct in `.env`
- [ ] Authentication token is valid
- [ ] Network connection is working
- [ ] API call uses correct endpoint
- [ ] Response data is parsed correctly
- [ ] Books are displayed in list

---

## 🧪 Manual Testing

### Test 1: Direct API Call

```powershell
# Without authentication (public endpoint)
$response = Invoke-RestMethod -Uri "https://major-86rr.onrender.com/api/marketplace/books"
Write-Host "Books count: $($response.books.Count)"
$response.books | ForEach-Object { Write-Host "- $($_.title)" }
```

**Expected Output:**

```
Books count: 1
- Your Book Title
```

### Test 2: API Call with Filters

```powershell
# With genre filter
$response = Invoke-RestMethod -Uri "https://major-86rr.onrender.com/api/marketplace/books?genre=fiction"

# With price filter
$response = Invoke-RestMethod -Uri "https://major-86rr.onrender.com/api/marketplace/books?price=free"

# With search
$response = Invoke-RestMethod -Uri "https://major-86rr.onrender.com/api/marketplace/books?search=book"
```

### Test 3: Check Book in Database

```javascript
// In MongoDB Compass or Atlas
db.marketplacebooks.find({}).pretty();

// Check required fields
db.marketplacebooks.aggregate([
  {
    $project: {
      title: 1,
      status: 1,
      seller: 1,
      author: 1,
      price: 1,
      genre: 1,
    },
  },
]);
```

---

## 🔧 Quick Fixes

### Fix 1: Clear App Cache

```powershell
cd app
npx expo start --clear
```

### Fix 2: Re-login to Get Fresh Token

1. Open app
2. Go to Profile → Logout
3. Login again

### Fix 3: Reset Filters in App

1. Open marketplace
2. Set genre to "All"
3. Set price to "All"
4. Clear search box

### Fix 4: Force Refresh

1. Pull down on the books list (pull-to-refresh)
2. Or restart the app

---

## 📝 What to Check in Console

After implementing the fixes, you should see:

**Successful Load:**

```
[Marketplace] Fetching books with params: { sort: 'trending' }
[Marketplace] Response: {
  books: [
    {
      _id: '...',
      title: 'Your Book',
      price: 0,
      cover: { url: '...' }
    }
  ],
  meta: { count: 1 }
}
[Marketplace] Books count: 1
```

**Failed Load (Empty):**

```
[Marketplace] Fetching books with params: { sort: 'trending' }
[Marketplace] Response: { books: [], meta: { count: 0 } }
[Marketplace] Books count: 0
```

**Failed Load (Error):**

```
[Marketplace] Fetching books with params: { sort: 'trending' }
[Marketplace] Error: Request failed with status code 500
[Marketplace] Error response: { message: 'Internal server error' }
```

---

## 🎯 Next Steps

1. **Restart Mobile App:**

   ```powershell
   cd app
   npx expo start --clear
   ```

2. **Open App and Navigate to Marketplace**

3. **Check Console Logs:**

   - Look for `[Marketplace]` logs
   - Note the response structure
   - Note the books count

4. **Report What You See:**
   - Books count from console
   - Any error messages
   - Response data structure

---

## 📚 API Endpoints Reference

### Public Endpoints (No Auth Required):

- `GET /api/marketplace/books` - Get all published books
- `GET /api/marketplace/books/:id/reviews` - Get book reviews

### Protected Endpoints (Auth Required):

- `GET /api/marketplace/seller/status` - Check seller status
- `GET /api/marketplace/seller/books` - Get your books as seller
- `POST /api/marketplace/books` - Create new book (seller only)
- `GET /api/marketplace/reader/books` - Get your purchased books

### Query Parameters:

- `sort`: trending, newest, price-low, price-high, popular
- `genre`: fiction, non-fiction, biography, etc.
- `price`: all, free, paid
- `search`: search term
- `limit`: max results (default 60)

---

## 🆘 If Still Not Working

### Collect Debug Info:

```powershell
# 1. Test backend directly
curl https://major-86rr.onrender.com/api/marketplace/books

# 2. Check backend is awake (cold start)
curl https://major-86rr.onrender.com/health

# 3. Check app .env
type app\.env
```

### Send This Info:

1. Console logs from app (`[Marketplace]` lines)
2. Response structure from backend test
3. Books count from console
4. Any error messages

---

**Status:** ✅ Debug logging added to both mobile app and frontend web  
**Next:** Test and check console logs to identify exact issue  
**Updated:** November 17, 2025
