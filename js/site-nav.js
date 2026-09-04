/* SITE-NAV.JS — cabeçalho, menu móvel, scroll do header e ano no rodapé,
   centralizados aqui (corre uma vez; ver "boundOnce") para não duplicar
   listeners de window/document a cada navegação SPA. */
(function () {
  "use strict";

  var boundOnce = false;
  var lastOpenScrollY = 0;

  function els() {
    return {
      header: document.getElementById("header"),
      burger: document.getElementById("burger"),
      menu: document.getElementById("menu"),
      overlay: document.getElementById("overlay"),
      closeBtn: document.getElementById("menuClose")
    };
  }

  function openMenu(r) {
    lastOpenScrollY = window.scrollY;
    var gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.position = "fixed";
    document.body.style.top = "-" + lastOpenScrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = gap + "px";

    r.overlay.hidden = false;
    requestAnimationFrame(function () { r.overlay.classList.add("is-open"); });
    r.menu.classList.add("is-open");
    r.menu.setAttribute("aria-hidden", "false");
    r.burger.setAttribute("aria-expanded", "true");
    r.closeBtn.focus();
  }

  function closeMenu(r, skipScrollRestore) {
    r.overlay.classList.remove("is-open");
    r.menu.classList.remove("is-open");
    r.menu.setAttribute("aria-hidden", "true");
    r.burger.setAttribute("aria-expanded", "false");

    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";

    if (!skipScrollRestore) {
      window.scrollTo({ top: lastOpenScrollY, left: 0, behavior: "instant" });
    }

    window.setTimeout(function () {
      if (!r.menu.classList.contains("is-open")) r.overlay.hidden = true;
    }, 350);
    r.burger.focus();
  }

  function isMenuOpen() {
    var menu = document.getElementById("menu");
    return !!(menu && menu.classList.contains("is-open"));
  }

  function wireMenuControls() {
    var r = els();
    if (!r.header || !r.burger || !r.menu || !r.overlay || !r.closeBtn) return;

    r.burger.addEventListener("click", function () {
      if (r.menu.classList.contains("is-open")) closeMenu(r); else openMenu(r);
    });
    r.closeBtn.addEventListener("click", function () { closeMenu(r); });
    r.overlay.addEventListener("click", function () { closeMenu(r); });

    var links = r.menu.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function () { closeMenu(r, true); });
    }

    onScroll();
  }

  function onScroll() {
    var header = document.getElementById("header");
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 40);
  }

  function updateFooterYear() {
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  function bindGlobalListenersOnce() {
    if (boundOnce) return;
    boundOnce = true;

    window.addEventListener("scroll", onScroll, { passive: true });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!isMenuOpen()) return;
      closeMenu(els());
    });
  }

  function init() {
    bindGlobalListenersOnce();
    wireMenuControls();
    updateFooterYear();
  }

  window.SiteNav = { isMenuOpen: isMenuOpen };

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("app:navigated", init);
})();
