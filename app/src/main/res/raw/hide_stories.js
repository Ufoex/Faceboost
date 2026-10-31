// Hide "story" container from feed.
(function() {
  const hideTargetElement = () => {
    const storyContainer = isDesktopMode() ? document.querySelector('.x193iq5w.xgmub6v.x1ceravr')
        : document.querySelector('[data-mcomponent="MContainer"][data-srat="43"]');

    if (storyContainer) storyContainer.style.display = 'none';
  };

  hideTargetElement();

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; hideTargetElement(); });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
