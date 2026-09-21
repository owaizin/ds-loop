// Static content remains readable when JavaScript is unavailable.
const choiceGroup = document.querySelector('.loop-choices');
if (choiceGroup) {
  const choices = [...choiceGroup.querySelectorAll('[data-loop-choice]')];
  const scenes = [...document.querySelectorAll('[data-loop-scene]')];
  const choose = (id) => {
    for (const button of choices)
      button.setAttribute('aria-pressed', String(button.dataset.loopChoice === id));
    for (const scene of scenes) scene.hidden = scene.dataset.loopScene !== id;
  };
  const revealHash = () => {
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    const details = target.closest('.loop-detail');
    if (details) details.open = true;
    if (target.dataset.loopScene) choose(target.dataset.loopScene);
  };
  choose('improve');
  choiceGroup.hidden = false;
  for (const button of choices) {
    button.addEventListener('click', () => {
      choose(button.dataset.loopChoice);
      history.replaceState(null, '', `#loop-${button.dataset.loopChoice}`);
    });
  }
  revealHash();
  window.addEventListener('hashchange', revealHash);
}
