# Admin Panel - Quick Start & Testing Guide

## 🚀 Quick Start

### 1. Start Backend Server

```bash
cd backend
npm start
```

**Expected Output:**

```
Server running in development mode on port 5000
Listening on all network interfaces (0.0.0.0:5000)
Local: http://localhost:5000
Network: http://YOUR_IP:5000
🔍 Initializing system monitoring...
✅ System monitoring initialized
```

### 2. Start Admin Panel

```bash
cd admin
npm run dev
```

**Expected Output:**

```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 3. Login to Admin Panel

1. Open http://localhost:5173/login
2. Use your admin credentials
3. You'll be redirected to the dashboard

## 🧪 Testing All Features

### Dashboard (/dashboard)

**Test:**

1. ✅ Check if all 6 stat cards show real numbers (not 0 or -)
2. ✅ Change period selector (7, 30, 90, 365 days)
3. ✅ Verify user growth chart renders
4. ✅ Verify revenue chart renders
5. ✅ Check categories pie chart
6. ✅ Check activity timeline chart

**Expected:**

- All stats should load from `/api/admin/dashboard/stats`
- Charts should display actual data from database
- If no data exists, create some users/posts first

---

### System Monitoring (/monitoring)

**Test:**

1. ✅ Check system health indicator (should show "healthy")
2. ✅ Verify response time is showing (should be 20-50ms typically)
3. ✅ Check active users count
4. ✅ Verify auto-refresh works (watch CPU/memory update every 5-10s)
5. ✅ Change refresh interval dropdown
6. ✅ Click "Manual Refresh" button
7. ✅ Test "Clear Cache" button
8. ✅ Test "Restart API" button
9. ✅ Test "Export Logs" button
10. ✅ Check CPU history chart updates in real-time
11. ✅ Check network traffic chart
12. ✅ Check requests per minute chart

**Expected:**

- CPU usage: 10-60% (varies with system load)
- Memory usage: Shows actual used/total MB
- Network strength: 90-100% typically
- Latency: 10-30ms
- All charts animate and update

**Debug:**

```bash
# Check monitoring endpoint manually
curl http://localhost:5000/api/monitoring/health -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Notifications (/notifications)

**Test:**

1. ✅ Navigate to notifications page
2. ✅ Check if unread count shows in navbar bell icon
3. ✅ Filter by All/Unread/Read
4. ✅ Click a notification (should mark as read)
5. ✅ Click "Mark All as Read" button
6. ✅ Delete a notification
7. ✅ Create a test notification (manually trigger an event)

**Trigger Test Notification:**

```javascript
// In browser console on admin panel:
// This simulates creating a notification
// (In production, these are auto-created by backend events)
```

**Or via backend:**

```javascript
// backend/test-notification.js
const { notifyAllAdmins } = require("./services/notificationService");

// Run this after server starts
notifyAllAdmins(
  "new_user",
  "New User Registered",
  "John Doe has joined the platform",
  { userId: "test123" },
  "info",
  "/users"
);
```

---

### Users Management (/users)

**Test:**

1. ✅ Check if all stat cards show real numbers
2. ✅ Click on each stat card to filter (Total/Active/Banned)
3. ✅ Search for a user by name, email, or username
4. ✅ Click "View Details" on a user (eye icon)
5. ✅ Ban a user (should prompt for reason)
6. ✅ Unban a banned user
7. ✅ Delete a non-admin user
8. ✅ Try to delete an admin (should fail)
9. ✅ Check pagination if you have many users

**Expected:**

- Users list loads from `/api/admin/users`
- Ban adds `isBanned: true` to user
- Unban removes ban flag
- Delete removes user and their content
- Modal shows detailed user info with activity stats

**Test Ban Flow:**

```bash
# Before ban
GET /api/admin/users/USER_ID

# Ban
PUT /api/admin/users/USER_ID/ban
Body: { "reason": "Violated community guidelines" }

# Verify
GET /api/admin/users/USER_ID
# Should see isBanned: true, banReason: "..."

# Unban
PUT /api/admin/users/USER_ID/unban

# Verify
GET /api/admin/users/USER_ID
# Should see isBanned: false
```

---

### Admin Management (/admins)

**Test:**

1. ✅ View list of all admins
2. ✅ Create a new admin
3. ✅ Delete a non-first admin
4. ✅ Try to delete the first admin (should fail with error)

**Expected:**

- Admins list loads
- New admin can be created with form
- First admin is protected from deletion
- Deleted admin is removed from database

---

### Settings (/settings)

**Test:**

1. ✅ Navigate through all 5 tabs (General, Email, Notifications, Features, Security)
2. ✅ Toggle maintenance mode
3. ✅ Toggle registration
4. ✅ Update SMTP settings
5. ✅ Toggle notification settings
6. ✅ Toggle feature flags
7. ✅ Click "Rotate JWT Secret" (security tab)
8. ✅ Click "Backup Database"

**Expected:**

