"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { Button } from "@/shared/components";
import { translate } from "@/i18n/runtime";

// Hidden long-press menu entry (CodeBuddy CN only). A normal click triggers the
// regular OAuth flow; PRESSING AND HOLDING for ~600ms reveals a small menu with
// hidden admin actions (e.g. "import accounts from JSON"). Kept off the normal
// UI so it never clutters the visible controls.

const LONG_PRESS_MS = 600;

export default function CodeBuddyOAuthMenuButton({ onPrimary, onImportJson, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef(null);
  const menuRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return; // left button only
    setPressing(true);
    timerRef.current = setTimeout(() => {
      setMenuOpen(true);
      setPressing(false);
      timerRef.current = null;
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    clearTimer();
    setPressing(false);
  };

  const handlePointerLeave = () => {
    clearTimer();
    setPressing(false);
  };

  const handleClick = () => {
    // A long-press already swallowed the click — do NOT fire the OAuth flow.
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    if (onPrimary) onPrimary();
  };

  // Close the menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => clearTimer, [clearTimer]);

  return (
    <div
      ref={menuRef}
      className="relative inline-flex"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <span onClick={handleClick}>
        <Button size="sm" icon="lock" variant="secondary">
          {children}
        </Button>
      </span>
      {pressing && (
        <span className="pointer-events-none absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-primary/60 transition-opacity" />
      )}
      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-60 rounded-lg border border-border-subtle bg-surface p-1 shadow-[var(--shadow-soft)]">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-text-main hover:bg-surface-2"
            onClick={() => {
              setMenuOpen(false);
              if (onImportJson) onImportJson();
            }}
          >
            <span className="material-symbols-outlined text-[16px] text-primary">upload_file</span>
            <span>{translate("Import CodeBuddy CN accounts from JSON...")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

CodeBuddyOAuthMenuButton.propTypes = {
  onPrimary: PropTypes.func,
  onImportJson: PropTypes.func,
  children: PropTypes.node,
};
