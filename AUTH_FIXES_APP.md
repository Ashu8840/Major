# Authentication System Fixes - App

## Issues Fixed

### 1. **Missing Signup Screen**

- ✅ Created `app/(auth)/signup.tsx` with full registration flow
- ✅ Added form validation (username, email, password matching)
- ✅ Added navigation between login and signup screens
- ✅ Beautiful UI matching the login screen design

### 2. **API Endpoint Issues**

- ✅ Fixed profile endpoint: Changed `/profile` to `/users/profile` to match backend routes
- ✅ Added API request/response logging for debugging
- ✅ Improved error handling with detailed error messages

### 3. **CORS Configuration**

Updated backend `server.js` to allow mobile app connections:

- ✅ Added support for `exp://` protocol (Expo)
- ✅ Added Android emulator IP: `10.0.2.2`
- ✅ Added local network IP ranges: `192.168.x.x` and `10.x.x.x`
- ✅ Allow all localhost variations during development
- ✅ Dynamic CORS validation for development environments

### 4. **Environment Configuration**

- ✅ Created `.env` file with API configuration
- ✅ Created `.env.example` with setup instructions
- ✅ Documented different API URLs for iOS, Android, and physical devices

## API Endpoints Used

### Frontend (`app/services/api.ts`)

```typescript
// Login
POST /api/users/login
Body: { email, password }
Response: { token, user data }

// Register
POST /api/users/register
Body: { username, email, password }
Response: { token, user data }

// Get Profile
GET /api/users/profile
Headers: { Authorization: Bearer <token> }
Response: { user profile data }
```

### Backend (`backend/routes/userRoutes.js`)

- `POST /register` → `registerUser` controller
- `POST /login` → `authUser` controller
- `GET /profile` → `getProfile` controller (protected)

## Configuration Guide

### For iOS Simulator

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

### For Android Emulator

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
```

### For Physical Device

Find your computer's local IP address:

- Windows: `ipconfig` → Look for IPv4 Address
- Mac/Linux: `ifconfig` → Look for inet address

Then use:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:5000/api
```

Example: `http://192.168.1.100:5000/api`

## Testing the Fix

1. **Start Backend Server**

   ```bash
   cd backend
   npm start
   ```

   Backend should be running on http://localhost:5000

2. **Start Expo App**

   ```bash
   cd app
   npm start
   ```

3. **Update .env if needed**

   - Check your device type (iOS/Android/Physical)
   - Update `EXPO_PUBLIC_API_URL` accordingly
   - Restart Expo server after changing .env

4. **Test Login/Signup**
   - Open app in simulator/device
   - Try creating a new account on signup screen
   - Try logging in with existing credentials
   - Check console for API logs (enabled in dev mode)

## Common Issues & Solutions

### Issue: "Network Error" or "Connection Refused"

**Solution:**

- Make sure backend is running
- Check if .env has correct API URL for your device type
- For physical devices, ensure both device and computer are on same WiFi network

### Issue: "CORS Error"

**Solution:**

- Restart backend server after CORS changes
- Check backend console for "Blocked CORS request" messages
- Verify origin is being logged correctly

### Issue: "401 Unauthorized" after login

**Solution:**

- Check if token is being saved correctly (check AsyncStorage/SecureStore)
- Verify JWT_SECRET is set in backend .env
- Check if Authorization header is being sent with requests

### Issue: Can't find backend on physical device

**Solution:**

- Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Update .env with: `http://YOUR_IP:5000/api`
- Make sure Windows Firewall allows Node.js connections
- Ensure both devices are on the same WiFi network

## Files Modified

### Frontend (app/)

1. `app/(auth)/signup.tsx` - NEW: Signup screen
2. `app/(auth)/login.tsx` - Added signup navigation
3. `services/api.ts` - Fixed profile endpoint, added logging
4. `.env` - NEW: API configuration
5. `.env.example` - NEW: Configuration guide

### Backend (backend/)

1. `server.js` - Enhanced CORS to allow mobile connections

## Next Steps

1. **Test on all platforms** (iOS simulator, Android emulator, physical device)
2. **Add error boundaries** for better error handling
3. **Add loading states** during API calls
4. **Implement token refresh** for expired sessions
5. **Add biometric authentication** (Face ID/Touch ID) option
6. **Add password reset** functionality
7. **Add email verification** for new accounts

## API Response Examples

### Successful Login/Signup

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "profileImage": null,
  "profileCompleted": false,
  "firstLogin": true,
  "role": "user",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Error Response

```json
{
  "message": "User already exists"
}
```

or

```json
{
  "message": "Invalid email or password"
}
```

## Security Notes

- ✅ Passwords are hashed with bcrypt (10 rounds)
- ✅ JWT tokens are stored securely (SecureStore on mobile, localStorage on web)
- ✅ Authorization header sent with all protected requests
- ✅ Input validation on both frontend and backend
- ✅ Rate limiting enabled on backend (100 requests per 15 minutes)
- ⚠️ HTTPS should be used in production (currently HTTP for dev)
- ⚠️ Implement token refresh mechanism for better security
- ⚠️ Add CSRF protection for web version

## Debug Logging

The app now logs all API requests in development mode:

```
[API] POST http://localhost:5000/api/users/login
[API] Response 200 from /users/login
```

Check the console for these logs to debug API issues.
