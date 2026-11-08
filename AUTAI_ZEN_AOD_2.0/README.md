# AUTAI ZEN AOD 2.0

Premium, battery-conscious iPad clock PWA — large 12/24h clock, date, Wake Lock (best-effort), offline, 5 themes, honest network diagnostics.

> A web PWA **cannot guarantee** permanent always-on display on iPadOS. The OS may suspend the app or dim the screen. Use Settings → Auto-Lock for best results. Wake Lock requests are user-controlled and best-effort.

## Features
- 12H / 24H, live seconds, AM/PM, weekday, date (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD), timezone (Local + 5 presets)
- 5 themes: OLED Pure Black, Midnight Blue, Cyber Cyan, Neon Green, Amber Night
- Clock size 80–140%, brightness 50–140%, glassmorphism (restrained), portrait/landscape
- Network: onLine/offline + 30s checks with timeout; latency is fetch duration (not ICMP ping); packet loss shows N/A until real samples exist
- Settings dashboard persisted in localStorage with reset
- Controls: COPY, GLOW, SEND, RELOAD, SETTINGS, FULLSCREEN, WAKE, RESET — all functional
- PWA: installable, offline shell, update banner, versioned cache cleanup

## Install on iPad
1. Serve this folder over **HTTPS** or localhost (PWA requirement).
2. Open in Safari → Share → **Add to Home Screen**.
3. Launch from Home Screen.

## Local development
```bash
python -m http.server 8099
# open http://localhost:8099/index.html
node tests/clock.test.js && node tests/settings.test.js && node tests/network.test.js
```

## Production deployment
Upload static files to any HTTPS host (GitHub Pages, Netlify, etc.). No build step. Keep all files at root so relative paths resolve: `index.html, style.css, script.js, sw.js, manifest.json, icon-*.png, Nevera-Regular.otf`.

## Configuration
All via the on-screen **SETTINGS** panel (no build-time config). Reset restores defaults after confirmation.

## Troubleshooting
- Install prompt missing: ensure HTTPS + icons present + manifest valid.
- Clock wrong after sleep: app resyncs on visible; check device time.
- Wake Lock shows DENIED: tap KEEP ON/WAKE from user gesture; check iPadOS version.
- Network shows N/A: normal until real samples; check connectivity.

## Compatibility
iPad Safari / Home Screen PWA, desktop Chrome/Edge/Firefox, mobile browsers. See `docs/COMPATIBILITY.md`.

## Docs
See `docs/AUDIT.md`, `ARCHITECTURE.md`, `BUGS.md`, `IMPLEMENTATION_PLAN.md`, `TEST_REPORT.md`, `CHANGELOG.md`.

## Tech / License
Vanilla HTML/CSS/JS. Font `Nevera-Regular.otf` (`font-display: swap`) — included from original project; verify font license before public distribution. Original author attribution preserved in `docs/AUDIT.md`.

## Screenshots
Placeholder — add after iPad verification.
