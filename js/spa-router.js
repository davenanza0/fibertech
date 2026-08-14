(function () {
  "use strict";

  
  var ROUTES = [
    "/index.html",
    "/paginas/sobre-nos.html",
    "/paginas/servicos.html",
    "/paginas/solucoes.html",
    "/paginas/projectos.html",
    "/paginas/tecnologias.html",
    "/paginas/insights.html",
    "/paginas/contactos.html",
    "/paginas/privacy.html",
    "/paginas/terms.html"
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
    var freshStyle = newDoc.querySelector("style");
    var currentStyle = document.querySelector("style");
    if (freshStyle && currentStyle) {
      currentStyle.textContent = freshStyle.textContent;
    }
  }

  
  function swapBody(newDoc) {
    var newBody = newDoc.body.cloneNode(true);

    stripPreloader(newBody);

    var scriptEl = newBody.querySelector("script");
    var scriptText = "";
    if (scriptEl) {
      scriptText = scriptEl.textContent;
      scriptEl.parentNode.removeChild(scriptEl);
    }

    document.body.innerHTML = newBody.innerHTML;

    if (scriptText) {
      var injected = document.createElement("script");
      injected.textContent = "(function(){\n" + scriptText + "\n})();";
      document.body.appendChild(injected);
      injected.parentNode.removeChild(injected);
    }
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

  
  function renderPath(path, hash, pushToHistory, fullUrl) {
    if (isNavigating) return;
    isNavigating = true;

    fetchPage(path).then(function (html) {
      var parser = new DOMParser();
      var newDoc = parser.parseFromString(html, "text/html");

      updateHead(newDoc);
      swapStyle(newDoc);
      swapBody(newDoc);

      if (pushToHistory) {
        history.pushState({ spa: true, path: path }, "", fullUrl);
      }

      currentRenderedPath = path;
      scrollToTarget(hash);
      isNavigating = false;
    }).catch(function () {
      
      isNavigating = false;
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
})();


