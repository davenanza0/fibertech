


/* =========================================================
   04. FILTROS
   ========================================================= */
const filterBtns = document.querySelectorAll('.filter-btn');
const articles = document.querySelectorAll('.article-card');
const emptyMsg = document.getElementById('articlesEmpty');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const filter = btn.dataset.filter;
    let visible = 0;

    articles.forEach(card => {
      const match = filter === 'all' || card.dataset.category === filter;
      card.style.display = match ? '' : 'none';
      if (match) visible++;
    });

    emptyMsg.classList.toggle('is-visible', visible === 0);
  });
});


