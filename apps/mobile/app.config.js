module.exports = {
  expo: {
    name: 'IRIS CRM',
    slug: 'iris-crm',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#f8fafc',
    },
    updates: {
      url: 'https://u.expo.dev/f8544eb2-b640-4c48-b1b8-78d792b8d7a5',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.iriscrm.app',
      runtimeVersion: {
        policy: 'appVersion',
      },
      infoPlist: {
        NSPhotoLibraryUsageDescription: 'ใช้เลือกรูปภาพเพื่อส่งให้ลูกค้า',
        NSCameraUsageDescription: 'ใช้กล้องถ่ายรูปเพื่อส่งให้ลูกค้า',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      runtimeVersion: '1.0.0',
      adaptiveIcon: {
        backgroundColor: '#f8fafc',
      },
      package: 'com.iriscrm.app',
      permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: 'f8544eb2-b640-4c48-b1b8-78d792b8d7a5',
      },
    },
    plugins: [
      'expo-secure-store',
      'expo-notifications',
      'expo-document-picker',
      'expo-image',
    ],
    owner: 'giantd2b',
  },
};
