// === Nier Glitch Script — Extreme Edition ===

// ------- Config -------
const REDIRECT_URL = "cyberpunk.html";
const GLITCH_DURATION_MS = 2000;       // total time before redirect
const INTENSITY = 1.0;                  // 0.5 = mild, 1.0 = default, 1.5 = wild
const ASCII_COLUMNS = Math.round(18 * INTENSITY);
const ASCII_SPEED_RANGE = [900, 1600];  // ms per loop
const BURST_COUNT = Math.round(7 * INTENSITY);
const TEAR_BAR_COUNT = Math.round(10 * INTENSITY);

// Random error lines
const ERR_LINES = [
  "E: CORE: integrity_check_failed()",
  "E: ROUTER: access_token ≠ trusted",
  "E: I/O: pipe broken on /dev/net/void",
  "W: CRC mismatch @ sector 0x3F2A",
  "E: SIGILL caught in userland",
  "F: privilege escalation detected",
  "E: segmentation fault (core dumped)",
  "W: unauthorized persona: Admin_1 impostor",
  "E: heap-use-after-free @ 0xDEADBEEF",
  "E: stack smashing detected",
  "F: kernel panic — not syncing"
];

// ASCII chars for rain
const ASCII_CHARS = ("!@#$%^&*()_+{}[]<>/\\|~`-=?;:," +
                     "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                     "0123456789").split("");

// Faux “escaped code” lines
const CODE_SNIPPETS = [
  "function auth(user){throw new Error('no.');}",
  "const key = atob('TUszQTI='); // <-- stop peeking",
  "if (persona !== 'Admin_1') revokeAccess();",
  ">>> exporting memory… export failed.",
  "trace: /system/ai/heuristics.js:42",
  "vm: isolate crashed: 0x0000F00D",
  "socket://core: write EPIPE",
  "panic: double free detected in tcache 2"
];

// ------- Helpers -------
function $(sel, root = document) { return root.querySelector(sel); }
function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
function randItem(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

// ------- Errors fill -------
function fillErrors(listEl) {
  listEl.innerHTML = "";
  const n = randInt(5, 8);
  for (let i = 0; i < n; i++) {
    const li = document.createElement("li");
    li.textContent = randItem(ERR_LINES);
    listEl.appendChild(li);
  }
}

// ------- ASCII Rain -------
function spawnAsciiRain(overlay) {
  const wrap = el("div","ascii-rain");
  overlay.appendChild(wrap);

  const viewW = window.innerWidth;
  const colWidth = clamp(Math.floor(viewW / (ASCII_COLUMNS + 2)), 12, 32);

  for (let i = 0; i < ASCII_COLUMNS; i++) {
    const col = el("div","ascii-col");
    col.style.left = `${(i/(ASCII_COLUMNS))*100}%`;
    col.style.width = `${colWidth}px`;
    col.style.animationDuration = `${randInt(ASCII_SPEED_RANGE[0], ASCII_SPEED_RANGE[1])}ms`;
    col.textContent = buildAsciiString();
    wrap.appendChild(col);
  }

  // refresh column glyphs mid-fall for “static”
  const refresh = () => {
    wrap.querySelectorAll(".ascii-col").forEach(c=>{
      if (Math.random() < 0.35) c.textContent = buildAsciiString();
    });
  };
  const refreshTimer = setInterval(refresh, 120);
  // auto-clean when glitch deactivates (safety if reused)
  setTimeout(()=>clearInterval(refreshTimer), GLITCH_DURATION_MS);
}

function buildAsciiString() {
  const h = window.innerHeight;
  const rows = Math.ceil(h / 18);
  let s = "";
  for (let i=0; i<rows; i++) s += randItem(ASCII_CHARS) + "\n";
  return s;
}

// ------- Code Bursts -------
function spawnCodeBursts(overlay) {
  for (let i = 0; i < BURST_COUNT; i++) {
    const b = el("div","code-burst");
    b.textContent = randItem(CODE_SNIPPETS);
    b.style.left = `${randInt(4, 82)}vw`;
    b.style.top  = `${randInt(8, 82)}vh`;
    b.style.transform = `rotate(${randInt(-8,8)}deg)`;
    b.style.animationDelay = `${randInt(0, 200)}ms`;
    overlay.appendChild(b);
  }
}

// ------- Tear Bars -------
function spawnTearBars(overlay) {
  const box = el("div","tear-bars");
  overlay.appendChild(box);
  for (let i = 0; i < TEAR_BAR_COUNT; i++) {
    const bar = el("div","tear-bar");
    bar.style.top = `${randInt(0, 96)}%`;
    bar.style.height = `${randInt(2, 6)}px`;
    bar.style.animationDelay = `${randInt(0, 180)}ms`;
    bar.style.animationDuration = `${randInt(90, 160)}ms`;
    bar.style.setProperty("--shift", `${randInt(-12, 12)}px`);
    box.appendChild(bar);
  }
}

// ------- Trigger -------
function triggerGlitchAndRedirect() {
  if (document.body.classList.contains("glitch-active")) return;
  document.body.classList.add("glitch-active");

  // Fill error list
  const errList = document.getElementById("glitch-errors");
  if (errList) fillErrors(errList);

  const overlay = document.getElementById("glitch-overlay");
  if (overlay) {
    // spawn effects
    spawnAsciiRain(overlay);
    spawnCodeBursts(overlay);
    spawnTearBars(overlay);
  }

  setTimeout(()=>{ window.location.href = REDIRECT_URL; }, GLITCH_DURATION_MS);
}

// Init (respect reduced motion)
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!prefersReduced) {
  window.addEventListener("click", triggerGlitchAndRedirect, { once: true });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") triggerGlitchAndRedirect();
  });
} else {
  // Reduced-motion: immediate cut to redirect on click/enter
  const softCut = () => window.location.href = REDIRECT_URL;
  window.addEventListener("click", softCut, { once: true });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") softCut();
  });
}
