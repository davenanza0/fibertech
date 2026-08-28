/* =========================================================
   REVEAL.JS
   Sistema centralizado de animações de entrada/saída (Reveal In /
   Reveal Out) baseado em IntersectionObserver, partilhado por
   todas as páginas (substitui os 10 blocos de observer duplicados
   que existiam em cada js/<pagina>.js).

   Reveal In (comportamento por omissão, para qualquer .reveal):
     - o elemento aparece suavemente quando entra na viewport;
     - deixa de ser observado depois de revelado (não repete).

   Reveal Out (opt-in, apenas para .reveal[data-reveal-repeat]):
     - quando o elemento sai da viewport, a classe é removida;
     - ao reentrar, revela novamente.
     - fica de fora por omissão para não alterar o comportamento
       visual já existente em nenhuma página.

   Corrige o problema de "salto" entre páginas: o router (spa-router.js)
   repõe o scroll para o topo (ou para o alvo do hash) ANTES de correr
   o script de cada página e ANTES deste módulo voltar a observar os
   elementos — por isso o IntersectionObserver nunca é inicializado
   com o scroll ainda na posição da página anterior, e as secções só
   são reveladas quando realmente entram na viewport.
   ========================================================= */
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
