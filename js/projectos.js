


/* =========================================================
   04. FILTROS DE PROJECTOS
   ========================================================= */
const filterBtns  = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');
const projectsEmpty = document.getElementById('projectsEmpty');

function applyProjectFilter(filter){
  let visibleCount = 0;
  projectCards.forEach(card => {
    const match = card.dataset.category === filter;
    card.style.display = match ? '' : 'none';
    if (match) visibleCount++;
  });
  projectsEmpty.classList.toggle('is-visible', visibleCount === 0);
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    applyProjectFilter(btn.dataset.filter);
  });
});

// Aplica a categoria activa por defeito (a marcada com "is-active" no HTML)
// logo no carregamento, para a grelha nunca depender de "Todos".
const initialFilterBtn = document.querySelector('.filter-btn.is-active') || filterBtns[0];
if (initialFilterBtn) applyProjectFilter(initialFilterBtn.dataset.filter);

/* =========================================================
   06. BLOCO NOVO — MODAIS DE DETALHES DOS PROJECTOS
   (JavaScript isolado, escopo próprio, não interfere com
   o menu, o overlay do menu, o scroll reveal ou os filtros)
   ========================================================= */
(function(){
  /* =======================================================
     CONFIGURAÇÃO DAS FOTOS DE CADA PROJECTO
     =======================================================
     Para adicionar fotos a um projecto, basta preencher a lista
     de caminhos correspondente ao seu "gallery-key" (proj-01 a
     proj-20). Podes colocar 1, várias, ou nenhuma foto — o espaço
     da galeria só aparece nos projectos que tiverem fotos.

     Exemplo:
     'proj-01': [
       '//imagens/project/projectos/cfm-maputo-1.jpg',
       '//imagens/project/projectos/cfm-maputo-2.jpg'
     ],
     ======================================================= */
  const PROJ_GALLERY_IMAGES = {
    'proj-01': [
      '/imagens/project/proj-01/galeria_a.jpg',
      '/imagens/project/proj-01/galeria_c.jpg',
      '/imagens/project/proj-01/galeria_d.jpg',
      '/imagens/project/proj-01/galeria_e.jpg'
    ],
    'proj-02': [
      '/imagens/project/proj-02/galeria_b.jpg',
      '/imagens/project/proj-02/galeria_c.jpg',
      '/imagens/project/proj-02/galeria_d.jpg',
      '/imagens/project/proj-02/galeria_e.jpg',
      '/imagens/project/proj-02/galeria_f.jpg',
      '/imagens/project/proj-02/galeria_g.jpg'
    ],
    'proj-03': [
      '/imagens/project/proj-03/galeria_b.jpg',
      '/imagens/project/proj-03/galeria_c.jpg'
    ],
    'proj-04': [],
    'proj-05': [
      '/imagens/project/proj-05/galeria_b.jpg'
    ],
    'proj-06': [
      '/imagens/project/proj-06/galeria_b.jpg',
      '/imagens/project/proj-06/galeria_c.jpg'
    ],
    'proj-07': [
      '/imagens/project/proj-07/galeria_a.jpg',
      '/imagens/project/proj-07/galeria_b.jpg',
      '/imagens/project/proj-07/galeria_d.jpg'
    ],
    'proj-08': [
      '/imagens/project/proj-08/galeria_a.jpg',
      '/imagens/project/proj-08/galeria_b.jpg',
      '/imagens/project/proj-08/galeria_c.jpg',
      '/imagens/project/proj-08/galeria_d.jpg'
    ],
    'proj-09': [
      '/imagens/project/proj-09/galeria_b.jpg',
      '/imagens/project/proj-09/galeria_c.jpg',
      '/imagens/project/proj-09/galeria_d.jpg',
      '/imagens/project/proj-09/galeria_e.jpg'
    ],
    'proj-10': [
      '/imagens/project/proj-10/galeria_b.jpg'
    ],
    'proj-11': [
      '/imagens/project/proj-11/galeria_b.jpg'
    ],
    'proj-12': [
      '/imagens/project/proj-12/galeria_b.jpg'
    ],
    'proj-13': [
      '/imagens/project/proj-13/galeria_b.jpg'
    ],
    'proj-14': [
      '/imagens/project/proj-14/galeria_b.jpg'
    ],
    'proj-15': [
      '/imagens/project/proj-15/galeria_b.jpg'
    ],
    'proj-16': [
      '/imagens/project/proj-16/galeria_b.jpg'
    ],
    'proj-17': [
      '/imagens/project/proj-17/galeria_b.jpg'
    ],
    'proj-18': [
      '/imagens/project/proj-18/galeria_b.jpg'
    ],
    'proj-19': [
      '/imagens/project/proj-19/galeria_b.jpg'
    ],
    'proj-20': [
      '/imagens/project/proj-20/galeria_a.jpg',
      '/imagens/project/proj-20/galeria_c.jpg',
      '/imagens/project/proj-20/galeria_d.jpg',
      '/imagens/project/proj-20/galeria_e.jpg',
      '/imagens/project/proj-20/galeria_f.jpg',
      '/imagens/project/proj-20/galeria_g.jpg'
    ],
    'proj-21': [
      '/imagens/project/proj-21/galeria_b.jpg',
      '/imagens/project/proj-21/galeria_c.jpg'
    ]
  };

  function renderProjGalleries(){
    document.querySelectorAll('.proj-modal-gallery').forEach(galleryEl => {
      const key = galleryEl.getAttribute('data-gallery-key');
      const images = PROJ_GALLERY_IMAGES[key] || [];
      if (!images.length) return;

      images.forEach((src, i) => {
        const img = document.createElement('img');
        img.src = src;
        img.loading = 'lazy';
        img.alt = 'Foto do projecto ' + (i + 1);
        galleryEl.appendChild(img);
      });
    });
  }

  renderProjGalleries();

  /* =======================================================
     CONFIGURAÇÃO DA IMAGEM DE CAPA DE CADA CARTÃO
     =======================================================
     Para colocar a imagem de fundo/capa de um cartão na grelha
     de projectos, preenche o caminho correspondente à sua
     "cover-key" (proj-01 a proj-20) — a mesma numeração usada
     na galeria de fotos do modal. Deixa "" (vazio) para manter
     o visual decorativo actual (ícone + fundo em grelha).

     A imagem fica bem visível: cobre todo o espaço do cartão
     (topo, onde hoje está o ícone), com a tag da categoria por
     cima, em contraste, e um leve zoom ao passar o rato.

     Exemplo:
     'proj-01': '//imagens/project/projectos/cfm-maputo-capa.jpg',
     ======================================================= */
  const PROJ_COVER_IMAGES = {
    'proj-01': '/imagens/project/proj-01/CAPA.jpg',
    'proj-02': '/imagens/project/proj-02/CAPA.jpg',
    'proj-03': '/imagens/project/proj-03/CAPA.jpg',
    'proj-04': '/imagens/project/proj-04/CAPA.jpg',
    'proj-05': '/imagens/project/proj-05/CAPA.jpg',
    'proj-06': '/imagens/project/proj-06/CAPA.jpg',
    'proj-07': '/imagens/project/proj-07/CAPA.jpg',
    'proj-08': '/imagens/project/proj-08/CAPA.jpg',
    'proj-09': '/imagens/project/proj-09/CAPA.jpg',
    'proj-10': '/imagens/project/proj-10/CAPA.jpg',
    'proj-11': '/imagens/project/proj-11/CAPA.jpg',
    'proj-12': '/imagens/project/proj-12/CAPA.jpg',
    'proj-13': '/imagens/project/proj-13/CAPA.jpg',
    'proj-14': '/imagens/project/proj-14/CAPA.jpg',
    'proj-15': '/imagens/project/proj-15/CAPA.jpg',
    'proj-16': '/imagens/project/proj-16/CAPA.jpg',
    'proj-17': '/imagens/project/proj-17/CAPA.jpg',
    'proj-18': '/imagens/project/proj-18/CAPA.jpg',
    'proj-19': '/imagens/project/proj-19/CAPA.jpg',
    'proj-20': '/imagens/project/proj-20/CAPA.jpg',
    'proj-21': '/imagens/project/proj-21/CAPA.jpg'
  };

  function renderProjCovers(){
    document.querySelectorAll('.project-visual[data-cover-key]').forEach(visualEl => {
      const key = visualEl.getAttribute('data-cover-key');
      const src = PROJ_COVER_IMAGES[key];
      if (!src) return;

      const img = document.createElement('img');
      img.src = src;
      img.loading = 'lazy';
      img.className = 'cover-img';
      img.alt = visualEl.closest('.project-card')?.querySelector('h3')?.textContent || 'Imagem do projecto';
      visualEl.insertBefore(img, visualEl.firstChild);
      visualEl.classList.add('has-cover');
    });
  }

  renderProjCovers();

  const detailButtons = document.querySelectorAll('.project-details-btn');
  let projModalScrollY = 0;
  let projModalActiveOverlay = null;

  function lockBodyScroll(){
    projModalScrollY = window.scrollY;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${projModalScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = gap + 'px';
    document.body.classList.add('proj-modal-lock');
  }

  function unlockBodyScroll(){
    document.body.classList.remove('proj-modal-lock');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    window.scrollTo({ top: projModalScrollY, left: 0, behavior: 'instant' });
  }

  function openProjModal(overlayEl){
    if (!overlayEl) return;
    projModalActiveOverlay = overlayEl;

    overlayEl.hidden = false;
    requestAnimationFrame(() => overlayEl.classList.add('is-open'));
    lockBodyScroll();

    const closeBtn = overlayEl.querySelector('.proj-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeProjModal(overlayEl){
    if (!overlayEl) return;
    overlayEl.classList.remove('is-open');
    unlockBodyScroll();

    window.setTimeout(() => { overlayEl.hidden = true; }, 300);
    projModalActiveOverlay = null;
  }

  detailButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-modal-target');
      const overlayEl = targetId ? document.getElementById(targetId) : null;
      openProjModal(overlayEl);
    });
  });

  document.querySelectorAll('.proj-modal-overlay').forEach(overlayEl => {
    const closeBtn = overlayEl.querySelector('.proj-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => closeProjModal(overlayEl));

    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) closeProjModal(overlayEl);
    });
  });

  if (window.PageScope) {
    window.PageScope.on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && projModalActiveOverlay) closeProjModal(projModalActiveOverlay);
    });
  }

  /* =======================================================
     PREVIEW (LIGHTBOX) DAS IMAGENS DA GALERIA DO MODAL
     =======================================================
     Isolado ao contexto do modal: só actua sobre imagens
     dentro de .proj-modal-gallery. Não afecta imagens fora
     do modal (capas dos cartões, etc.).
     ======================================================= */
  const projLightboxOverlay = document.createElement('div');
  projLightboxOverlay.className = 'proj-lightbox-overlay';
  projLightboxOverlay.hidden = true;

  const projLightboxCloseBtn = document.createElement('button');
  projLightboxCloseBtn.type = 'button';
  projLightboxCloseBtn.className = 'proj-lightbox-close';
  projLightboxCloseBtn.setAttribute('aria-label', 'Fechar pré-visualização da imagem');
  projLightboxCloseBtn.textContent = '✕';

  const projLightboxImg = document.createElement('img');
  projLightboxImg.className = 'proj-lightbox-img';
  projLightboxImg.alt = '';

  projLightboxOverlay.appendChild(projLightboxCloseBtn);
  projLightboxOverlay.appendChild(projLightboxImg);
  document.body.appendChild(projLightboxOverlay);

  function openProjLightbox(src, alt){
    projLightboxImg.src = src;
    projLightboxImg.alt = alt || '';
    projLightboxOverlay.hidden = false;
    requestAnimationFrame(() => projLightboxOverlay.classList.add('is-open'));
  }

  function closeProjLightbox(){
    projLightboxOverlay.classList.remove('is-open');
    window.setTimeout(() => { projLightboxOverlay.hidden = true; projLightboxImg.src = ''; }, 250);
  }

  document.querySelectorAll('.proj-modal-gallery').forEach(galleryEl => {
    galleryEl.addEventListener('click', (e) => {
      const target = e.target;
      if (target && target.tagName === 'IMG') {
        openProjLightbox(target.src, target.alt);
      }
    });
  });

  projLightboxCloseBtn.addEventListener('click', closeProjLightbox);
  projLightboxOverlay.addEventListener('click', (e) => {
    if (e.target === projLightboxOverlay) closeProjLightbox();
  });

  if (window.PageScope) {
    window.PageScope.on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && !projLightboxOverlay.hidden) closeProjLightbox();
    });
  }
})();

