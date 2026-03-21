import { browser } from "$app/environment";

export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];

export const themeStorageKey = "theme";
const legacyThemeStorageKey = "docs-theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function getStoredTheme(): Theme | null {
  if (!browser) {
    return null;
  }

  const storedTheme = localStorage.getItem(themeStorageKey);
  if (isTheme(storedTheme)) {
    return storedTheme;
  }

  const legacyStoredTheme = localStorage.getItem(legacyThemeStorageKey);
  if (isTheme(legacyStoredTheme)) {
    localStorage.setItem(themeStorageKey, legacyStoredTheme);
    localStorage.removeItem(legacyThemeStorageKey);
    return legacyStoredTheme;
  }

  return null;
}

function getPreferredTheme(): Theme {
  if (!browser) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (!browser) {
    return;
  }
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

function createThemeStore() {
  let current = $state<Theme>("light");

  if (browser) {
    const storedTheme = getStoredTheme();
    const initialTheme = storedTheme ?? getPreferredTheme();
    current = initialTheme;
    applyTheme(initialTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handlePreferredThemeChange = () => {
      const savedTheme = getStoredTheme();
      if (savedTheme) {
        return;
      }
      const preferredTheme = mediaQuery.matches ? "dark" : "light";
      if (current !== preferredTheme) {
        current = preferredTheme;
        applyTheme(preferredTheme);
      }
    };
    mediaQuery.addEventListener("change", handlePreferredThemeChange);
  }

  const set = (theme: Theme) => {
    current = theme;
    if (browser) {
      localStorage.setItem(themeStorageKey, theme);
      localStorage.removeItem(legacyThemeStorageKey);
    }
    applyTheme(theme);
  };

  const toggle = () => {
    set(current === "dark" ? "light" : "dark");
  };

  return {
    get current() {
      return current;
    },
    get isDark() {
      return current === "dark";
    },
    set,
    toggle,
  };
}

export const themeStore = createThemeStore();
