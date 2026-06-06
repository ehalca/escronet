module.exports = {
  dependencies: {
    // Exclude heavy native modules not used by the current shell app.
    // Re-enable each one when the corresponding feature is implemented.
    'onnxruntime-react-native': {
      platforms: { android: null, ios: null },
    },
    'react-native-callkeep': {
      platforms: { android: null, ios: null },
    },
  },
};
