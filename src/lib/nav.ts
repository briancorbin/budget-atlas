/**
 * Programmatic navigation primitives for the in-app routing setup.
 *
 * Lives in its own module (rather than alongside `App` in App.tsx) so that
 * App.tsx can be a pure component module — Vite's Fast Refresh only HMR's
 * files whose exports are *all* components, and mixing this navigate helper
 * in there would silently break component reload during development.
 */

export const NAV_EVENT = 'app:navigate';

/**
 * Change the route without a full page reload. Pushes a new history entry
 * and emits a `NAV_EVENT` so the App listener picks it up. Call this from
 * in-app links instead of setting `window.location`.
 */
export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event(NAV_EVENT));
}
