export function hasTauri() {
  return typeof window !== 'undefined' && !!window.__TAURI__;
}

export async function invoke(cmd, payload) {
  if (!hasTauri()) {
    throw new Error('Tauri API not available');
  }
  return window.__TAURI__.invoke(cmd, payload);
}

export function listen(eventName, handler) {
  if (!hasTauri()) {
    return () => {};
  }
  return window.__TAURI__.event.listen(eventName, handler);
}

