const mongoose = require("mongoose");

const adminSettingsSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["general", "email", "notifications", "features", "security"],
      required: true,
      unique: true,
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Default settings
adminSettingsSchema.statics.getDefaultSettings = function () {
  return {
    general: {
      siteName: "Daiaryverse",
      siteDescription: "Your digital diary and creative community",
      maintenanceMode: false,
      allowRegistration: true,
      defaultUserRole: "user",
      maxUploadSize: 10, // MB
    },
    email: {
      smtpHost: "",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "noreply@daiaryverse.com",
      fromName: "Daiaryverse",
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      adminAlerts: true,
      userWelcomeEmail: true,
      contentModerationAlerts: true,
      systemAlerts: true,
    },
    features: {
      marketplace: true,
      community: true,
      aiAssistant: true,
      readerLounge: true,
      creatorProjects: true,
      socialFeatures: true,
    },
    security: {
      jwtExpiration: "7d",
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requireEmailVerification: false,
      twoFactorAuth: false,
      sessionTimeout: 24, // hours
    },
  };
};

module.exports = mongoose.model("AdminSettings", adminSettingsSchema);
