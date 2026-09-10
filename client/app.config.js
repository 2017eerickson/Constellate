require("dotenv").config();

module.exports = {
  expo: {
    name: "Constellate",
    slug: "constellate",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "constellate",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.constellate.app",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.constellate.app",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["@react-native-google-signin/google-signin"],
    extra: {
      webClientId: process.env.WEB_CLIENT_ID,
      iosClientId: process.env.IOS_CLIENT_ID,
    },
  },
};
