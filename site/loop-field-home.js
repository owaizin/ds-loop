import { createLoopField, selectedLoopSettings } from './loop-field.js';

const field = document.querySelector('.restored-orbital-field');
const playback = document.getElementById('loop-playback');
if (field && playback) {
  const controller = createLoopField(field, selectedLoopSettings);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // The existing loop button pauses the rings and central panel together.
  const sync = () => controller.setPaused(playback.classList.contains('is-paused') || reducedMotion.matches);
  new MutationObserver(sync).observe(playback, { attributes: true, attributeFilter: ['class'] });
  reducedMotion.addEventListener('change', sync);
  sync();
}
