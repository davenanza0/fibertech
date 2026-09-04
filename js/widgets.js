/* WIDGETS.JS — botões fixos (idioma + WhatsApp) no canto inferior direito,
   construídos uma vez e marcados [data-persist] para sobreviver à navegação SPA. */
(function () {
  "use strict";

  var WHATSAPP_MESSAGE = "Ol\u00e1 FiberTech, gostaria de saber mais sobre os vossos servi\u00e7os.";
  var WHATSAPP_URL = "https://wa.me/258866539417?text=" + encodeURIComponent(WHATSAPP_MESSAGE);
  var WHATSAPP_ARIA_KEY = "common.shared.27";
  var WHATSAPP_ARIA_FALLBACK = "Falar connosco no WhatsApp";

  function buildWidget() {
    if (document.getElementById("fw-widget-stack")) return;

    var stack = document.createElement("div");
    stack.id = "fw-widget-stack";
    stack.className = "fw-widget-stack";
    stack.setAttribute("data-persist", "true");

    stack.innerHTML =
      '<div class="fw-lang" id="fw-lang">' +
        '<button type="button" class="fw-lang-btn" id="fw-lang-btn" aria-haspopup="true" aria-expanded="false" aria-label="Selecionar idioma / Select language">' +
          '<span class="fw-lang-globe" aria-hidden="true">\uD83C\uDF10</span>' +
          '<span class="fw-lang-code" id="fw-lang-code">--</span>' +
        '</button>' +
        '<ul class="fw-lang-menu" id="fw-lang-menu" role="menu" hidden></ul>' +
      '</div>' +
      '<a class="fw-whatsapp" id="fw-whatsapp" href="' + WHATSAPP_URL + '" target="_blank" rel="noopener" data-i18n-attr="aria-label:' + WHATSAPP_ARIA_KEY + '" aria-label="' + WHATSAPP_ARIA_FALLBACK + '">' +
        '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">' +
          '<path d="M16.004 3C9.376 3 4 8.373 4 15c0 2.386.703 4.61 1.916 6.475L4 29l7.72-1.877A11.94 11.94 0 0016.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3zm0 21.7a9.66 9.66 0 01-4.928-1.35l-.354-.21-4.58 1.114 1.223-4.463-.23-.365A9.65 9.65 0 016.35 15c0-5.327 4.335-9.65 9.654-9.65 5.318 0 9.654 4.323 9.654 9.65 0 5.328-4.336 9.7-9.654 9.7zm5.29-7.234c-.29-.145-1.71-.844-1.976-.94-.265-.097-.458-.145-.65.145-.194.29-.746.94-.914 1.133-.168.194-.337.218-.626.073-.29-.146-1.223-.451-2.33-1.44-.861-.769-1.443-1.72-1.611-2.01-.169-.29-.018-.447.127-.591.13-.13.29-.339.435-.508.145-.169.193-.29.29-.484.097-.194.048-.363-.024-.508-.073-.145-.65-1.566-.89-2.145-.235-.564-.473-.488-.65-.497l-.554-.01c-.194 0-.508.073-.774.363-.265.29-1.014.99-1.014 2.41 0 1.421 1.038 2.795 1.183 2.988.145.194 2.043 3.12 4.949 4.375.692.299 1.232.478 1.653.611.694.221 1.326.19 1.826.115.557-.083 1.71-.699 1.951-1.373.242-.674.242-1.252.169-1.373-.073-.121-.266-.194-.556-.339z"></path>' +
        '</svg>' +
      '</a>';

    document.body.appendChild(stack);
    wireEvents(stack);
    renderMenu();
    if (window.I18N) window.I18N.applyToCurrentRoot(stack);
  }

  function wireEvents(stack) {
    var btn = document.getElementById("fw-lang-btn");
    var menu = document.getElementById("fw-lang-menu");
    if (!btn || !menu) return;

    function closeMenu() {
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }
    function openMenu() {
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.hidden) openMenu(); else closeMenu();
    });

    document.addEventListener("click", function (e) {
      if (!stack.contains(e.target)) closeMenu();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    // Fecha o menu ao navegar (evita menu aberto "pendurado" apos swap SPA)
    document.addEventListener("app:navigated", closeMenu);
  }

  function renderMenu() {
    var menu = document.getElementById("fw-lang-menu");
    var btnCode = document.getElementById("fw-lang-code");
    if (!menu || !btnCode || !window.I18N) return;

    var langs = window.I18N.getLanguages();
    if (!langs.length) return;
    var current = window.I18N.getCurrentLang();

    menu.innerHTML = "";
    langs.forEach(function (l) {
      var li = document.createElement("li");
      li.setAttribute("role", "none");

      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "menuitemradio");
      b.setAttribute("aria-checked", l.code === current ? "true" : "false");
      b.className = "fw-lang-option" + (l.code === current ? " is-active" : "");
      b.innerHTML =
        '<span class="fw-lang-option-flag" aria-hidden="true">' + l.flag + '</span>' +
        '<span>' + l.name + '</span>';

      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        window.I18N.setLanguage(l.code);
        menu.hidden = true;
        var btn = document.getElementById("fw-lang-btn");
        if (btn) btn.setAttribute("aria-expanded", "false");
      });

      li.appendChild(b);
      menu.appendChild(li);
    });

    if (current) btnCode.textContent = current.toUpperCase();
  }

  function ensure() {
    buildWidget();
    renderMenu();
  }

  document.addEventListener("DOMContentLoaded", ensure);
  document.addEventListener("app:navigated", ensure);
  document.addEventListener("i18n:applied", renderMenu);
  document.addEventListener("i18n:ready", renderMenu);
})();
