import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// Deep links from the web bounce page (/open/bookings) and LINE cards.
// iriscrm:// is registered on the next native build; com.iriscrm.app:// already
// works on iOS because Expo registers the bundle id as a URL scheme.
const linking: LinkingOptions<any> = {
  prefixes: ['iriscrm://', 'com.iriscrm.app://'],
  config: {
    screens: {
      Main: {
        screens: {
          Inbox: 'inbox',
          Dashboard: 'dashboard',
          Bookings: 'bookings',
          Settings: 'settings',
        },
      },
      SlipReport: 'slips',
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer linking={linking}>
          <AppNavigator />
          <StatusBar style="dark" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