- Settings load from `/api/admin/settings`
- Updates save successfully
- Toast notifications confirm actions
- Changes persist after page reload

---

## 🔍 API Endpoint Testing

### Test All Monitoring Endpoints

```bash
# Get your admin token first
# Login at http://localhost:5173/login
# Open DevTools > Application > Local Storage
# Copy the "admin_token" value

# Set token variable
TOKEN="your_token_here"

# Test health
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/monitoring/health

# Test network
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/monitoring/network

# Test server
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/monitoring/server

# Test traffic
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/monitoring/traffic

# Test downtime
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/monitoring/downtime

# Test all metrics
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/monitoring/all
```

### Test Dashboard Endpoint

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/dashboard/stats?period=7
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 100,
      "totalPosts": 250,
      "totalEntries": 500,
      "totalBooks": 20,
      "totalRevenue": 5000,
      "activeUsers": 45,
      "newUsers": 10,
      "newPosts": 25
    },
    "charts": {
      "userGrowth": [...],
      "revenueTrends": [...],
      "popularCategories": [...],
      "activityTimeline": [...]
    }
  }
}
```

### Test Notifications Endpoint

```bash
# Get notifications
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/notifications

# Mark as read
curl -X PUT -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/notifications/NOTIFICATION_ID/read

# Delete
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/notifications/NOTIFICATION_ID
```

---

## 🐛 Troubleshooting

### Problem: Dashboard shows 0 for all stats

**Solution:**

- Database is empty or has no data
- Create some test users and posts first
- Check backend console for errors

### Problem: Monitoring shows "Failed to fetch"

**Solution:**

- Backend is not running
- Check if http://localhost:5000 is accessible
- Verify JWT token is valid
- Check CORS settings

### Problem: Notifications don't appear

**Solution:**

- No notifications exist yet (system events haven't occurred)
- Create a test notification manually
- Check `/api/notifications` endpoint in browser DevTools

### Problem: "Not authorized as an admin"

**Solution:**

- User account is not admin role
- Check user.role in database
- Update role: `db.users.updateOne({email: "admin@email.com"}, {$set: {role: "admin"}})`

### Problem: Charts not rendering

**Solution:**

- No data in database for charts
- Check browser console for errors
- Verify Recharts is installed: `cd admin && npm list recharts`

### Problem: Auto-refresh not working in monitoring

**Solution:**

- Toggle auto-refresh off and on
- Change interval to 10 seconds
- Check browser console for errors
- Verify React Query refetchInterval is set

---

## ✅ Success Indicators

**Backend:**

```
✅ Server starts without errors
✅ "System monitoring initialized" appears
✅ No MongoDB connection errors
✅ JWT_SECRET is loaded
✅ All routes registered
```

**Frontend:**

```
✅ Login successful
✅ Dashboard loads with real numbers
✅ Charts render correctly
✅ Monitoring page shows system metrics
✅ Notifications bell shows unread count
✅ No console errors
✅ Auto-refresh indicator animates
```

**Database:**

```
✅ Users collection has data
✅ Posts collection has data
✅ Notifications collection exists
✅ SystemLogs collection exists
✅ AdminSettings collection exists
```

---

## 📊 Performance Benchmarks

**Expected Load Times:**

- Dashboard: < 500ms
- Monitoring: < 200ms (real-time)
- Users List: < 300ms
- Notifications: < 200ms

**Expected Metrics:**

- CPU Usage: 10-60%
- Memory Usage: 500-2000 MB
- Response Time: 20-100ms
- Network Latency: 10-50ms
- Error Rate: < 1%

---

## 🎯 Production Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Database backups enabled
- [ ] Monitoring alerts configured
- [ ] Email notifications setup (SMTP)
- [ ] Rate limiting configured
- [ ] CORS origins set correctly
- [ ] JWT secret is strong and secure
- [ ] HTTPS enabled
- [ ] Log rotation configured
- [ ] Error tracking enabled (e.g., Sentry)
- [ ] Performance monitoring (e.g., New Relic)
- [ ] Admin accounts secured
- [ ] First admin password changed
- [ ] Backup admin account created

---

## 📚 Additional Resources

**Backend Code Locations:**

- Controllers: `backend/controllers/`
- Services: `backend/services/`
- Routes: `backend/routes/`
- Models: `backend/models/`

**Frontend Code Locations:**

- Pages: `admin/src/pages/`
- Components: `admin/src/components/`
- API Client: `admin/src/lib/apiClient.js`
- Routes: `admin/src/routes.jsx`

**Documentation:**

- API Implementation: `ADMIN_API_IMPLEMENTATION.md`
- Backend Fix Summary: `BACKEND_FIX_SUMMARY.md`

---

## 🎉 All Done!

Your admin panel now has:
✅ Real-time system monitoring
✅ Live notifications
✅ Network analysis
✅ Downtime tracking
✅ User management with real data
✅ Dashboard with real analytics
✅ No dummy values - everything is production-ready!

Happy monitoring! 🚀
