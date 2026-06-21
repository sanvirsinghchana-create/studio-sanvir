/* =========================================================================
   THE CHANDAN — interaction layer
   GSAP + ScrollTrigger + Lenis. Everything degrades gracefully:
   - respects prefers-reduced-motion
   - disables cursor / heavy parallax on touch devices
   ========================================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";

  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ----------  Lenis smooth scroll  ---------- */
  let lenis = null;
  function initLenis() {
    if (reduceMotion || typeof Lenis === "undefined") return;
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, syncTouch: false });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ----------  Loader (dark veil over the centred name)  ---------- */
  function initLoader(done) {
    // defensive hook: non-RM users without GSAP still see content
    if (!hasGSAP) document.body.classList.add("no-anim");

    var loader = document.querySelector(".loader");
    if (!loader) { done(); return; }

    var numEl  = loader.querySelector("[data-load-num]");
    var dotsEl = loader.querySelector("[data-load-dots]");
    var barEl  = loader.querySelector("[data-load-bar]");
    var arcEl  = loader.querySelector(".spool-arc");
    var reelEl = loader.querySelector(".spool-svg__reel");

    var finished = false;
    function finish() {
      if (finished) return; finished = true;
      loader.style.display = "none";
      document.body.classList.add("loaded");
      done();                                   // Lenis + ScrollTrigger come alive here
    }
    var safety = setTimeout(finish, 5600);      // hard ceiling — never trap the page

    var seen = false;
    try { seen = sessionStorage.getItem("sc_intro") === "1"; } catch (e) {}

    // reduced-motion / no-GSAP / returning visitor → snap to 100ft and fade (skip the threading)
    if (reduceMotion || !hasGSAP || seen) {
      if (numEl) numEl.textContent = "100";
      if (barEl) barEl.style.width = "100%";
      if (arcEl) arcEl.style.strokeDashoffset = "0";
      loader.style.transition = "opacity .5s ease";
      requestAnimationFrame(function () { loader.style.opacity = "0"; });
      setTimeout(function () { clearTimeout(safety); finish(); }, 520);
      return;
    }
    try { sessionStorage.setItem("sc_intro", "1"); } catch (e) {}

    // animated trailing dots on "Threading 100ft spool…"
    var dotN = 0;
    var dotTimer = setInterval(function () {
      dotN = (dotN + 1) % 4; if (dotsEl) dotsEl.textContent = new Array(dotN + 1).join(".");
    }, 300);

    // thread the magazine: count feet 0→100 while the reel spins and the arc + bar fill
    var prog = { v: 0 };
    var tl = gsap.timeline({ onComplete: reveal });
    tl.to(prog, {
      v: 100, duration: 2.5, ease: "power1.inOut",
      onUpdate: function () {
        var v = prog.v;
        if (numEl) numEl.textContent = Math.round(v);
        if (barEl) barEl.style.width = v + "%";
        if (arcEl) arcEl.style.strokeDashoffset = (100 - v).toFixed(2);
      }
    }, 0);
    tl.to(reelEl, { rotation: 560, duration: 2.5, ease: "power1.inOut", svgOrigin: "100 100" }, 0);

    function reveal() {
      clearInterval(dotTimer);
      if (dotsEl) dotsEl.textContent = "";
      gsap.timeline({ onComplete: function () { clearTimeout(safety); finish(); } })
        .to(reelEl,  { rotation: "+=22", duration: 0.55, ease: "power3.out", svgOrigin: "100 100" }, 0)
        .to(loader,  { opacity: 0, duration: 0.7, ease: "power2.inOut" }, 0.2);
    }
  }

  /* ----------  Hero intro (film-in-letters → scroll dissolves the letters to reveal the film)  ---------- */
  function initAperture() {
    var stage = document.querySelector(".aperture");
    if (!stage) return;

    var knockout = stage.querySelector(".hero-knockout");
    var signWrap = stage.querySelector(".hero-sign");
    var sign     = stage.querySelector(".hero-sign__img");
    var reel     = stage.querySelector(".hero-reel");
    var lockup   = stage.querySelector(".aperture__lockup");

    if (reduceMotion || !hasGSAP || !window.ScrollTrigger || !knockout || !sign) {
      stage.classList.add("is-static");
      document.body.classList.add("nav-on");      // no scroll-driven hero → the menu is available immediately
      return;
    }

    document.body.classList.add("intro-dark");

    gsap.set(reel,   { scale: 1.12 });
    gsap.set(lockup, { opacity: 0, yPercent: 16 });

    // the signature is FULLY ILLUMINATED at rest (the film travels through every stroke) — no draw-on.
    // Build a grid of tiles that reconstruct it, so the whole thing can dissipate into pieces on scroll.
    var COLS = 10, ROWS = 3, tiles = [];
    var tilesWrap = document.createElement("div");
    tilesWrap.className = "hero-sign__tiles"; tilesWrap.setAttribute("aria-hidden", "true");
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var t = document.createElement("div");
        t.className = "hero-sign__tile";
        t.style.left   = (c / COLS * 100) + "%";
        t.style.top    = (r / ROWS * 100) + "%";
        t.style.width  = (100 / COLS) + "%";
        t.style.height = (100 / ROWS) + "%";
        t.style.backgroundPosition = (c / (COLS - 1) * 100) + "% " + (r / (ROWS - 1) * 100) + "%";
        var ang = Math.random() * Math.PI * 2;                 // each piece flies off in a random direction
        t._dx = Math.cos(ang) * (0.3 + Math.random() * 0.5);   // 0.3–0.8 of the viewport
        t._dy = Math.sin(ang) * (0.3 + Math.random() * 0.5);
        t._rot = (Math.random() * 2 - 1) * 110;
        t._at = Math.random() * 0.24;                          // staggered random start → it dissipates raggedly
        tilesWrap.appendChild(t); tiles.push(t);
      }
    }
    signWrap.appendChild(tilesWrap);
    gsap.set(sign, { display: "none" });                       // the <img> is the static/reduced-motion fallback

    // ENTRANCE — the signature simply resolves in, already illuminated (a quiet fade as the loader lifts, no draw-on)
    gsap.fromTo(signWrap, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, ease: "power2.out", delay: 0.2 });
    setTimeout(function () { gsap.set(signWrap, { autoAlpha: 1 }); }, 2400);   // hidden-tab safety

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage, start: "top top", end: "+=70%",        // short pin → you scroll straight through to the films text
        pin: true, pinSpacing: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
        onEnterBack: function () { document.body.classList.add("intro-dark"); document.body.classList.remove("nav-on"); },
        onLeave: function () { document.body.classList.remove("intro-dark"); document.body.classList.add("nav-on"); },     // signature gone → menu appears
        onLeaveBack: function () { document.body.classList.add("intro-dark"); document.body.classList.remove("nav-on"); }
      }
    });

    // DISSIPATE — on scroll, every piece of the signature scatters off in its own random direction and fades,
    // handing over to the films text beneath
    tiles.forEach(function (t) {
      tl.to(t, {
        x: function () { return t._dx * window.innerWidth; },
        y: function () { return t._dy * window.innerHeight; },
        rotation: t._rot, scale: 0.5, autoAlpha: 0, ease: "power2.in", duration: 0.6
      }, t._at);
    });
    tl.to(reel,     { scale: 1, ease: "none", duration: 1 }, 0)
      .to(knockout, { opacity: 0, ease: "power1.inOut", duration: 0.32 }, 0.58)
      .to(lockup,   { opacity: 1, yPercent: 0, ease: "power2.out", duration: 0.26 }, 0.66);
  }

  /* ----------  Autoplay rescue — if the browser blocks muted autoplay, kick the active clip on first gesture  ---------- */
  function armAutoplayRescue(reel) {
    var done = false;
    var kick = function () {
      if (done) return; done = true;
      var act = reel.querySelector(".hero-reel__clip.is-active");
      if (act) { try { var p = act.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
      ["pointerdown", "touchstart", "keydown"].forEach(function (ev) { window.removeEventListener(ev, kick); });
    };
    ["pointerdown", "touchstart", "keydown"].forEach(function (ev) { window.addEventListener(ev, kick, { passive: true }); });
  }

  /* ----------  Hero showreel — a compiled selection of works; clips crossfade over one another  ---------- */
  function initHeroReel() {
    var reel = document.querySelector(".hero-reel");
    if (!reel) return;
    var clips = Array.prototype.slice.call(reel.querySelectorAll(".hero-reel__clip"));
    if (!clips.length) return;
    var play = function (v) { try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} };
    var warm = function (v) { if (v.getAttribute("preload") === "none") { v.preload = "auto"; try { v.load(); } catch (e) {} } };

    clips[0].classList.add("is-active");            // poster/first frame is correct even if everything below bails
    if (reduceMotion) return;                       // reduced motion → posters only, no playback

    armAutoplayRescue(reel);                         // blocked autoplay still starts on the first tap/scroll/key

    // pause the whole stack when the hero is off-screen; resume the active clip when it returns
    var onScreen = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (ents) {
        onScreen = ents[0].isIntersecting;
        if (!onScreen) clips.forEach(function (c) { try { c.pause(); } catch (e) {} });
        else { var a = reel.querySelector(".hero-reel__clip.is-active"); if (a) play(a); }
      }, { threshold: 0.02 }).observe(reel);
    }

    // light path: touch / save-data / single clip → just play the first, no multi-video stack
    var saveData = navigator.connection && navigator.connection.saveData;
    if (isTouch || saveData || clips.length < 2) { play(clips[0]); return; }

    // desktop: background-load the rest so crossfades never flash a poster, then crossfade through the works
    play(clips[0]);
    clips.slice(1).forEach(warm);
    var i = 0;
    setInterval(function () {
      if (!onScreen) return;                          // don't churn playback while hidden
      var prev = clips[i];
      i = (i + 1) % clips.length;
      var next = clips[i];
      play(next);
      next.classList.add("is-active");
      prev.classList.remove("is-active");
      setTimeout(function () { if (!prev.classList.contains("is-active")) { try { prev.pause(); } catch (e) {} } }, 1700);
    }, 15000);   // each film holds for 15s (the colour hero clip loops to fill it) before crossfading
  }

  /* ----------  Horizontal sections — each pins independently (scoped to itself)  ---------- */
  function initHScroll() {
    var sections = document.querySelectorAll("[data-hscroll]");
    if (!sections.length) return;

    // touch / reduced-motion / no-GSAP → native horizontal swipe per section (CSS handles it)
    if (reduceMotion || !hasGSAP || !window.ScrollTrigger || isTouch) return;

    sections.forEach(function (section) {
      var track = section.querySelector(".hscroll__track");
      if (!track) return;
      section.classList.add("is-pinned");

      // panel widths are deterministic (fixed/aspect-ratio), so this is stable without image load.
      var amount = function () { return Math.max(0, track.scrollWidth - section.offsetWidth); };

      // the horizontal pin + pan — you land on the big "FILMS", then scroll to reveal the films
      var pan = gsap.to(track, {
        x: function () { return -amount(); },
        ease: "none",
        scrollTrigger: {
          trigger: section, start: "top top", end: function () { return "+=" + amount(); },
          pin: true, pinSpacing: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true
        }
      });

      // FILM BACKGROUND — the centred panel's film plays full-frame behind (blurred); it crossfades to the next
      var bgLayers = section.querySelectorAll(".hscroll__filmbg-layer");
      var bgPlay = function (v) { try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} };
      section.querySelectorAll(".hscroll__panel").forEach(function (panel, i) {
        var layer = bgLayers[i];
        if (!layer) return;
        // crossfade: this film's bg rises to full as its panel reaches centre, then falls as the next takes over
        gsap.timeline({ scrollTrigger: { trigger: panel, containerAnimation: pan, start: "left right", end: "right left", scrub: true } })
          .fromTo(layer, { opacity: 0 }, { opacity: 1, ease: "power1.in", duration: 1 })
          .to(layer, { opacity: 0, ease: "power1.out", duration: 1 });
        // play the video only while it's the centred film (perf)
        if (layer.tagName === "VIDEO") {
          window.ScrollTrigger.create({
            trigger: panel, containerAnimation: pan, start: "left 78%", end: "right 22%",
            onToggle: function (self) {
              if (self.isActive) { if (layer.getAttribute("preload") === "none") layer.preload = "auto"; bgPlay(layer); }
              else { try { layer.pause(); } catch (e) {} }
            }
          });
        }
      });

      // reveal each film ONE BY ONE — a clean wipe + fade as it pans into view (no tilt, no rise)
      section.querySelectorAll(".hscroll__panel, .hscroll__end").forEach(function (panel) {
        gsap.fromTo(panel,
          { clipPath: "inset(0 0 100% 0)", opacity: 0 },
          { clipPath: "inset(0% 0 0% 0)", opacity: 1, ease: "power2.out",
            scrollTrigger: { trigger: panel, containerAnimation: pan, start: "left 96%", end: "left 60%", scrub: true } }
        );
      });
    });
  }

  /* ----------  FILMS heading — the letters fly in from the left of the screen as you arrive from the hero,
                 bridging the two sections so the cut never feels sterile  ---------- */
  function initFilmsTitle() {
    var title = document.querySelector(".hscroll--films .hscroll__title");
    if (!title || reduceMotion || !hasGSAP || !window.ScrollTrigger || isTouch) return;

    // split into per-letter spans (keep the accessible word on the element)
    var text = title.textContent;
    title.setAttribute("aria-label", text);
    title.textContent = "";
    var spans = text.split("").map(function (ch) {
      var s = document.createElement("span");
      s.className = "ft-l"; s.textContent = ch; s.setAttribute("aria-hidden", "true");
      title.appendChild(s); return s;
    });

    // scrubbed to the section arriving → the letters track the scroll in from the left, bridging hero → films
    gsap.fromTo(spans,
      { xPercent: -240, autoAlpha: 0 },
      { xPercent: 0, autoAlpha: 1, ease: "power3.out", stagger: 0.16,
        scrollTrigger: { trigger: ".hscroll--films", start: "top 96%", end: "top 22%", scrub: 0.5 } });
  }

  /* ----------  Films — full-screen cinematic horizontal reel: the section pins and scroll pans one film at a
                 time; each film's image drifts a touch and its title/line/cta resolve up as it reaches centre  ---------- */
  function initFilmsReel() {
    var section = document.querySelector("[data-films-reel]");
    if (!section) return;
    var track = section.querySelector(".hscroll__track");
    if (!track || reduceMotion || !hasGSAP || !window.ScrollTrigger || isTouch) return;   // touch → native horizontal swipe (CSS)
    section.classList.add("is-pinned");

    // pin the section and pan the track left by exactly its horizontal overflow as you scroll down
    var amount = function () { return Math.max(0, track.scrollWidth - section.offsetWidth); };
    var pan = gsap.to(track, {
      x: function () { return -amount(); }, ease: "none",
      scrollTrigger: {
        trigger: section, start: "top top", end: function () { return "+=" + amount(); },
        pin: true, pinSpacing: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true
      }
    });

    // per film: the image parallaxes a touch INSIDE its frame as the panel passes; title/line/cta resolve up at centre
    section.querySelectorAll(".hfilm").forEach(function (panel) {
      var pics = panel.querySelectorAll(".hfilm__media .film-still, .hfilm__media .film-clip");
      var inner = panel.querySelector(".hfilm__inner");
      if (pics.length) gsap.fromTo(pics, { scale: 1.12, xPercent: -2 }, { scale: 1.06, xPercent: 2, ease: "none",
        scrollTrigger: { trigger: panel, containerAnimation: pan, start: "left right", end: "right left", scrub: true } });
      if (inner) gsap.from(inner, { autoAlpha: 0, yPercent: 60, ease: "power3.out",
        scrollTrigger: { trigger: panel, containerAnimation: pan, start: "left 80%", end: "left 38%", scrub: 0.5 } });
    });
  }

  /* ----------  Scroll spool — the loaded 100ft magazine "runs" as you scroll from the hero into the films:
                 the reel turns, the counter winds 0→100ft and a meter fills, then it hands off at the films  ---------- */
  function initScrollSpool() {
    var el = document.querySelector(".scroll-spool");
    if (!el || reduceMotion || !hasGSAP || !window.ScrollTrigger) return;

    var reel  = el.querySelector("[data-spool-reel]");
    var numEl = el.querySelector("[data-spool-num]");
    var fill  = el.querySelector("[data-spool-fill]");
    var ST    = window.ScrollTrigger;

    // section tops as page-progress (0–1) — the spool only surfaces as you cross from one section to the next
    var sections = [".films", ".press-feature", ".founder", ".site-footer"]
      .map(function (q) { return document.querySelector(q); }).filter(Boolean);
    var bounds = [];
    function computeBounds() {
      var maxS = ST.maxScroll(window) || 1;
      var sc = (window.scrollY || window.pageYOffset || 0);
      bounds = sections.map(function (s) { return (s.getBoundingClientRect().top + sc) / maxS; });
    }
    computeBounds();
    ST.addEventListener("refresh", computeBounds);

    var BEFORE = 0.035, AFTER = 0.10;   // reveal a hair before a boundary, linger into the new section; never at the start

    // the 100ft magazine still winds the ENTIRE page (0ft top → 100ft footer); only its VISIBILITY is gated to transitions
    ST.create({
      trigger: document.body, start: "top top", end: "bottom bottom",
      scrub: 0.4, invalidateOnRefresh: true,
      onUpdate: function (self) {
        var p = self.progress;
        var feet = p * 100;
        if (reel)  gsap.set(reel, { rotation: p * 1800, svgOrigin: "32 32" });   // ~5 winds across the spool
        if (numEl) numEl.textContent = Math.round(feet);
        if (fill)  fill.style.width = feet.toFixed(1) + "%";
        // visible only near a section boundary; hidden through the body of each section AND at the hero start
        var vis = 0;
        for (var i = 0; i < bounds.length; i++) {
          var d = p - bounds[i];
          var v = d < 0 ? 1 - Math.min(1, (-d) / BEFORE) : 1 - Math.min(1, d / AFTER);
          if (v > vis) vis = v;
        }
        vis = vis * vis * (3 - 2 * vis);   // smoothstep
        gsap.set(el, { autoAlpha: vis });
      }
    });
  }

  /* ----------  Hero intro  ---------- */
  function initHero() {
    if (!hasGSAP || reduceMotion) return;

    // split-type hero (legacy inner pages, if present)
    const hero = document.querySelector(".hero");
    if (hero) {
      const lines = hero.querySelectorAll(".hero__line > span");
      const media = hero.querySelector(".hero__media");
      const fades = hero.querySelectorAll("[data-hero-fade]");
      const tl = gsap.timeline({ delay: 0.1 });
      if (lines.length) tl.from(lines, { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.08 });
      if (media) tl.from(media, { clipPath: "inset(100% 0 0 0)", scale: 1.15, duration: 1.2, ease: "expo.out" }, "-=0.9");
      if (fades.length) tl.from(fades, { y: 20, opacity: 0, duration: 0.8, ease: "power2.out", stagger: 0.1 }, "-=0.7");
    }

    // full-bleed statement hero (legacy)
    const shero = document.querySelector(".shero");
    if (shero) {
      const media = shero.querySelector(".shero__media img");
      const fades = shero.querySelectorAll("[data-hero-fade]");
      const tl = gsap.timeline({ delay: 0.05 });
      if (media) tl.from(media, { scale: 1.12, duration: 1.6, ease: "expo.out" });
      if (fades.length) tl.from(fades, { y: 26, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.12 }, "-=1.2");
    }

    // warm voice-led hero
    const bhero = document.querySelector(".bhero");
    if (bhero) {
      const fades = bhero.querySelectorAll("[data-hero-fade]");
      if (fades.length) gsap.from(fades, { y: 28, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.1, delay: 0.05 });
    }

    // minimal gallery / giant-name hero
    const ghero = document.querySelector(".ghero, .bigname");
    if (ghero) {
      const fades = ghero.querySelectorAll("[data-hero-fade]");
      if (fades.length) gsap.from(fades, { y: 24, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.09, delay: 0.05 });
    }

    // split-name intro (juanmora)
    const split = document.querySelector(".split-hero");
    if (split) {
      const words = split.querySelectorAll(".split-hero__name .word");
      const inset = split.querySelector(".split-hero__inset");
      const fades = split.querySelectorAll("[data-hero-fade]");
      const tl = gsap.timeline({ delay: 0.08 });
      if (words.length) tl.from(words, { yPercent: 28, opacity: 0, duration: 1.15, ease: "expo.out", stagger: 0.12 });
      if (inset) tl.from(inset, { clipPath: "inset(100% 0 0 0)", scale: 1.12, duration: 1.15, ease: "expo.out" }, "-=0.95");
      if (fades.length) tl.from(fades, { y: 16, opacity: 0, duration: 0.8, ease: "power2.out", stagger: 0.08 }, "-=0.8");
    }
  }

  /* ----------  Generic scroll reveals  ---------- */
  function initReveals() {
    if (!hasGSAP || reduceMotion) {
      document.querySelectorAll("[data-reveal], [data-reveal-lines]").forEach((el) => (el.style.opacity = 1));
      return;
    }
    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        y: 40, opacity: 0, duration: 1, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });
    // staggered groups
    gsap.utils.toArray("[data-reveal-group]").forEach((group) => {
      const items = group.querySelectorAll("[data-reveal-item]");
      gsap.from(items, {
        y: 44, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.09,
        scrollTrigger: { trigger: group, start: "top 85%" }
      });
    });
    // line-by-line headings
    gsap.utils.toArray("[data-reveal-lines]").forEach((el) => {
      const spans = el.querySelectorAll(".line-mask > span, .line > span");
      const targets = spans.length ? spans : [el];
      gsap.from(targets, {
        yPercent: 110, opacity: spans.length ? 1 : 0, duration: 1.1, ease: "expo.out", stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 86%" }
      });
    });
  }

  /* ----------  Scroll-driven text — words brighten from dim to ink as you scroll through (Apple-style)  ---------- */
  function initScrollText() {
    var nodes = document.querySelectorAll("[data-scroll-text]");
    if (!hasGSAP || reduceMotion || !window.ScrollTrigger) {
      nodes.forEach(function (el) { el.style.opacity = 1; });
      return;
    }
    var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
    nodes.forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map(function (w) { return '<span class="rw">' + esc(w) + "</span>"; }).join(" ");
      var spans = el.querySelectorAll(".rw");
      gsap.set(spans, { opacity: 0.16 });                    // dim baseline, held until each word is reached
      var tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 58%", scrub: 0.5, invalidateOnRefresh: true }
      });
      spans.forEach(function (w, i) { tl.to(w, { opacity: 1, ease: "none", duration: 1 }, i * 0.55); });
    });
  }

  /* ----------  Footer wordmark — drifts horizontally as it scrolls in (sakazuki-style kinetic type)  ---------- */
  function initFooterKinetic() {
    if (!hasGSAP || reduceMotion || !window.ScrollTrigger || isTouch) return;
    var name = document.querySelector(".site-footer .bigname__title");
    if (!name) return;
    gsap.fromTo(name, { xPercent: 8 }, {
      xPercent: -8, ease: "none",
      scrollTrigger: { trigger: ".site-footer", start: "top bottom", end: "bottom bottom", scrub: 0.6 }
    });
  }

  /* ----------  Parallax bands / images  ---------- */
  function initParallax() {
    if (!hasGSAP || reduceMotion || isTouch) return;
    gsap.utils.toArray("[data-parallax]").forEach((img) => {
      const amount = parseFloat(img.dataset.parallax) || 12;
      gsap.fromTo(img, { yPercent: -amount }, {
        yPercent: amount, ease: "none",
        scrollTrigger: { trigger: img.closest(".band, .film-hero, .shero, .split-hero, .reel__item, figure") || img, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
  }

  /* ----------  Marquee  ---------- */
  function initMarquee() {
    document.querySelectorAll(".marquee__track").forEach((track) => {
      const inner = track.innerHTML;
      track.innerHTML = inner + inner; // duplicate for seamless loop
      if (!hasGSAP || reduceMotion) return;
      const dir = track.dataset.dir === "rev" ? 1 : -1;
      gsap.to(track, {
        xPercent: dir * 50, duration: 24, ease: "none", repeat: -1
      });
    });
  }

  /* ----------  Nav scroll state + overlay menu  ---------- */
  function initNav() {
    const nav = document.querySelector(".nav");
    const onScroll = () => { if (nav) nav.classList.toggle("scrolled", window.scrollY > 40); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const btn = document.querySelector(".menu-btn");
    const menu = document.querySelector(".menu");
    if (!btn || !menu) return;

    const label = btn.querySelector(".menu-btn__label");
    const links = menu.querySelectorAll(".menu__nav a");
    const media = menu.querySelector(".menu__media img");
    let isOpen = false;

    // highlight current page
    const here = location.pathname.split("/").pop() || "index.html";
    links.forEach((a) => {
      const href = a.getAttribute("href").split("/").pop();
      if (href === here) a.setAttribute("aria-current", "page");
    });

    function open() {
      isOpen = true; menu.classList.add("open"); document.body.classList.add("menu-open");
      menu.setAttribute("aria-hidden", "false"); btn.setAttribute("aria-expanded", "true");
      if (label) label.textContent = label.dataset.close || "Close";
      document.body.style.overflow = "hidden";
      if (hasGSAP && !reduceMotion) {
        gsap.fromTo(links, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.06, delay: 0.18 });
        gsap.fromTo(menu.querySelector(".menu__aside"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", delay: 0.35 });
      }
    }
    function close() {
      isOpen = false; menu.classList.remove("open"); document.body.classList.remove("menu-open");
      menu.setAttribute("aria-hidden", "true"); btn.setAttribute("aria-expanded", "false");
      if (label) label.textContent = label.dataset.open || "Menu";
      document.body.style.overflow = "";
    }
    btn.addEventListener("click", () => (isOpen ? close() : open()));
    links.forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen) close(); });

    // hover-swap aside image (desktop)
    if (media && !isTouch) {
      links.forEach((a) => {
        const src = a.dataset.img; if (!src) return;
        a.addEventListener("mouseenter", () => {
          if (media.getAttribute("src") === src) return;
          if (hasGSAP && !reduceMotion) {
            gsap.to(media, { opacity: 0, duration: 0.2, onComplete: () => { media.src = src; gsap.to(media, { opacity: 1, duration: 0.35 }); } });
          } else { media.src = src; }
        });
      });
    }
  }

  /* ----------  Project list hover preview (desktop)  ---------- */
  function initProjectPreview() {
    if (isTouch || reduceMotion || !hasGSAP) return;
    const preview = document.querySelector(".project__preview");
    if (!preview) return;
    const img = preview.querySelector("img");
    const projects = document.querySelectorAll(".project[data-preview]");
    let active = false;
    const xTo = gsap.quickTo(preview, "x", { duration: 0.5, ease: "expo.out" });
    const yTo = gsap.quickTo(preview, "y", { duration: 0.5, ease: "expo.out" });

    projects.forEach((p) => {
      p.addEventListener("mouseenter", () => {
        if (img) img.src = p.dataset.preview;
        active = true; gsap.to(preview, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out" });
      });
      p.addEventListener("mouseleave", () => {
        active = false; gsap.to(preview, { opacity: 0, scale: 0.92, duration: 0.4, ease: "expo.out" });
      });
    });
    window.addEventListener("mousemove", (e) => { if (active) { xTo(e.clientX); yTo(e.clientY); } });
  }

  /* ----------  About — extra micro-interactions: a filmic portrait reveal + hover wash, a wiping heading, a drawn rule  ---------- */
  function initAbout() {
    var about = document.querySelector(".founder");
    if (!about || reduceMotion || !hasGSAP || !window.ScrollTrigger) return;
    var fig  = about.querySelector(".founder__portrait");
    var name = about.querySelector(".founder__name");
    var sep  = about.querySelector(".founder__role-sep");

    // portrait — wipes up into view, then zooms gently on hover (the burgundy colour-wash is CSS :hover)
    if (fig) {
      gsap.fromTo(fig, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: 1.2, ease: "power3.out",
        scrollTrigger: { trigger: fig, start: "top 82%" } });
      if (!isTouch) {   // scale the FIGURE (the img carries the scroll-parallax, so scaling it would clobber)
        var zoom = gsap.quickTo(fig, "scale", { duration: 0.6, ease: "power3.out" });
        fig.addEventListener("mouseenter", function () { zoom(1.035); });
        fig.addEventListener("mouseleave", function () { zoom(1); });
      }
    }
    // the big "About" wipes up out of a mask
    if (name) gsap.from(name, { clipPath: "inset(0 0 100% 0)", yPercent: 10, duration: 1.1, ease: "power3.out",
      scrollTrigger: { trigger: name, start: "top 84%" } });
    // the role rule draws across
    if (sep) gsap.from(sep, { scaleX: 0, transformOrigin: "left center", duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: about.querySelector(".founder__role") || sep, start: "top 86%" } });
  }

  /* ----------  Magnetic buttons — interactive elements lean toward the cursor, then spring back  ---------- */
  function initMagnetic() {
    if (isTouch || reduceMotion || !hasGSAP) return;
    var els = document.querySelectorAll(".menu-btn--float, .hfilm__cta, .filmtale__cta, .next-film, .hscroll__end, .films__archive, .btn, .footer-top");
    els.forEach(function (el) {
      var xTo = gsap.quickTo(el, "x", { duration: 0.55, ease: "back.out(1.7)" });
      var yTo = gsap.quickTo(el, "y", { duration: 0.55, ease: "back.out(1.7)" });
      var S = 0.32, MAX = 16;
      var clamp = function (v) { return v < -MAX ? -MAX : v > MAX ? MAX : v; };
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        xTo(clamp((e.clientX - (r.left + r.width / 2)) * S));
        yTo(clamp((e.clientY - (r.top + r.height / 2)) * S));
      });
      el.addEventListener("mouseleave", function () { xTo(0); yTo(0); });   // back.out → a little spring home
    });
  }

  /* ----------  Custom cursor  ---------- */
  function initCursor() {
    if (isTouch || reduceMotion || !hasGSAP) return;
    const cursor = document.createElement("div"); cursor.className = "cursor"; document.body.appendChild(cursor);
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.25, ease: "power3.out" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.25, ease: "power3.out" });
    window.addEventListener("mousemove", (e) => { xTo(e.clientX); yTo(e.clientY); });
    const hoverables = "a, button, .project, .pcard, .video-placeholder, [data-cursor]";
    document.querySelectorAll(hoverables).forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });
  }

  /* ----------  Video placeholder → iframe  ---------- */
  function initVideo() {
    document.querySelectorAll(".video-placeholder").forEach((ph) => {
      ph.addEventListener("click", () => {
        const wrap = ph.closest(".video-wrap");
        const src = ph.dataset.embed;
        if (!src || !wrap) return;
        const iframe = document.createElement("iframe");
        iframe.src = src + (src.includes("?") ? "&" : "?") + "autoplay=1";
        iframe.allow = "autoplay; fullscreen; picture-in-picture";
        iframe.setAttribute("allowfullscreen", "");
        iframe.title = ph.getAttribute("aria-label") || "Film player";
        wrap.appendChild(iframe);
        ph.remove();
      });
      ph.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ph.click(); } });
    });
  }

  /* ----------  Works filter (left rail)  ---------- */
  function initFilter() {
    const btns = document.querySelectorAll(".rail-btn[data-filter]");
    const items = document.querySelectorAll(".masonry .g-item");
    if (!btns.length || !items.length) return;
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const f = btn.dataset.filter;
        btns.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
        items.forEach((it) => {
          const show = f === "all" || (it.dataset.cat || "").split(" ").includes(f);
          it.classList.toggle("is-hidden", !show);
        });
        if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });
  }

  /* ----------  Moving images (video) playback  ---------- */
  function initMotionMedia() {
    if (reduceMotion) return;                 // respect reduced motion — posters/stills stay static
    var play = function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); };

    // (the hero showreel is handled by initHeroReel)

    // film clips ARE the panel icons — autoplay each while it's in view, pause when it leaves
    // (the poster still covers any panel whose clip isn't added yet, so nothing ever breaks)
    var saveData = navigator.connection && navigator.connection.saveData;
    document.querySelectorAll(".film-clip").forEach(function (v) {
      if (saveData) return;                    // data-saver → keep the poster still
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (ents) {
          ents.forEach(function (e) {
            if (e.isIntersecting) { if (v.getAttribute("preload") === "none") { v.preload = "auto"; } play(v); v.classList.add("is-playing"); }
            else { try { v.pause(); } catch (err) {} v.classList.remove("is-playing"); }
          });
        }, { threshold: 0.25 }).observe(v);
      } else { play(v); }
    });
  }

  /* ----------  Smooth in-page anchor scrolling  ---------- */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      const id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      a.addEventListener("click", (e) => {
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        // close the overlay menu if it's open
        const menu = document.querySelector(".menu");
        if (menu && menu.classList.contains("open")) {
          menu.classList.remove("open"); document.body.classList.remove("menu-open");
          menu.setAttribute("aria-hidden", "true");
          const btn = document.querySelector(".menu-btn");
          if (btn) { btn.setAttribute("aria-expanded", "false"); const l = btn.querySelector(".menu-btn__label"); if (l) l.textContent = l.dataset.open || "Menu"; }
          document.body.style.overflow = "";
        }
        if (lenis && lenis.scrollTo) lenis.scrollTo(target, { offset: 0, duration: 1.2 });
        else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
        history.replaceState(null, "", id);
      });
    });
  }

  /* ----------  Year  ---------- */
  function initYear() { document.querySelectorAll("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear())); }

  /* ----------  Boot  ---------- */
  function boot() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    initNav(); initMarquee(); initVideo(); initYear(); initFilter(); initAnchors();
    initLoader(() => {
      window.scrollTo(0, 0);
      initLenis();
      if (lenis && lenis.scrollTo) lenis.scrollTo(0, { immediate: true, force: true });
      initAperture(); initHeroReel(); initHero(); initReveals(); initParallax(); initHScroll(); initFilmsReel(); initFilmsTitle(); initScrollSpool(); initScrollText(); initFooterKinetic(); initMotionMedia(); initProjectPreview(); initCursor(); initMagnetic(); initAbout();
      if (hasGSAP && window.ScrollTrigger) {
        ScrollTrigger.clearScrollMemory("manual");
        window.scrollTo(0, 0);
        if (lenis && lenis.scrollTo) lenis.scrollTo(0, { immediate: true, force: true });
        ScrollTrigger.refresh();           // measure pins from the top
        ScrollTrigger.update();            // evaluate triggers at scroll 0 (closed iris + centred name)
        // web fonts change text metrics after first paint → re-measure once they're ready so triggers don't drift
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
