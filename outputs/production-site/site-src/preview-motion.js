/* Update selection immediately; a subtle fade lets the eye follow the new data. */
const previewTransitions = new Map();

function transitionPreview(key, elements, update, animate = true) {
  const previous = previewTransitions.get(key);
  previous?.forEach(animation => animation.cancel());
  previewTransitions.delete(key);
  update();

  const nodes = elements.filter(Boolean);
  if (!animate || !nodes.length || matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !nodes.every(node => typeof node.animate === 'function')) return;

  const animations = nodes.map(node => node.animate(
    [{opacity: 0.82}, {opacity: 1}],
    {duration: 320, easing: 'ease-out'}
  ));
  previewTransitions.set(key, animations);
  Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
    if (previewTransitions.get(key) === animations) previewTransitions.delete(key);
  });
}
