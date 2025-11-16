const mongoose = require("mongoose");
const ChatbotTraining = require("../models/ChatbotTraining");
const User = require("../models/User");
require("dotenv").config();

// Sample training data for Diaryverse app
const trainingData = [
  // Features
  {
    question: "How do I create a new diary entry?",
    answer:
      "To create a new diary entry, click on the '+' or 'New Entry' button on your dashboard. You can write your thoughts, add photos, voice notes, and even set the mood for that entry. Your entry will be automatically saved!",
    category: "features",
    keywords: ["create", "entry", "diary", "new", "write"],
    priority: 10,
  },
  {
    question: "How do I add images to my diary?",
    answer:
      "When creating or editing a diary entry, click on the image icon or drag-and-drop photos directly into the entry. You can add multiple images and they'll be stored securely in your diary.",
    category: "features",
    keywords: ["images", "photos", "upload", "pictures"],
    priority: 8,
  },
  {
    question: "Can I record voice notes?",
    answer:
      "Yes! Each diary entry supports voice notes. Click the microphone icon while creating an entry, and you can record your thoughts directly. Voice notes are great for capturing emotions that words might miss!",
    category: "features",
    keywords: ["voice", "audio", "record", "notes", "microphone"],
    priority: 7,
  },
  {
    question: "How does the AI polishing feature work?",
    answer:
      "Our AI Polish feature uses advanced AI to enhance your writing. After writing your entry, click 'Polish with AI' and choose a style (formal, casual, poetic, etc.). The AI will refine your thoughts while keeping your voice authentic!",
    category: "features",
    keywords: ["ai", "polish", "enhance", "improve", "writing"],
    priority: 9,
  },

  // Navigation
  {
    question: "Where can I find my past entries?",
    answer:
      "All your past entries are in the 'My Entries' or 'Timeline' section. You can filter by date, mood, or search for specific keywords. Use the calendar view to jump to entries from specific dates!",
    category: "navigation",
    keywords: ["past", "old", "entries", "find", "timeline", "history"],
    priority: 9,
  },
  {
    question: "How do I access the community section?",
    answer:
      "Click on the 'Community' icon in the main navigation menu. Here you'll find public posts from other writers, creative circles you can join, and writing challenges to participate in!",
    category: "navigation",
    keywords: ["community", "social", "circles", "find", "access"],
    priority: 7,
  },
  {
    question: "Where is the marketplace?",
    answer:
      "The Marketplace is accessible from the main menu. Here you can buy and sell physical journals, discover writing tools, stationery, and connect with other journal enthusiasts!",
    category: "navigation",
    keywords: ["marketplace", "buy", "sell", "shop", "store"],
    priority: 6,
  },

  // Diary-specific
  {
    question: "Are my diary entries private?",
    answer:
      "Absolutely! All your diary entries are private by default and encrypted. Only you can see them unless you explicitly choose to share specific entries or create a public post in the Community section.",
    category: "diary",
    keywords: ["private", "secure", "encryption", "security", "safe"],
    priority: 10,
  },
  {
    question: "Can I export my diary?",
    answer:
      "Yes! Go to Settings > Export Data. You can download your entire diary as a PDF, JSON, or plain text file. This ensures you always have a backup of your precious memories!",
    category: "diary",
    keywords: ["export", "download", "backup", "save", "pdf"],
    priority: 8,
  },
  {
    question: "How do I set the mood for an entry?",
    answer:
      "When creating an entry, you'll see mood emojis or a mood selector. Choose the emotion that best represents your feelings - happy, sad, excited, anxious, etc. This helps track your emotional journey over time!",
    category: "diary",
    keywords: ["mood", "emotion", "feeling", "track", "emoji"],
    priority: 8,
  },
  {
    question: "Can I lock specific entries?",
    answer:
      "Yes! You can add an extra layer of security to sensitive entries. Click the lock icon on any entry and set a PIN or password. These locked entries will require authentication to view.",
    category: "diary",
    keywords: ["lock", "password", "pin", "protect", "secure"],
    priority: 7,
  },

  // Community
  {
    question: "What are creative circles?",
    answer:
      "Creative Circles are small communities of writers who share a common interest (poetry, travel journaling, gratitude, etc.). Join a circle to share your work, get feedback, and participate in themed challenges!",
    category: "community",
    keywords: ["circles", "groups", "community", "join", "creative"],
    priority: 8,
  },
  {
    question: "How do I join writing challenges?",
    answer:
      "Check the Community section for active challenges! Challenges like '30-Day Journal Streak' or 'Weekly Poetry Prompt' help you stay consistent. Click 'Join Challenge' and start participating!",
    category: "community",
    keywords: ["challenge", "competition", "participate", "join", "streak"],
    priority: 7,
  },
  {
    question: "Can I share my entries publicly?",
    answer:
      "Yes! While your diary is private, you can choose to publish specific entries to the Community as public posts. Edit any entry and toggle 'Share to Community' to inspire others with your writing!",
    category: "community",
    keywords: ["share", "public", "post", "publish", "community"],
    priority: 7,
  },

  // Analytics
  {
    question: "What analytics does Diaryverse provide?",
    answer:
      "Your Analytics Dashboard shows: daily/monthly writing streak, word count trends, mood patterns over time, most active writing hours, and your creative growth. It's fascinating to see your journaling journey visualized!",
    category: "analytics",
    keywords: ["analytics", "stats", "statistics", "insights", "data"],
    priority: 8,
  },
  {
    question: "How is my writing streak calculated?",
    answer:
      "Your writing streak counts consecutive days you've created at least one entry. Even a short entry counts! Streaks are a great motivator to maintain a daily journaling habit.",
    category: "analytics",
    keywords: ["streak", "consecutive", "daily", "days", "count"],
    priority: 7,
  },

  // Marketplace
  {
    question: "Can I sell my old journals?",
    answer:
      "Yes! Our Marketplace allows you to list physical journals, notebooks, or writing supplies for sale. Create a seller account, upload photos, set your price, and connect with buyers in your area!",
    category: "marketplace",
    keywords: ["sell", "seller", "journals", "marketplace", "money"],
    priority: 6,
  },
  {
    question: "Is shipping available for marketplace items?",
    answer:
      "Shipping options depend on the seller. When browsing items, you'll see if the seller offers shipping or local pickup only. You can also contact sellers directly to arrange delivery.",
    category: "marketplace",
    keywords: ["shipping", "delivery", "marketplace", "buy", "send"],
    priority: 5,
  },

  // Troubleshooting
  {
    question: "Why isn't my entry saving?",
    answer:
      "If your entry isn't saving, check your internet connection. Entries are auto-saved every few seconds when online. If you're offline, the app will save locally and sync when you reconnect. Try refreshing the page if issues persist!",
    category: "troubleshooting",
    keywords: ["save", "not saving", "error", "problem", "bug"],
    priority: 9,
  },
  {
    question: "I forgot my password. How do I reset it?",
    answer:
      "Click 'Forgot Password' on the login screen. Enter your email address, and we'll send you a password reset link. Follow the link to create a new password. If you don't receive the email, check your spam folder!",
    category: "troubleshooting",
    keywords: ["password", "reset", "forgot", "login", "email"],
    priority: 10,
  },
  {
    question: "Why can't I upload images?",
    answer:
      "Image upload issues are usually due to file size or format. Make sure your images are under 10MB and in JPG, PNG, or GIF format. Try compressing large images or converting to a supported format.",
    category: "troubleshooting",
    keywords: ["upload", "images", "photos", "error", "not working"],
    priority: 8,
  },
  {
    question: "The app is running slow. What should I do?",
    answer:
      "Try these steps: 1) Clear your browser cache, 2) Close other browser tabs, 3) Restart your browser, 4) Check your internet speed. If problems persist, email support@diaryverse.com with details about your device and browser.",
    category: "troubleshooting",
    keywords: ["slow", "performance", "lag", "loading", "freeze"],
    priority: 7,
  },

  // Account
  {
    question: "How do I change my email address?",
    answer:
      "Go to Settings > Account Settings > Email. Enter your new email address and verify it by clicking the confirmation link we send. For security, you'll need to enter your current password.",
    category: "account",
    keywords: ["email", "change", "update", "account", "settings"],
    priority: 7,
  },
  {
    question: "Can I delete my account?",
    answer:
      "Yes, but this is permanent! Go to Settings > Account > Delete Account. You'll be asked to confirm and export your data first. Once deleted, all your entries and data will be permanently removed after 30 days.",
    category: "account",
    keywords: ["delete", "remove", "close", "account", "cancel"],
    priority: 8,
  },
  {
    question: "How do I update my profile picture?",
    answer:
      "Go to Settings > Profile. Click on your current profile picture or the camera icon. Upload a new photo (max 5MB, square images work best). Your new picture will appear across the app!",
    category: "account",
    keywords: ["profile", "picture", "photo", "avatar", "change"],
    priority: 6,
  },

  // Subscription
  {
    question: "What's included in the Premium subscription?",
    answer:
      "Premium unlocks: unlimited entries, AI polish with advanced styles, priority support, custom themes, voice-to-text transcription, advanced analytics, unlimited storage for photos/audio, and ad-free experience!",
    category: "subscription",
    keywords: ["premium", "subscription", "pro", "paid", "upgrade"],
    priority: 9,
  },
  {
    question: "How much does Premium cost?",
    answer:
      "Premium is $4.99/month or $49.99/year (save 17%!). We also offer a free 7-day trial so you can explore all features before committing. Cancel anytime, no questions asked!",
    category: "subscription",
    keywords: ["price", "cost", "payment", "subscription", "premium"],
    priority: 8,
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "Go to Settings > Subscription > Manage Plan. Click 'Cancel Subscription' and confirm. You'll keep Premium access until the end of your billing period. No cancellation fees or hidden charges!",
    category: "subscription",
    keywords: ["cancel", "subscription", "stop", "refund", "end"],
    priority: 8,
  },

  // General
  {
    question: "What is Diaryverse?",
    answer:
      "Diaryverse is a modern digital journaling platform that combines the intimacy of a personal diary with AI-powered tools, community features, and beautiful analytics. It's your private space to write, reflect, and grow!",
    category: "general",
    keywords: ["what is", "about", "app", "platform", "purpose"],
    priority: 10,
  },
  {
    question: "Is Diaryverse free?",
    answer:
      "Yes! Diaryverse has a generous free tier with unlimited entries, basic AI polish, community access, and analytics. Premium features are available for $4.99/month with a 7-day free trial.",
    category: "general",
    keywords: ["free", "cost", "price", "payment", "trial"],
    priority: 9,
  },
  {
    question: "Which devices can I use Diaryverse on?",
    answer:
      "Diaryverse works on any device! Use the web app on desktop/laptop, or download our mobile apps for iOS and Android. Your entries sync automatically across all your devices!",
    category: "general",
    keywords: ["devices", "mobile", "desktop", "ios", "android", "sync"],
    priority: 7,
  },
];

async function seedTrainingData() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Find an admin user (or create a dummy one)
    let adminUser = await User.findOne({ role: "admin" });

    if (!adminUser) {
      console.log(
        "No admin user found. Please create an admin first or modify this script."
      );
      process.exit(1);
    }

    // Clear existing training data
    const deleted = await ChatbotTraining.deleteMany({});
    console.log(`Cleared ${deleted.deletedCount} existing training records`);

    // Insert new training data
    const results = await ChatbotTraining.bulkImport(
      trainingData,
      adminUser._id
    );

    console.log("\n✅ Training Data Seeded Successfully!");
    console.log(`   Success: ${results.success}`);
    console.log(`   Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log("\n❌ Errors:");
      results.errors.forEach((err) => {
        console.log(`   - ${err.question}: ${err.error}`);
      });
    }

    console.log("\n📊 Summary by Category:");
    const categoryStats = await ChatbotTraining.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    categoryStats.forEach((stat) => {
      console.log(`   ${stat._id}: ${stat.count} items`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding training data:", error);
    process.exit(1);
  }
}

seedTrainingData();
