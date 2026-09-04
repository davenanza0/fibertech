(function () {
  "use strict";

  /* PageScope: listeners de window/document devem usar PageScope.on()
     em vez de addEventListener directo, para o router os poder limpar
     (cleanup) antes de cada nova navegação — evita listeners acumulados. */
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

  // Para adicionar uma nova página: acrescentar o caminho aqui e criar
  // o ficheiro em /pages/, com o mesmo layout header/menu/footer das outras.
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
    // <- nova página: copiar e colar aqui, ex. "/pages/nova-pagina.html"
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

  
  /* Elementos [data-persist] (widget de idioma/WhatsApp, loader) sobrevivem à troca do body */
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

  /* Troca o body; devolve o script da página ainda por executar (ver renderPath) */
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

        // scroll TEM de ser reposto antes do script/reveal correrem
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


