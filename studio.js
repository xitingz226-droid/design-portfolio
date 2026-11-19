addEventListener('hashchange', () => {
  const activeCase = document.querySelector('.case:target');
  if (activeCase) {
    activeCase.focus({ preventScroll: true });
    scrollTo(0, 0);
  }
});

const viewer = document.querySelector('#viewer');
const enlarged = viewer.querySelector('img');
document.querySelectorAll('figure a').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (typeof viewer.showModal !== 'function') return;
    event.preventDefault();
    enlarged.src = link.href;
    enlarged.alt = link.querySelector('img').alt;
    viewer.showModal();
  });
});

const uiGrid = document.querySelector('#work > .grid');
const digitalGrid = uiGrid.cloneNode(false);
const cockpitProjects = new Set(['#polar-day', '#night-amber', '#hmi-system']);
for (const card of [...uiGrid.children]) {
  if (!cockpitProjects.has(card.getAttribute('href'))) digitalGrid.append(card);
}
function addUiCollection(id, title, grid) {
  const section = document.createElement('section');
  section.className = 'ui-collection';
  section.id = id;
  const heading = document.createElement('h3');
  heading.textContent = title;
  section.append(heading, grid);
  return section;
}
const workSection = document.querySelector('#work');
workSection.append(
  addUiCollection('cockpit-collection', 'Automotive HMI', uiGrid),
  addUiCollection('digital-collection', 'Digital Products', digitalGrid)
);

