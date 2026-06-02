/**
 * useKeyboardShortcuts — 全局键盘快捷键管理
 * 在各页面中注册对应的快捷键处理
 */

import { useEffect, useRef, useCallback } from "react";

export interface ShortcutDef {
  /** 键名，如 "s"、"z"、"y"、"n"、"f" */
  key: string;
  /** 是否需要 Ctrl 修饰键 */
  ctrl: boolean;
  /** 是否需要 Shift 修饰键 */
  shift?: boolean;
  /** 快捷键描述 */
  description: string;
  /** 处理函数 */
  handler: () => void;
}

/**
 * 注册一组键盘快捷键
 * 通过 ref 保持 handler 引用最新，避免闭包陈旧问题
 */
export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isInputFocused =
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA" ||
      document.activeElement?.tagName === "SELECT";

    for (const s of shortcutsRef.current) {
      const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const shiftMatch = s.shift ? e.shiftKey : true;

      if (keyMatch && ctrlMatch && shiftMatch) {
        // 仅 Ctrl+N / Ctrl+F 在输入框中也触发（聚焦搜索框/新建）
        const allowInInput = s.key === "n" || s.key === "f";
        if (isInputFocused && !allowInInput) return;

        e.preventDefault();
        s.handler();
        return;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
