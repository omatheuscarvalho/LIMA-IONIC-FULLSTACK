import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'LIMA-ionic',
  webDir: 'www',
  plugins: {
    StatusBar: {
      overlaysWebView: false
    }
  }
};

export default config;
