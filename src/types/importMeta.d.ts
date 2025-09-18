// Global ImportMeta augmentation for non-Vite contexts (e.g., config files)
declare interface ImportMeta {
  env?: Record<string, any>;
}

export {};