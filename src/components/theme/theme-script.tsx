export const THEME_STORAGE_KEY = "tracky-theme";
export type ThemePreference = "dark" | "light" | "system";

/**
 * Runs synchronously before first paint so the stored theme is applied with no
 * flash. Dark is the default. See Next.js guide "Preventing flash before hydration".
 */
const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="system")p="dark";var r=p==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;var d=document.documentElement;d.dataset.theme=r;d.dataset.themePref=p;}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
