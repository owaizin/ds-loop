const stage = document.querySelector('.comparison-stage');
const slider = document.getElementById('reveal');
if (stage && slider) {
  slider.disabled = false;
  const output = document.querySelector('output');
  const update = (value) => {
    const split = Math.min(100, Math.max(0, Math.round(value)));
    slider.value = String(split);
    slider.setAttribute('aria-valuetext', `${split}% drifting apart, ${100 - split}% shared foundation`);
    stage.style.setProperty('--split', `${split}%`);
    output.textContent = `${split} / ${100 - split}`;
  };
  slider.addEventListener('input', () => update(Number(slider.value)));
  let dragging = false;
  const move = (event) => {
    const bounds = stage.getBoundingClientRect();
    update(((event.clientX - bounds.left) / bounds.width) * 100);
  };
  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    dragging = true;
    stage.setPointerCapture(event.pointerId);
    move(event);
  });
  stage.addEventListener('pointermove', (event) => {
    if (dragging) move(event);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stage.addEventListener(type, () => {
      dragging = false;
    });
  }
}
