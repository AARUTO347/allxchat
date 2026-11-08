# Bugs Found & Fixed

| # | File | Bug | Fix in 2.0 |
|---|---|---|---|
| 1 | script.js | rAF infinite DOM loop | 1s aligned timeout, pause when hidden |
| 2 | script.js | no-cors ping presented as connectivity | Replaced; latency labelled, timeout 1.5s |
| 3 | script.js | 4s network polling | 30s + visibility-aware + manual CHECK via settings network toggle |
| 4 | script.js | Fake 0% packet loss | Removed; N/A or real sample % from last 20 checks |
| 5 | script.js | COPY no error handling | clipboard catch + toast + fallback message |
| 6 | index.html | SEND no functionality | Web Share API + copy fallback |
| 7 | index.html | RELOAD destructive | SW-aware reload with SKIP_WAITING post |
| 8 | manifest.json | Missing icons | Generated icon-192/512 (incl. maskable purpose) |
| 9 | sw.js | Cache-first stale risk | Stale-while-revalidate; nav network-first; versioned cache with cleanup |
| 10 | style.css | No responsive portrait | Media queries, dvh, safe-areas, bottom-row sidebar |
| 11 | style.css | No reduced-motion | prefers-reduced-motion + settings animation toggle |
| 12 | README.md | No docs | Full README + docs/ set |
| 13 | script.js | AM/PM + date only once at load | Recomputed every second; midnight rollover automatic |
| 14 | index.html | user-scalable=no blocked zoom | Removed restriction for accessibility |
| + | script.js | Wake Lock absent | User-controlled Wake Lock with graceful fallback |
| + | script.js | No settings persistence | Validated localStorage, reset with confirm |

Remaining known limitations: see COMPATIBILITY.md / TEST_REPORT.md.
