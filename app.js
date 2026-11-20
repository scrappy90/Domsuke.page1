(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = false;

  function handleMiss(img) {
    const drive = img.dataset.driveSrc;
    if (drive && !img.dataset.triedDrive) {
      img.dataset.triedDrive = "1";
      img.src = drive;
      return;
    }
    const slot = img.closest(".ph-slot");
    if (slot) slot.classList.add("is-empty");
  }
  $$(".ph-slot img").forEach((img) => {
    img.addEventListener("error", () => handleMiss(img));
    if (img.complete && img.naturalWidth === 0) handleMiss(img);
  });

  let toastTimer;
  function say(text) {
    const el = $("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch (err2) {
        return false;
      }
    }
  }

  function burst(origin) {
    if (reduceMotion || !origin.animate) return;
    const r = origin.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const ns = "http://www.w3.org/2000/svg";
    for (let i = 0; i < 12; i++) {
      const svg = document.createElementNS(ns, "svg");
      const use = document.createElementNS(ns, "use");
      use.setAttribute("href", i % 3 === 0 ? "#i-spark" : "#i-heart");
      svg.appendChild(use);
      svg.setAttribute("class", "confetti");
      svg.style.left = cx - 8 + "px";
      svg.style.top = cy - 8 + "px";
      if (i % 2) svg.style.fill = "var(--purple-sage)";
      document.body.appendChild(svg);
      const ang = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
      const dist = 50 + Math.random() * 60;
      const anim = svg.animate([
        { transform: "translate(0,0) scale(0.4) rotate(0)", opacity: 1 },
        { transform: "translate(" + Math.cos(ang) * dist + "px," + (Math.sin(ang) * dist - 30) + "px) scale(1.1) rotate(" + (Math.random() * 90 - 45) + "deg)", opacity: 1, offset: 0.6 },
        { transform: "translate(" + Math.cos(ang) * dist * 1.1 + "px," + (Math.sin(ang) * dist + 30) + "px) scale(0.5) rotate(" + (Math.random() * 120 - 60) + "deg)", opacity: 0 }
      ], { duration: 900 + Math.random() * 300, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
      anim.onfinish = () => svg.remove();
    }
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const text = btn.dataset.copy;
    if (await copyText(text)) {
      say("Copiado: " + text);
      burst(btn);
      const original = btn.textContent;
      btn.textContent = "¡Listo!";
      setTimeout(() => { btn.textContent = original; }, 1400);
    } else {
      say("Selecciona y copia a mano: " + text);
    }
  });

  const bar = $("scrollProgress");

  const navLinks = $$(".nav-link").filter((l) => (l.getAttribute("href") || "").startsWith("#"));
  const sections = navLinks.map((l) => document.querySelector(l.getAttribute("href")));
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";

    let cur = 0;
    const line = window.innerHeight * 0.35;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= line) cur = i; });
    if (max > 0 && y >= max - 4) cur = sections.length - 1;

    navLinks.forEach((l, i) => {
      const on = i === cur;
      l.classList.toggle("active", on);
      if (on) l.setAttribute("aria-current", "true"); else l.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener("resize", update);
  update();

  const veil = document.createElement("div");
  veil.className = "veil";
  veil.setAttribute("aria-hidden", "true");
  document.body.appendChild(veil);

  let travelRaf = 0;
  let veilTimer = 0;

  function stopTravel() {
    cancelAnimationFrame(travelRaf);
    clearTimeout(veilTimer);
    veil.classList.remove("travel");
  }

  function travelTo(top, done) {
    stopTravel();
    const start = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const end = Math.max(0, Math.min(top, max));
    const dist = Math.abs(end - start);
    if (reduceMotion || dist < 4) {
      window.scrollTo({ top: end, behavior: "instant" });
      if (done) done();
      return;
    }
    const dur = Math.max(800, Math.min(1500, dist * 0.55));
    const t0 = performance.now();
    veil.classList.add("travel");
    veilTimer = setTimeout(() => veil.classList.remove("travel"), dur * 0.72);
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      window.scrollTo({ top: start + (end - start) * ease(t), behavior: "instant" });
      if (t < 1) travelRaf = requestAnimationFrame(step);
      else { veil.classList.remove("travel"); if (done) done(); }
    })(t0);
  }

  ["wheel", "touchstart", "keydown"].forEach((ev) =>
    window.addEventListener(ev, stopTravel, { passive: true })
  );

  function goToHash(hash, push) {
    const target = hash === "#inicio" ? document.body : document.querySelector(hash);
    if (!target) return false;
    const top = hash === "#inicio" ? 0 : target.getBoundingClientRect().top + window.scrollY - 8;
    travelTo(top, () => { if (push && history.pushState) history.pushState(null, "", hash); });
    return true;
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    const samePage = url.origin === location.origin && url.pathname === location.pathname;

    if (samePage && url.hash && !/^#obra-/.test(url.hash)) {
      if (goToHash(url.hash, true)) e.preventDefault();
      return;
    }
    if (url.origin === location.origin && url.pathname !== location.pathname && !reduceMotion) {
      e.preventDefault();
      veil.classList.add("leave");
      document.body.classList.add("is-leaving");
      setTimeout(() => { location.href = a.href; }, 520);
    }
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      veil.classList.remove("leave");
      document.body.classList.remove("is-leaving");
    }
  });

  if (location.hash && !/^#obra-/.test(location.hash) && document.querySelector(location.hash)) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => goToHash(location.hash, false), 700);
  }

  const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter("es", { granularity: "grapheme" }) : null;
  $$("[data-split]").forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    let n = 0;
    const words = text.split(/\s+/);
    words.forEach((w, wi) => {
      const word = document.createElement("span");
      word.className = "word";
      word.setAttribute("aria-hidden", "true");
      const chars = seg ? Array.from(seg.segment(w), (s) => s.segment) : Array.from(w);
      chars.forEach((c) => {
        const s = document.createElement("span");
        s.className = "ch";
        s.style.setProperty("--ci", n++);
        s.textContent = c;
        word.appendChild(s);
      });
      el.appendChild(word);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
    });

    if (!el.classList.contains("reveal")) requestAnimationFrame(() => el.classList.add("is-visible"));
  });

  const targets = $$(".reveal, .stagger");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach((t) => t.classList.add("is-visible"));
  }

  const frame = document.querySelector(".tilt-frame");
  if (frame && !reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let raf;
    frame.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = frame.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        frame.style.setProperty("--mx", x * 100 + "%");
        frame.style.setProperty("--my", y * 100 + "%");
        frame.style.transform =
          "perspective(950px) rotateY(" + ((x - 0.5) * 7).toFixed(2) + "deg) rotateX(" +
          (-(y - 0.5) * 7).toFixed(2) + "deg) scale3d(1.012,1.012,1.012)";
      });
    });
    frame.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      frame.style.transform = "";
    });
  }

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hero = document.querySelector(".hero");
  if (hero && finePointer && !reduceMotion) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      hero.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--px", 0);
      hero.style.setProperty("--py", 0);
    });
  }

  if (finePointer && !reduceMotion) {
    $$(".piece").forEach((p) => {
      p.addEventListener("pointermove", (e) => {
        const r = p.getBoundingClientRect();
        p.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        p.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });
    });
  }

  const lightbox = $("lightbox");
  const lbImg = $("lbImg");
  const lbTitle = $("lbTitle");
  const lbCategory = $("lbCategory");
  const lbDesc = $("lbDesc");
  const lbPrev = $("lbPrev");
  const lbNext = $("lbNext");
  const lbClose = $("lbClose");
  const triggers = $$("[data-lightbox-trigger]");
  let current = 0;
  let lastFocus = null;

  const usable = (el) => !el.classList.contains("is-empty") && el.querySelector("img");
  const usableCount = () => triggers.filter(usable).length;

  const dialog = lightbox.querySelector(".lightbox-dialog");
  const backdrop = lightbox.querySelector(".lightbox-backdrop");
  const lbCaption = lightbox.querySelector(".lb-caption");
  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
  let busy = false;

  function srcOf(item) {
    const img = item.querySelector("img");
    return item.dataset.full || img.currentSrc || img.src;
  }

  function preload(url) {
    return new Promise((resolve) => {
      const probe = new Image();
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      probe.onload = probe.onerror = finish;
      probe.src = url;
      setTimeout(finish, 900);
    });
  }

  function show(index) {
    const item = triggers[index];
    const img = item.querySelector("img");
    current = index;

    lbImg.classList.add("is-loading");
    lbImg.onload = lbImg.onerror = () => lbImg.classList.remove("is-loading");
    lbImg.src = srcOf(item);
    lbImg.alt = img.alt || "";
    if (lbImg.complete) lbImg.classList.remove("is-loading");

    lbTitle.textContent = item.dataset.title || "Ilustración";
    lbCategory.textContent = item.dataset.category || "Domsuke";
    lbDesc.textContent = item.dataset.desc || "";

    const several = usableCount() > 1;
    lbPrev.hidden = !several;
    lbNext.hidden = !several;
  }

  function originTransform(item) {
    const d = dialog.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    const hidden = r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth;
    if (hidden || !d.width) return "translateY(26px) scale(0.9)";
    const s = Math.max(0.12, Math.min(1, r.width / d.width));
    const dx = r.left + r.width / 2 - (d.left + d.width / 2);
    const dy = r.top + r.height / 2 - (d.top + d.height / 2);
    return "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(" + s.toFixed(3) + ")";
  }

  async function openLightbox(index) {
    const item = triggers[index];
    if (busy || !item || !usable(item)) return;
    busy = true;
    lastFocus = document.activeElement;
    await preload(srcOf(item));
    show(index);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lbClose.focus({ preventScroll: true });

    if (!reduceMotion && dialog.animate) {
      const from = originTransform(item);
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: "ease-out" });
      dialog.animate([
        { transform: from, opacity: 0, borderRadius: "8px" },
        { opacity: 1, offset: 0.3 },
        { transform: "none", opacity: 1, borderRadius: "18px" }
      ], { duration: 720, easing: EASE });
      lbImg.animate([{ transform: "scale(1.18)", filter: "blur(10px)" }, { transform: "scale(1)", filter: "blur(0)" }], { duration: 900, easing: EASE });
      lbCaption.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: 260, easing: EASE, fill: "backwards" });
      [lbClose, lbPrev, lbNext].forEach((b) => b.animate([{ opacity: 0, scale: "0.6" }, { opacity: 1, scale: "1" }], { duration: 500, delay: 380, easing: EASE, fill: "backwards" }));
    }
    busy = false;
  }

  function closeLightbox() {
    if (lightbox.hidden || busy) return;
    busy = true;
    const finish = () => {
      lightbox.hidden = true;
      document.body.style.overflow = "";
      busy = false;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    if (reduceMotion || !dialog.animate) { finish(); return; }
    const to = originTransform(triggers[current]);
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: "ease-in", fill: "forwards" });
    const out = dialog.animate([
      { transform: "none", opacity: 1, borderRadius: "18px" },
      { opacity: 1, offset: 0.7 },
      { transform: to, opacity: 0, borderRadius: "8px" }
    ], { duration: 520, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" });
    out.onfinish = () => {
      finish();
      backdrop.getAnimations().forEach((a) => a.cancel());
      dialog.getAnimations().forEach((a) => a.cancel());
    };
  }

  async function stepLightbox(dir) {
    if (busy) return;
    const n = triggers.length;
    let idx = current;
    for (let k = 0; k < n; k++) {
      idx = (idx + dir + n) % n;
      if (usable(triggers[idx])) {
        busy = true;
        await preload(srcOf(triggers[idx]));
        busy = false;
        show(idx);
        if (!reduceMotion && lbImg.animate) {
          lbImg.animate([
            { opacity: 0, transform: "translateX(" + dir * 70 + "px) scale(0.96)", filter: "blur(8px)" },
            { opacity: 1, transform: "none", filter: "blur(0)" }
          ], { duration: 650, easing: EASE });
          lbCaption.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: 120, easing: EASE, fill: "backwards" });
        }
        return;
      }
    }
  }

  triggers.forEach((el, i) => {
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Ampliar: " + (el.dataset.title || "ilustración"));
    el.addEventListener("click", () => openLightbox(i));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(i);
      }
    });
  });

  const deep = location.hash.match(/^#obra-(\d+)$/);
  if (deep) setTimeout(() => openLightbox(parseInt(deep[1], 10) - 1), 650);
  window.addEventListener("hashchange", () => {
    const m = location.hash.match(/^#obra-(\d+)$/);
    if (m && lightbox.hidden) openLightbox(parseInt(m[1], 10) - 1);
  });

  $$("[data-lb-close]").forEach((el) => el.addEventListener("click", closeLightbox));
  lbPrev.addEventListener("click", () => stepLightbox(-1));
  lbNext.addEventListener("click", () => stepLightbox(1));

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") stepLightbox(-1);
    else if (e.key === "ArrowRight") stepLightbox(1);
    else if (e.key === "Tab") {
      const focusables = [lbClose, lbPrev, lbNext].filter((b) => !b.hidden);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  let touchX = null;
  lightbox.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
