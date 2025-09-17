import { CapacitorConfig } from '@capacitor/cli';

const IS_DEV = process.env.NODE_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'com.tera.pmscan',
  appName: 'PMScan',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: IS_DEV
    ? {
        // (optional) use your dev URL during web/dev only
        // url: 'http://192.168.1.10:5173', // <= adjust, or leave undefined
        // cleartext: true,
      }
    : {
        // PRODUCTION (APK/AAB): load bundled assets inside the app
        androidScheme: 'https',
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
  },
};

export default config;