


/* 03b. SLIDESHOW "QUEM SOMOS" — crossfade automático */
(function(){
  const figure = document.querySelector('.split-figure');
  if (!figure) return;
  const slides = Array.from(figure.querySelectorAll('.split-slide'));
  const dots   = Array.from(figure.querySelectorAll('.split-dots button'));
  if (slides.length < 2) return;

  let splitIndex = 0;
  let splitTimer = null;
  const AUTOPLAY_MS = 5000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function splitGoTo(next){
    splitIndex = (next + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === splitIndex));
    dots.forEach((d, i) => {
      d.classList.toggle('is-active', i === splitIndex);
      d.setAttribute('aria-selected', i === splitIndex ? 'true' : 'false');
    });
  }

  function splitStart(){
    if (reduceMotion) return;
    splitStop();
    splitTimer = window.setInterval(() => splitGoTo(splitIndex + 1), AUTOPLAY_MS);
  }
  function splitStop(){
    if (splitTimer) { window.clearInterval(splitTimer); splitTimer = null; }
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { splitGoTo(i); splitStart(); });
  });

  figure.addEventListener('mouseenter', splitStop);
  figure.addEventListener('mouseleave', splitStart);

  splitGoTo(0);
  splitStart();
})();

