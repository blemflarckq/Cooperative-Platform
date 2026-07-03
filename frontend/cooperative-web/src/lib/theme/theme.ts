export type ThemeMode = "light" | "dark";

const THEME_KEY = "coop.theme";

export function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);

  if (stored === "dark") return "dark";
  return "light";
}

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(theme);

  localStorage.setItem(THEME_KEY, theme);
}

export function initializeTheme() {
  applyTheme(getStoredTheme());
}