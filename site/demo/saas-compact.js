const main = document.querySelector('main');
const canvas = document.querySelector('.comparison-canvas');
const range = document.getElementById('compact-reveal');
const output = document.querySelector('output');
const pairs = [...document.querySelectorAll('.pair')];
function reveal() {
  const bounds = canvas.getBoundingClientRect();
  const split = (1 - Number(range.value) / 100) * bounds.width;
  main.style.setProperty('--split', `${100 - Number(range.value)}%`);
  output.value = `${range.value}%`;
  range.setAttribute('aria-valuetext', `${range.value}% shared foundation revealed`);
  for (const pair of pairs) {
    const rect = pair.getBoundingClientRect();
    const clip = Math.max(0, Math.min(rect.width, split - (rect.left - bounds.left)));
    pair.querySelector('.after').style.clipPath = `inset(0 0 0 ${clip}px)`;
    pair.querySelector('.before').setAttribute('aria-hidden', String(clip === 0));
    pair.querySelector('.after').setAttribute('aria-hidden', String(clip === rect.width));
  }
}
range.addEventListener('input', reveal);
let grabOffset = 0;
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || event.target === range) return;
  const bounds = canvas.getBoundingClientRect();
  const current = bounds.left + (1 - Number(range.value) / 100) * bounds.width;
  grabOffset = event.target.closest('.canvas-divider') ? event.clientX - current : 0;
  canvas.setPointerCapture(event.pointerId);
  move(event);
});
function move(event) {
  if (!canvas.hasPointerCapture(event.pointerId)) return;
  const bounds = canvas.getBoundingClientRect();
  range.value = String(
    Math.round(
      100 - Math.max(0, Math.min(1, (event.clientX - grabOffset - bounds.left) / bounds.width)) * 100,
    ),
  );
  reveal();
}
canvas.addEventListener('pointermove', move);
canvas.addEventListener('pointerup', (event) => canvas.releasePointerCapture(event.pointerId));
if ('ResizeObserver' in window) new ResizeObserver(reveal).observe(canvas);
reveal();
