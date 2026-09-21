for (const specimenFrame of document.querySelectorAll('[data-specimen-frame]')) {
  let observer;
  const fit = () => {
    observer?.disconnect();
    const content = specimenFrame.contentDocument?.querySelector('main');
    if (!content) return;
    const resize = () => {
      specimenFrame.style.height = `${Math.ceil(content.getBoundingClientRect().height) + 2}px`;
    };
    resize();
    if ('ResizeObserver' in window) {
      observer = new ResizeObserver(resize);
      observer.observe(content);
    }
  };
  specimenFrame.addEventListener('load', fit);
  fit();
}

const loopSteps = {
  measure: {
    owner: 'Engine',
    title: 'Start with what the code says.',
    copy: 'Run the supported checks to locate hardcoded values, token issues, and other findings. Keep coverage limits with the report so the team knows what still needs inspection.',
    link: 'Explore code checks',
    href: 'docs.html#audit-loop',
  },
  decide: {
    owner: 'Your team + agent',
    title: 'Decide what belongs in the system.',
    copy: 'Compare the findings with existing components and product needs. Reuse the convention, improve it, or keep a difference with a documented reason.',
    link: 'Explore design decisions',
    href: 'docs.html#adoption-loop',
  },
  verify: {
    owner: 'Your team + agent',
    title: 'Check the screens that changed.',
    copy: 'Rerun the audit and inspect the affected screens, states, themes, and behavior. Code findings cover part of the work; the interface still needs a review.',
    link: 'Explore verification',
    href: 'docs.html#workflow',
  },
  retain: {
    owner: 'Project documentation',
    title: 'Leave a decision others can find.',
    copy: 'Save the convention, any exceptions, and the checks behind the change. Link the record from the project documentation so contributors can use it in the next review.',
    link: 'See a saved decision',
    href: 'example.html#record',
  },
};
const loopButtons = [...document.querySelectorAll('[data-loop-step]')];
const loopRecords = [
  {
    stage: '01 / MEASURE',
    title: 'Locate a token bypass.',
    labelA: 'Finding',
    valueA: 'Hardcoded color',
    labelB: 'Source',
    valueB: 'Card.tsx:2',
  },
  {
    stage: '02 / DECIDE',
    title: 'Choose the surface token.',
    labelA: 'Convention',
    valueA: 'Use color-surface',
    labelB: 'Exception',
    valueB: 'Keep status colors',
  },
  {
    stage: '03 / VERIFY',
    title: 'Check the changed screens.',
    labelA: 'Review',
    valueA: 'States, themes, behavior',
    labelB: 'Evidence',
    valueB: 'Screens + code findings',
  },
  {
    stage: '04 / RETAIN',
    title: 'Keep the decision with the code.',
    labelA: 'Record',
    valueA: 'Surface role + reason',
    labelB: 'Next change',
    valueB: 'Reuse the convention',
  },
];

