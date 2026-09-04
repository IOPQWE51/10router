; 10Router web installer — dual-source package download with fallback.
;
; electron-builder's custom include lands BEFORE the official templates, so
; redefining `downloadApplicationFiles` fails ("macro already exists").
; Instead we hook `customInit` (runs before the install section) and let the
; OFFICIAL download macro stay in place — but we make its single
; APP_PACKAGE_URL resilient by pre-resolving which mirror actually works:
;
;   1. customInit HEAD/GET-probes GitHub (releases/latest/download), then
;      Gitee (versioned path), using inetc with a tiny probe file… too heavy.
;
; Simpler, dependency-free approach that the official macro already supports:
; it first looks for a local file passed via `--package-file`. We instead
; override APP_PACKAGE_URL semantics entirely by NOT relying on runtime
; source switching — the URL used here is GitHub's version-independent
; `releases/latest/download` (302-redirects to the newest release assets),
; and the Gitee mirror URL is baked in as a fallback string written into the
; packageUrl variable before the official macro runs. Because the official
; macro copies `${APP_PACKAGE_URL}` into `$packageUrl` itself, our value set
; here would be overwritten — so the ONLY clean hook is the retry dialog…
;
; => Conclusion: macro redefinition conflicts are unavoidable via include.
; electron-builder therefore needs `APP_PACKAGE_URL` to point at a source
; that serves `app-64.7z` (or the versioned nsis.7z name). The Gitee
; fallback is implemented OUTSIDE the installer instead: our release
; automation uploads the package to both GitHub and Gitee, and users behind
; a broken GitHub route can download `10Router-Web-Setup` from either
; release page — the installer itself then always pulls from the configured
; GitHub URL. If a future electron-builder version adds multi-source
; support, wire it here.
;
; This file intentionally defines no macros — kept as documentation for the
; packaging flow and a ready-to-extend hook point.
