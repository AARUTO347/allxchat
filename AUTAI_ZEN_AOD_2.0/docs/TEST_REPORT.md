# Test Report — AUTAI ZEN AOD 2.5

## Automated (run in build environment)
- JS syntax: `node --check script.js` / `sw.js` — PASS
- Manifest JSON parse — PASS
- Asset reference scan — PASS (icons present, font present, all SW assets HTTP 200 locally)
- Logic tests: `tests/clock.test.js`, `settings.test.js`, `network.test.js`, `extras.test.js` (doy/week/secs/countdown/focus/stopwatch math) — PASS
- Forbidden-pattern scan (no rAF loop, no no-cors, no 4s poll) — PASS

## Manual / environment-limited
- Browser rendering & console check — NOT VERIFIED (headless browser timeout; open via http://localhost:8099)
- PWA install on iPad — NOT VERIFIED (requires iPad + HTTPS host)
- Service Worker offline navigation — VERIFIED locally (all 8 assets 200, SW v5, offline fallback in code); full airplane-mode on-device still NOT VERIFIED
- Wake Lock on iPadOS — NOT VERIFIED (needs device)
- Alarms / gestures / voice on iPadOS — NOT VERIFIED (needs device)
- Responsive portrait/landscape — NOT VERIFIED visually (needs device)

## Known limitations
- Wake Lock cannot prevent iPadOS sleep; best-effort only.
- Alarms/Notifications fire only in foreground; suspended PWA can't play sound.
- Latency is fetch duration, not ICMP ping; packet loss needs real samples or shows N/A.
- Ambient canvas draws on 1s tick; battery labelled.
- Custom font file included as-is; license assumed with original project — verify before public distribution.
