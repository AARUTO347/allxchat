/**
 * AUTAI ZEN AOD 2.0 — Battery-conscious iPad clock
 * Modules: clock (Intl), settings, network, wake-lock, analog, timer,
 * alarms, stopwatch, focus, countdown, ambient, gestures, speech, PWA
 * No rAF loop; 1s interval aligned to second boundary; pauses when hidden.
 */
(function () {
  'use strict';

  var LS_KEY = 'autai-zen-settings-v2';
  var THEMES = ['oled-pure-black', 'midnight-blue', 'cyber-cyan', 'neon-green', 'amber-night'];
  var FACES = ['nevera', 'flip', 'dot', 'sans'];
  var AMBIENTS = ['none', 'gradient', 'stars', 'rain', 'aurora', 'snow', 'fireflies'];
  var LEGACY_THEME = { 'zen-night': 'oled-pure-black', 'ocean': 'midnight-blue', 'ember': 'amber-night', 'minimal-light': 'oled-pure-black' };
  var NET_INTERVAL_MS = 30000;

  var DEFAULTS = {
    format24: false, showSeconds: true, showWeekday: true, showDate: true, showNetwork: true,
    animations: true, showAnalog: false, showBattery: true, accentColor: '#34C759',
    showWorld: true, showComplications: true, highContrast: false, gestures: true, largeText: false,
    autoTheme: false, face: 'nevera', ambient: 'none', letterSpacing: 100, preset: '',
    greeterName: '', ticker: '', countdownLabel: '', countdownDate: '',
    theme: 'oled-pure-black', dateFormat: 'DD/MM/YYYY', timezone: 'local', clockSize: 100, brightness: 100
  };

  var state = Object.assign({}, DEFAULTS, { wakeLockWanted: false });
  var alarms = [];
  var ambientParticles = [];

  function loadSettings() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      ['format24','showSeconds','showWeekday','showDate','showNetwork','animations','showAnalog','showBattery','showWorld','showComplications','highContrast','gestures','autoTheme','largeText'].forEach(function (k) {
        if (typeof parsed[k] === 'boolean') state[k] = parsed[k];
      });
      if (typeof parsed.preset === 'string') state.preset = parsed.preset;
      if (typeof parsed.clockSize === 'number') state.clockSize = clamp(parsed.clockSize, 80, 140);
      if (typeof parsed.brightness === 'number') state.brightness = clamp(parsed.brightness, 50, 140);
      if (typeof parsed.letterSpacing === 'number') state.letterSpacing = clamp(parsed.letterSpacing, 80, 160);
      if (typeof parsed.accentColor === 'string' && /^#([0-9a-f]{6})$/i.test(parsed.accentColor)) state.accentColor = parsed.accentColor;
      if (parsed.dateFormat && ['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'].indexOf(parsed.dateFormat) !== -1) state.dateFormat = parsed.dateFormat;
      if (typeof parsed.timezone === 'string') state.timezone = parsed.timezone;
      if (parsed.face && FACES.indexOf(parsed.face) !== -1) state.face = parsed.face;
      if (parsed.ambient && AMBIENTS.indexOf(parsed.ambient) !== -1) state.ambient = parsed.ambient;
      if (typeof parsed.greeterName === 'string') state.greeterName = parsed.greeterName.slice(0, 24);
      if (typeof parsed.ticker === 'string') state.ticker = parsed.ticker.slice(0, 120);
      if (typeof parsed.countdownLabel === 'string') state.countdownLabel = parsed.countdownLabel.slice(0, 24);
      if (typeof parsed.countdownDate === 'string') state.countdownDate = parsed.countdownDate;
      if (parsed.theme) { var t = LEGACY_THEME[parsed.theme] || parsed.theme; if (THEMES.indexOf(t) !== -1) state.theme = t; }
      try { var a = JSON.parse(localStorage.getItem('autai-zen-alarms') || '[]'); if (Array.isArray(a)) alarms = a.filter(function (x) { return x && /^\d{2}:\d{2}$/.test(x.time); }).slice(0, 15); } catch (e) { alarms = []; }
    } catch (e) { /* keep defaults */ }
  }

  function saveSettings() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        format24: state.format24, showSeconds: state.showSeconds, showWeekday: state.showWeekday,
        showDate: state.showDate, showNetwork: state.showNetwork, animations: state.animations,
        showAnalog: state.showAnalog, showBattery: state.showBattery, accentColor: state.accentColor,
        showWorld: state.showWorld, showComplications: state.showComplications,
        highContrast: state.highContrast, gestures: state.gestures, autoTheme: state.autoTheme, largeText: state.largeText,
        preset: state.preset, face: state.face, ambient: state.ambient, letterSpacing: state.letterSpacing,
        greeterName: state.greeterName, ticker: state.ticker,
        countdownLabel: state.countdownLabel, countdownDate: state.countdownDate,
        theme: state.theme, dateFormat: state.dateFormat, timezone: state.timezone,
        clockSize: state.clockSize, brightness: state.brightness
      }));
      localStorage.setItem('autai-zen-alarms', JSON.stringify(alarms));
    } catch (e) { /* ignore */ }
  }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function $(id) { return document.getElementById(id); }
  function pad(n) { return String(n).padStart(2, '0'); }

  var clockEl, secEl, ampmEl, dateEl, dayEl, dotEl, statusEl, wakeEl, tzEl;
  var latEl, linkEl, logEl, lastCheckEl, pulseEl, toastEl, packetLossEl, netPanel, settingsPanel;
  var analogCanvas, ambientCanvas, worldRow, compEl, greeterEl, tickerEl, tickerTextEl;
  var clockTimer = null, netTimer = null, pendingSW = null, wakeLockSentinel = null, networkSamples = [];
  var sessionStart = Date.now(), renderCount = 0, latencyHistory = [];
  var batteryEl, batteryColEl;
  var timerSec = 0, timerRunning = false, timerValEl, timerStateEl, timerDispEl;
  var swElapsed = 0, swRunning = false, swStart = null, swValEl, swStateEl, laps = [];
  var focusSec = 0, focusRunning = false, focusPhase = 'focus', focusSessions = 0, focusValEl, focusMetaEl, focusDispEl, focusPhaseEl;
  var cdValEl, cdDispEl, cdLabelEl, cdMetaEl;

  var toastTimer = null;
  function showToast(msg) { toastEl.textContent = msg; toastEl.hidden = false; if (toastTimer) clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2600); }
  function log(msg) { logEl.textContent = msg; }

  /* ---------- Clock helpers ---------- */
  function getParts(now, tz) {
    try {
      var opts = { timeZone: tz === 'local' ? undefined : tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false };
      var parts = new Intl.DateTimeFormat('en-GB', opts).formatToParts(now);
      var map = {}; parts.forEach(function (p) { map[p.type] = p.value; });
      var hour24 = parseInt(map.hour, 10) % 24;
      return { hour24: hour24, min: map.minute, sec: map.second, ampm: hour24 >= 12 ? 'PM' : 'AM' };
    } catch (e) { return { hour24: now.getHours(), min: pad(now.getMinutes()), sec: pad(now.getSeconds()), ampm: now.getHours() >= 12 ? 'PM' : 'AM' }; }
  }
  function timeForTz(now, tz) {
    var p = getParts(now, tz);
    var h = state.format24 ? pad(p.hour24) : pad((p.hour24 % 12 === 0) ? 12 : p.hour24 % 12);
    return h + ':' + p.min + (state.format24 ? '' : ' ' + p.ampm);
  }
  function formatDate(now) {
    var d = String(now.getDate()).padStart(2, '0'), m = String(now.getMonth() + 1).padStart(2, '0'), y = String(now.getFullYear());
    if (state.timezone !== 'local') {
      try {
        var parts = new Intl.DateTimeFormat('en-CA', { timeZone: state.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
        var mp = {}; parts.forEach(function (p) { mp[p.type] = p.value; });
        d = mp.day; m = mp.month; y = mp.year;
      } catch (e) {}
    }
    if (state.dateFormat === 'MM/DD/YYYY') return m + '/' + d + '/' + y;
    if (state.dateFormat === 'YYYY-MM-DD') return y + '-' + m + '-' + d;
    return d + '/' + m + '/' + y;
  }
  function dayFacts(now) {
    var start = new Date(now.getFullYear(), 0, 0);
    var doy = Math.floor((now - start) / 864e5);
    var week = Math.ceil(doy / 7);
    var secs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    var pct = Math.round((secs / 86400) * 100);
    return { doy: doy, week: week, pct: pct, secs: secs };
  }

  /* ---------- Analog ---------- */
  function drawAnalog(p) {
    if (!analogCanvas) return;
    var ctx = analogCanvas.getContext('2d');
    var size = analogCanvas.width, c = size / 2, r = size / 2 - 6;
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 1; i <= 12; i++) { var a = (i / 12) * Math.PI * 2 - Math.PI / 2; ctx.fillText(String(i), c + Math.cos(a) * (r - 12), c + Math.sin(a) * (r - 12)); }
    function hand(angle, len, width, color) { ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + Math.cos(angle) * len, c + Math.sin(angle) * len); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke(); }
    var h = p.hour24 % 12, m = parseInt(p.min, 10), s = parseInt(p.sec, 10);
    hand(((h + m / 60) / 12) * Math.PI * 2 - Math.PI / 2, r * 0.52, 5, '#ffffff');
    hand(((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2, r * 0.78, 3, '#ffffff');
    hand((s / 60) * Math.PI * 2 - Math.PI / 2, r * 0.85, 1.5, state.accentColor || '#34C759');
    ctx.beginPath(); ctx.arc(c, c, 4, 0, Math.PI * 2); ctx.fillStyle = state.accentColor || '#34C759'; ctx.fill();
  }

  /* ---------- Ambient (drawn on the 1s tick; no extra loop) ---------- */
  function drawAmbient(now) {
    if (!ambientCanvas) return;
    var show = state.ambient !== 'none' && state.animations && !document.hidden && !document.body.classList.contains('no-animations');
    ambientCanvas.hidden = !show;
    if (!show) return;
    var ctx = ambientCanvas.getContext('2d');
    var w = ambientCanvas.width = window.innerWidth, h = ambientCanvas.height = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    if (state.ambient === 'gradient') {
      var t = (now.getTime() / 60000) % 1;
      var g = ctx.createLinearGradient(0, 0, w * t, h * (1 - t));
      g.addColorStop(0, state.accentColor + '22'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      return;
    }
    if (!ambientParticles.length) {
      for (var i = 0; i < 12; i++) ambientParticles.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.5 });
    }
    if (state.ambient === 'aurora') {
      var t2 = (now.getTime() / 30000) % 1;
      var g2 = ctx.createLinearGradient(0, h * 0.2, w, h * 0.6 + Math.sin(t2 * Math.PI * 2) * 40);
      g2.addColorStop(0, 'rgba(0,255,200,.12)'); g2.addColorStop(0.5, 'rgba(80,120,255,.12)'); g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
    }
    ambientParticles.forEach(function (pt) {
      var speed = state.ambient === 'rain' ? 0.02 : (state.ambient === 'snow' ? 0.005 : (state.ambient === 'fireflies' ? 0.002 : 0.001));
      pt.y = (pt.y + speed * pt.s) % 1;
      if (state.ambient === 'fireflies') pt.x = (pt.x + Math.sin(now.getTime() / 2000 + pt.s) * 0.0008 + 1) % 1;
      ctx.fillStyle = state.ambient === 'fireflies' ? 'rgba(255,240,150,.8)' : (state.ambient === 'rain' ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.6)');
      ctx.beginPath(); ctx.arc(pt.x * w, pt.y * h, pt.s, 0, Math.PI * 2); ctx.fill();
    });
  }

  /* ---------- Timer / Stopwatch / Focus ---------- */
  function fmtTimer(sec) { var m = Math.floor(sec / 60), s = sec % 60; return pad(m) + ':' + pad(s); }
  function fmtSW(totalSec) { var m = Math.floor(totalSec / 60), s = totalSec % 60, t = Math.floor((totalSec % 1) * 10); return pad(m) + ':' + pad(s) + '.' + t; }
  function updateTimerUI() {
    if (!timerValEl) return;
    timerValEl.textContent = fmtTimer(timerSec);
    timerStateEl.textContent = timerRunning ? 'RUNNING' : (timerSec > 0 ? 'PAUSED' : 'READY');
    timerDispEl.hidden = !(timerSec > 0 || timerRunning);
  }
  function updateFocusUI() {
    if (!focusValEl) return;
    focusValEl.textContent = fmtTimer(focusSec);
    focusPhaseEl.textContent = focusPhase.toUpperCase();
    focusMetaEl.textContent = 'SESSION ' + focusSessions + '/4';
    focusDispEl.hidden = !(focusSec > 0 || focusRunning);
  }
  function updateSWUI() {
    if (!swValEl) return;
    swValEl.textContent = fmtSW(swElapsed);
    swStateEl.textContent = swRunning ? 'RUNNING' : (swElapsed > 0 ? 'PAUSED' : 'READY');
  }
  function tickTimer(now) {
    if (timerRunning && !document.hidden && timerSec > 0) {
      timerSec--;
      if (timerSec === 0) { timerRunning = false; showToast('Timer done'); if (navigator.vibrate) try { navigator.vibrate(200); } catch (e) {} }
    }
    if (focusRunning && !document.hidden) {
      if (focusSec > 0) { focusSec--; }
      if (focusSec <= 0) {
        if (focusPhase === 'focus') { focusSessions++; focusPhase = 'break'; focusSec = 300; setStandby(true); showToast('Focus done — break'); }
        else { focusPhase = 'focus'; focusSec = 1500; if (standbyOn) setStandby(false); showToast('Break over'); }
        focusRunning = false;
      }
    }
    if (swRunning && !document.hidden && swStart) swElapsed = (Date.now() - swStart) / 1000;
    checkAlarms(now);
  }
  function checkAlarms(now) {
    if (!alarms.length) return;
    var hm = pad(now.getHours()) + ':' + pad(now.getMinutes());
    alarms.forEach(function (a) {
      if (a.time === hm && !a.firedFor) {
        a.firedFor = now.toDateString();
        showToast('⏰ ' + (a.label || 'Alarm') + ' — ' + a.time);
        if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('AUTAI ZEN', { body: (a.label || 'Alarm') }); } catch (e) {} }
        if (navigator.vibrate) try { navigator.vibrate([200, 100, 200]); } catch (e) {}
      }
    });
  }

  /* ---------- Battery ---------- */
  function initBattery() {
    if (!state.showBattery || !navigator.getBattery) return;
    navigator.getBattery().then(function (b) {
      function upd() { batteryEl.textContent = Math.round(b.level * 100) + '%' + (b.charging ? ' ⚡' : ''); batteryEl.style.color = b.charging ? 'var(--accent)' : ''; }
      upd(); b.addEventListener('levelchange', upd); b.addEventListener('chargingchange', upd);
    }).catch(function () { batteryEl.textContent = 'N/A'; });
  }

  /* ---------- Standby ---------- */
  var standbyOn = false;
  function setStandby(on) { standbyOn = on; document.body.classList.toggle('standby', on); $('btnStandby').classList.toggle('active', on); }

  /* ---------- Render ---------- */
  function renderClock() {
    var now = new Date();
    var p = getParts(now, state.timezone);
    var displayH, ampm = '';
    if (state.format24) { displayH = pad(p.hour24); }
    else { var h12 = p.hour24 % 12; if (h12 === 0) h12 = 12; displayH = pad(h12); ampm = p.ampm; }
    clockEl.textContent = displayH + ':' + p.min;
    secEl.textContent = p.sec;
    secEl.classList.toggle('hidden', !state.showSeconds);
    ampmEl.textContent = ampm;
    dayEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: state.timezone === 'local' ? undefined : state.timezone }).toUpperCase();
    dayEl.classList.toggle('hidden', !state.showWeekday);
    dateEl.textContent = formatDate(now);
    dateEl.classList.toggle('hidden', !state.showDate);
    tzEl.textContent = state.timezone.toUpperCase();

    var hr = p.hour24;
    var greet = hr < 12 ? 'Good morning' : (hr < 18 ? 'Good afternoon' : 'Good evening');
    greeterEl.textContent = state.greeterName ? (greet + ', ' + state.greeterName) : greet;
    greeterEl.classList.toggle('hidden', !state.greeterName && hr >= 0 && false);

    var facts = dayFacts(now);
    $('cDoy').textContent = 'DAY ' + pad(facts.doy);
    $('cWeek').textContent = 'WEEK ' + pad(facts.week);
    $('cPct').textContent = facts.pct + '% OF DAY';
    $('cMid').textContent = facts.secs + 'S SINCE MIDNIGHT';
    compEl.classList.toggle('hidden', !state.showComplications);

    $('w1Label').textContent = state.timezone.toUpperCase();
    $('w1Time').textContent = timeForTz(now, state.timezone);
    $('w2Time').textContent = timeForTz(now, 'UTC');
    $('w3Time').textContent = timeForTz(now, 'Europe/London');
    $('w4Time').textContent = timeForTz(now, 'Asia/Tokyo');
    $('w5Time').textContent = timeForTz(now, 'America/New_York');
    worldRow.classList.toggle('hidden', !state.showWorld);
    renderCount++;
    updateStats(now);

    tickerEl.classList.toggle('hidden', !state.ticker);
    tickerTextEl.textContent = state.ticker;

    var isPM = hr >= 12;
    dotEl.classList.toggle('pm', !state.format24 && isPM);
    statusEl.textContent = navigator.onLine ? 'SYSTEM ACTIVE' : 'OFFLINE — LOCAL TIME';
    dotEl.classList.toggle('offline', !navigator.onLine);

    if (state.showAnalog && analogCanvas) drawAnalog(p);
    drawAmbient(now);
    updateTimerUI(); updateFocusUI(); updateSWUI(); updateCountdownUI(now);

    if (state.autoTheme) {
      var want = (hr >= 6 && hr < 18) ? 'cyber-cyan' : 'amber-night';
      if (document.documentElement.dataset.theme !== want) {
        document.documentElement.dataset.theme = want;
        document.documentElement.style.setProperty('--glow-intensity', (hr >= 6 && hr < 18 ? state.brightness : 70) / 100);
      }
    }
  }

  function updateCountdownUI(now) {
    if (!cdValEl) return;
    var target = state.countdownDate ? new Date(state.countdownDate).getTime() : 0;
    if (!target || isNaN(target)) { cdDispEl.hidden = true; return; }
    var diff = Math.floor((target - now.getTime()) / 1000);
    cdDispEl.hidden = false;
    cdLabelEl.textContent = (state.countdownLabel || 'COUNTDOWN').toUpperCase().slice(0, 24);
    if (diff <= 0) { cdValEl.textContent = '00:00:00:00'; cdMetaEl.textContent = 'REACHED'; return; }
    var d = Math.floor(diff / 86400), h = Math.floor(diff % 86400 / 3600), m = Math.floor(diff % 3600 / 60), s = diff % 60;
    cdValEl.textContent = d + ':' + pad(h) + ':' + pad(m) + ':' + pad(s);
    cdMetaEl.textContent = d === 0 ? 'TODAY' : d + ' DAY' + (d === 1 ? '' : 'S');
  }

  function scheduleNextSecond() {
    if (document.hidden) return;
    var delay = 1000 - (Date.now() % 1000);
    if (delay < 50) delay = 50;
    clockTimer = setTimeout(function () { var n = new Date(); tickTimer(n); renderClock(); scheduleNextSecond(); }, delay);
  }
  function restartClock() { if (clockTimer) clearTimeout(clockTimer); renderClock(); scheduleNextSecond(); }

  /* ---------- Network ---------- */
  function setLink(online, latency) { linkEl.textContent = online ? 'ONLINE' : 'OFFLINE'; linkEl.style.color = online ? 'var(--accent)' : '#ff453a'; latEl.textContent = (latency != null) ? String(latency) : '—'; }
  function animatePulse() { pulseEl.classList.remove('packet-active'); void pulseEl.offsetWidth; pulseEl.classList.add('packet-active'); }
  function updatePacketLoss() { if (networkSamples.length === 0) { packetLossEl.textContent = 'N/A'; return; } var failed = networkSamples.filter(function (s) { return !s; }).length; packetLossEl.textContent = Math.round((failed / networkSamples.length) * 100) + '% (' + networkSamples.length + ' samples)'; }
  function checkNetwork() {
    if (!navigator.onLine) { networkSamples.push(false); networkSamples = networkSamples.slice(-20); updatePacketLoss(); setLink(false, null); log('AOD_SYNC_LOCAL // OFFLINE'); lastCheckEl.textContent = 'Last check: ' + new Date().toLocaleTimeString(); return Promise.resolve(false); }
    var start = performance.now(); var controller = null; try { controller = new AbortController(); } catch (e) {}
    var timeout = setTimeout(function () { if (controller) controller.abort(); }, 1500);
    var fetchOpts = { cache: 'no-store' }; if (controller) fetchOpts.signal = controller.signal;
    return fetch('https://1.1.1.1/cdn-cgi/trace?t=' + Date.now(), fetchOpts)
      .then(function () { clearTimeout(timeout); var latency = Math.round(performance.now() - start); latencyHistory.push(latency); latencyHistory = latencyHistory.slice(-20); networkSamples.push(true); networkSamples = networkSamples.slice(-20); updatePacketLoss(); setLink(true, latency); log('LINK_STABLE // ' + latency + 'MS'); lastCheckEl.textContent = 'Last check: ' + new Date().toLocaleTimeString(); animatePulse(); drawSpark(); return true; })
      .catch(function () { clearTimeout(timeout); networkSamples.push(false); networkSamples = networkSamples.slice(-20); updatePacketLoss(); setLink(navigator.onLine, null); log(navigator.onLine ? 'LINK_UNVERIFIED // CHECK AGAIN' : 'AOD_SYNC_LOCAL // OFFLINE'); lastCheckEl.textContent = 'Last check: ' + new Date().toLocaleTimeString(); return false; });
  }
  function startNetworkPolling() { if (netTimer) clearInterval(netTimer); netTimer = null; if (!state.showNetwork) return; checkNetwork(); netTimer = setInterval(function () { if (!document.hidden) checkNetwork(); }, NET_INTERVAL_MS); }
  function onOnline() { log('CONNECTION RESTORED'); checkNetwork(); renderClock(); }
  function onOffline() { setLink(false, null); log('AOD_SYNC_LOCAL // OFFLINE'); renderClock(); }

  /* ---------- Wake Lock ---------- */
  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) { wakeEl.textContent = 'WAKE LOCK: NOT SUPPORTED'; return false; }
    try { wakeLockSentinel = await navigator.wakeLock.request('screen'); wakeEl.textContent = 'WAKE LOCK: ON'; wakeLockSentinel.addEventListener('release', function () { wakeEl.textContent = 'WAKE LOCK: RELEASED'; }); return true; }
    catch (err) { wakeEl.textContent = 'WAKE LOCK: DENIED'; return false; }
  }
  function releaseWakeLock() { if (wakeLockSentinel) wakeLockSentinel.release().catch(function () {}); wakeLockSentinel = null; }
  async function toggleWake() { state.wakeLockWanted = !state.wakeLockWanted; syncButtons(); if (state.wakeLockWanted) { var ok = await requestWakeLock(); showToast(ok ? 'Wake Lock requested' : 'Wake Lock unavailable — OS may dim'); } else { releaseWakeLock(); wakeEl.textContent = 'WAKE LOCK: OFF'; } }

  /* ---------- Appearance ---------- */
  /* ---------- 100 presets (deterministic combos) ---------- */
  var PRESET_COLORS = ['#34C759','#3a8dde','#00e5ff','#39ff14','#FF9F0A','#ff5a8a','#a259ff','#ffde59','#4dd0e1','#ff7043','#81c784','#64b5f6','#ba68c8','#7986cb','#a1887f','#f06292','#fff176','#4db6ac','#ffd54f','#90caf9'];
  var PRESET_BGS = ['#000000','#000a1a','#00141a','#000800','#140800','#1a000f','#0d1b2a','#0a0a2a','#0e2a16','#2a0a0a','#101010','#1c1033','#0a2030','#331a00','#00222a','#221100','#110022','#002200','#220022','#002233'];
  var PRESETS = [];
  for (var pi = 0; pi < 100; pi++) { var ai = pi % 20, bi = Math.floor(pi / 20) % 10; PRESETS.push({ bg: PRESET_BGS[bi], accent: PRESET_COLORS[ai], name: 'Preset ' + (pi + 1) + ' ' + PRESET_BGS[bi] + ' ' + PRESET_COLORS[ai] }); }
  function applyPreset(idx) {
    if (idx < 0 || idx >= PRESETS.length) return;
    var p = PRESETS[idx];
    document.documentElement.style.setProperty('--bg', p.bg);
    document.documentElement.style.setProperty('--accent', p.accent);
    document.documentElement.style.setProperty('--clock-grad-bottom', p.accent);
    state.accentColor = p.accent;
    state.preset = 'p' + idx;
  }
  function updateStats(now) {
    var up = Math.floor((now.getTime() - sessionStart) / 1000);
    var el = $('statUptime'); if (!el) return;
    el.textContent = 'Uptime ' + pad(Math.floor(up / 3600)) + ':' + pad(Math.floor(up / 60 % 60)) + ':' + pad(up % 60) + ' · Renders ' + renderCount;
    $('statRenders').textContent = 'Clock renders: ' + renderCount + ' · Latency samples: ' + latencyHistory.length;
    $('statSW').textContent = 'Service worker: ' + (navigator.serviceWorker && navigator.serviceWorker.controller ? 'active (v5)' : 'none');
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (est) { var used = (est.usage || 0) / 1024; $('statCache').textContent = 'Storage used ≈ ' + Math.round(used) + ' KB / quota ' + Math.round((est.quota || 0) / 1024 / 1024) + ' MB'; }).catch(function () {});
    drawSpark();
  }
  function drawSpark() {
    var cv = $('sparkCanvas'); if (!cv || !latencyHistory.length) return;
    var ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
    var max = Math.max.apply(null, latencyHistory.concat([50]));
    ctx.beginPath(); ctx.moveTo(0, cv.height);
    latencyHistory.forEach(function (v, i) { var x = (i / 19) * cv.width, y = cv.height - (v / max) * (cv.height - 4); ctx.lineTo(x, y); });
    ctx.strokeStyle = state.accentColor || '#34C759'; ctx.stroke();
  }

  function applyAppearance() {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.face = state.face;
    document.documentElement.style.setProperty('--clock-scale', (state.clockSize / 100).toFixed(2));
    document.documentElement.style.setProperty('--letter-scale', (state.letterSpacing / 100).toFixed(2));
    document.documentElement.style.setProperty('--glow-intensity', (state.brightness / 100).toFixed(2));
    document.documentElement.style.setProperty('--accent', state.accentColor || '');
    document.body.classList.toggle('no-animations', !state.animations);
    document.body.classList.toggle('high-contrast', state.highContrast);
    document.body.classList.toggle('large-text', !!state.largeText);
    if (state.preset && state.preset[0] === 'p') applyPreset(parseInt(state.preset.slice(1), 10));
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', '#000000');
  }
  function syncSettingsUI() {
    if (!$('setTheme')) return;
    $('setTheme').value = state.theme; $('setFace').value = state.face; $('setAmbient').value = state.ambient;
    $('setAccent').value = state.accentColor || '#34C759'; $('setName').value = state.greeterName || ''; $('setTicker').value = state.ticker || '';
    if ($('setPreset')) $('setPreset').value = state.preset && state.preset[0] === 'p' ? state.preset : '';
    if ($('setLargeText')) $('setLargeText').checked = !!state.largeText;
    $('setDateFormat').value = state.dateFormat; $('setTimezone').value = state.timezone;
    $('setClockSize').value = String(state.clockSize); $('clockSizeVal').textContent = state.clockSize + '%';
    $('setLetterSpacing').value = String(state.letterSpacing); $('spacingVal').textContent = state.letterSpacing + '%';
    $('setBrightness').value = String(state.brightness); $('brightnessVal').textContent = state.brightness + '%';
    $('setFormat24').checked = state.format24; $('setShowSeconds').checked = state.showSeconds;
    $('setShowWeekday').checked = state.showWeekday; $('setShowDate').checked = state.showDate;
    $('setShowNetwork').checked = state.showNetwork; $('setShowWorld').checked = state.showWorld;
    $('setShowComplications').checked = state.showComplications;
    $('setAnimations').checked = state.animations; $('setShowAnalog').checked = state.showAnalog;
    $('setShowBattery').checked = state.showBattery; $('setHighContrast').checked = state.highContrast;
    $('setGestures').checked = state.gestures; $('setAutoTheme').checked = state.autoTheme;
    $('cdLabel').value = state.countdownLabel || ''; $('cdDate').value = state.countdownDate || '';
  }
  function syncButtons() {
    $('btnWake').classList.toggle('active', state.wakeLockWanted);
    $('btnAnalog').classList.toggle('active', state.showAnalog);
    $('btnStandby').classList.toggle('active', standbyOn);
    if (analogCanvas) analogCanvas.hidden = !state.showAnalog;
    if (batteryColEl) batteryColEl.classList.toggle('hidden', !state.showBattery);
    applyAppearance();
  }

  /* ---------- Panels ---------- */
  function togglePanel(id, btn) { var el = $(id); var open = el.hidden; el.hidden = !open; if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false'); return open; }
  function renderAlarms() {
    var ul = $('alarmList'); ul.innerHTML = '';
    if (!alarms.length) { ul.innerHTML = '<li>No alarms — add one above.</li>'; return; }
    alarms.forEach(function (a, i) {
      var li = document.createElement('li');
      var span = document.createElement('span'); span.textContent = '⏰ ' + a.time + ' ' + (a.label || '');
      var del = document.createElement('button'); del.textContent = '×'; del.setAttribute('aria-label', 'Delete alarm'); del.className = 'action-btn';
      del.addEventListener('click', function () { alarms.splice(i, 1); saveSettings(); renderAlarms(); });
      li.appendChild(span); li.appendChild(del); ul.appendChild(li);
    });
  }

  /* ---------- Controls ---------- */
  function copyTime() {
    var text = clockEl.textContent + ':' + secEl.textContent + ' ' + ampmEl.textContent + ' • ' + dateEl.textContent + ' • ' + dayEl.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { showToast('Time copied'); }).catch(function () { showToast('Copy failed'); });
    else showToast('Copy not supported');
  }
  async function shareClock() {
    var text = 'AUTAI ZEN AOD: ' + clockEl.textContent + ' ' + ampmEl.textContent + ' • ' + dateEl.textContent;
    if (navigator.share) { try { await navigator.share({ title: 'AUTAI ZEN AOD', text: text, url: location.href }); } catch (e) {} }
    else { copyTime(); showToast('Share not available — copied'); }
  }
  function toggleGlow() { state.theme = (state.theme === 'amber-night') ? 'oled-pure-black' : 'amber-night'; saveSettings(); syncButtons(); syncSettingsUI(); showToast(state.theme === 'amber-night' ? 'GLOW: Amber Night' : 'GLOW: OLED Black'); }
  function toggleFullscreen() { if (document.fullscreenElement) { document.exitFullscreen().catch(function () {}); return; } if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () { showToast('Fullscreen not allowed'); }); else showToast('Fullscreen not supported on this browser'); }
  function speakTime() {
    if (!('speechSynthesis' in window)) { showToast('Speech not supported'); return; }
    var utter = new SpeechSynthesisUtterance(greeterEl.textContent + '. The time is ' + clockEl.textContent + ' ' + ampmEl.textContent);
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utter); showToast('Speaking time…');
  }

  /* ---------- Gestures ---------- */
  var touchStart = { x: 0, t: 0, count: 0 }, lastTap = 0;
  function initGestures() {
    var layout = $('zenLayout');
    layout.addEventListener('touchstart', function (e) { if (!state.gestures) return; if (e.touches.length === 1) { touchStart.x = e.touches[0].clientX; touchStart.t = Date.now(); } }, { passive: true });
    layout.addEventListener('touchend', function (e) {
      if (!state.gestures) return;
      if (e.touches.length === 2) { setStandby(!standbyOn); showToast(standbyOn ? 'Standby' : 'Wake'); return; }
      if (e.touches.length !== 0) return;
      var now = Date.now();
      if (now - lastTap < 300) { toggleFullscreen(); lastTap = 0; return; }
      lastTap = now;
      var dx = (e.changedTouches[0] ? e.changedTouches[0].clientX : 0) - touchStart.x;
      if (Math.abs(dx) > 60) {
        var i = THEMES.indexOf(document.documentElement.dataset.theme);
        var next = dx < 0 ? (i + 1) % THEMES.length : (i - 1 + THEMES.length) % THEMES.length;
        state.theme = THEMES[next]; saveSettings(); applyAppearance(); syncSettingsUI(); showToast('Theme: ' + state.theme);
      }
    }, { passive: true });
  }

  /* ---------- Service Worker ---------- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js')
      .then(function (registration) {
        if (registration.waiting) pendingSW = registration.waiting;
        registration.addEventListener('updatefound', function () { var w = registration.installing; if (!w) return; w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) { pendingSW = w; $('updateBanner').hidden = false; } }); });
        registration.update().catch(function () {});
        setInterval(function () { registration.update().catch(function () {}); }, 30 * 60 * 1000);
      }).catch(function (err) { console.log('SW registration failed', err); });
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (refreshing) return; refreshing = true; location.reload(); });
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    clockEl = $('time'); secEl = $('sec'); ampmEl = $('ampm'); dateEl = $('fullDate');
    dayEl = $('day'); dotEl = $('statusDot'); statusEl = $('statusText'); wakeEl = $('wakeLockStatus'); tzEl = $('tzLabel');
    latEl = $('lat'); linkEl = $('linkState'); logEl = $('log');
    lastCheckEl = $('lastCheck'); pulseEl = $('packet-pulse'); toastEl = $('toast');
    packetLossEl = $('packetLoss'); netPanel = $('networkPanel'); settingsPanel = $('settingsPanel');
    analogCanvas = $('analog'); ambientCanvas = $('ambientCanvas'); worldRow = $('worldRow'); compEl = $('complications');
    greeterEl = $('greeter'); tickerEl = $('ticker'); tickerTextEl = $('tickerText');
    timerValEl = $('timerValue'); timerStateEl = $('timerState'); timerDispEl = $('timerDisplay');
    swValEl = $('swValue'); swStateEl = $('swState');
    focusValEl = $('focusValue'); focusMetaEl = $('focusMeta'); focusDispEl = $('focusDisplay'); focusPhaseEl = $('focusPhase');
    cdValEl = $('countdownValue'); cdDispEl = $('countdownDisplay'); cdLabelEl = $('countdownLabel'); cdMetaEl = $('countdownMeta');
    batteryEl = $('battery'); batteryColEl = $('batteryCol');

    loadSettings();
    syncButtons(); syncSettingsUI();
    restartClock();
    setLink(navigator.onLine, null);
    log(navigator.onLine ? 'READY' : 'AOD_SYNC_LOCAL // OFFLINE');
    startNetworkPolling();
    applyAppearance();
    initBattery();
    renderAlarms();
    initGestures();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { restartClock(); checkNetwork(); if (state.wakeLockWanted) requestWakeLock(); } });

    $('btnCopy').addEventListener('click', copyTime);
    $('btnGlow').addEventListener('click', toggleGlow);
    $('btnSend').addEventListener('click', shareClock);
    $('btnReload').addEventListener('click', function () { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' }); location.reload(); });
    $('btnSettings').addEventListener('click', function () { togglePanel('settingsPanel', $('btnSettings')); syncSettingsUI(); });
    $('btnAnalog').addEventListener('click', function () { state.showAnalog = !state.showAnalog; saveSettings(); syncButtons(); syncSettingsUI(); renderClock(); });
    $('btnTimer').addEventListener('click', function () { togglePanel('timerPanel', $('btnTimer')); });
    $('btnAlarms').addEventListener('click', function () { togglePanel('alarmsPanel', $('btnAlarms')); renderAlarms(); });
    $('btnStopwatch').addEventListener('click', function () { togglePanel('stopwatchPanel', $('btnStopwatch')); });
    $('btnFocus').addEventListener('click', function () { togglePanel('focusPanel', $('btnFocus')); });
    $('btnCountdown').addEventListener('click', function () { togglePanel('countdownPanel', $('btnCountdown')); });
    $('btnFace').addEventListener('click', function () { var i = FACES.indexOf(state.face); state.face = FACES[(i + 1) % FACES.length]; saveSettings(); applyAppearance(); syncSettingsUI(); showToast('Face: ' + state.face); });
    $('btnWorld').addEventListener('click', function () { state.showWorld = !state.showWorld; saveSettings(); syncButtons(); syncSettingsUI(); renderClock(); });
    $('btnSpeak').addEventListener('click', speakTime);
    $('btnStandby').addEventListener('click', function () { setStandby(!standbyOn); showToast(standbyOn ? 'Standby — tap clock to wake' : 'Standby off'); });
    $('zenLayout').addEventListener('click', function (e) { if (standbyOn && !e.target.closest('button')) setStandby(false); });
    $('btnFullscreen').addEventListener('click', toggleFullscreen);
    $('btnWake').addEventListener('click', toggleWake);
    $('btnReset').addEventListener('click', function () {
      if (!window.confirm('Reset all preferences to defaults?')) return;
      Object.assign(state, DEFAULTS); alarms = []; setStandby(false);
      timerSec = 0; timerRunning = false; swElapsed = 0; swRunning = false; focusSec = 0; focusRunning = false; focusSessions = 0;
      saveSettings(); syncButtons(); syncSettingsUI(); restartClock(); startNetworkPolling(); renderAlarms();
      updateTimerUI(); updateFocusUI(); updateSWUI();
      showToast('Settings reset');
    });
    $('btnUpdate').addEventListener('click', function () { if (pendingSW) pendingSW.postMessage({ type: 'SKIP_WAITING' }); setTimeout(function () { location.reload(); }, 800); });

    /* Timer */
    $('btnTimerStart').addEventListener('click', function () { var mins = Math.max(1, Math.min(120, parseInt($('timerMinutes').value, 10) || 5)); if (!timerRunning && timerSec <= 0) timerSec = mins * 60; timerRunning = true; updateTimerUI(); showToast('Timer started: ' + mins + ' min'); });
    $('btnTimerStop').addEventListener('click', function () { timerRunning = false; updateTimerUI(); showToast('Timer paused'); });
    $('btnTimerReset').addEventListener('click', function () { timerSec = 0; timerRunning = false; updateTimerUI(); });

    /* Alarms (15) */
    $('btnAlarmAdd').addEventListener('click', function () {
      var time = $('alarmTime').value, label = $('alarmLabel').value.trim();
      if (!/^\d{2}:\d{2}$/.test(time)) { showToast('Pick a time'); return; }
      if (alarms.length >= 15) { showToast('Max 15 alarms'); return; }
      alarms.push({ time: time, label: label, firedFor: '' }); saveSettings(); renderAlarms(); $('alarmLabel').value = ''; showToast('Alarm added: ' + time);
    });

    /* Stopwatch */
    $('btnSwStart').addEventListener('click', function () { if (!swRunning) { swStart = Date.now() - swElapsed * 1000; swRunning = true; } updateSWUI(); });
    $('btnSwPause').addEventListener('click', function () { swRunning = false; updateSWUI(); });
    $('btnSwLap').addEventListener('click', function () { if (!swRunning) return; laps.push(swElapsed); var ul = $('lapList'); var li = document.createElement('li'); li.textContent = 'Lap ' + laps.length + ' — ' + fmtSW(swElapsed); ul.appendChild(li); });
    $('btnSwReset').addEventListener('click', function () { swElapsed = 0; swRunning = false; laps = []; $('lapList').innerHTML = ''; updateSWUI(); });

    /* Focus */
    document.querySelectorAll('.focus-preset').forEach(function (b) { b.addEventListener('click', function () { var mins = parseInt(b.getAttribute('data-min'), 10); focusSec = mins * 60; focusPhase = 'focus'; focusRunning = true; $('focusStatus').textContent = 'Focus ' + mins + ' min → 5 min break. DIM auto on break.'; updateFocusUI(); showToast('Focus: ' + mins + ' min'); }); });
    $('btnFocusStart').addEventListener('click', function () { if (focusSec <= 0) { focusSec = 1500; focusPhase = 'focus'; } focusRunning = true; updateFocusUI(); });
    $('btnFocusPause').addEventListener('click', function () { focusRunning = false; updateFocusUI(); showToast('Focus paused'); });
    $('btnFocusReset').addEventListener('click', function () { focusSec = 0; focusRunning = false; focusPhase = 'focus'; focusSessions = 0; updateFocusUI(); });

    /* Countdown */
    $('btnCdSave').addEventListener('click', function () { state.countdownLabel = $('cdLabel').value.trim().slice(0, 24); state.countdownDate = $('cdDate').value; saveSettings(); updateCountdownUI(new Date()); showToast('Countdown saved'); });
    $('btnCdClear').addEventListener('click', function () { state.countdownLabel = ''; state.countdownDate = ''; saveSettings(); updateCountdownUI(new Date()); showToast('Countdown cleared'); });

    /* Settings */
    $('setTheme').addEventListener('change', function (e) { state.theme = e.target.value; saveSettings(); applyAppearance(); });
    $('setFace').addEventListener('change', function (e) { state.face = e.target.value; saveSettings(); applyAppearance(); });
    $('setAmbient').addEventListener('change', function (e) { state.ambient = e.target.value; saveSettings(); ambientParticles = []; renderClock(); });
    $('setAccent').addEventListener('input', function (e) { state.accentColor = e.target.value; saveSettings(); applyAppearance(); renderClock(); });
    $('setName').addEventListener('input', function (e) { state.greeterName = e.target.value.slice(0, 24); saveSettings(); renderClock(); });
    $('setTicker').addEventListener('input', function (e) { state.ticker = e.target.value.slice(0, 120); saveSettings(); renderClock(); });
    $('setDateFormat').addEventListener('change', function (e) { state.dateFormat = e.target.value; saveSettings(); renderClock(); });
    $('setTimezone').addEventListener('change', function (e) { state.timezone = e.target.value; saveSettings(); renderClock(); });
    $('setClockSize').addEventListener('input', function (e) { state.clockSize = parseInt(e.target.value, 10); $('clockSizeVal').textContent = state.clockSize + '%'; saveSettings(); applyAppearance(); });
    $('setLetterSpacing').addEventListener('input', function (e) { state.letterSpacing = parseInt(e.target.value, 10); $('spacingVal').textContent = state.letterSpacing + '%'; saveSettings(); applyAppearance(); });
    $('setBrightness').addEventListener('input', function (e) { state.brightness = parseInt(e.target.value, 10); $('brightnessVal').textContent = state.brightness + '%'; saveSettings(); applyAppearance(); });
    $('setFormat24').addEventListener('change', function (e) { state.format24 = e.target.checked; saveSettings(); renderClock(); });
    $('setShowSeconds').addEventListener('change', function (e) { state.showSeconds = e.target.checked; saveSettings(); renderClock(); });
    $('setShowWeekday').addEventListener('change', function (e) { state.showWeekday = e.target.checked; saveSettings(); renderClock(); });
    $('setShowDate').addEventListener('change', function (e) { state.showDate = e.target.checked; saveSettings(); renderClock(); });
    $('setShowNetwork').addEventListener('change', function (e) { state.showNetwork = e.target.checked; saveSettings(); netPanel.classList.toggle('hidden', !state.showNetwork); startNetworkPolling(); });
    $('setShowWorld').addEventListener('change', function (e) { state.showWorld = e.target.checked; saveSettings(); renderClock(); });
    $('setShowComplications').addEventListener('change', function (e) { state.showComplications = e.target.checked; saveSettings(); renderClock(); });
    $('setAnimations').addEventListener('change', function (e) { state.animations = e.target.checked; saveSettings(); applyAppearance(); });
    $('setShowAnalog').addEventListener('change', function (e) { state.showAnalog = e.target.checked; saveSettings(); syncButtons(); renderClock(); });
    $('setShowBattery').addEventListener('change', function (e) { state.showBattery = e.target.checked; saveSettings(); batteryColEl.classList.toggle('hidden', !state.showBattery); if (state.showBattery) initBattery(); });
    $('setHighContrast').addEventListener('change', function (e) { state.highContrast = e.target.checked; saveSettings(); applyAppearance(); });
    $('setLargeText').addEventListener('change', function (e) { state.largeText = e.target.checked; saveSettings(); applyAppearance(); });
    $('setGestures').addEventListener('change', function (e) { state.gestures = e.target.checked; saveSettings(); });
    $('setAutoTheme').addEventListener('change', function (e) { state.autoTheme = e.target.checked; saveSettings(); });
    $('btnStats').addEventListener('click', function () { togglePanel('statsPanel', $('btnStats')); updateStats(new Date()); });
    $('setPreset').addEventListener('change', function (e) { if (e.target.value && e.target.value[0] === 'p') { state.preset = e.target.value; saveSettings(); applyAppearance(); showToast('Preset applied'); } });
    $('btnLink').addEventListener('click', function () {
      var q = '?theme=' + encodeURIComponent(state.theme) + '&face=' + state.face + '&tz=' + encodeURIComponent(state.timezone) + '&size=' + state.clockSize + '&ambient=' + state.ambient;
      var url = location.origin + location.pathname + q;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { showToast('Link copied'); }).catch(function () { showToast('Copy failed'); });
      else showToast('Copy not supported');
    });
    $('btnExport').addEventListener('click', function () {
      var j = localStorage.getItem(LS_KEY) || '{}';
      if (navigator.clipboard) navigator.clipboard.writeText(j).then(function () { showToast('Settings JSON copied'); }).catch(function () { showToast('Export failed'); });
      else showToast('Copy not supported');
    });
    $('btnImport').addEventListener('click', function () {
      var raw = prompt('Paste settings JSON:');
      if (!raw) return;
      try { JSON.parse(raw); localStorage.setItem(LS_KEY, raw); loadSettings(); syncButtons(); syncSettingsUI(); restartClock(); showToast('Import applied'); }
      catch (e) { showToast('Invalid JSON'); }
    });

    /* Presets populate */
    (function () {
      var sel = $('setPreset');
      PRESETS.forEach(function (p, i) { var o = document.createElement('option'); o.value = 'p' + i; o.textContent = p.name; sel.appendChild(o); });
    })();

    /* URL preset */
    (function () {
      var q = new URLSearchParams(location.search);
      if (q.get('theme') && THEMES.indexOf(q.get('theme')) !== -1) { state.theme = q.get('theme'); saveSettings(); }
      if (q.get('face') && FACES.indexOf(q.get('face')) !== -1) { state.face = q.get('face'); saveSettings(); }
      if (q.get('tz')) { state.timezone = q.get('tz'); saveSettings(); }
      if (q.get('size')) { var s = parseInt(q.get('size'), 10); if (!isNaN(s)) { state.clockSize = clamp(s, 80, 140); saveSettings(); } }
      if (q.get('ambient') && AMBIENTS.indexOf(q.get('ambient')) !== -1) { state.ambient = q.get('ambient'); saveSettings(); }
      syncButtons(); syncSettingsUI();
    })();

    /* Keyboard shortcuts */
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var map = { '1': 'btnCopy', '2': 'btnGlow', '3': 'btnSend', '4': 'btnSettings', '5': 'btnAnalog', '6': 'btnTimer', '7': 'btnAlarms', '8': 'btnStopwatch', '9': 'btnFocus' };
      if (map[e.key]) { e.preventDefault(); $(map[e.key]).click(); return; }
      if (e.key.toLowerCase() === 't') toggleGlow();
      if (e.key.toLowerCase() === 'd') { setStandby(!standbyOn); }
      if (e.key.toLowerCase() === 'f') toggleFullscreen();
      if (e.key.toLowerCase() === 's') speakTime();
    });

    registerSW();
  });
})();
