# Quick Start Guide: Testing New Navbar Features

## Testing Wallet Feature

The wallet feature is automatically initialized with ₹0 balance. To test:

1. **View Wallet**: Click the wallet button in the navbar (shows ₹0)
2. **Top Up**: Click "Top up ₹1,000" button in the dropdown
3. **Repeat**: Keep clicking to add more funds (max ₹5,000)
4. **Verify Progress**: Watch the progress bar fill up
5. **Test Persistence**: Close and reopen the app - balance should persist

## Testing Notifications Feature

To add demo notifications for testing:

### Option 1: Add to Home Screen (Recommended)

Add this to any screen you want to test from (e.g., `app/screens/HomeScreen.tsx`):

```typescript
import { useDemoNotifications } from "@/utils/demoNotifications";

// Inside your component:
const { addSampleNotifications } = useDemoNotifications();

// Add a button to trigger demo notifications:
<TouchableOpacity onPress={addSampleNotifications}>
  <Text>Add Demo Notifications</Text>
</TouchableOpacity>;
```

### Option 2: Auto-add on App Start

Add to `app/app/_layout.tsx` inside `AppStack` component:

```typescript
import { useDemoNotifications } from "@/utils/demoNotifications";

const AppStack = () => {
  const { addSampleNotifications } = useDemoNotifications();

  // Add demo notifications once on mount
  React.useEffect(() => {
    addSampleNotifications();
  }, []);

  // ... rest of the code
};
```

### Option 3: Manual Testing

Use the notification context directly in any screen:

```typescript
import { useNotifications } from "@/context/NotificationContext";

const { addNotification } = useNotifications();

// Add a single notification
addNotification({
  type: "message",
  title: "Test Notification",
  message: "This is a test message!",
  link: "/social",
});
```

## What to Test

### Wallet

1. ✅ Click wallet button - dropdown should open
2. ✅ Click "Top up ₹1,000" - balance should increase
3. ✅ Progress bar should fill as balance increases
4. ✅ At ₹5,000, button should disable
5. ✅ Warning message should appear when full
6. ✅ Balance should persist after app restart

### Notifications

1. ✅ Add notifications - unread count badge should appear
2. ✅ Click notifications button - dropdown should show list
3. ✅ Unread notifications should have blue background
4. ✅ Click "Mark all read" - all should become read
5. ✅ Click individual notification - should mark as read and navigate
6. ✅ Different notification types should show different icons
7. ✅ Timestamps should show relative time ("5m ago", etc.)
8. ✅ Notifications should persist after app restart

### Profile

1. ✅ Profile image should display (or initials if no image)
2. ✅ Click profile - dropdown menu should appear
3. ✅ "View profile" → should navigate to profile tab
4. ✅ "Settings" → should navigate to settings
5. ✅ "Messages" → should navigate to social tab
6. ✅ "Log out" → should log out and go to login screen

### Theme

1. ✅ Click moon/sun icon - theme should toggle
2. ✅ All dropdowns should respect current theme
3. ✅ Theme should persist after app restart
4. ✅ All screens should respect theme (check multiple tabs)

## Common Issues & Solutions

### Issue: Notifications not appearing

**Solution**: Make sure you've added the `NotificationProvider` in `_layout.tsx` (already done)

### Issue: Wallet balance resets

**Solution**: This uses AsyncStorage - it should persist. Clear app data if testing fresh state.

### Issue: Profile image not showing

**Solution**: Make sure user has a `profileImage` field in their profile. Falls back to initials if not set.

### Issue: Dropdowns don't close

**Solution**: Click outside the dropdown or press device back button (Android)

## Next Steps

After basic testing, you can:

1. **Connect to Backend**: Replace demo notifications with real WebSocket events
2. **Add Wallet Transactions**: Implement purchase flows using `deduct()` method
3. **Customize Notifications**: Add more notification types and custom icons
4. **Add Analytics**: Track wallet usage and notification engagement

## Code Examples

### Deducting from Wallet (e.g., for purchases)

```typescript
import { useWallet } from "@/context/WalletContext";

const { balance, hasEnough, deduct } = useWallet();

const handlePurchase = (amount: number) => {
  if (!hasEnough(amount)) {
    alert("Insufficient balance!");
    return;
  }

  const result = deduct(amount);
  if (result.success) {
    console.log("Purchase successful! Remaining:", result.remaining);
    // Proceed with purchase
  }
};
```

### Adding Real-time Notifications

```typescript
import { useNotifications } from "@/context/NotificationContext";

const { addNotification } = useNotifications();

// When receiving a message via WebSocket:
socket.on("newMessage", (data) => {
  addNotification({
    type: "message",
    title: `New message from ${data.senderName}`,
    message: data.text,
    link: "/social",
    externalId: `msg-${data.messageId}`, // Prevents duplicates
  });
});
```

## File Locations

- **Wallet Context**: `app/context/WalletContext.tsx`
- **Notification Context**: `app/context/NotificationContext.tsx`
- **Enhanced Navbar**: `app/components/layout/Navbar.tsx`
- **Demo Notifications**: `app/utils/demoNotifications.ts`
- **App Layout**: `app/app/_layout.tsx`

Happy testing! 🎉
