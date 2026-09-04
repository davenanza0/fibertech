/* I18N.JS — Sistema de idiomas (JSON em /translations/).
   Prioridade automática: geolocalização já autorizada > IP > idioma
   do browser > EN. Escolha manual (localStorage) tem sempre prioridade. */
(function () {
  "use strict";

  var STORAGE_KEY = "fibertech_lang";
  var FALLBACK_LANG = "en";
  var MANIFEST_URL = "/translations/manifest.json";
  var LANG_FILE_URL = function (code) { return "/translations/" + code + ".json"; };

  var translationsData = null; // { code: { name, flag, translations } } montado a partir dos ficheiros individuais
  var currentLang = null;
  var readyPromise = null;

  /* ---- deteccao por regiao geografica (heuristica leve, offline,
     sem qualquer chamada de rede/API paga) ---- */
  var GEO_HINTS = [
    { lang: "pt", boxes: [
      [-26.9, -10.3, 30.1, 40.9],   // Mocambique (aprox.)
      [-33.8, 5.3, -74.0, -34.7],   // Brasil (aprox.)
      [36.9, 42.2, -9.6, -6.1],     // Portugal (aprox.)
      [-18.1, -4.3, 11.6, 24.1]     // Angola (aprox.)
    ]},
    { lang: "es", boxes: [
      [35.9, 43.9, -9.4, 4.4],      // Espanha (aprox.)
      [-56.0, -21.7, -75.8, -53.0], // Argentina (aprox.)
      [14.3, 32.8, -118.5, -86.4]   // Mexico (aprox.)
    ]}
  ];

  function pointInBox(lat, lon, box) {
    return lat >= box[0] && lat <= box[1] && lon >= box[2] && lon <= box[3];
  }

  function langFromCoords(lat, lon, supported) {
    for (var i = 0; i < GEO_HINTS.length; i++) {
      var entry = GEO_HINTS[i];
      if (!supported[entry.lang]) continue;
      for (var j = 0; j < entry.boxes.length; j++) {
        if (pointInBox(lat, lon, entry.boxes[j])) return entry.lang;
      }
    }
    return null;
  }

  function normalizeLang(tag) {
    if (!tag) return null;
    return String(tag).split("-")[0].toLowerCase();
  }

  function getSavedLang() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function saveLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* noop */ }
  }

  function supportedMap() {
    var map = {};
    if (translationsData) {
      Object.keys(translationsData).forEach(function (k) { map[k] = true; });
    }
    return map;
  }

  /* ---- PRIORIDADE 1: localizacao ja autorizada ----
     So resolve algo se a permissao "geolocation" ja estiver no
     estado "granted" (nunca chama requestPermission/getCurrentPosition
     as cegas — isso mostraria um popup só por causa do idioma, o que
     é explicitamente proibido). Resolve null quando nao ha permissao,
     quando a API nao existe, ou em caso de erro/timeout — nunca falha
     de forma nao tratada. */
  function tryAuthorizedGeolocation() {
    return new Promise(function (resolve) {
      if (!("permissions" in navigator) || !navigator.permissions || !navigator.permissions.query || !("geolocation" in navigator)) {
        resolve(null);
        return;
      }
      navigator.permissions.query({ name: "geolocation" }).then(function (status) {
        if (!status || status.state !== "granted") { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            resolve(langFromCoords(pos.coords.latitude, pos.coords.longitude, { pt: true, es: true }));
          },
          function () { resolve(null); },
          { maximumAge: 3600000, timeout: 1200 }
        );
      }).catch(function () { resolve(null); });
    });
  }

  /* ---- PRIORIDADE 2: regiao obtida pela Internet (IP) ----
     Chamada leve a um serviço público de geolocalização por IP, com
     timeout curto (AbortController) para nunca bloquear a página à
     espera da resposta — se demorar ou falhar, segue para a
     prioridade seguinte sem qualquer impacto na experiência. */
  var COUNTRY_LANG_MAP = {
    // Países lusófonos
    MZ: "pt", PT: "pt", BR: "pt", AO: "pt", CV: "pt", GW: "pt", ST: "pt", TL: "pt",
    // Países hispanófonos
    ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es",
    GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es", SV: "es", NI: "es",
    CR: "es", PA: "es", UY: "es", GQ: "es"
  };

  function tryIpRegion(timeoutMs) {
    return new Promise(function (resolve) {
      if (typeof fetch !== "function") { resolve(null); return; }
      var controller = (typeof AbortController === "function") ? new AbortController() : null;
      var timer = window.setTimeout(function () {
        if (controller) controller.abort();
        resolve(null);
      }, timeoutMs);

      fetch("https://ipapi.co/json/", { signal: controller ? controller.signal : undefined })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          window.clearTimeout(timer);
          var code = data && data.country_code ? String(data.country_code).toUpperCase() : null;
          resolve(code && COUNTRY_LANG_MAP[code] ? COUNTRY_LANG_MAP[code] : null);
        })
        .catch(function () {
          window.clearTimeout(timer);
          resolve(null);
        });
    });
  }

  /* ---- PRIORIDADE 3 + fallback: idioma do browser / EN ---- */
  function browserLangCandidate() {
    var browserTag = (navigator.languages && navigator.languages[0]) || navigator.language;
    return normalizeLang(browserTag);
  }

  /* Lista de candidatos por ordem de prioridade: [geo?, ip?, browser?, EN] */
  function detectCandidates() {
    return tryAuthorizedGeolocation().then(function (geoLang) {
      if (geoLang) return [geoLang, browserLangCandidate(), FALLBACK_LANG];
      return tryIpRegion(900).then(function (ipLang) {
        var list = [];
        if (ipLang) list.push(ipLang);
        var b = browserLangCandidate();
        if (b) list.push(b);
        list.push(FALLBACK_LANG);
        return list;
      });
    }).catch(function () {
      var b = browserLangCandidate();
      return b ? [b, FALLBACK_LANG] : [FALLBACK_LANG];
    });
  }

  /* Limite de tempo da deteccao automatica; passado isto, cai para browser/EN */
  function withTimeout(promise, ms, fallbackValue) {
    return new Promise(function (resolve) {
      var done = false;
      var t = window.setTimeout(function () {
        if (!done) { done = true; resolve(fallbackValue); }
      }, ms);
      promise.then(function (v) {
        if (!done) { done = true; window.clearTimeout(t); resolve(v); }
      }, function () {
        if (!done) { done = true; window.clearTimeout(t); resolve(fallbackValue); }
      });
    });
  }

  function pickFirstSupported(candidates, supported) {
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] && supported[candidates[i]]) return candidates[i];
    }
    return null;
  }

  function setHtmlLangAttr(lang) {
    var map = { pt: "pt-MZ", en: "en", es: "es" };
    document.documentElement.setAttribute("lang", map[lang] || lang);
  }

  function dictFor(lang) {
    return (translationsData && translationsData[lang] && translationsData[lang].translations) || {};
  }

  function applyToRoot(root, lang) {
    var dict = dictFor(lang);

    var nodes = root.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute("data-i18n");
      var val = dict[key];
      if (val === undefined) continue; // sem tradução: mantém o texto PT já presente (fallback gracioso)
      if (el.tagName === "TITLE") {
        document.title = val;
      } else {
        el.textContent = val;
      }
    }

    var attrNodes = root.querySelectorAll("[data-i18n-attr]");
    for (var j = 0; j < attrNodes.length; j++) {
      var aEl = attrNodes[j];
      var spec = aEl.getAttribute("data-i18n-attr") || "";
      var pairs = spec.split(",");
      for (var k = 0; k < pairs.length; k++) {
        var pair = pairs[k];
        var idx = pair.indexOf(":");
        if (idx === -1) continue;
        var attrName = pair.slice(0, idx);
        var attrKey = pair.slice(idx + 1);
        var attrVal = dict[attrKey];
        if (attrVal === undefined) continue;
        aEl.setAttribute(attrName, attrVal);
      }
    }
  }

  function applyAll(lang) {
    if (!translationsData || !translationsData[lang]) return;
    currentLang = lang;
    setHtmlLangAttr(lang);
    applyToRoot(document, lang);
    document.dispatchEvent(new CustomEvent("i18n:applied", { detail: { lang: lang } }));
  }

  function setLanguage(lang, manual) {
    if (!translationsData || !translationsData[lang]) return;
    if (manual) saveLang(lang);
    applyAll(lang);
  }

  function loadTranslations() {
    if (readyPromise) return readyPromise;
    readyPromise = fetch(MANIFEST_URL, { credentials: "same-origin" })
      .then(function (res) { return res.json(); })
      .then(function (codes) {
        return Promise.all(codes.map(function (code) {
          return fetch(LANG_FILE_URL(code), { credentials: "same-origin" })
            .then(function (res) { return res.json(); })
            .then(function (payload) { return { code: code, payload: payload }; });
        }));
      })
      .then(function (results) {
        var data = {};
        results.forEach(function (r) { data[r.code] = r.payload; });
        translationsData = data;
        return data;
      });
    return readyPromise;
  }

  function init() {
    var translationsPromise = loadTranslations();
    var saved = getSavedLang();

    /* Escolha manual guardada tem sempre prioridade */
    if (saved) {
      translationsPromise.then(function () {
        var supported = supportedMap();
        var lang = supported[saved] ? saved : (pickFirstSupported([browserLangCandidate(), FALLBACK_LANG], supported) || FALLBACK_LANG);
        applyAll(lang);
        window.dispatchEvent(new CustomEvent("i18n:ready", { detail: { lang: currentLang } }));
      }).catch(function () { /* mantém PT já presente no HTML */ });
      return;
    }

    /* Deteccao automatica corre em paralelo as traducoes; UMA so chamada a applyAll() */
    var detectionPromise = withTimeout(detectCandidates(), 1500, null).then(function (candidates) {
      return candidates || (function () {
        var b = browserLangCandidate();
        return b ? [b, FALLBACK_LANG] : [FALLBACK_LANG];
      })();
    });

    Promise.all([translationsPromise, detectionPromise]).then(function (results) {
      // Escolha manual entretanto feita ganha sempre
      var justSaved = getSavedLang();
      var supported = supportedMap();
      if (justSaved && supported[justSaved]) {
        applyAll(justSaved);
      } else {
        var lang = pickFirstSupported(results[1], supported) || FALLBACK_LANG;
        applyAll(lang);
      }
      window.dispatchEvent(new CustomEvent("i18n:ready", { detail: { lang: currentLang } }));
    }).catch(function () {
      /* Se a tradução falhar ao carregar, o site continua no idioma
         PT que já está presente no HTML. */
    });
  }

  window.I18N = {
    init: init,
    setLanguage: function (lang) { setLanguage(lang, true); },
    getCurrentLang: function () { return currentLang; },
    getLanguages: function () {
      if (!translationsData) return [];
      return Object.keys(translationsData).map(function (code) {
        return {
          code: code,
          name: translationsData[code].name,
          flag: translationsData[code].flag
        };
      });
    },
    applyToCurrentRoot: function (root) {
      if (translationsData && currentLang) applyToRoot(root || document, currentLang);
    },
    /* Traduz uma chave para o idioma actual (usado por outros scripts, ex. contactos.js) */
    t: function (key) {
      var dict = dictFor(currentLang);
      if (dict && dict[key] != null) return dict[key];
      var en = dictFor("en");
      if (en && en[key] != null) return en[key];
      return key;
    }
  };

  document.addEventListener("DOMContentLoaded", init);

  /* Reaplica a traducao apos cada navegacao SPA, pois a pagina
     recem-carregada chega com o HTML base em PT. */
  document.addEventListener("app:navigated", function () {
    if (translationsData && currentLang) applyAll(currentLang);
  });
})();
