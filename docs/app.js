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
    var title = s.brand + " — Telegram-бот для щоденного харчування";
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

  /* One persistent header keeps the main action within reach. */
  var header = document.getElementById("header");
  var onScroll = function () {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  /* Each demo group changes only when chosen, with full keyboard navigation. */
  var groups = Array.prototype.slice.call(document.querySelectorAll(".tabs")).map(function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll(".tab[data-scene]"));
    var scenes = tabs.map(function (tab) { return document.getElementById(tab.getAttribute("aria-controls")); });
    return { box: box, tabs: tabs, scenes: scenes };
  }).filter(function (group) {
    return group.tabs.length > 0 && group.scenes.every(function (scene) { return !!scene; });
  });
  var showIn = function (group, index) {
    var current = (index + group.tabs.length) % group.tabs.length;
    group.tabs.forEach(function (tab, i) {
      var active = i === current;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.setAttribute("tabindex", active ? "0" : "-1");
    });
    group.scenes.forEach(function (scene, i) {
      var active = i === current;
      scene.classList.toggle("is-active", active);
      scene.hidden = !active;
    });
    return current;
  };
  groups.forEach(function (group) {
    group.tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { showIn(group, i); });
      tab.addEventListener("keydown", function (event) {
        var index;
        switch (event.key) {
          case "ArrowRight": case "ArrowDown": index = i + 1; break;
          case "ArrowLeft": case "ArrowUp": index = i - 1; break;
          case "Home": index = 0; break;
          case "End": index = group.tabs.length - 1; break;
          default: return;
        }
        event.preventDefault();
        var current = showIn(group, index);
        group.tabs[current].focus();
      });
    });
  });
  var requestedScene = new URLSearchParams(location.search).get("scene");
  groups.forEach(function (group) {
    var startIndex = group.tabs.findIndex(function (tab) { return tab.getAttribute("data-scene") === requestedScene; });
    showIn(group, startIndex < 0 ? 0 : startIndex);
  });
})();
