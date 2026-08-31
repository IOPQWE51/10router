"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { initRuntimeI18n, reloadTranslations, onLocaleChange } from "./runtime";

export function RuntimeI18nProvider({ children }) {
  const pathname = usePathname();

  // Track locale in React state so {translate(...)} re-evaluates when the
  // language changes. Without this, text rendered through translate() keeps the
  // previous locale until a full reload (e.g. the "Disabled" badge staying
  // Chinese after switching to English).
  const [, setLocaleTick] = useState(0);

  useEffect(() => {
    initRuntimeI18n();
  }, []);

  // Re-process DOM when route changes
  useEffect(() => {
    if (pathname) {
      // Double RAF to ensure React has committed changes to DOM
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          reloadTranslations();
        });
      });
    }
  }, [pathname]);

  // Force React re-render whenever the runtime locale changes, so components
  // that call translate() during render pick up the new language.
  useEffect(() => {
    return onLocaleChange(() => setLocaleTick((t) => t + 1));
  }, []);

  return <>{children}</>;
}
