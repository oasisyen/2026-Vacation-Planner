/**
 * Whether the app boots as the read-only "shared options" viewer instead of the
 * editor. True in the published GitHub Pages build (VITE_SHARE=1, baked in at
 * build time) or when the URL carries `?share` (handy for previewing locally).
 *
 * Computed once at module load so both `main.tsx` (which app to render) and the
 * store (whether to persist to localStorage) agree. In share mode the store uses
 * non-persistent storage, so loading an option into the viewer never overwrites
 * the editor's saved plan on the same origin.
 */
export const SHARE_MODE: boolean =
  import.meta.env.VITE_SHARE === '1' ||
  (typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('share'));
