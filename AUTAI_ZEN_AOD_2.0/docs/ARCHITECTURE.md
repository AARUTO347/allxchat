# Architecture — AUTAI ZEN AOD 2.0

Vanilla HTML/CSS/JS, no build, no dependencies. Deployable as static files over HTTPS.

## Modules (sections inside script.js IIFE)
- Clock: `Intl.DateTimeFormat` for timezone + dateFormat; 1s timeout aligned to next second; resync on visibilitychange; midnight rollover automatic because full Date re-read each second.
- Settings: `localStorage` key `autai-zen-settings-v2`, validated, clamped, corrupt-safe; wakeLock excluded (needs gesture).
- Network: `navigator.onLine` + `online/offline` events + 30s polling with AbortController timeout; latency = fetch duration to 1.1.1.1 trace (labelled as request latency, not ICMP ping); packet loss sampled only from real checks (last 20), else `N/A`.
- Wake Lock: `navigator.wakeLock.request('screen')` with unsupported/denied fallback; re-request on visible if wanted.
- PWA: `sw.js` stale-while-revalidate (navigation network-first with offline fallback), versioned cache `autai-zen-v2`, update banner via `SKIP_WAITING`.

## CSS
Variables per theme; `--clock-scale` (80–140%) and `--glow-intensity` (50–140%) driven from settings; `100dvh` + safe-area insets; portrait reflows sidebar to bottom row.

## Files
`index.html`, `style.css`, `script.js`, `sw.js`, `manifest.json`, `icon-192.png`, `icon-512.png`, `Nevera-Regular.otf`, `docs/`, `tests/`.