document.querySelectorAll('.grid').forEach(grid => {
  const cards = [...grid.querySelectorAll('.card')];
  const vertical = Boolean(grid.closest('#work, #game-design'));
  const motorcycles = Boolean(grid.closest('#two-wheel'));
  const isCockpit = name => ['polar-day', 'night-amber', 'hmi-system'].includes(name);
  const axisValue = event => vertical ? event.clientY : event.clientX;
  const crossValue = event => vertical ? event.clientX : event.clientY;
  const spacingFor = () => vertical
    ? Math.max(64, grid.clientHeight)
    : motorcycles ? grid.clientWidth / 3 : Math.max(96, Math.min(350, grid.clientWidth * .285));
  if (vertical) grid.classList.add('vertical-deck');
  const deck = document.createElement('div');
  deck.className = 'deck';
  deck.innerHTML = '<div class="deck-camera" aria-hidden="true"></div><div class="deck-controls"><p class="mobile-project-title"></p><output class="deck-count" aria-live="polite"></output><a class="deck-open">View project</a></div>';
  const controls = deck.querySelector('.deck-controls');
  const count = controls.querySelector('output');
  const mobileTitle = controls.querySelector('.mobile-project-title');
  const open = controls.querySelector('a');
  grid.before(deck);
  deck.insertBefore(grid, controls);
  grid.setAttribute('aria-label', vertical ? 'Projects. Swipe up or down, or use the up and down arrow keys.' : 'Projects. Swipe left or right, or use the left and right arrow keys.');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 0;
  let offset = 0;
  let animation = 0;
  let gesture;
  let suppressClick = false;

  function paint() {
    const spacing = spacingFor();
    const half = cards.length / 2;
    cards.forEach((card, index) => {
      const raw = index - selected - offset;
      const position = ((raw + half) % cards.length + cards.length) % cards.length - half;
      const depth = Math.abs(position);
      card.style.setProperty('--x', (vertical ? 0 : spacing * position) + 'px');
      card.style.setProperty('--y', (vertical ? spacing * position : 0) + 'px');
      card.style.setProperty('--z', -depth * 108 + 'px');
      card.style.setProperty('--angle', -Math.sign(position) * Math.min(38, depth * 27) + 'deg');
      const scale = motorcycles ? 1.18 - Math.min(depth, 1.5) * .43 : 1 + .12 * Math.max(0, 1 - depth) - depth * .055;
      card.style.setProperty('--scale', String(scale));
      const opacity = motorcycles ? Math.max(.17, 1 - depth * .58) : Math.max(0, 1 - depth * .19 - Math.max(0, depth - 2.55) * .62);
      card.style.setProperty('--opacity', String(opacity));
      card.style.setProperty('--layer', String(Math.round((cards.length - depth) * 100)));
      card.style.setProperty('--blur', Math.min(7, depth * 2.65) + 'px');
      card.style.pointerEvents = depth > 3.15 ? 'none' : '';
    });
  }
  function updateSelection() {
    cards.forEach((card, index) => {
      card.tabIndex = index === selected ? 0 : -1;
      card.setAttribute('aria-current', String(index === selected));
    });
    const card = cards[selected];
    deck.style.setProperty('--cover', 'url("' + card.querySelector('img').src + '")');
    deck.dataset.theme = card.getAttribute('href').slice(1);
    mobileTitle.textContent = card.querySelector('h2').textContent;
    count.value = (selected + 1) + ' / ' + cards.length;
    open.href = card.href;
  }
  function centerBy(step) {
    cancelAnimationFrame(animation);
    selected = (selected + step + cards.length) % cards.length;
    offset -= step;
    const wasCockpit = isCockpit(deck.dataset.theme);
    updateSelection();
    if (step && vertical && !reduce.matches && wasCockpit !== isCockpit(deck.dataset.theme)) {
      const stage = grid.closest('.device-stage');
      stage?.getAnimations().forEach(effect => effect.cancel());
      stage?.animate([{opacity: .72, scale: '.989'}, {opacity: 1, scale: '1'}],
        {duration: 550, easing: 'cubic-bezier(.22,.74,.27,1)'});
    }
    if (reduce.matches) {
      offset = 0;
      paint();
      return;
    }
    const initial = offset;
    const start = performance.now();
    const duration = motorcycles ? 390 : vertical ? 410 : 475;
    const settleEnd = 1 - 8 * Math.exp(-7);
    function settle(now) {
      const progress = Math.min(1, (now - start) / duration);
      // A critically damped response settles cleanly without overshooting its slot.
      const distance = 1 - (1 - (1 + 7 * progress) * Math.exp(-7 * progress)) / settleEnd;
      offset = initial * distance;
      paint();
      if (progress < 1) animation = requestAnimationFrame(settle);
    }
    animation = requestAnimationFrame(settle);
  }
  cards.forEach((card, index) => {
    card.draggable = false;
    if (motorcycles) {
      const image = card.querySelector('img');
      const stand = document.createElement('span');
      stand.className = 'bike-stand';
      image.before(stand);
      stand.append(image);
    }
    card.dataset.theme = card.getAttribute('href').slice(1);
    card.addEventListener('click', event => {
      if (suppressClick) {
        event.preventDefault();
        return;
      }
      if (index !== selected && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
        event.preventDefault();
        const half = Math.floor(cards.length / 2);
        centerBy((index - selected + cards.length + half) % cards.length - half);
      }
    });
  });
  grid.addEventListener('keydown', event => {
    if (!(vertical ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight']).includes(event.key)) return;
    event.preventDefault();
    centerBy(['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1);
    cards[selected].focus({ preventScroll: true });
  });
  grid.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    gesture = { id: event.pointerId, along: axisValue(event), across: crossValue(event), last: axisValue(event), time: event.timeStamp, speed: 0 };
  });
  grid.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const coordinate = axisValue(event);
    const dragDistance = coordinate - gesture.along;
    if (!gesture.dragging) {
      if (Math.abs(dragDistance) < 8 || Math.abs(dragDistance) < Math.abs(crossValue(event) - gesture.across)) return;
      cancelAnimationFrame(animation);
      gesture.dragging = true;
      gesture.offset = offset;
      grid.setPointerCapture(event.pointerId);
      grid.classList.add('dragging');
    }
    gesture.speed = .5 * gesture.speed + .5 * (gesture.last - coordinate) / Math.max(1, event.timeStamp - gesture.time);
    gesture.last = coordinate;
    gesture.time = event.timeStamp;
    const spacing = spacingFor();
    offset = Math.max(-3, Math.min(3, gesture.offset - dragDistance / spacing));
    paint();
  });
  function endDrag(event) {
    if (event.type === 'lostpointercapture' && event.target !== grid) return;
    if (!gesture || gesture.id !== event.pointerId) return;
    if (gesture.dragging) {
      suppressClick = true;
      const momentum = event.type === 'pointerup' && !reduce.matches && event.timeStamp - gesture.time < 100
        ? Math.max(-.55, Math.min(.55, gesture.speed * .48)) : 0;
      const maxSteps = Math.min(3, cards.length - 1);
      const distance = (gesture.along - axisValue(event)) / spacingFor();
      const travel = offset + momentum;
      const step = Math.round(Math.max(-maxSteps, Math.min(maxSteps, travel)));
      centerBy(step || (event.type === 'pointerup' && Math.abs(distance) >= .24 ? Math.sign(distance) : 0));
      setTimeout(() => { suppressClick = false; }, 0);
    }
    gesture = undefined;
    grid.classList.remove('dragging');
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => grid.addEventListener(type, endDrag));
  let wheelTimer;
  grid.addEventListener('wheel', event => {
    if (vertical ? Math.abs(event.deltaY) <= Math.abs(event.deltaX)
      : !event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    cancelAnimationFrame(animation);
    const delta = vertical ? event.deltaY : event.deltaX || event.deltaY;
    const pixels = delta * (event.deltaMode === 1 ? 16 : 1);
    offset = Math.max(-3, Math.min(3, offset + pixels / 245));
    paint();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      const step = Math.round(offset) || (Math.abs(offset) > .15 ? Math.sign(offset) : 0);
      centerBy(step);
    }, 95);
  }, { passive: false });
  addEventListener('resize', paint);
  if ('ResizeObserver' in window) new ResizeObserver(paint).observe(grid);
  addEventListener('hashchange', paint);
  updateSelection();
  paint();

});

