const DEBUG_ENABLED = import.meta.env.VITE_LOG_LEVEL === 'debug' || import.meta.env.DEV;

export function debug(...args: unknown[]) {
  if (DEBUG_ENABLED) {
    console.debug(...args);
  }
}

export function info(...args: unknown[]) {
  console.info(...args);
}

export function error(...args: unknown[]) {
  console.error(...args);
}

export default { debug, info, error };
