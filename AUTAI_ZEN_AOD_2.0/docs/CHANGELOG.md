# Changelog

## 2.5 — All 15 features (2026-11-08)
- Batch 2: Face styles (Nevera/Flip/Dot/Sans), world clocks (Local+UTC+Tokyo), complications (doy/week/%/secs), ambient background (gradient/stars/rain on 1s tick), greeter + name.
- Batch 3: Alarms (5, toast+vibrate+Notification), stopwatch+lap, Pomodoro focus (25/50/90, auto-DIM break), countdown (label+datetime), auto day/night theme.
- Batch 4: Letter-spacing slider, high-contrast mode, gestures (swipe=theme, 2-finger=DIM, double-tap=Fullscreen), voice announce (speechSynthesis), ticker message.
- PWA cache → `autai-zen-v5`; `tests/extras.test.js` added.

## 2.0 (2026-11-08)
- Battery: replaced rAF loop with 1s aligned scheduler; pause when hidden; 30s network polling.
- Clock: 12/24h, seconds, AM/PM, weekday, 3 date formats, Intl timezone (local + 5), midnight rollover.
- Visual: 5 themes (OLED Pure Black, Midnight Blue, Cyber Cyan, Neon Green, Amber Night), clock size 80–140%, brightness 50–140%, glassmorphism, portrait/landscape responsive, reduced-motion.
- Network: honest latency with timeout, packet loss = N/A until real samples, onLine/offline events.
- PWA: generated 192/512 icons, versioned stale-while-revalidate SW, update banner, offline nav.
- Controls: COPY, GLOW (Amber↔OLED), SEND (Share→copy fallback), RELOAD (SW-aware), SETTINGS panel, FULLSCREEN, WAKE, RESET (confirm), all functional.
- Accessibility: labels, focus-visible, 44px targets, no zoom block.
- Docs: README + docs/AUDIT/ARCHITECTURE/BUGS/IMPLEMENTATION_PLAN/TEST_REPORT/COMPATIBILITY.

## 1.x (original)
- Initial iPad PWA clock with Nevera font. Superseded by 2.0.
