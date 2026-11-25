(() => {
  const journey = document.querySelector('.journey-scroll');
  const chapters = [...journey.querySelectorAll('.journey-chapter')];
  const stage = journey.querySelector('.journey-stage');
  const stageTitle = stage.querySelector('.stage-title');
  const stageViews = stage.querySelector('.stage-views');
  const links = [...document.querySelectorAll('.journey-nav a')];
  const supportsTour = matchMedia('(min-width: 961px) and (prefers-reduced-motion: no-preference)');
  let views = [];
  let currentChapter = -1;
  let frame = 0;

  function renderTour() {
    frame = 0;
    if (!supportsTour.matches) return;

    const viewport = innerHeight;
    const bounds = journey.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > viewport * 1.2) return;

    // The centre of each chapter is a keyframe for the same fixed viewpoint.
    const focus = viewport * .53;
    const centers = chapters.map(chapter => {
      const box = chapter.getBoundingClientRect();
      return box.top + box.height / 2;
    });
    let position = 0;
    for (let i = 1; i < centers.length; i++) {
      const between = (focus - centers[i - 1]) / (centers[i] - centers[i - 1]);
      const transition = Math.min(1, Math.max(0, (between - .15) / .7));
      position += transition * transition * (3 - 2 * transition);
    }

    stage.style.setProperty('--travel', position / (chapters.length - 1));
    views.forEach((view, i) => {
      const offset = i - position;
      const distance = Math.min(1, Math.abs(offset));
      view.hidden = distance === 1;
      view.style.setProperty('--view-opacity', Math.cos(distance * Math.PI / 2));
      view.style.setProperty('--view-x', (offset * 54) + '%');
      view.style.setProperty('--view-y', (distance * 18) + 'px');
      view.style.setProperty('--view-z', (-distance * 210) + 'px');
      view.style.setProperty('--view-yaw', (-offset * 17) + 'deg');
      view.style.zIndex = Math.round((1 - distance) * 10);
    });

    const active = Math.round(position);
    if (active === currentChapter) return;
    currentChapter = active;
    stageTitle.textContent = chapters[active].dataset.screen;
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function scheduleTour() {
    if (supportsTour.matches && !frame) frame = requestAnimationFrame(renderTour);
  }

  function setLayout() {
    if (supportsTour.matches && !views.length) {
      views = chapters.map(chapter => {
        const view = document.createElement('div');
        view.className = 'stage-view';
        view.hidden = true;
        const image = chapter.querySelector('img').cloneNode(true);
        image.alt = '';
        view.append(image);
        return view;
      });
      stageViews.append(...views);
    }

    journey.classList.toggle('has-scroll', supportsTour.matches);
    if (!supportsTour.matches) {
      currentChapter = -1;
      for (const link of links) link.removeAttribute('aria-current');
    }
    scheduleTour();
  }

  supportsTour.addEventListener('change', setLayout);
  window.addEventListener('scroll', scheduleTour, { passive: true });
  window.addEventListener('resize', scheduleTour);
  window.addEventListener('load', scheduleTour);
  document.fonts.ready.then(scheduleTour);
  setLayout();

  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('chapter-in-view');
        reveal.unobserve(entry.target);
      }
    }, { threshold: .18 });
    for (const chapter of chapters) reveal.observe(chapter);
  }
})();
