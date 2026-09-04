
/* Pré-carregamento das páginas é feito por js/loader.js (não aqui) */


/* 02. HERO SLIDER — DOM REFERENCES */
const hero    = document.getElementById('hero');
const slides  = Array.from(document.querySelectorAll('[data-slide]'));
const dotsBox = document.getElementById('dots');
const counter = document.getElementById('counter');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

/* 02b. HERO — carregamento progressivo (1º slide é inline no HTML; resto via data-bg) */
function loadSlideBackground(slide){
  if (!slide) return;
  const bg = slide.getAttribute('data-bg');
  if (!bg) return;
  slide.style.backgroundImage = "url('" + bg + "')";
  slide.removeAttribute('data-bg');
}

function deferredLoadRemainingSlides(){
  if (slides.length < 2) return;
  const queue = slides.slice(1);
  function next(){
    if (!queue.length) return;
    loadSlideBackground(queue.shift());
    if (window.requestIdleCallback) window.requestIdleCallback(next, { timeout: 1500 });
    else window.setTimeout(next, 350);
  }
  if (window.requestAnimationFrame) window.requestAnimationFrame(next); // 2º slide logo após o 1º paint
  else next();
}

/* 03. HERO SLIDER (dots e navegação automáticos) */
const AUTOPLAY_MS = 6000;
let index = 0;
let timer = null;

slides.forEach((slide, i) => {
  slide.setAttribute('aria-hidden', String(i !== 0));

  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = 'dot';
  dot.setAttribute('role','tab');
  dot.setAttribute('aria-label', `Ir para o slide ${i + 1}`);
  dot.addEventListener('click', () => { goTo(i); restart(); });
  dotsBox.appendChild(dot);
});

const dots = Array.from(dotsBox.children);
const pad = n => String(n).padStart(2,'0');

function goTo(next){
  index = (next + slides.length) % slides.length;
  loadSlideBackground(slides[index]); // garante imagem pronta antes de mostrar
  slides.forEach((s,i) => {
    s.classList.toggle('is-active', i === index);
    s.setAttribute('aria-hidden', String(i !== index));
  });
  dots.forEach((d,i) => {
    d.classList.toggle('is-active', i === index);
    d.setAttribute('aria-selected', String(i === index));
  });
  counter.textContent = `${pad(index + 1)} / ${pad(slides.length)}`;
}

function start(){ timer = window.setInterval(() => goTo(index + 1), AUTOPLAY_MS); }
function stop(){ window.clearInterval(timer); timer = null; }
function restart(){ stop(); start(); }

prevBtn.addEventListener('click', () => { goTo(index - 1); restart(); });
nextBtn.addEventListener('click', () => { goTo(index + 1); restart(); });
hero.addEventListener('mouseenter', stop);
hero.addEventListener('mouseleave', start);
if (window.PageScope) {
  window.PageScope.on(document, 'visibilitychange', () => document.hidden ? stop() : restart());
} else {
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : restart());
}

if (slides.length){ goTo(0); start(); deferredLoadRemainingSlides(); }

/* 04. TOUCH / SWIPE */
let touchStartX = 0;
hero.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; stop(); }, { passive:true });
hero.addEventListener('touchend', e => {
  const delta = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) > 50) goTo(delta < 0 ? index + 1 : index - 1);
  restart();
}, { passive:true });

/* 05. KEYBOARD CONTROLS */
if (window.PageScope) {
  window.PageScope.on(document, 'keydown', e => {
    // O fecho do menu com Escape ja e tratado globalmente por site-nav.js;
    // aqui so evitamos que as setas mexam no carrossel enquanto o menu
    // movel estiver aberto.
    if (window.SiteNav && window.SiteNav.isMenuOpen()) return;
    if (e.key === 'ArrowLeft')  { goTo(index - 1); restart(); }
    if (e.key === 'ArrowRight') { goTo(index + 1); restart(); }
  });
}

/* 06b. SLIDESHOW "SOBRE" — crossfade automático */
(function(){
  const figure = document.querySelector('.about-figure');
  if (!figure) return;
  const slides = Array.from(figure.querySelectorAll('.about-slide'));
  const dots   = Array.from(figure.querySelectorAll('.about-dots button'));
  if (slides.length < 2) return;

  let aboutIndex = 0;
  let aboutTimer = null;
  const AUTOPLAY_MS = 5000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function aboutGoTo(next){
    aboutIndex = (next + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === aboutIndex));
    dots.forEach((d, i) => {
      d.classList.toggle('is-active', i === aboutIndex);
      d.setAttribute('aria-selected', i === aboutIndex ? 'true' : 'false');
    });
  }

  function aboutStart(){
    if (reduceMotion) return;
    aboutStop();
    aboutTimer = window.setInterval(() => aboutGoTo(aboutIndex + 1), AUTOPLAY_MS);
  }
  function aboutStop(){
    if (aboutTimer) { window.clearInterval(aboutTimer); aboutTimer = null; }
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { aboutGoTo(i); aboutStart(); });
  });

  figure.addEventListener('mouseenter', aboutStop);
  figure.addEventListener('mouseleave', aboutStart);

  aboutGoTo(0);
  aboutStart();
})();

