module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated is fully supported out of the box by Expo SDK 51/52 
      // without needing extra class property plugins here
      'react-native-reanimated/plugin',
    ],
  };
};
