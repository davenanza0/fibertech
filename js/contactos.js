


/* =========================================================
   04. FORM SUBMIT (placeholder)
   ========================================================= */
document.getElementById('contactForm').addEventListener('submit', function(e){
  e.preventDefault();
  alert('Obrigado pela sua mensagem! Entraremos em contacto brevemente.');
  this.reset();
});


