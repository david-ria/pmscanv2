// Google API TypeScript declarations
declare global {
  interface Window {
    gapi: {
      load: (
        api: string,
        options: { callback: () => void; onerror?: () => void }
      ) => void;
      auth2: {
        init: (config: { client_id: string; scope: string }) => Promise<any>;
        getAuthInstance: () => {
          signIn: () => Promise<{
            getAuthResponse: () => { access_token: string };
          }>;
        };
      };
    };
  }
}

export {};