if (loopButtons.length) {
  const stageDuration = 6000;
  const instrument = document.querySelector('.loop-instrument, .restored-loop-instrument');
  const progress = instrument.querySelector('.track-progress, .restored-track-progress');
  const explanation = document.getElementById('loop-explanation');
  const recordContent = document.querySelector('.record-content, .restored-record-content');
  const playback = document.getElementById('loop-playback');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = reducedMotion.matches;
  let inView = false;
  let activeIndex = 0;
  let timer;
  let fade;

  // One animation clock drives both the traveling highlight and the panel stages.
  const makeClock = () =>
    progress.animate(
      [{ strokeDashoffset: '0' }, { strokeDashoffset: reducedMotion.matches ? '0' : '-100' }],
      {
        duration: stageDuration * loopButtons.length,
        iterations: Number.POSITIVE_INFINITY,
        easing: 'linear',
      },
    );
  let clock = makeClock();
  clock.pause();
  const traces = loopButtons.map((button) => {
    const outline = button.querySelector('.stop-trace rect');
    if (!outline) return null;
    const animation = outline.animate([{ strokeDashoffset: '100' }, { strokeDashoffset: '0' }], {
      duration: stageDuration,
      fill: 'both',
      easing: 'linear',
    });
    animation.pause();
    return animation;
  });
  const syncTraces = () => {
    const time = Number(clock.currentTime) || 0;
    const index = Math.floor(time / stageDuration) % loopButtons.length;
    for (const [candidate, trace] of traces.entries()) {
      if (!trace) continue;
      trace.pause();
      trace.currentTime = reducedMotion.matches
        ? stageDuration
        : candidate === index
          ? time % stageDuration
          : 0;
      if (candidate === index && clock.playState === 'running' && !reducedMotion.matches) trace.play();
    }
  };

  const showStep = (index, manual = false, animate = true) => {
    activeIndex = index;
    const step = loopSteps[loopButtons[index].dataset.loopStep];
    const record = loopRecords[index];
    explanation.setAttribute('aria-live', manual ? 'polite' : 'off');
    for (const [candidateIndex, candidate] of loopButtons.entries()) {
      candidate.setAttribute('aria-pressed', String(candidateIndex === index));
    }
    document.getElementById('loop-owner').textContent = step.owner;
    document.getElementById('loop-detail-title').textContent = step.title;
    document.getElementById('loop-detail-copy').textContent = step.copy;
    const link = document.getElementById('loop-detail-link');
    link.firstChild.textContent = `${step.link} `;
    link.href = step.href;
    for (const [id, value] of Object.entries({
      'record-stage': record.stage,
      'record-title': record.title,
      'record-label-a': record.labelA,
      'record-value-a': record.valueA,
      'record-label-b': record.labelB,
      'record-value-b': record.valueB,
    }))
      document.getElementById(id).textContent = value;
    fade?.cancel();
    if (animate && !reducedMotion.matches) {
      fade = recordContent.animate([{ opacity: 0.35 }, { opacity: 1 }], {
        duration: 180,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      });
    }
  };
  const schedule = () => {
    clearTimeout(timer);
    if (clock.playState !== 'running') return;
    const time = Number(clock.currentTime) || 0;
    const index = Math.floor(time / stageDuration) % loopButtons.length;
    if (index !== activeIndex) showStep(index);
    syncTraces();
    timer = setTimeout(schedule, stageDuration - (time % stageDuration) + 24);
  };
  const syncPlayback = () => {
    const running = !userPaused && inView && !document.hidden;
    if (running) clock.play();
    else clock.pause();
    syncTraces();
    playback.classList.toggle('is-paused', userPaused);
    playback.title = userPaused ? 'Play loop animation' : 'Pause loop animation';
    playback.setAttribute('aria-label', userPaused ? 'Play loop animation' : 'Pause loop animation');
    schedule();
  };

  for (const [index, button] of loopButtons.entries()) {
    button.disabled = false;
    button.addEventListener('click', (event) => {
      clock.currentTime = index * stageDuration;
      showStep(index, true, event.detail !== 0);
      syncTraces();
      schedule();
    });
  }
  playback.addEventListener('click', () => {
    userPaused = !userPaused;
    syncPlayback();
  });
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', () => {
    const time = clock.currentTime;
    clock.cancel();
    clock = makeClock();
    clock.currentTime = time;
    userPaused = reducedMotion.matches;
    syncPlayback();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.15 },
    ).observe(instrument);
  } else {
    inView = true;
    syncPlayback();
  }
  showStep(0, false, false);
}

// Embedded specimens resize during load. Restore deep links once those sizes settle,
// unless the visitor has already started interacting with the page.
let interactedDuringLoad = false;
for (const event of ['pointerdown', 'wheel', 'keydown', 'touchstart']) {
  window.addEventListener(
    event,
    () => {
      interactedDuringLoad = true;
    },
    { once: true, passive: true },
  );
}
window.addEventListener(
  'load',
  () => {
    if (interactedDuringLoad || !window.location.hash) return;
    let id;
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
  },
  { once: true },
);

// Keep the upright loop separate from the wide, foreshortened background plane.
const loopSurface = document.querySelector('.loop-instrument');
if (loopSurface) {
  const narrow = matchMedia('(max-width: 760px)');
  const track = loopSurface.querySelector('.loop-track');
  const field = loopSurface.querySelector('.orbital-field');
  const paths = [
    ...track.querySelectorAll('.track-extrusion,.track-aura,.track-body,.track-center,.track-progress'),
  ];
  const desktopPath = paths[0].getAttribute('d');
  const mobilePath =
    'M128 150H272C330 150 364 190 364 250V550C364 610 330 650 272 650H128C70 650 36 610 36 550V250C36 190 70 150 128 150Z';
  const fitGeometry = () => {
    const mobile = narrow.matches;
    const viewBox = mobile ? '0 0 400 800' : '0 0 1000 660';
    track.setAttribute('viewBox', viewBox);
    field.setAttribute('viewBox', mobile ? '0 0 400 800' : '0 0 1200 660');
    field
      .querySelector('#plane-spectrum')
      .setAttribute('gradientTransform', mobile ? 'translate(0 0)' : 'translate(100 0)');
    const spectrum = track.querySelector('#spectrum');
    for (const [name, value] of Object.entries(
      mobile ? { x1: '36', y1: '650', x2: '364', y2: '150' } : { x1: '130', y1: '430', x2: '870', y2: '90' },
    ))
      spectrum.setAttribute(name, value);
    for (const path of paths) path.setAttribute('d', mobile ? mobilePath : desktopPath);
    for (const arc of field.querySelectorAll('[data-orbit-front]')) {
      arc.setAttribute('d', mobile ? 'M12 560a188 71 0 0 0 376 0' : 'M20 330a580 218 0 0 0 1160 0');
    }
    for (const ellipse of field.querySelectorAll('[data-orbit-scale]')) {
      const scale = Number(ellipse.dataset.orbitScale);
      ellipse.setAttribute('cx', mobile ? '200' : '600');
      ellipse.setAttribute('cy', mobile ? '560' : '330');
      ellipse.setAttribute('rx', String((mobile ? 188 : 580) * scale));
      ellipse.setAttribute('ry', String((mobile ? 71 : 218) * scale));
    }
  };
  narrow.addEventListener('change', fitGeometry);
  fitGeometry();
}
