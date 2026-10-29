/* aynen.fun — viewport-sized desktop game catalog.
   Show complete covers per page; keep the original scrollable layout on mobile. */
(() => {
  const scene = document.querySelector('.desktop-scene');
  const catalog = scene?.querySelector('.orbit-cards');
  const controls = document.getElementById('catalog-pagination');
  if (!scene || !catalog || !controls) return;

  const cards = Array.from(catalog.querySelectorAll(':scope > .game-tile'));
  const previous = controls.querySelector('[data-page="previous"]');
  const next = controls.querySelector('[data-page="next"]');
  const count = controls.querySelector('.catalog-page-count');
  const smallScreen = window.matchMedia('(max-width:760px)');
  let currentPage = 0;
  let pageSize = 0;
  let resizeFrame = 0;

  function render() {
    if (smallScreen.matches) {
      scene.classList.remove('is-paged');
      cards.forEach(card => { card.hidden = false; });
      controls.hidden = true;
      return;
    }

    const rows = innerHeight >= 760 ? 4 : innerHeight >= 570 ? 3 : 2;
    const newPageSize = rows * 4;
    if (pageSize !== newPageSize) {
      currentPage = Math.floor(currentPage * pageSize / newPageSize) || 0;
      pageSize = newPageSize;
    }

    const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
    currentPage = Math.max(0, Math.min(pageCount - 1, currentPage));
    const first = currentPage * pageSize;
    const last = first + pageSize;

    scene.classList.add('is-paged');
    cards.forEach((card, index) => { card.hidden = index < first || index >= last; });

    count.textContent = `${currentPage + 1} / ${pageCount}`;
    previous.disabled = currentPage === 0;
    next.disabled = currentPage === pageCount - 1;
    controls.hidden = pageCount === 1;
  }

  function go(offset) {
    if (smallScreen.matches) return;
    currentPage += offset;
    render();
    if (window.scrollY) window.scrollTo(0, 0);
  }

  previous.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  window.addEventListener('resize', () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      render();
    });
  }, { passive: true });
  render();
})();
