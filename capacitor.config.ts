import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d8e7ca00b3774793af43f6fcf3d043bd',
  appName: 'pmscanv2',
  webDir: 'dist',
  server: {
    url: 'https://d8e7ca00-b377-4793-af43-f6fcf3d043bd.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    // Enable background modes for Bluetooth, Location, and Audio
    // Audio mode keeps the app alive during background recording
    backgroundModes: ['bluetooth-central', 'location', 'audio'],
  },
  android: {
    // Allow background location for continuous recording
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    BackgroundTask: {
      // Android foreground service notification
      android: {
        notificationTitle: 'PMScan Recording',
        notificationText: 'Recording air quality data in background',
        notificationIcon: 'ic_notification',
        notificationColor: '#4F46E5',
      },
    },
  },
};

export default config;