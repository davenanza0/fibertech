(function () {
  "use strict";

  /* -------- PageScope: registo de listeners globais do script de
     página --------
     Cada página injeta o seu próprio script (via runPageScript) a
     cada navegação. Scripts de página que precisem de anexar
     listeners a window/document (que sobrevivem à troca do body)
     devem usar PageScope.on(...) em vez de addEventListener
     diretamente. O router chama PageScope.cleanup() antes de correr
     o script de cada nova página, removendo os listeners que a
     página anterior tinha registado — sem isto, cada navegação
     acumularia mais um listener "morto" (memory leak). */
  window.PageScope = (function () {
    var registry = [];
    return {
      on: function (target, type, handler, opts) {
        target.addEventListener(type, handler, opts);
        registry.push({ target: target, type: type, handler: handler, opts: opts });
      },
      cleanup: function () {
        registry.forEach(function (r) {
          r.target.removeEventListener(r.type, r.handler, r.opts);
        });
        registry = [];
      }
    };
  })();

  var ROUTES = [
    "/index.html",
    "/pages/sobre-nos.html",
    "/pages/servicos.html",
    "/pages/solucoes.html",
    "/pages/projectos.html",
    "/pages/tecnologias.html",
    "/pages/insights.html",
    "/pages/contactos.html",
    "/pages/privacy.html",
    "/pages/terms.html"
  ];

  function normalizePath(pathname) {
    if (pathname === "/" || pathname === "") return "/index.html";
    return pathname;
  }

  function isKnownRoute(pathname) {
    return ROUTES.indexOf(normalizePath(pathname)) !== -1;
  }

  
  var isNavigating = false;
  var cache = Object.create(null); // path -> texto HTML (evita re-fetch em back/forward)
  var scriptCache = Object.create(null); // src -> texto JS (evita re-fetch do script da página)

  
  var currentRenderedPath = normalizePath(window.location.pathname);

  

  
  function stripPreloader(bodyEl) {
    var preloader = bodyEl.querySelector("#preloader");
    if (preloader) preloader.parentNode.removeChild(preloader);
  }

  
  function updateHead(newDoc) {
    if (newDoc.title) document.title = newDoc.title;

    var metaSelectors = [
      'meta[name="description"]',
      'meta[name="keywords"]',
      'link[rel="canonical"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:url"]',
      'meta[property="og:image"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]',
      'meta[name="twitter:image"]'
    ];

    metaSelectors.forEach(function (sel) {
      var fresh = newDoc.querySelector(sel);
      var current = document.querySelector(sel);
      if (!fresh || !current) return;
      if (current.tagName === "LINK") {
        current.setAttribute("href", fresh.getAttribute("href") || "");
      } else {
        current.setAttribute("content", fresh.getAttribute("content") || "");
      }
    });
  }

  
  function swapStyle(newDoc) {
    var freshLink = newDoc.querySelector("#page-style");
    var currentLink = document.querySelector("#page-style");
    if (freshLink && currentLink) {
      var freshHref = freshLink.getAttribute("href");
      if (freshHref && currentLink.getAttribute("href") !== freshHref) {
        currentLink.setAttribute("href", freshHref);
      }
    }
  }

  
  /* -------- Elementos persistentes (sobrevivem à troca do body) --------
     swapBody normalmente substitui todo o body.innerHTML. Isso apaga
     elementos que precisam de sobreviver à navegação SPA (o widget
     fixo de idioma/WhatsApp e o overlay de loading de rota). Qualquer
     elemento marcado com [data-persist] é desanexado antes da troca
     e reanexado depois, sem nunca ser destruído. */
  function detachPersistentElements() {
    var nodes = document.body.querySelectorAll("[data-persist]");
    return Array.prototype.slice.call(nodes).map(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
      return el;
    });
  }

  function reattachPersistentElements(elements) {
    elements.forEach(function (el) { document.body.appendChild(el); });
  }

  function syncBodyAttrs(newBody) {
    // swapBody only replaces innerHTML, so attributes on <body> itself
    // (e.g. data-page, used by other scripts to know the active page)
    // must be synced separately.
    var attrs = newBody.attributes;
    var seen = {};
    for (var i = 0; i < attrs.length; i++) {
      document.body.setAttribute(attrs[i].name, attrs[i].value);
      seen[attrs[i].name] = true;
    }
    var current = document.body.attributes;
    for (var j = current.length - 1; j >= 0; j--) {
      if (!seen[current[j].name]) document.body.removeAttribute(current[j].name);
    }
  }

  /* Troca o conteúdo do body e devolve o texto do script da página,
     SEM o executar ainda. Isso permite ao chamador repor o scroll
     antes de qualquer script (e antes do IntersectionObserver do
     sistema de reveal) correr — ver renderPath. O texto do script
     em si já foi obtido antecipadamente via fetchScript(), pois as
     páginas referenciam o seu script através de src="" (externo). */
  function swapBody(newDoc, externalScriptText) {
    var newBody = newDoc.body.cloneNode(true);

    syncBodyAttrs(newBody);
    stripPreloader(newBody);

    // remove duplicatas de elementos persistentes vindos do HTML buscado
    var dupes = newBody.querySelectorAll("[data-persist]");
    for (var d = 0; d < dupes.length; d++) {
      if (dupes[d].parentNode) dupes[d].parentNode.removeChild(dupes[d]);
    }

    var scriptEl = newBody.querySelector("script");
    var scriptText = externalScriptText || "";
    if (scriptEl) {
      scriptText = scriptText || scriptEl.textContent;
      scriptEl.parentNode.removeChild(scriptEl);
    }

    var persisted = detachPersistentElements();
    document.body.innerHTML = newBody.innerHTML;
    reattachPersistentElements(persisted);

    return scriptText;
  }

  function runPageScript(scriptText) {
    if (window.PageScope) window.PageScope.cleanup();
    if (!scriptText) return;
    var injected = document.createElement("script");
    injected.textContent = "(function(){\n" + scriptText + "\n})();";
    document.body.appendChild(injected);
    injected.parentNode.removeChild(injected);
  }

  function scrollToTarget(hash) {
    if (hash) {
      var id = decodeURIComponent(hash.replace("#", ""));
      var el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }

  
  function fetchPage(path) {
    if (cache[path]) return Promise.resolve(cache[path]);
    return fetch(path, { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) throw new Error("Falha ao carregar " + path);
      return res.text();
    }).then(function (html) {
      cache[path] = html;
      return html;
    });
  }

  
  function fetchScript(src) {
    if (scriptCache[src]) return Promise.resolve(scriptCache[src]);
    return fetch(src, { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) throw new Error("Falha ao carregar " + src);
      return res.text();
    }).then(function (text) {
      scriptCache[src] = text;
      return text;
    });
  }

  
  function renderPath(path, hash, pushToHistory, fullUrl) {
    if (isNavigating) return;
    isNavigating = true;

    var wasCached = !!cache[path];
    if (!wasCached && window.PageLoader) window.PageLoader.showRouteLoading();

    fetchPage(path).then(function (html) {
      var parser = new DOMParser();
      var newDoc = parser.parseFromString(html, "text/html");

      var scriptEl = newDoc.body ? newDoc.body.querySelector("script") : null;
      var scriptSrc = scriptEl ? (scriptEl.getAttribute("src") || "") : "";
      var scriptPromise = scriptSrc ? fetchScript(scriptSrc) : Promise.resolve("");

      return scriptPromise.then(function (scriptText) {
        updateHead(newDoc);
        swapStyle(newDoc);
        var finalScriptText = swapBody(newDoc, scriptText);

        if (pushToHistory) {
          history.pushState({ spa: true, path: path }, "", fullUrl);
        }

        currentRenderedPath = path;

        // O scroll TEM de ser reposto antes do script da página (e do
        // sistema de reveal) correr — caso contrário o IntersectionObserver
        // arranca com o scroll ainda na posição da página anterior e
        // marca secções como visíveis prematuramente (ver spa-router
        // + reveal.js). Ver análise no cabeçalho do ficheiro.
        scrollToTarget(hash);
        runPageScript(finalScriptText);

        isNavigating = false;

        if (!wasCached && window.PageLoader) window.PageLoader.hideRouteLoading();
        document.dispatchEvent(new CustomEvent("app:navigated", { detail: { path: path } }));
      });
    }).catch(function () {
      
      isNavigating = false;
      if (!wasCached && window.PageLoader) window.PageLoader.hideRouteLoading();
      window.location.href = fullUrl;
    });
  }

  function goTo(url, pushToHistory) {
    var target;
    try {
      target = new URL(url, window.location.href);
    } catch (e) {
      return;
    }

    if (target.origin !== window.location.origin) {
      window.location.href = url;
      return;
    }

    var path = normalizePath(target.pathname);
    if (!isKnownRoute(path)) {
      window.location.href = url;
      return;
    }

    
    if (path === currentRenderedPath) {
      if (pushToHistory) {
        history.pushState({ spa: true, path: path }, "", target.href);
      }
      scrollToTarget(target.hash);
      return;
    }

    renderPath(path, target.hash, pushToHistory, target.href);
  }

  
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return; // apenas clique principal
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var link = e.target.closest ? e.target.closest("a[href]") : null;
    if (!link) return;

    var href = link.getAttribute("href");
    if (!href) return;
    if (href.charAt(0) === "#") return; // âncora pura na própria página
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
    if (link.target && link.target !== "" && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    var url;
    try {
      url = new URL(href, window.location.href);
    } catch (err) {
      return;
    }
    if (url.origin !== window.location.origin) return;
    if (!isKnownRoute(url.pathname)) return;

    e.preventDefault();
    goTo(url.href, true);
  });

  
  window.addEventListener("popstate", function () {
    goTo(window.location.href, false);
  });

  
  history.replaceState({ spa: true, path: normalizePath(window.location.pathname) }, "", window.location.href);

  /* -------- API exposta para pre-carregamento em segundo plano -------- */
  function prefetch(path) {
    path = normalizePath(path);
    return fetchPage(path).then(function (html) {
      var parser = new DOMParser();
      var newDoc = parser.parseFromString(html, "text/html");
      var scriptEl = newDoc.body ? newDoc.body.querySelector("script") : null;
      var scriptSrc = scriptEl ? (scriptEl.getAttribute("src") || "") : "";
      if (scriptSrc) return fetchScript(scriptSrc);
      return null;
    });
  }

  window.SPA_ROUTER = {
    routes: ROUTES.slice(),
    isCached: function (path) { return !!cache[normalizePath(path)]; },
    prefetch: prefetch,
    currentPath: function () { return currentRenderedPath; }
  };
})();


