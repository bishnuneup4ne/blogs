"use client";

import { useEffect, useState } from "react";
import { Icon, useTheme } from "@once-ui-system/core";
import styles from "./ThemeToggle.module.scss";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const theme =
      (document.documentElement.getAttribute("data-theme") as "light" | "dark" | null) ??
      "dark";
    setCurrentTheme(theme === "light" ? "light" : "dark");
    setMounted(true);

    // Listen for storage changes (cross-tab theme sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "data-theme" && e.newValue) {
        const newTheme = e.newValue as "light" | "dark";
        setCurrentTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleThemeChange = () => {
    const newTheme = currentTheme === "light" ? "dark" : "light";
    
    // Update localStorage first to prevent flickering
    localStorage.setItem("data-theme", newTheme);
    
    // Update DOM attribute immediately
    document.documentElement.setAttribute("data-theme", newTheme);
    
    // Update local state
    setCurrentTheme(newTheme);
    
    // Call once-ui setTheme if it handles additional logic
    setTheme(newTheme);
  };

  const icon = currentTheme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={styles.themeBtn}
      onClick={handleThemeChange}
      aria-label={mounted ? `Switch to ${currentTheme === "light" ? "dark" : "light"} mode` : "Toggle theme"}
      suppressHydrationWarning
    >
      <Icon name={mounted ? icon : "light"} size="xs" />
    </button>
  );
}
