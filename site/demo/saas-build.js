// Authored component reuse, never a live generation or automatic repair claim.
const bench = document.querySelector('.workbench');
const stage = document.querySelector('.bench-stage');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const status = document.querySelector('.assembly-status');
const replay = document.querySelector('.replay');
const pause = document.querySelector('.pause');
const ns = 'http://www.w3.org/2000/svg';
const phases = [
  { key: 'shell', start: 350, label: 'Reusing the workspace layout' },
  { key: 'type', start: 1600, label: 'Applying the shared type hierarchy' },
  { key: 'controls', start: 2750, label: 'Reusing controls and surfaces' },
  { key: 'rows', start: 4050, label: 'Applying table patterns and states' },
];
const duration = 5700;
const ease = 'cubic-bezier(.16,1,.3,1)';
const parts = [...document.querySelectorAll('[data-part]')];
const routes = document.querySelector('.connection-routes');
const signals = new Map();
let animations = [];
let clock;
let frame;
let visible = false;
let userPaused = false;
let complete = true;
let started = false;
let currentPhase = '';
const screens = {
  billing: {
    area: 'Billing',
    description: 'Manage invoices and payment details.',
    action: 'Download invoices',
    metricA: 'Current plan',
    valueA: 'Team',
    detailA: '12 seats in your workspace',
    metricB: 'Next invoice',
    valueB: '$249.00',
    detailB: 'Billed on October 1',
    filter: 'All invoices',
    search: 'Search invoices',
    column: 'Invoice',
    columnB: 'Amount',
    row1: 'September subscription',
    row2: 'Additional seats',
    row3: 'August subscription',
    amount1: '$249.00',
    amount2: '$48.00',
    amount3: '$249.00',
    status1: 'Paid',
    status2: 'Pending',
    status3: 'Paid',
    symbol1: '01',
    symbol2: '02',
    symbol3: '03',
  },
  members: {
    area: 'Members',
    description: 'Manage access to your workspace.',
    action: 'Invite member',
    metricA: 'Workspace members',
    valueA: '12',
    detailA: 'Across 3 product teams',
    metricB: 'Pending invites',
    valueB: '2',
    detailB: 'Awaiting an acceptance',
    filter: 'All members',
    search: 'Search members',
    column: 'Name',
    columnB: 'Role',
    row1: 'Jordan Lee',
    row2: 'Alex Morgan',
    row3: 'Sam Rivera',
    amount1: 'Admin',
    amount2: 'Editor',
    amount3: 'Viewer',
    status1: 'Active',
    status2: 'Invited',
    status3: 'Active',
    symbol1: 'JL',
    symbol2: 'AM',
    symbol3: 'SR',
  },
};
for (const part of parts) {
  const wire = document.createElement('div');
  wire.className = 'wire-lines';
  wire.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) wire.append(document.createElement('i'));
  part.append(wire);
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('part-outline');
  svg.setAttribute('aria-hidden', 'true');
  const rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('x', '1');
  rect.setAttribute('y', '1');
  rect.setAttribute('rx', '6');
  rect.setAttribute('pathLength', '100');
  svg.append(rect);
  part.append(svg);
}
for (const phase of phases) {
  const route = document.createElementNS(ns, 'path');
  route.classList.add('route');
  route.dataset.route = phase.key;
  const signal = route.cloneNode();
  signal.classList.remove('route');
  signal.classList.add('signal');
  signal.setAttribute('pathLength', '100');
  routes.append(route, signal);
  signals.set(phase.key, signal);
}
function measure() {
  const root = stage.getBoundingClientRect();
  for (const phase of phases) {
    const from = document.querySelector(`[data-source="${phase.key}"] .source-port`).getBoundingClientRect();
    const to = document.querySelector(`[data-part="${phase.key}"]`).getBoundingClientRect();
    const x1 = from.left - root.left + from.width / 2;
    const y1 = from.top - root.top + from.height / 2;
    const x2 = to.left - root.left;
    const y2 = to.top - root.top + to.height / 2;
    const mid = x1 + (x2 - x1) * 0.5;
    const d = `M${x1} ${y1}H${mid - 10}Q${mid} ${y1} ${mid} ${y1 + (y2 > y1 ? 10 : -10)}V${y2 + (y2 > y1 ? -10 : 10)}Q${mid} ${y2} ${mid + 10} ${y2}H${x2}`;
    document.querySelector(`.route[data-route="${phase.key}"]`).setAttribute('d', d);
    signals.get(phase.key).setAttribute('d', d);
  }
}
function finish() {
  complete = true;
  bench.dataset.playback = 'complete';
  cancelAnimationFrame(frame);
  for (const animation of animations) animation.cancel();
  animations = [];
  for (const part of parts) part.dataset.state = 'done';
  for (const source of document.querySelectorAll('[data-source]')) {
    source.dataset.active = 'false';
    source.dataset.complete = 'true';
  }
  status.textContent = 'Built from the shared foundation';
  document.querySelector('.screen-count').textContent = '4 foundations reused';
  pause.disabled = true;
  pause.textContent = 'Pause';
}
function tick() {
  if (complete) return;
  const time = Number(clock.currentTime) || 0;
  const phase = [...phases].reverse().find((item) => time >= item.start);
  if (phase && phase.key !== currentPhase) {
    currentPhase = phase.key;
    status.textContent = phase.label;
    for (const source of document.querySelectorAll('[data-source]'))
      source.dataset.active = String(source.dataset.source === phase.key);
  }
  for (const part of parts) {
    const p = phases.find((item) => item.key === part.dataset.part);
    if (time >= p.start + 400) part.dataset.state = 'built';
  }
  document.querySelector('.screen-count').textContent =
    `${phases.filter((p) => time >= p.start + 900).length} / 4 foundations reused`;
  for (const p of phases)
    document.querySelector(`[data-source="${p.key}"]`).dataset.complete = String(time >= p.start + 900);
  if (time >= duration) {
    finish();
    return;
  }
  if (!userPaused && visible && !document.hidden) frame = requestAnimationFrame(tick);
}
function sync() {
  const playing = !complete && !userPaused && visible && !document.hidden;
  bench.dataset.playback = complete ? 'complete' : playing ? 'playing' : 'paused';
  bench.dataset.inView = String(visible);
  for (const animation of animations) playing ? animation.play() : animation.pause();
  pause.textContent = userPaused ? 'Resume' : 'Pause';
  pause.setAttribute('aria-pressed', String(userPaused));
  cancelAnimationFrame(frame);
  if (playing) frame = requestAnimationFrame(tick);
}
function build() {
  cancelAnimationFrame(frame);
  for (const animation of animations) animation.cancel();
  animations = [];
  if (reduced.matches) {
    finish();
    return;
  }
  complete = false;
  started = true;
  userPaused = false;
  currentPhase = '';
  pause.disabled = false;
  status.textContent = 'Starting with the shared foundations';
  document.querySelector('.screen-count').textContent = '0 / 4 foundations reused';
  measure();
  for (const source of document.querySelectorAll('[data-source]')) {
    source.dataset.active = 'false';
    source.dataset.complete = 'false';
  }
  const counters = {};
  for (const part of parts) {
    part.dataset.state = 'draft';
    const p = phases.find((item) => item.key === part.dataset.part);
    const order = counters[p.key] || 0;
    counters[p.key] = order + 1;
    const delay = p.start + 350 + order * 110;
    animations.push(
      part.querySelector('.part-content').animate(
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 650, delay, easing: ease, fill: 'both' },
      ),
    );
    animations.push(
      part.querySelector('.wire-lines').animate([{ opacity: 0.8 }, { opacity: 0 }], {
        duration: 400,
        delay: delay - 100,
        easing: ease,
        fill: 'both',
      }),
    );
    animations.push(
      part.querySelector('.part-outline rect').animate(
        [
          { strokeDashoffset: 100, opacity: 0 },
          { strokeDashoffset: 100, opacity: 1, offset: 0.05 },
          { strokeDashoffset: 0, opacity: 1, offset: 0.7 },
          { strokeDashoffset: 0, opacity: 0 },
        ],
        { duration: 1000, delay: p.start, easing: ease, fill: 'both' },
      ),
    );
    if (p.key === 'rows')
      for (const [index, row] of [...part.querySelectorAll('.product-row')].entries())
        animations.push(
          row.animate(
            [
              { opacity: 0, transform: 'translateY(6px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 500, delay: delay + index * 110, easing: ease, fill: 'both' },
          ),
        );
  }
  for (const p of phases)
    animations.push(
      signals.get(p.key).animate(
        [
          { strokeDashoffset: 100, opacity: 0 },
          { strokeDashoffset: 80, opacity: 1, offset: 0.12 },
          { strokeDashoffset: -18, opacity: 1, offset: 0.85 },
          { strokeDashoffset: -25, opacity: 0 },
        ],
        { duration: 1000, delay: p.start - 150, easing: 'linear', fill: 'both' },
      ),
    );
  clock = bench.animate([{ opacity: 1 }, { opacity: 1 }], { duration, fill: 'both' });
  animations.push(clock);
  sync();
}
for (const button of document.querySelectorAll('[data-screen]'))
  button.addEventListener('click', () => {
    for (const tab of document.querySelectorAll('[data-screen]'))
      tab.setAttribute('aria-pressed', String(tab === button));
    const data = screens[button.dataset.screen];
    for (const item of document.querySelectorAll('[data-nav]'))
      item.classList.toggle('selected-nav', item.dataset.nav === button.dataset.screen);
    for (const node of document.querySelectorAll('[data-copy]')) node.textContent = data[node.dataset.copy];
    build();
  });
replay.addEventListener('click', build);
pause.addEventListener('click', () => {
  userPaused = !userPaused;
  sync();
});
document.addEventListener('visibilitychange', sync);
reduced.addEventListener('change', () => {
  if (reduced.matches) finish();
});
new ResizeObserver(measure).observe(stage);
new IntersectionObserver(
  ([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !started) build();
    else sync();
  },
  { threshold: 0.25 },
).observe(stage);
document.querySelector('.bench-controls').hidden = false;
for (const part of parts) if (!reduced.matches) part.dataset.state = 'draft';
measure();