const motion = matchMedia('(prefers-reduced-motion: no-preference)');
if (motion.matches && 'IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('motion-pending');
      reveal.unobserve(entry.target);
    });
  }, { threshold: .04 });
  document.querySelectorAll('.case section').forEach(panel => {
    panel.classList.add('motion-reveal', 'motion-pending');
    panel.addEventListener('focusin', () => panel.classList.remove('motion-pending'), { once: true });
    reveal.observe(panel);
  });
}


const coverLinks = document.querySelectorAll('.discipline');
coverLinks.forEach(link => {
  link.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !motion.matches) return;
    const bounds = link.getBoundingClientRect();
    link.style.setProperty('--art-x', ((event.clientX - bounds.left) / bounds.width - .5) * 18 + 'px');
    link.style.setProperty('--art-y', ((event.clientY - bounds.top) / bounds.height - .5) * 14 + 'px');
  });
  link.addEventListener('pointerleave', () => {
    link.style.removeProperty('--art-x');
    link.style.removeProperty('--art-y');
  });
  link.addEventListener('click', event => {
    if (!motion.matches || !document.startViewTransition || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = document.querySelector(link.hash);
    const stage = target.querySelector('.bike-opening, .car-opening') || target.querySelector('.deck');
    if (!stage) return;
    event.preventDefault();
    link.style.viewTransitionName = 'portfolio-portal';
    const transition = document.startViewTransition(() => {
      location.hash = link.hash;
      link.style.viewTransitionName = '';
      stage.style.viewTransitionName = 'portfolio-portal';
      scrollTo(0, 0);
    });
    const clear = () => { stage.style.viewTransitionName = ''; };
    transition.finished.then(clear, clear);
  });
});


const carGallery = document.querySelector('#four-wheel');
const carDeck = carGallery.querySelector('.deck');
const intro = document.createElement('section');
intro.className = 'car-opening';
const introContent = document.createElement('div');
introContent.className = 'car-opening-content';
introContent.innerHTML = '<p>Four-Wheeler Design</p><h2>Automotive<br><em>form studies.</em></h2><a href="#four-wheel" class="road-jump">Explore the three concepts</a>';
intro.append(introContent);
carDeck.before(intro);

const road = document.createElement('section');
road.className = 'road-showcase';
road.setAttribute('aria-label', 'Automotive concepts on the road');
const lane = document.createElement('div');
lane.className = 'road-lane';
carDeck.before(road);
road.append(lane);
lane.append(carDeck);
introContent.querySelector('.road-jump').addEventListener('click', event => {
  event.preventDefault();
  road.scrollIntoView({ behavior: motion.matches ? 'smooth' : 'instant' });
});
const carriage = document.createElement('video');
carriage.className = 'carriage-footage';
carriage.src = 'assets/carriage.mp4';
carriage.poster = 'assets/carriage-poster.webp';
carriage.preload = 'none';
carriage.muted = true;
carriage.loop = true;
carriage.playsInline = true;
carriage.setAttribute('aria-hidden', 'true');
intro.prepend(carriage);

