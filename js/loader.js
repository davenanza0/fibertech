/* LOADER.JS — preloader inicial + loading do spa-router + prefetch em segundo plano */
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

  /* Garante um mínimo de 1s de ecrã de loading, para não "piscar" */
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

  /* Preloader some no DOM pronto, sem esperar imagens/fontes */
  if (document.readyState === "interactive" || document.readyState === "complete") {
    hideInitialPreloader();
  } else {
    document.addEventListener("DOMContentLoaded", hideInitialPreloader);
  }

  /* -------- Pre-carregamento em segundo plano -------- */
  function idle(fn, timeout) {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(fn, { timeout: timeout || 2000 });
    } else {
      window.setTimeout(fn, 300);
    }
  }

  /* Detecta conexões lentas / "poupar dados", para desativar o prefetch */
  function isSlowConnection() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return false;
    if (conn.saveData) return true;
    if (conn.effectiveType && /(^|-)2g/.test(conn.effectiveType)) return true;
    return false;
  }

  /* Prefetch: no máx. 3 páginas mais prováveis, em tempo ocioso, nunca em conexão lenta */
  var MAX_PREFETCH_PAGES = 3;

  function likelyNextRoutes(currentPath) {
    var priority = [
      "/pages/servicos.html",
      "/pages/solucoes.html",
      "/pages/sobre-nos.html",
      "/pages/projectos.html",
      "/pages/tecnologias.html",
      "/pages/contactos.html",
      "/pages/insights.html",
      "/index.html"
    ];
    return priority.filter(function (p) { return p !== currentPath; });
  }

  function prefetchRemainingPages() {
    var router = window.SPA_ROUTER;
    if (!router || !router.routes || !router.prefetch) return;
    if (isSlowConnection()) return;

    var currentPath = router.currentPath ? router.currentPath() : window.location.pathname;
    var queue = likelyNextRoutes(currentPath).slice(0, MAX_PREFETCH_PAGES);

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
    idle(prefetchRemainingPages, 4000); // só depois da página actual estar pronta
  }

  if (document.readyState === "complete") {
    window.setTimeout(startPrefetch, 1200);
  } else {
    window.addEventListener("load", function () {
      window.setTimeout(startPrefetch, 1200);
    });
  }
})();
