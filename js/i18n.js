/* =========================================================
   I18N.JS
   Sistema de idiomas centralizado, orientado por JSON
   (/translations/manifest.json + /translations/<idioma>.json).

   Prioridade de deteccao:
     1) Escolha manual anterior (localStorage)
     2) Idioma do navegador
     3) Localizacao (apenas como sinal complementar, best-effort,
        nunca solicitada de forma invasiva)
     4) Fallback fixo: EN
   ========================================================= */
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

  function detectInitialLang() {
    var supported = supportedMap();

    var saved = getSavedLang();
    if (saved && supported[saved]) return { lang: saved, manual: true };

    var browserTag = (navigator.languages && navigator.languages[0]) || navigator.language;
    var browserLang = normalizeLang(browserTag);
    if (browserLang && supported[browserLang]) return { lang: browserLang, manual: false };

    return { lang: FALLBACK_LANG, manual: false };
  }

  /* Tenta refinar com localizacao apenas se a permissao ja tiver sido
     concedida anteriormente (nunca solicita/preenche um novo pedido). */
  function tryGeoRefinement(onLangFound) {
    if (!("permissions" in navigator) || !navigator.permissions || !navigator.permissions.query) return;
    if (!("geolocation" in navigator)) return;

    navigator.permissions.query({ name: "geolocation" }).then(function (status) {
      if (!status || status.state !== "granted") return; // nao solicita popup
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var lang = langFromCoords(pos.coords.latitude, pos.coords.longitude, supportedMap());
          if (lang) onLangFound(lang);
        },
        function () { /* ignora falhas silenciosamente */ },
        { maximumAge: 3600000, timeout: 800 }
      );
    }).catch(function () { /* API indisponivel; ignora */ });
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
    loadTranslations().then(function () {
      var detected = detectInitialLang();
      applyAll(detected.lang);

      if (!detected.manual) {
        tryGeoRefinement(function (geoLang) {
          if (getSavedLang()) return; // escolha manual entretanto feita tem prioridade
          if (geoLang && geoLang !== currentLang) applyAll(geoLang);
        });
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
    }
  };

  document.addEventListener("DOMContentLoaded", init);

  /* Reaplica a traducao apos cada navegacao SPA, pois a pagina
     recem-carregada chega com o HTML base em PT. */
  document.addEventListener("app:navigated", function () {
    if (translationsData && currentLang) applyAll(currentLang);
  });
})();
