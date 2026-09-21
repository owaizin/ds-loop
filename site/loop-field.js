// Shared geometry keeps the selected homepage loop identical to its playground preview.
export const selectedLoopSettings = Object.freeze({
  count: 24,
  width: 125,
  height: 84,
  depth: 88,
  vanish: 75,
  zoom: 80,
  opacity: 48,
  thickness: 1,
  glow: 100,
  motion: 'inward',
  duration: 12,
});

export function createLoopField(field, initial) {
  let state = { ...initial };
  let paused = true;
  let inView = true;
  let phase = 0;
  let frame = 0;
  let previousTime = null;
  const original = field.cloneNode(true);
  let rings = [];
  let frontEdges = [];
  let originalMode = true;
  const ns = 'http://www.w3.org/2000/svg';
  const smooth = (x) => {
    const t = Math.max(0, Math.min(1, x));
    return t * t * (3 - 2 * t);
  };
  function rebuild() {
    // The two original rings and the original cubic light arc survive reset exactly.
    originalMode =
      state.count === 2 &&
      state.depth === 0 &&
      state.vanish === 0 &&
      (state.motion === 'still' || state.motion === 'breathe');
    field.replaceChildren(...[...original.childNodes].map((node) => node.cloneNode(true)));
    frontEdges = [...field.querySelectorAll('path')];
    rings = [...field.querySelectorAll('ellipse')];
    if (!originalMode) {
      for (const ring of rings) ring.remove();
      const group = document.createElementNS(ns, 'g');
      group.setAttribute('data-lab-rings', '');
      field.insertBefore(group, frontEdges[0]);
      rings = Array.from({ length: state.count }, () => {
        const ring = document.createElementNS(ns, 'ellipse');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#a59bc9');
        group.append(ring);
        return ring;
      });
    }
    render();
  }

  function render() {
    field.parentElement.style.transform = `scale(${state.zoom / 100})`;
    const breathing = state.motion === 'breathe' ? 1 + Math.sin(phase * Math.PI * 2) * 0.045 : 1;
    field.style.transform = `scale(${(state.width / 100) * breathing}, ${(state.height / 100) * breathing})`;
    field.style.transformOrigin = '50% 50%';
    const flowing = state.motion === 'inward' || state.motion === 'outward';
    for (const [index, ring] of rings.entries()) {
      let fade = 1;
      if (!originalMode) {
        const travel = state.motion === 'outward' ? -phase : phase;
        const position = flowing ? (((index + travel) % state.count) + state.count) % state.count : index;
        const t = position / state.count;
        // Preserve generous outer spacing, then compress rings toward a vanishing point.
        const depth = state.depth / 100;
        const flatScale = Math.max(0.04, 1 - position * Math.min(30 / 535, 0.94 / state.count));
        const tunnelScale = Math.exp(-t * 4.2);
        const scale = flatScale * (1 - depth) + tunnelScale * depth;
        const cy = 290 + (state.vanish / 100) * 230 * (1 - scale);
        ring.setAttribute('cx', '550');
        ring.setAttribute('cy', cy.toFixed(3));
        ring.setAttribute('rx', (535 * scale).toFixed(3));
        ring.setAttribute('ry', (236 * scale).toFixed(3));
        // Both ends reach zero opacity before wrapping: no jump at the loop seam.
        if (flowing) fade = smooth(t / 0.07) * smooth((1 - t) / 0.14);
      }
      const originalOpacity = originalMode && index === 1 ? 0.8 : 1;
      ring.setAttribute('opacity', ((state.opacity / 100) * fade * originalOpacity).toFixed(4));
      ring.setAttribute('stroke-width', state.thickness);
    }
    for (const edge of frontEdges) edge.setAttribute('opacity', state.glow / 100);
  }

  function tick(time) {
    if (previousTime !== null) phase = (phase + (time - previousTime) / (state.duration * 1000)) % 1;
    previousTime = time;
    render();
    frame = requestAnimationFrame(tick);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    previousTime = null;
    if (state.motion !== 'still' && !paused && inView && !document.hidden)
      frame = requestAnimationFrame(tick);
  }

  rebuild();
  document.addEventListener('visibilitychange', syncAnimation);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncAnimation();
    }).observe(field.parentElement);
  }
  return {
    update(next, resetPhase = false) {
      state = { ...next };
      if (resetPhase) phase = 0;
      rebuild();
      syncAnimation();
    },
    setPaused(value) {
      paused = value;
      syncAnimation();
    },
  };
}
