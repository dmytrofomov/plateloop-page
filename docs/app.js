(function () {
  "use strict";

  /* ---------- Brand binding from window.SITE ---------- */
  var s = window.SITE;
  if (s) {
    var origin = String(s.domain || "").replace(/\/+$/, "");
    var abs = function (path) {
      return origin + (path ? "/" + String(path).replace(/^\/+/, "") : "/");
    };
    document.querySelectorAll("[data-site]").forEach(function (el) {
      var val = s[el.getAttribute("data-site")];
      if (val == null || val === "") return;
      var attr = el.getAttribute("data-site-attr");
      if (attr) el.setAttribute(attr, val);
      else el.textContent = val;
    });
    var title = s.brand + " — щоденник їжі, план тижня і покупки в одному чаті Telegram";
    document.title = title;
    [
      ['meta[property="og:title"]', s.brand + " — їжа, план і покупки в одному чаті Telegram"],
      ['meta[property="og:site_name"]', s.brandLong],
      ['meta[property="og:url"]', abs("")],
      ['meta[property="og:image"]', abs("brand/social-cover.jpg")],
      ['meta[name="twitter:title"]', s.brand + " — їжа, план і покупки в одному чаті Telegram"],
      ['meta[name="twitter:image"]', abs("brand/social-cover.jpg")],
      ['link[rel="canonical"]', abs(""), "href"]
    ].forEach(function (row) {
      var el = document.querySelector(row[0]);
      if (el) el.setAttribute(row[2] || "content", row[1]);
    });
    var ld = document.getElementById("jsonld");
    if (ld) {
      try {
        var data = JSON.parse(ld.textContent);
        (data["@graph"] || []).forEach(function (node) {
          if (node.name) node.name = s.brandLong;
          if (node.alternateName) node.alternateName = s.brand;
          if (node.url) node.url = abs("");
          if (node.image) node.image = abs("brand/social-cover.jpg");
          if (node.sameAs) node.sameAs = [s.botUrl];
        });
        ld.textContent = JSON.stringify(data);
      } catch (e) { /* keep static JSON-LD */ }
    }
  }

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: solid after scroll ---------- */
  var header = document.getElementById("header");
  var mobileCta = document.querySelector(".mobile-cta");
  var hero = document.querySelector(".hero");
  var onScroll = function () {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    if (mobileCta) {
      var limit = hero ? hero.offsetHeight * 0.55 : 400;
      mobileCta.classList.toggle("is-shown", window.scrollY > limit);
    }
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Hero chat: replay when it scrolls back into view ---------- */
  var heroChat = document.querySelector(".chat-hero");
  if (heroChat && "IntersectionObserver" in window && !reduceMotion) {
    var heroIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          heroChat.classList.remove("is-playing");
          void heroChat.offsetWidth; // restart CSS animations
          heroChat.classList.add("is-playing");
        }
      });
    }, { threshold: 0.4 });
    heroIo.observe(heroChat);
  } else if (heroChat) {
    heroChat.classList.add("is-playing");
  }

  /* ---------- Inside-the-bot tabs with auto-advance ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab[data-scene]"));
  var scenes = Array.prototype.slice.call(document.querySelectorAll(".scene"));
  var stage = document.querySelector(".inside-stage");
  if (tabs.length && scenes.length) {
    var DURATION = 5200;
    var current = 0;
    var timer = null;
    var paused = false;
    var inView = false;

    var show = function (idx, fromUser) {
      current = (idx + tabs.length) % tabs.length;
      tabs.forEach(function (t, i) {
        var active = i === current;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
        t.setAttribute("tabindex", active ? "0" : "-1");
        t.classList.remove("is-running");
      });
      scenes.forEach(function (sc, i) {
        var active = i === current;
        sc.classList.toggle("is-active", active);
        if (active) sc.removeAttribute("hidden"); else sc.setAttribute("hidden", "");
      });
      if (fromUser) restart();
    };

    var tick = function () {
      if (paused || !inView || reduceMotion) return;
      show(current + 1, false);
      arm();
    };

    var arm = function () {
      clearTimeout(timer);
      if (reduceMotion || paused || !inView) return;
      var t = tabs[current];
      t.style.setProperty("--dur", DURATION + "ms");
      // restart progress animation
      t.classList.remove("is-running");
      void t.offsetWidth;
      t.classList.add("is-running");
      timer = setTimeout(tick, DURATION);
    };

    var restart = function () { arm(); };

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(i, true); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); show(i + 1, true); tabs[current].focus(); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); show(i - 1, true); tabs[current].focus(); }
        if (e.key === "Home") { e.preventDefault(); show(0, true); tabs[current].focus(); }
        if (e.key === "End") { e.preventDefault(); show(tabs.length - 1, true); tabs[current].focus(); }
      });
    });

    var pause = function () { paused = true; clearTimeout(timer); tabs[current].classList.remove("is-running"); };
    var resume = function () { if (!paused) return; paused = false; arm(); };
    [stage, document.querySelector(".tabs")].forEach(function (el) {
      if (!el) return;
      el.addEventListener("mouseenter", pause);
      el.addEventListener("mouseleave", resume);
      el.addEventListener("focusin", pause);
      el.addEventListener("focusout", resume);
    });

    var scene = new URLSearchParams(location.search).get("scene");
    var startIdx = tabs.findIndex(function (t) { return t.getAttribute("data-scene") === scene; });
    show(startIdx >= 0 ? startIdx : 0, false);

    if ("IntersectionObserver" in window) {
      var stageIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          inView = entry.isIntersecting;
          if (inView) arm(); else { clearTimeout(timer); tabs[current].classList.remove("is-running"); }
        });
      }, { threshold: 0.35 });
      stageIo.observe(stage || tabs[0]);
    } else {
      inView = true;
      arm();
    }
  }
})();
