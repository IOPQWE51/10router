"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { marked } from "marked";
import { translate, getCurrentLocale } from "@/i18n/runtime";

marked.setOptions({ gfm: true, breaks: true });

// External links (e.g. the full CHANGELOG.md link) must open in a new tab —
// navigating inside the app window breaks the SPA. marked v18 passes a token
// object {href, title, tokens} to the link renderer (NOT positional args);
// use this.parser to render the link text so nested inline tokens survive.
const renderer = {
  link({ href, title, tokens }) {
    const text = tokens ? this.parser.parseInline(tokens) : (title || href);
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  },
};
marked.use({ renderer });

// Locales with a dedicated changelog translation. Everything else (including
// ja/ko until they're translated) falls back to en.md. The file name uses the
// canonical locale key exactly as the i18n literals (zh-CN, zh-TW).
const CHANGELOG_LOCALES = ["en", "zh-CN", "zh-TW"];

// Changelog files ship in the build under public/i18n/changelog/, so they're
// served from this app directly (no network round-trip to raw.githubusercontent).
const CHANGELOG_BASE = "/i18n/changelog/";

function changelogFileForLocale(locale) {
  const normalized = locale === "zh" ? "zh-CN" : locale;
  return CHANGELOG_LOCALES.includes(normalized) ? normalized : "en";
}

function fetchChangelog(url) {
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((md) => marked.parse(md));
}

export default function ChangelogModal({ isOpen, onClose }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen || html) return;
    setLoading(true);
    setError("");

    const file = changelogFileForLocale(getCurrentLocale());
    const url = `${CHANGELOG_BASE}${file}.md`;
    fetchChangelog(url)
      .then((md) => {
        setHtml(md);
        setError("");
      })
      .catch((primaryErr) => {
        // Locale file missing (e.g. ja/ko not translated yet, or file removed) —
        // fall back to the English changelog before surfacing an error.
        if (file !== "en") {
          const enUrl = `${CHANGELOG_BASE}en.md`;
          fetchChangelog(enUrl)
            .then((md) => { setHtml(md); setError(""); })
            .catch((enErr) => setError(enErr.message || "Failed to load"))
            .finally(() => setLoading(false));
        } else {
          setError(primaryErr.message || "Failed to load");
          setLoading(false);
        }
      });
  }, [isOpen, html]);

  // Reload when the locale changes while the modal is open, so a locale switch
  // re-renders the changelog in the new language instead of reusing the cache.
  const currentLocale = getCurrentLocale();
  useEffect(() => {
    if (isOpen && html) setHtml("");
  }, [currentLocale]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        className="relative w-full bg-surface border border-black/10 dark:border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-w-3xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-black/5 dark:border-white/5">
          <h2 className="text-lg font-semibold text-text-main">{translate("Change Log")}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label={translate("Close")}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-10 text-text-muted">
              <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
              {translate("Loading...")}
            </div>
          )}
          {error && (
            <div className="text-red-500 py-4">{translate("Failed to load changelog: ")}{error}</div>
          )}
          {!loading && !error && html && (
            <div
              className="changelog-body text-text-main"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

ChangelogModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
