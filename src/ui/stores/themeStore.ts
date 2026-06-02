/**
 * themeStore — 主题状态管理 (Zustand + localStorage 持久化)
 * 默认遵循系统偏好 prefers-color-scheme
 */

import { create } from "zustand";

function getSystemPreference(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): "dark" | "light" {
  try {
    const stored = localStorage.getItem("cardmaker-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // localStorage 不可用时回退
  }
  return getSystemPreference();
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
}

interface ThemeState {
  theme: "dark" | "light";
  toggle: () => void;
  setTheme: (t: "dark" | "light") => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getStoredTheme();
  applyTheme(initial);

  // 监听系统主题变化
  if (typeof window !== "undefined") {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      // 仅在用户未手动设置时跟随系统
      const stored = localStorage.getItem("cardmaker-theme");
      if (!stored || (stored !== "dark" && stored !== "light")) {
        const sys = e.matches ? "dark" : "light";
        applyTheme(sys);
        set({ theme: sys });
      }
    });
  }

  return {
    theme: initial,
    toggle: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("cardmaker-theme", next); } catch {}
      set({ theme: next });
    },
    setTheme: (t) => {
      applyTheme(t);
      try { localStorage.setItem("cardmaker-theme", t); } catch {}
      set({ theme: t });
    },
  };
});
