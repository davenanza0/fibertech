/* =========================================================
   LOADER.JS
   - Esconde o preloader inicial (fundo branco + spinner) apenas
     quando a pagina estiver 100% pronta (evita qualquer flash de
     conteudo incompleto).
   - Expoe uma API para o spa-router mostrar/ocultar o mesmo
     ecrã de carregamento SOMENTE quando a pagina de destino ainda
     nao tiver sido preparada/pre-carregada.
   - Faz o pre-carregamento em segundo plano das restantes paginas,
     sem bloquear a pagina actual, para que a navegacao seguinte
     seja praticamente instantanea.
   ========================================================= */
(function () {
  "use strict";

  var MIN_LOADING_MS = 1000;
  var routeLoaderEl = null;
  var loaderShownAt = null;

  function hideInitialPreloader() {
    var el = document.getElementById("preloader");
    if (!el) return;
    el.classList.add("is-hidden");
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  }

  function ensureRouteLoader() {
    if (routeLoaderEl && document.body.contains(routeLoaderEl)) return routeLoaderEl;
    routeLoaderEl = document.createElement("div");
    routeLoaderEl.className = "fw-route-loader";
    routeLoaderEl.setAttribute("aria-hidden", "true");
    routeLoaderEl.setAttribute("data-persist", "true"); // sobrevive a um eventual swapBody enquanto visível
    routeLoaderEl.innerHTML = '<div class="fw-spinner"></div>';
    document.body.appendChild(routeLoaderEl);
    return routeLoaderEl;
  }

  function showRouteLoading() {
    var el = ensureRouteLoader();
    el.style.display = "flex";
    loaderShownAt = Date.now();
  }

  function removeLoaderNow() {
    if (routeLoaderEl && routeLoaderEl.parentNode) {
      routeLoaderEl.parentNode.removeChild(routeLoaderEl);
    }
    routeLoaderEl = null;
    loaderShownAt = null;
  }

  /* Garante um mínimo de 1 segundo de exibição sempre que o loading
     tiver sido efectivamente mostrado — mesmo que a página já esteja
     pronta muito antes disso. O conteúdo novo já foi trocado no DOM
     nessa altura (ver spa-router), mas continua coberto pelo overlay
     branco opaco até este prazo mínimo terminar. */
  function hideRouteLoading() {
    if (!routeLoaderEl) return;
    var elapsed = loaderShownAt ? Date.now() - loaderShownAt : MIN_LOADING_MS;
    var remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    if (remaining <= 0) {
      removeLoaderNow();
    } else {
      window.setTimeout(removeLoaderNow, remaining);
    }
  }

  window.PageLoader = {
    showRouteLoading: showRouteLoading,
    hideRouteLoading: hideRouteLoading
  };

  /* Esconde o preloader inicial apenas quando a janela estiver
     totalmente carregada (imagens, fontes, etc.) — nunca antes. */
  if (document.readyState === "complete") {
    hideInitialPreloader();
  } else {
    window.addEventListener("load", hideInitialPreloader);
  }

  /* -------- Pre-carregamento em segundo plano -------- */
  function idle(fn) {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(fn, { timeout: 2000 });
    } else {
      window.setTimeout(fn, 300);
    }
  }

  function prefetchRemainingPages() {
    var router = window.SPA_ROUTER;
    if (!router || !router.routes || !router.prefetch) return;

    var currentPath = router.currentPath ? router.currentPath() : window.location.pathname;
    var queue = router.routes.filter(function (r) { return r !== currentPath; });

    function next() {
      if (!queue.length) return;
      var path = queue.shift();
      if (router.isCached(path)) {
        idle(next);
        return;
      }
      router.prefetch(path).then(function () {
        idle(next);
      }).catch(function () {
        idle(next);
      });
    }

    idle(next);
  }

  function startPrefetch() {
    idle(prefetchRemainingPages);
  }

  if (document.readyState === "complete") {
    startPrefetch();
  } else {
    window.addEventListener("load", startPrefetch);
  }
})();
