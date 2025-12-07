const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Custom Expo config plugin to add usesCleartextTraffic to AndroidManifest.xml
 * This allows the app to make HTTP (non-HTTPS) requests
 */
module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Add usesCleartextTraffic attribute to application tag
    mainApplication.$["android:usesCleartextTraffic"] = "true";

    return config;
  });
};