const footageButton = document.createElement('button');
footageButton.type = 'button';
footageButton.className = 'footage-toggle';
footageButton.textContent = 'Play footage';
intro.append(footageButton);
let footageEnabled = motion.matches;
function syncFootage() {
  if (location.hash === '#four-wheel' && footageEnabled && !document.hidden) {
    carriage.play().catch(() => {});
  } else {
    carriage.pause();
  }
}
carriage.addEventListener('play', () => { footageButton.textContent = 'Pause footage'; });
carriage.addEventListener('pause', () => { footageButton.textContent = 'Play footage'; });
footageButton.addEventListener('click', () => {
  footageEnabled = carriage.paused;
  syncFootage();
});
addEventListener('hashchange', syncFootage);
document.addEventListener('visibilitychange', syncFootage);
motion.addEventListener('change', event => {
  footageEnabled = event.matches;
  syncFootage();
});
syncFootage();

const gameGallery = document.querySelector('#game-design .deck');
const controls = gameGallery.querySelector('.deck-controls');
for (const [key, label, cssClass] of [['ArrowUp', 'Previous game', 'handheld-prev'], ['ArrowDown', 'Next game', 'handheld-next']]) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'handheld-key ' + cssClass;
  button.setAttribute('aria-label', label);
  button.textContent = key === 'ArrowUp' ? '‹' : '›';
  button.addEventListener('click', () => gameGallery.querySelector('.grid').dispatchEvent(new KeyboardEvent('keydown', { key })));
  controls.append(button);
}


const generatedScenes = [
  ['#cockpit-collection', 'laptop'],
  ['#digital-collection', 'laptop'],
  ['#game-design', 'game'],
  ['#two-wheel', 'two'],

];
for (const [route, scene] of generatedScenes) {
  const gallery = document.querySelector(route + ' .deck');
  const galleryGrid = gallery.querySelector('.grid');
  const stage = document.createElement('div');
  stage.className = 'device-stage';
  stage.dataset.scene = scene;
  const art = document.createElement('img');
  art.className = 'device-art';
  art.alt = '';
  if (scene === 'game' || scene === 'laptop') art.src = 'assets/scene-' + scene + '.webp';
  galleryGrid.before(stage);
  if (scene === 'game' || scene === 'laptop') stage.append(art);
  stage.append(galleryGrid);
  if (scene === 'laptop') {
    const cockpit = document.createElement('img');
    cockpit.className = 'device-art cockpit-art';
    cockpit.alt = '';
    cockpit.src = 'assets/scene-cockpit.webp';
    stage.prepend(cockpit);
  }
  if (scene === 'game') stage.append(...gallery.querySelectorAll('.handheld-key'));

  if (scene === 'game' || scene === 'laptop') {
    const hint = document.createElement('span');
    hint.className = 'scroll-hint';
    hint.textContent = 'Swipe up or down';
    gallery.querySelector('.deck-controls').prepend(hint);
  }
}


const motorcycleSection = document.querySelector('#two-wheel');
const motorcycleDeck = motorcycleSection.querySelector('.deck');
const motorcycleOpening = document.createElement('section');
motorcycleOpening.className = 'bike-opening';
motorcycleOpening.setAttribute('aria-labelledby', 'bike-opening-title');
motorcycleOpening.innerHTML = '<img class="bike-opening-vehicle" src="assets/cutout-flowcut.webp" alt="FLOWCUT sport motorcycle concept"><div class="bike-opening-copy"><h2 id="bike-opening-title">Two wheels.<br><em>Three directions.</em></h2><a href="#two-wheel" class="bike-jump">Explore the three concepts</a></div>';
motorcycleDeck.before(motorcycleOpening);
motorcycleOpening.querySelector('.bike-jump').addEventListener('click', event => {
  event.preventDefault();
  motorcycleDeck.scrollIntoView({ behavior: motion.matches ? 'smooth' : 'instant' });
});

const backLink = document.querySelector('.bar .brand');
const siteName = backLink.querySelector('.site-name');
const backLabel = backLink.querySelector('.back-label');
function updateBackLink() {
  const caseBack = document.querySelector('.case:target > a');
  const section = ['#work', '#game-design', '#two-wheel', '#four-wheel'].includes(location.hash);
  const isBack = Boolean(caseBack) || section;
  backLink.setAttribute('href', caseBack?.getAttribute('href') || '#portfolio');
  siteName.hidden = isBack;
  backLabel.hidden = !isBack;
  if (isBack) {
    backLink.setAttribute('aria-label', caseBack?.textContent.trim() || 'Back to all disciplines');
  } else {
    backLink.removeAttribute('aria-label');
  }
}
addEventListener('hashchange', updateBackLink);
updateBackLink();
