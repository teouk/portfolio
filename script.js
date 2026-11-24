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
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach((s) => spy.observe(s));

  // ---- Reveal on scroll ----
  if (!reduceMotion) {
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

  // ---- Hero: a car lapping a track (nod to the dissertation) ----
  const canvas = document.getElementById("track");
  const ctx = canvas.getContext("2d");
  const lapEl = document.getElementById("lap");
  const timeEl = document.getElementById("lap-time");
  const bestEl = document.getElementById("best");
  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  let w = 0, h = 0;
  let path = [];   // sampled centre line: {x, y, angle, speed}
  const SAMPLES = 600;

  // A closed, kidney-shaped circuit described in polar form.
  function point(t) {
    const r = 1 + 0.16 * Math.cos(2 * t) + 0.07 * Math.sin(3 * t);
    return { x: w / 2 + (w * 0.38) * r * Math.cos(t), y: h / 2 + (h * 0.33) * r * Math.sin(t) };
  }

  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    path = [];
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

  function drawCar(pos, trail) {
    // Fading racing line behind the car
    const accent2 = css("--accent-2");
    for (let k = 1; k < 70; k += 2) {
      const p = path[(Math.floor(pos) - k + SAMPLES) % SAMPLES];
      ctx.globalAlpha = (1 - k / 70) * 0.55 * trail;
      ctx.fillStyle = accent2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const p = path[Math.floor(pos) % SAMPLES];
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.fillStyle = css("--accent");
    ctx.beginPath(); ctx.roundRect(-11, -6.5, 22, 13, 4); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillRect(3, -4.5, 5, 9);
    ctx.restore();
  }

  build();
  addEventListener("resize", () => { build(); if (reduceMotion) frame(performance.now()); });

  let pos = 0, lap = 1, lapStart = performance.now(), best = null, last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!reduceMotion) {
      const before = pos;
      // The car "learns": each lap is a little faster, levelling off after ten laps.
      const skill = 1 + Math.min(lap - 1, 10) * 0.035;
      pos = (pos + path[Math.floor(pos) % SAMPLES].speed * 140 * skill * dt) % SAMPLES;
      if (pos < before) {           // crossed the line
        const t = (now - lapStart) / 1000;
        best = best === null ? t : Math.min(best, t);
        bestEl.textContent = `${best.toFixed(2)}s`;
        lap += 1; lapEl.textContent = lap; lapStart = now;
      }
      timeEl.textContent = `${((now - lapStart) / 1000).toFixed(2)}s`;
    }
    drawTrack();
    drawCar(pos, reduceMotion ? 0 : 1);
    if (!reduceMotion) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Redraw immediately when the theme changes so colours follow.
  new MutationObserver(() => reduceMotion && frame(performance.now())).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
})();
