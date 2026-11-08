# Compatibility

- iPad Safari + Home Screen PWA: supported target. Wake Lock availability varies by iPadOS; app degrades gracefully.
- iPadOS limitation: a web PWA cannot guarantee permanent always-on display; OS may suspend or dim. Users should raise Auto-Lock delay in Settings for best results.
- Desktop browsers (Chrome/Edge/Firefox): full clock/settings; Wake Lock supported where available.
- Mobile browsers: responsive portrait layout; Fullscreen falls back to toast where unsupported.
- Offline: app shell cached; clock/date/settings work offline; network panel shows OFFLINE/N/A honestly.
- HTTPS or localhost required for Service Worker + install prompt.
