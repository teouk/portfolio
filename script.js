(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Theme toggle (remembers the choice when storage is available) ----
  const isDark = () => root.dataset.theme
    ? root.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  document.querySelector(".theme-toggle").addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  });

  // ---- Mobile menu ----
  const menuBtn = document.querySelector(".menu-toggle");
  const links = document.getElementById("nav-links");
  const setMenu = (open) => {
    links.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  menuBtn.addEventListener("click", () => setMenu(!links.classList.contains("open")));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  // ---- Header border + active nav link ----
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const navLinks = [...links.querySelectorAll('a[href^="#"]')];
  const hasIO = "IntersectionObserver" in window;
  if (hasIO) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach((s) => spy.observe(s));
  }

  // ---- Reveal on scroll (skipped where it could leave content hidden) ----
  if (!reduceMotion && hasIO) {
    const targets = document.querySelectorAll(".section-head, .feature, .card, .timeline li, .skill-group, .edu-item, .contact-card, .about-grid");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    targets.forEach((t) => { t.classList.add("reveal"); io.observe(t); });
  }

  // ---- Show "Download CV" only once a CV file has been added ----
  const cv = document.querySelector(".cv-link");
  if (cv && location.protocol.startsWith("http")) {
    fetch(cv.getAttribute("href"), { method: "HEAD" })
      .then((r) => { if (r.ok) cv.hidden = false; })
      .catch(() => {});
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  // ---- Colour-code the tech tags (unknown tags keep the neutral style) ----
  const TECH = {
    "java": ["#e4322b"], "javafx": ["#f89820"], "python": ["#3776ab", "#ffd43b"],
    "typescript": ["#3178c6"], "javascript": ["#f7df1e"], "kotlin": ["#7f52ff", "#e44857"],
    "sql": ["#0284c7"], "haskell": ["#5e5086"], "bash": ["#4eaa25"],
    "react": ["#61dafb"], "next.js": ["#94a3b8"], "spring boot": ["#6db33f"], "tailwind css": ["#38bdf8"],
    "android": ["#3ddc84"], "material 3": ["#6750a4"], "xml layouts": ["#e37933"],
    "postgresql": ["#336791"], "postgresql (neon)": ["#336791", "#00e599"], "neon": ["#00e599"],
    "mysql": ["#00758f", "#f29111"], "sqlite": ["#0f80cc"], "machine learning": ["#a855f7"],
    "computer vision": ["#ec4899"], "curriculum learning": ["#8b5cf6"], "ollama": ["#94a3b8"],
    "nextauth": ["#a21caf"], "vercel": ["#94a3b8"], "rest apis": ["#10b981"],
    "n8n": ["#ea4b71"], "discord": ["#5865f2"], "linux": ["#fcc624"], "ubuntu": ["#e95420"],
    "docker": ["#2496ed"], "raspberry pi": ["#c51a4a"], "tailscale": ["#14b8a6"],
    "flyway": ["#cc0200"], "gradle": ["#209bc4"], "git": ["#f05032"], "git & github": ["#f05032", "#6e5494"],
    "code review": ["#f59e0b"], "algorithms": ["#d946ef"], "oop": ["#06b6d4"],
  };
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  document.querySelectorAll(".tags li").forEach((li) => {
    const colours = TECH[li.textContent.trim().toLowerCase()];
    if (!colours) return;
    const [a, b = a] = colours;
    li.classList.add("tech");
    li.style.background = `linear-gradient(90deg, ${rgba(a, 0.16)}, ${rgba(b, 0.16)})`;
    li.style.borderColor = rgba(a, 0.45);
    li.style.setProperty("--tag-dot", a === b ? a : `linear-gradient(135deg, ${a} 50%, ${b} 50%)`);
  });

  // ---- Hero: a slot car lapping a track (nod to the dissertation) ----
  const canvas = document.getElementById("track");
  const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  if (ctx) startTrack(canvas, ctx);

  function startTrack(canvas, ctx) {
  const lapEl = document.getElementById("lap");
  const timeEl = document.getElementById("lap-time");
  const bestEl = document.getElementById("best");
  const toggle = document.querySelector(".track-toggle");
  const status = document.querySelector(".track-status");
  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const CAR = "#e11d48";

  let w = 0, h = 0;
  let path = [];   // sampled centre line: {x, y, angle, speed}
  const SAMPLES = 600;
  let pos = 0, lap = 1, lapTime = 0, best = null;
  // With "reduce motion" switched on, start paused but let the visitor press play.
  let playing = !reduceMotion, visible = true, rafId = 0, last = 0;

  // A closed, kidney-shaped circuit described in polar form.
  function point(t) {
    const r = 1 + 0.16 * Math.cos(2 * t) + 0.07 * Math.sin(3 * t);
    return { x: w / 2 + (w * 0.38) * r * Math.cos(t), y: h / 2 + (h * 0.33) * r * Math.sin(t) };
  }

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    path = [];
    if (w < 10 || h < 10) return false;   // not laid out yet; the resize observer retries
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (let i = 0; i < SAMPLES; i++) {
      const t = (i / SAMPLES) * Math.PI * 2;
      const a = point(t), b = point(t + 0.01);
      path.push({ x: a.x, y: a.y, angle: Math.atan2(b.y - a.y, b.x - a.x) });
    }
    // Slower in tight corners: speed falls with the change in heading.
    path.forEach((p, i) => {
      const next = path[(i + 6) % SAMPLES];
      let turn = Math.abs(next.angle - p.angle);
      if (turn > Math.PI) turn = 2 * Math.PI - turn;
      p.speed = 1.35 - Math.min(turn * 2.4, 0.85);
    });
    return true;
  }

  // CanvasRenderingContext2D.roundRect only exists in Safari 16+ and Chrome 99+.
  function roundedRect(x, y, rw, rh, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") { ctx.roundRect(x, y, rw, rh, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + rw, y, x + rw, y + rh, r);
    ctx.arcTo(x + rw, y + rh, x, y + rh, r);
    ctx.arcTo(x, y + rh, x, y, r);
    ctx.arcTo(x, y, x + rw, y, r);
    ctx.closePath();
  }

  function drawTrack() {
    ctx.clearRect(0, 0, w, h);
    const trace = () => { ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
    ctx.lineJoin = "round";
    trace(); ctx.strokeStyle = css("--track"); ctx.lineWidth = Math.max(26, w * 0.06); ctx.stroke();
    trace(); ctx.setLineDash([8, 10]); ctx.strokeStyle = css("--muted"); ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // Start/finish line
    const s = path[0], n = s.angle + Math.PI / 2, half = Math.max(13, w * 0.03);
    ctx.beginPath();
    ctx.moveTo(s.x + Math.cos(n) * half, s.y + Math.sin(n) * half);
    ctx.lineTo(s.x - Math.cos(n) * half, s.y - Math.sin(n) * half);
    ctx.strokeStyle = css("--text"); ctx.lineWidth = 3; ctx.stroke();
  }

  function drawCar() {
    // Fading racing line behind the car
    for (let k = 1; k < 70; k += 2) {
      const p = path[(Math.floor(pos) - k + SAMPLES) % SAMPLES];
      ctx.globalAlpha = (1 - k / 70) * 0.5;
      ctx.fillStyle = CAR;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const p = path[Math.floor(pos) % SAMPLES];
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.fillStyle = CAR;
    roundedRect(-11, -6.5, 22, 13, 4); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillRect(3, -4.5, 5, 9);
    ctx.restore();
  }

  function draw() {
    if (!path.length) return;
    drawTrack();
    drawCar();
  }

  function step(dt) {
    const before = pos;
    // The car "learns": each lap is a little faster, levelling off after ten laps.
    const skill = 1 + Math.min(lap - 1, 10) * 0.035;
    pos = (pos + path[Math.floor(pos) % SAMPLES].speed * 140 * skill * dt) % SAMPLES;
    lapTime += dt;
    if (pos < before) {           // crossed the line
      best = best === null ? lapTime : Math.min(best, lapTime);
      bestEl.textContent = `${best.toFixed(2)}s`;
      lap += 1; lapEl.textContent = lap; lapTime = 0;
    }
    timeEl.textContent = `${lapTime.toFixed(2)}s`;
  }

  function loop(now) {
    rafId = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (path.length) step(dt);
    draw();
    schedule();
  }
  // Only animate while playing, on screen and in a visible tab.
  function schedule() {
    if (playing && visible && !document.hidden && !rafId) rafId = requestAnimationFrame(loop);
  }
  function halt() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0; last = 0;
  }

  function updateControls() {
    if (toggle) {
      toggle.textContent = playing ? "Pause" : "Play";
      toggle.setAttribute("aria-label", playing ? "Pause the track animation" : "Play the track animation");
    }
    if (status) status.textContent = playing ? "learning" : "paused";
    canvas.parentElement.classList.toggle("is-paused", !playing);
  }
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      playing = !playing;
      updateControls();
      if (playing) schedule(); else halt();
    });
  }

  const onResize = () => { if (build()) draw(); schedule(); };
  if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(canvas);
  else addEventListener("resize", onResize);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) schedule(); else halt();
    }).observe(canvas);
  }
  document.addEventListener("visibilitychange", () => (document.hidden ? halt() : schedule()));

  // Redraw when the theme changes so the track colours follow.
  new MutationObserver(draw).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  if (scheme.addEventListener) scheme.addEventListener("change", draw);
  else if (scheme.addListener) scheme.addListener(draw);

  build();
  draw();
  updateControls();
  schedule();
  }
})();
