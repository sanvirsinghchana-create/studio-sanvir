/* =========================================================================
   SANVIR CHANA — wedding films · three independently-scrolling columns
   GSAP (micro-interactions) + IntersectionObserver. Degrades gracefully.
   ========================================================================= */
(function () {
  "use strict";

  var reduce  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touch   = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasIO   = "IntersectionObserver" in window;

  /* ---- split headings into word spans (rise-in reveal) ---- */
  function initSplit() {
    document.querySelectorAll("[data-split]").forEach(function (el) {
      var text = el.textContent, i = 0;
      el.textContent = "";
      text.split(/(\s+)/).forEach(function (chunk) {
        if (chunk === "") return;
        if (/^\s+$/.test(chunk)) { el.appendChild(document.createTextNode(" ")); return; }
        var w = document.createElement("span"); w.className = "word";
        var inner = document.createElement("span"); inner.className = "word__in"; inner.textContent = chunk;
        if (!reduce) inner.style.transitionDelay = (i * 0.055) + "s";
        w.appendChild(inner); el.appendChild(w); i++;
      });
    });
  }

  /* ---- reveal on scroll: opacity, clip wipe, word rise ---- */
  function initReveals() {
    var items = document.querySelectorAll("[data-reveal], [data-clip], [data-split]");
    if (reduce || !hasIO) { items.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
    items.forEach(function (i) { io.observe(i); });

    /* safety sweep — reveal anything already on-screen that the observer's first pass
       may miss (e.g. once fonts/images settle the layout), so nothing can stay hidden. */
    var sweep = function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      items.forEach(function (el) {
        if (el.classList.contains("in")) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0 && r.height > 0) { el.classList.add("in"); io.unobserve(el); }
      });
    };
    sweep();                                                 // whatever is visible right now
    window.addEventListener("load", sweep);                  // again once images settle
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sweep);
    setTimeout(sweep, 600);

    /* Reveal on scroll too. The homepage's three columns each scroll independently
       (overflow-y:auto), and a viewport-rooted IntersectionObserver doesn't reliably
       fire for that inner-container scrolling — so images you scroll down to could stay
       clipped. Sweeping on every scroll (throttled to one pass per frame) guarantees
       anything scrolled into view is revealed, on the columns and on the page itself. */
    var queued = false;
    var onScroll = function () {
      if (queued) return; queued = true;
      requestAnimationFrame(function () { queued = false; sweep(); });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.querySelectorAll(".col").forEach(function (el) { el.addEventListener("scroll", onScroll, { passive: true }); });
  }

  /* ---- wedding films play while in view (each fills its section) ---- */
  function initFilms() {
    if (reduce) return;
    var play = function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    var warm = function (v) { if (v.getAttribute("preload") === "none") { v.preload = "auto"; try { v.load(); } catch (e) {} } };
    var vids = document.querySelectorAll(".wed__vid");
    if (!hasIO) { vids.forEach(function (v) { warm(v); play(v); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { warm(v); play(v); }
        else { try { v.pause(); } catch (x) {} }
      });
    }, { threshold: 0.4 });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* ---- the films reel scrolls SIDEWAYS — one wedding per gesture, smoothly paged ---- */
  function initReelScroll() {
    var track = document.querySelector(".reel__track");
    if (!track) return;
    var reel = track.closest(".col--reel");
    var panels = track.querySelectorAll(".wed");
    if (!panels.length) return;
    var idx = 0, locked = false, lockT, raf;

    /* build one dot per film */
    var dots = [];
    var dotsWrap = reel.querySelector("[data-dots]");
    if (dotsWrap) {
      panels.forEach(function (p, i) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "reel__dot";
        b.setAttribute("aria-label", "Go to film " + (i + 1));
        b.addEventListener("click", function () { goTo(i); });
        dotsWrap.appendChild(b); dots.push(b);
      });
    }

    function mark(i) {
      idx = i;
      dots.forEach(function (d, di) { d.classList.toggle("is-on", di === i); });
      reel.classList.add("reel--moved");   // retire the scroll hint after the first move
    }
    function animateTo(target) {
      var start = track.scrollLeft, dist = target - start;
      if (reduce || Math.abs(dist) < 1) { track.scrollLeft = target; locked = false; return; }
      track.style.scrollSnapType = "none";   // keep CSS snap from fighting the tween
      var t0 = null, dur = 980;               // slow, cinematic glide between weddings
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;   // easeInOutCubic
        track.scrollLeft = start + dist * e;
        if (p < 1) requestAnimationFrame(step);
        else { track.style.scrollSnapType = ""; locked = false; }
      }
      requestAnimationFrame(step);
    }
    function goTo(i) {
      i = Math.max(0, Math.min(panels.length - 1, i));
      if (i === idx && Math.abs(track.scrollLeft - panels[i].offsetLeft) < 1) return;
      mark(i);
      locked = true;
      animateTo(panels[i].offsetLeft);
      window.clearTimeout(lockT);
      lockT = window.setTimeout(function () { locked = false; track.style.scrollSnapType = ""; }, 1300);
    }

    /* a vertical scroll over the reel pages it sideways, one film at a time */
    track.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // genuine horizontal gesture → native scroll
      e.preventDefault();
      if (locked || Math.abs(e.deltaY) < 2) return;
      goTo(idx + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });

    /* keep the active dot in sync with touch-swipes / keyboard focus */
    track.addEventListener("scroll", function () {
      if (locked) return;
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(function () {
        var sl = track.scrollLeft, best = 0, bd = Infinity;
        panels.forEach(function (p, i) { var d = Math.abs(p.offsetLeft - sl); if (d < bd) { bd = d; best = i; } });
        if (best !== idx) mark(best);
      });
    }, { passive: true });

    window.addEventListener("resize", function () { track.scrollTo({ left: panels[idx].offsetLeft }); });
    if (dots[0]) dots[0].classList.add("is-on");
  }

  /* ---- the feature's reading-progress bar ---- */
  function initProgress() {
    var col = document.querySelector(".col--feature");
    var bar = document.querySelector("[data-progress]");
    if (!col || !bar) return;
    var update = function () {
      var max = col.scrollHeight - col.clientHeight;
      bar.style.transform = "scaleY(" + (max > 0 ? col.scrollTop / max : 0) + ")";
    };
    col.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---- magnetic links/CTAs ---- */
  function initMagnetic() {
    if (touch || reduce || !hasGSAP) return;
    document.querySelectorAll("[data-magnet]").forEach(function (el) {
      var xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "back.out(1.6)" });
      var yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "back.out(1.6)" });
      var S = 0.3, M = 13, clamp = function (v) { return v < -M ? -M : v > M ? M : v; };
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        xTo(clamp((e.clientX - (r.left + r.width / 2)) * S));
        yTo(clamp((e.clientY - (r.top + r.height / 2)) * S));
      });
      el.addEventListener("mouseleave", function () { xTo(0); yTo(0); });
    });
  }

  /* ---- custom cursor ---- */
  function initCursor() {
    if (touch || reduce || !hasGSAP) return;
    var c = document.createElement("div"); c.className = "cursor"; document.body.appendChild(c);
    gsap.set(c, { xPercent: -50, yPercent: -50, opacity: 0 });
    var xTo = gsap.quickTo(c, "x", { duration: 0.16, ease: "power3.out" });
    var yTo = gsap.quickTo(c, "y", { duration: 0.16, ease: "power3.out" });
    var shown = false;
    window.addEventListener("mousemove", function (e) { if (!shown) { shown = true; gsap.to(c, { opacity: 1, duration: 0.2 }); } xTo(e.clientX); yTo(e.clientY); });
    window.addEventListener("mouseout", function (e) { if (!e.relatedTarget) gsap.to(c, { opacity: 0, duration: 0.2 }); });
    var on = function (sel, cls) { document.querySelectorAll(sel).forEach(function (el) {
      el.addEventListener("mouseenter", function () { c.classList.add(cls); });
      el.addEventListener("mouseleave", function () { c.classList.remove(cls); });
    }); };
    on("a, button, [data-magnet]", "is-hover");
    on(".wed__overlay", "is-media");
  }

  function initYear() { document.querySelectorAll("[data-year]").forEach(function (e) { e.textContent = new Date().getFullYear(); }); }

  /* ---- fade the three columns up from the blank ground, wordmark column last ---- */
  function revealColumns() {
    var html = document.documentElement;
    var cols = [".col--reel", ".col--feature", ".col--id"].map(function (s) { return document.querySelector(s); }).filter(Boolean);
    if (reduce || !cols.length) { cols.forEach(function (c) { c.classList.add("is-in"); }); html.classList.remove("is-intro"); return; }
    var delays = [0, 90, 240];   // reel + feature first, the identity column (wordmark) last
    cols.forEach(function (c, i) { setTimeout(function () { c.classList.add("is-in"); }, delays[i] || 0); });
    setTimeout(function () { html.classList.remove("is-intro"); }, 240 + 1050);   // release once the last column has settled
  }

  /* ---- the opening titles: a Bolex threading film over a feet counter, then the
          wordmark, then a dissolve that hands off to the column reveal underneath ---- */
  function initLoader(onReveal) {
    var el = document.getElementById("loader");
    if (!el) { onReveal(); return; }

    var done = false;
    var finish = function () {
      if (done) return; done = true;
      onReveal();                                   // start the columns fading in underneath
      el.classList.add("is-done");                  // then dissolve the burgundy overlay over them
      var remove = function () { if (el.parentNode) el.parentNode.removeChild(el); };
      el.addEventListener("transitionend", remove, { once: true });
      setTimeout(remove, 1300);                     // belt-and-braces in case transitionend never fires
    };
    el.addEventListener("click", finish);           // click anywhere to skip the intro

    if (reduce) { finish(); return; }               // reduced motion → straight to the site

    /* the feet counter winds 0 → 100ft (the camera's reels + film loop run via CSS) */
    var num = el.querySelector("[data-load-ft]");
    var fill = el.querySelector("[data-load-fill]");
    var DUR = 2050, t0 = null;
    var pad = function (n) { return ("00" + n).slice(-3); };
    var tick = function (ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / DUR);
      var e = 1 - Math.pow(1 - p, 2.2);             // ease toward 100
      if (num) num.textContent = pad(Math.round(e * 100));
      if (fill) fill.style.transform = "scaleX(" + e.toFixed(4) + ")";
      if (p < 1 && !done) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    setTimeout(function () { if (!done) el.classList.add("is-named"); }, 2250);   // spool down → resolve the wordmark
    setTimeout(finish, 3750);                                                     // → dissolve into the site
  }

  /* ---- scroll the identity column → it expands over the feature, then contracts (studio-simms) ---- */
  function initExpand() {
    var left   = document.querySelector(".col--id");
    var mid    = document.querySelector(".col--feature");
    var layout = document.querySelector(".layout");
    if (!left || !layout) return;

    var mq = window.matchMedia("(min-width: 1041px) and (hover: hover) and (pointer: fine)");
    var STEP = 1 / 470;   // wheel delta → expansion progress (≈ a deliberate swipe to open)
    var smooth = function (t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };  // smoothstep

    var mode = null;                                          // "left" | "mid" | null — which column is taking over
    var target = 0, applied = 0, raf = null, on = false;

    var colsLeft = function (k) {                             // 29/27/44 → 63/37/0  (identity takes over the middle; reel closes)
      return (29 + 34 * k).toFixed(2) + "% " + (27 + 10 * k).toFixed(2) + "% " + (44 - 44 * k).toFixed(2) + "%";
    };
    var colsMid = function (k) {                              // 29/27/44 → 0/56/44  (middle takes over the identity column; reel stays)
      return (29 - 29 * k).toFixed(2) + "% " + (27 + 29 * k).toFixed(2) + "% 44.00%";
    };

    var apply = function () {
      var e = smooth(applied);
      if (mode === "mid") {
        layout.style.gridTemplateColumns = colsMid(e);
        layout.style.setProperty("--expand-mid", e.toFixed(4));
        layout.style.setProperty("--expand", "0");
      } else {
        layout.style.gridTemplateColumns = colsLeft(e);
        layout.style.setProperty("--expand", e.toFixed(4));
        layout.style.setProperty("--expand-mid", "0");
      }
      if (mid) mid.classList.toggle("ft--wide", mode === "mid" && e > 0.55);   // reflow the article to fill, once wide
    };

    var frame = function () {
      applied += (target - applied) * 0.16;                  // ease toward the scrolled target
      if (Math.abs(target - applied) < 0.0008) applied = target;
      apply();
      if (applied === 0 && target === 0) mode = null;        // fully closed → release for either column
      raf = (applied !== target) ? requestAnimationFrame(frame) : null;
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(frame); };

    var drive = function (col, myMode) {
      return function (ev) {
        if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;        // let trackpad horizontals through
        if (mode && mode !== myMode && applied > 0.0008) return;       // one column takes over at a time
        var dy = ev.deltaY;
        if (dy > 0) {                                                  // down → open, before the content scrolls
          if (target < 1) { ev.preventDefault(); mode = myMode; target = Math.min(1, target + dy * STEP); kick(); }
        } else {                                                       // up → close, once the content is back at top
          if (col.scrollTop <= 0 && target > 0) { ev.preventDefault(); mode = myMode; target = Math.max(0, target + dy * STEP); kick(); }
        }
      };
    };
    var onLeft = drive(left, "left");
    var onMid  = mid ? drive(mid, "mid") : null;

    var enable = function () {
      if (on || reduce) return; on = true;
      left.addEventListener("wheel", onLeft, { passive: false });
      if (onMid) mid.addEventListener("wheel", onMid, { passive: false });
    };
    var disable = function () {
      if (!on) return; on = false;
      left.removeEventListener("wheel", onLeft);
      if (onMid) mid.removeEventListener("wheel", onMid);
      mode = null; target = 0; applied = 0;
      layout.style.gridTemplateColumns = "";
      layout.style.removeProperty("--expand");
      layout.style.removeProperty("--expand-mid");
      if (mid) mid.classList.remove("ft--wide");
    };
    var check = function () { mq.matches ? enable() : disable(); };
    if (mq.addEventListener) mq.addEventListener("change", check); else mq.addListener(check);
    check();
  }

  /* ---- the score: a small record that plays Marcus Herne's original score (film pages) ---- */
  function initRecord() {
    document.querySelectorAll(".fscore").forEach(function (scope) {
      var btn = scope.querySelector(".record");
      var audio = scope.querySelector(".fscore__audio");
      if (!btn || !audio) return;
      var cue = scope.querySelector(".fscore__cue");
      var sync = function (playing) {
        scope.classList.toggle("is-playing", playing);
        btn.setAttribute("aria-pressed", playing ? "true" : "false");
        if (cue) cue.innerHTML = playing ? "Pause <i>&#10074;&#10074;</i>" : "Play <i>&#9654;</i>";
      };
      btn.addEventListener("click", function () {
        if (audio.paused) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
        else { audio.pause(); }
      });
      audio.addEventListener("play",  function () { sync(true); });
      audio.addEventListener("pause", function () { sync(false); });
      audio.addEventListener("ended", function () { sync(false); });
    });
  }

  function boot() {
    if (!hasGSAP) document.body.classList.add("no-anim");
    initSplit(); initYear(); initReveals(); initFilms(); initReelScroll(); initProgress(); initMagnetic(); initCursor(); initExpand(); initRecord();
    initLoader(revealColumns);   // plays the opening titles, then hands off to the column reveal
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
