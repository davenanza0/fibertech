/* CONTACTOS.JS — Envio real do formulário via Web3Forms (ver LEIA-ME.txt).
   Para trocar de fornecedor: só mexer em WEB3FORMS_ACCESS_KEY/ENDPOINT abaixo. */
(function () {
  "use strict";

  // >>> ACAO NECESSARIA: obter Access Key gratuita em https://web3forms.com
  // (usar o email fibertechnology@yandex.com) e colar aqui:
  var WEB3FORMS_ACCESS_KEY = "SUBSTITUIR_PELA_ACCESS_KEY_WEB3FORMS";
  var WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

  var MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  var ALLOWED_EXT = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];

  var form = document.getElementById("contactForm");
  if (!form) return;

  var submitBtn = document.getElementById("submitBtn");
  var submitBtnText = document.getElementById("submitBtnText");
  var statusBox = document.getElementById("formStatus");
  var fileInput = document.getElementById("anexo");
  var consentInput = document.getElementById("consent");
  var honeypot = document.getElementById("botcheck");

  var submitting = false;
  var successTimer = null;
  var defaultBtnLabel = submitBtnText ? submitBtnText.textContent : "";

  function tr(key, fallback) {
    if (window.I18N && typeof window.I18N.t === "function") {
      var v = window.I18N.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  function showStatus(kind, message) {
    if (!statusBox) return;
    statusBox.hidden = false;
    statusBox.classList.remove("is-success", "is-error");
    statusBox.classList.add(kind === "success" ? "is-success" : "is-error");
    statusBox.textContent = message;
  }

  function clearStatus() {
    if (!statusBox) return;
    statusBox.hidden = true;
    statusBox.classList.remove("is-success", "is-error");
    statusBox.textContent = "";
  }

  function setBusy(isBusy) {
    submitting = isBusy;
    if (!submitBtn) return;
    submitBtn.disabled = isBusy;
    submitBtn.setAttribute("aria-busy", isBusy ? "true" : "false");
    if (submitBtnText) {
      submitBtnText.textContent = isBusy
        ? tr("contactos.status.45", "A enviar...")
        : defaultBtnLabel;
    }
  }

  function getFileExtension(name) {
    var parts = String(name || "").split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  }

  function validateFile() {
    if (!fileInput || !fileInput.files || !fileInput.files.length) return true;
    var file = fileInput.files[0];
    var ext = getFileExtension(file.name);

    if (ALLOWED_EXT.indexOf(ext) === -1) {
      showStatus("error", tr("contactos.status.48", "Tipo de ficheiro não permitido. Utilize PDF, Word, JPG ou PNG."));
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      showStatus("error", tr("contactos.status.49", "O ficheiro excede o tamanho máximo permitido (5MB)."));
      return false;
    }
    return true;
  }

  // Limpa o erro assim que a pessoa troca de ficheiro, para nao deixar
  // uma mensagem de erro antiga visivel sobre um ficheiro ja corrigido.
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      if (statusBox && statusBox.classList.contains("is-error")) clearStatus();
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return; // impede envios duplicados

    // Honeypot: se um robo preencheu este campo invisivel, ignora
    // silenciosamente o envio (nao mostra erro, nao envia nada).
    if (honeypot && honeypot.checked) return;

    // Validacao nativa (nome, email, telefone, servico, mensagem)
    if (!form.checkValidity()) {
      form.reportValidity();
      showStatus("error", tr("contactos.status.51", "Preencha todos os campos obrigatórios."));
      return;
    }

    // Consentimento da Politica de Privacidade e obrigatorio
    if (consentInput && !consentInput.checked) {
      showStatus("error", tr("contactos.status.50", "É necessário aceitar a Política de Privacidade antes de enviar."));
      consentInput.focus();
      return;
    }

    if (!validateFile()) return;

    clearStatus();
    setBusy(true);

    var formData = new FormData(form);
    formData.append("access_key", WEB3FORMS_ACCESS_KEY);

    fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      body: formData
    })
      .then(function (res) { return res.json().catch(function () { return {}; }); })
      .then(function (data) {
        setBusy(false);
        if (data && data.success) {
          showStatus("success", tr("contactos.status.46", "Mensagem enviada com sucesso."));
          form.reset();
          // A mensagem de sucesso desaparece sozinha ao fim de ~5s;
          // o formulario ja foi limpo, o botao ja foi restaurado acima.
          if (successTimer) window.clearTimeout(successTimer);
          successTimer = window.setTimeout(clearStatus, 5000);
        } else {
          showStatus("error", tr("contactos.status.47", "Não foi possível enviar a mensagem. Tente novamente ou contacte-nos diretamente por email."));
          // Mantem os dados preenchidos para nova tentativa (nao chama form.reset()).
        }
      })
      .catch(function () {
        setBusy(false);
        showStatus("error", tr("contactos.status.47", "Não foi possível enviar a mensagem. Tente novamente ou contacte-nos diretamente por email."));
      });
  });
})();
