/**
 * Detect whether the app is running inside a Tauri webview.
 *
 * This works because `withGlobalTauri: true` injects `window.__TAURI__`
 * into the webview. On the normal web it is `undefined`, so this returns
 * `false` and the web app behaves exactly as before — no Tauri code needed.
 *
 * @returns {boolean}
 */
export const isTauri = () => typeof window !== 'undefined' && !!window.__TAURI__;

/**
 * Dynamically load a Tauri API module. Only call this when `isTauri()`
 * is true — on the web these imports would resolve to nothing/throw.
 *
 * @param {string} path - Tauri module path, e.g. '@tauri-apps/api/core'
 * @returns {Promise<any>} The module namespace
 */
export const loadTauriModule = (path) => import(path);

/**
 * Whether the current session token was issued by a desktop client.
 * @param {Object} [userData] - Optional user object
 * @returns {boolean}
 */
export const isDesktopSession = () => isTauri();
