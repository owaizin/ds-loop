for (const button of document.querySelectorAll('[data-copy]')) {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copy);
    const status = document.getElementById(`${button.dataset.copy}-status`);
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(target.textContent.trim());
      status.textContent = `${button.dataset.copyKind || 'Command'} copied.`;
      button.textContent = 'Copied';
    } catch {
      status.textContent = 'Copy unavailable. Select the text below and copy it manually.';
      button.textContent = 'Copy';
    } finally {
      button.disabled = false;
    }
  });
}
if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('.docs-nav a[href^="#"]')];
  const observer = new IntersectionObserver(
    (entries) => {
      const current = entries.find((entry) => entry.isIntersecting);
      if (!current) return;
      for (const link of links) {
        if (link.hash === `#${current.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-10% 0px -65% 0px' },
  );
  for (const link of links) {
    const section = document.getElementById(link.hash.slice(1));
    if (section) observer.observe(section);
  }
}
