"use client";

const STORAGE_KEY = "foodscan_theme";

export type Theme = "light" | "dark";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const t = localStorage.getItem(STORAGE_KEY);
  if (t === "light" || t === "dark") return t;
  return null;
}

export function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getEffectiveTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  return getSystemPrefersDark() ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function toggleTheme(): Theme {
  const next = getEffectiveTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
