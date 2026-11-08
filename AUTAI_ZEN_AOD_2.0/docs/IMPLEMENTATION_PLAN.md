# Implementation Plan (executed)

Phases: 0 Audit & backup → 1 Engine (clock/network/SW/WakeLock) → 2 UI/themes/settings → 3 iPad optimization → 4 QA → 5 Release docs.

All phases implemented in this delivery under `AUTAI_ZEN_AOD_2.0/`:

1. Clock engine: 12/24h, seconds, Intl timezone, 3 date formats, weekday, midnight rollover, hidden pause.
2. Visual engine: 5 themes (OLED, Midnight, Cyber, Neon, Amber), glassmorphism, clock size 80–140%, brightness 50–140%, portrait/landscape.
3. Network: onLine + 30s polling + manual latency, honest packet loss, timeout handling.
4. Battery: no rAF, hidden pause, 30s polling, reduced-motion, OLED black.
5. PWA: icons, versioned SW, offline nav, update banner, cache cleanup.
6. Settings: persisted validated prefs + reset confirm.
7. Controls: COPY, GLOW, SEND, RELOAD, SETTINGS, FULLSCREEN, WAKE, RESET — no dead buttons.
8. Accessibility: labels, focus visible, 44px targets, aria-live=off on clock, aria-expanded on settings.
9. Reliability: no third-party deps, safe DOM textContent updates, guarded APIs.
10. Compatibility: Safari/Home Screen PWA, desktop, mobile, touch+mouse.
11. Testing: node --check, manifest JSON validation, asset-ref scan, logic tests in tests/. Browser visual test NOT VERIFIED (headless browser unavailable in this environment).
12. Docs: README + docs/* + changelog.
