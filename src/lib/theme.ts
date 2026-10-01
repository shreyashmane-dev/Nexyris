export type ThemeMode = 'dark' | 'light' | 'oled';

const THEME_STORAGE_KEY = 'nexyris_theme';

export function getStoredTheme(): ThemeMode {
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val === 'light' || val === 'oled' || val === 'dark') {
      return val;
    }
  } catch (e) {}
  return 'dark';
}

export function applyTheme(theme: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {}

  const root = document.documentElement;
  root.classList.remove('theme-dark', 'theme-light', 'theme-oled');
  root.classList.add(`theme-${theme}`);
  root.setAttribute('data-theme', theme);

  if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }

  window.dispatchEvent(new CustomEvent('nexyris-theme-change', { detail: { theme } }));
}

export function cycleTheme(current: ThemeMode): ThemeMode {
  if (current === 'dark') return 'light';
  if (current === 'light') return 'oled';
  return 'dark';
}
