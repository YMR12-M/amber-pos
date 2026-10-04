import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "amber-pos-theme";

/**
 * `localStorage` بيرمي استثناء (مش بيرجّع null) لما المتصفح يكون قافل
 * تخزين المواقع — تصفّح خاص أو تابلت في وضع kiosk بإعدادات مشددة.
 * من غير الحماية دي التطبيق كان بيقع على شاشة بيضا وقت الإقلاع.
 */
function readStored(): Theme | null {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

function initial(): Theme {
  return (
    readStored() ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
}

/** الوضع الفاتح/الداكن — بيتخزّن محلياً وبيتطبّق على <html data-theme>. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // التخزين مقفول — الثيم بيشتغل للجلسة دي بس.
    }
    document
      .querySelector('meta[name="theme-color"]')
      // لون شريط الترويسة (داكن في الوضعين) — نفس قيم index.html و tokens.css
      ?.setAttribute("content", theme === "dark" ? "#0f0a07" : "#2b1f17");
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return { theme, toggle };
}
