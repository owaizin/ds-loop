// A preview-only layer: the homepage supplies the current loop, unchanged.
(async () => {
  const scene = document.getElementById('scene');
  const status = document.getElementById('lab-status');
  const form = document.getElementById('controls');
  const pause = document.getElementById('motion-pause');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const defaults = {
    count: 2,
    width: 100,
    height: 100,
    depth: 0,
    vanish: 0,
    zoom: 100,
    opacity: 30,
    thickness: 1,
    glow: 100,
    motion: 'still',
    duration: 12,
  };
  let state = { ...defaults };
  let paused = false;
  let fieldController;
  function syncAnimation() {
    fieldController.setPaused(paused);
  }

  function readSettings(values) {
    const next = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const input = form.elements.namedItem(key);
      if (key === 'motion') {
        if (['still', 'inward', 'outward', 'breathe'].includes(values[key])) next[key] = values[key];
      } else if (values[key] !== undefined && Number.isFinite(Number(values[key]))) {
        const step = Number(input.step) || 1;
        next[key] = Number(
          (
            Math.round(Math.max(Number(input.min), Math.min(Number(input.max), Number(values[key]))) / step) *
            step
          ).toFixed(2),
        );
      }
    }
    return next;
  }

  function updateControls() {
    for (const [key, value] of Object.entries(state)) {
      form.elements.namedItem(key).value = String(value);
      const output = document.getElementById(`${key}-value`);
      if (output)
        output.value = `${value}${key === 'count' ? '' : key === 'duration' ? ' s' : key === 'thickness' ? ' px' : '%'}`;
    }
    pause.disabled = state.motion === 'still';
    pause.textContent = paused ? 'Play ellipses' : 'Pause ellipses';
    pause.setAttribute('aria-pressed', String(paused));
  }

  function apply(next, message) {
    state = readSettings(next);
    paused = false;
    updateControls();
    fieldController.update(state, true);
    syncAnimation();
    if (message) status.textContent = message;
  }

  async function copy(text, message) {
    const fallback = document.getElementById('copy-fallback');
    fallback.hidden = true;
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = message;
    } catch {
      fallback.value = text;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      status.textContent = 'Select and copy the text below.';
    }
  }

  try {
    const homepage = new URL('../../index.html', location.href);
    const response = await fetch(homepage);
    if (!response.ok) throw new Error('Homepage unavailable');
    const source = new DOMParser().parseFromString(await response.text(), 'text/html');
    const workflow = source.getElementById('workflow');
    if (!workflow?.querySelector('.restored-orbital-field')) throw new Error('Current loop unavailable');
    for (const element of workflow.querySelectorAll('[src], a[href]')) {
      const attribute = element.hasAttribute('src') ? 'src' : 'href';
      element.setAttribute(attribute, new URL(element.getAttribute(attribute), homepage).href);
    }
    scene.replaceChildren(workflow);
    const { createLoopField } = await import('../../loop-field.js');
    fieldController = createLoopField(workflow.querySelector('.restored-orbital-field'), defaults);
    const script = document.createElement('script');
    script.src = new URL('../../home.js', location.href).href;
    document.body.append(script);
    const initial = Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
    apply(initial);
    window.addEventListener('hashchange', () => {
      const settings = Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
      if (reducedMotion.matches) settings.motion = 'still';
      apply(settings, 'Settings restored from the preview link.');
    });
    if (reducedMotion.matches && state.motion !== 'still') {
      paused = true;
      updateControls();
      syncAnimation();
      status.textContent =
        'Motion is paused for your reduced-motion preference. Press Play ellipses to preview it.';
    }
    form.addEventListener('submit', (event) => event.preventDefault());
    form.addEventListener('input', (event) => {
      const key = event.target.name;
      if (!Object.hasOwn(defaults, key)) return;
      state = readSettings({ ...state, [key]: event.target.value });
      if (key === 'motion') {
        paused = false;
      }
      updateControls();
      fieldController.update(state, key === 'motion');
      syncAnimation();
    });
    document.getElementById('reset').addEventListener('click', () => {
      apply(defaults, 'Original background restored. Homepage unchanged.');
      history.replaceState(null, '', location.pathname + location.search);
    });
    document.getElementById('infinity').addEventListener('click', () => {
      apply(
        {
          ...defaults,
          count: 24,
          width: 125,
          height: 84,
          depth: 88,
          vanish: 75,
          opacity: 48,
          zoom: 80,
          motion: reducedMotion.matches ? 'still' : 'inward',
        },
        'Infinity preset loaded. Adjust the geometry or motion to make it yours.',
      );
    });
    pause.addEventListener('click', () => {
      paused = !paused;
      updateControls();
      syncAnimation();
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) {
        paused = true;
        updateControls();
        syncAnimation();
      }
    });
    document
      .getElementById('copy')
      .addEventListener('click', () =>
        copy(
          JSON.stringify({ version: 1, ...state }, null, 2),
          'Settings copied. Paste them here when you have a direction you like.',
        ),
      );
    document.getElementById('share').addEventListener('click', () => {
      const url = new URL(location.href);
      url.hash = new URLSearchParams(state).toString();
      copy(url.href, 'Preview link copied. It restores these settings on this local site.');
    });
  } catch (error) {
    scene.textContent = 'Could not load the current loop. Start the local site and reload this page.';
    status.textContent = error.message;
    for (const input of document.querySelectorAll(
      '.lab-controls button, .lab-controls input, .lab-controls select',
    ))
      input.disabled = true;
  }
})();
