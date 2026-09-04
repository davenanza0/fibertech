/* REVEAL.JS — animações de entrada/saída (.reveal) via IntersectionObserver, partilhado por todas as páginas.
   Reveal In (omissão): revela ao entrar na viewport, uma só vez.
   Reveal Out (opt-in, [data-reveal-repeat]): esconde ao sair, revela de novo ao reentrar. */
(function () {
  "use strict";

  var io = null;

  function siblingStagger(el) {
    var parent = el.parentElement;
    if (!parent) return 0;
    var group = Array.prototype.filter.call(parent.children, function (c) {
      return c.classList && c.classList.contains("reveal");
    });
    if (group.length <= 1) return 0;
    return Math.min(group.indexOf(el), 5) * 90;
  }

  function onIntersect(entries) {
    entries.forEach(function (entry) {
      var el = entry.target;
      var repeats = el.hasAttribute("data-reveal-repeat");

      if (entry.isIntersecting) {
        var stagger = siblingStagger(el);
        el.style.transitionDelay = stagger ? stagger + "ms" : "";
        el.classList.add("is-visible");
        if (!repeats) io.unobserve(el);
      } else if (repeats) {
        // Reveal Out: só para elementos explicitamente marcados,
        // evitando qualquer flicker ou re-animação em conteúdo comum.
        el.classList.remove("is-visible");
      }
    });
  }

  function init(root) {
    root = root || document;

    if (io) io.disconnect();
    io = new IntersectionObserver(onIntersect, { threshold: 0.12 });

    var elements = root.querySelectorAll(".reveal");
    for (var i = 0; i < elements.length; i++) io.observe(elements[i]);
  }

  window.Reveal = { init: init };

  document.addEventListener("DOMContentLoaded", function () { init(document); });

  /* Reaplicado depois de cada navegação SPA. Nesse momento o scroll
     já foi reposto pelo router (ver spa-router.js), pelo que o estado
     inicial de intersecção reflecte corretamente a nova página. */
  document.addEventListener("app:navigated", function () { init(document); });
})();
