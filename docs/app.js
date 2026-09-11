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
    var title = s.brand + " — (не) ще один щоденник калорій";
    document.title = title;
    [
      ['meta[property="og:title"]', title],
      ['meta[property="og:site_name"]', s.brandLong],
      ['meta[property="og:url"]', abs("")],
      ['meta[property="og:image"]', abs("brand/social-cover.jpg")],
      ['meta[name="twitter:title"]', title],
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

  /* Keep the mobile action out of the way while another primary action is visible. */
  var header = document.getElementById("header");
  var mobileCta = document.querySelector(".mobile-cta");
  var hero = document.querySelector(".hero");
  var finalCta = document.querySelector(".cta-final");
  var onScroll = function () {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    if (mobileCta) {
      var afterHero = hero ? hero.getBoundingClientRect().bottom < 0 : window.scrollY > 400;
      var beforeFinal = !finalCta || finalCta.getBoundingClientRect().top > window.innerHeight;
      mobileCta.classList.toggle("is-shown", afterHero && beforeFinal);
    }
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  /* Tabs change only when chosen, with full keyboard navigation. */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab[data-scene]"));
  var scenes = Array.prototype.slice.call(document.querySelectorAll(".scene"));
  if (tabs.length && scenes.length) {
    var current = 0;
    var show = function (index) {
      current = (index + tabs.length) % tabs.length;
      tabs.forEach(function (tab, i) {
        var active = i === current;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.setAttribute("tabindex", active ? "0" : "-1");
      });
      scenes.forEach(function (scene, i) {
        var active = i === current;
        scene.classList.toggle("is-active", active);
        scene.hidden = !active;
      });
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { show(i); });
      tab.addEventListener("keydown", function (event) {
        var index;
        switch (event.key) {
          case "ArrowRight": case "ArrowDown": index = i + 1; break;
          case "ArrowLeft": case "ArrowUp": index = i - 1; break;
          case "Home": index = 0; break;
          case "End": index = tabs.length - 1; break;
          default: return;
        }
        event.preventDefault();
        show(index);
        tabs[current].focus();
      });
    });
    var requestedScene = new URLSearchParams(location.search).get("scene");
    var startIndex = tabs.findIndex(function (tab) { return tab.getAttribute("data-scene") === requestedScene; });
    show(startIndex < 0 ? 0 : startIndex);
  }
})();
