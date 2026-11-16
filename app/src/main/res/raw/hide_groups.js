// Hide group suggestions on search page
(() => {
  const hideLastGroupSuggestion = () => {
    if (window.location.href.includes('facebook.com/search')) {
      const parents = document.querySelectorAll('[data-is-h-scrollable]');
      const lastParent = parents[parents.length - 1]?.closest('.m.bg-s1');
      if (lastParent) lastParent.style.display = 'none';
    }
  };

  hideLastGroupSuggestion();
  new MutationObserver(hideLastGroupSuggestion).observe(document.body, { childList: true, subtree: true });
})();

// Hide on comments
(() => {
  const hideGroupContainer = () => {
    if (!window.location.href.includes('facebook.com/story.php?') && !window.location.href.includes('facebook.com/groups')) return;

    const groupContainer = document.querySelector('h3[data-tti-phase="-1"].m');
    if (groupContainer) {
      const parent = groupContainer.closest('.m.bg-s2');
      if (parent) parent.style.display = 'none';
    }
  };

  hideGroupContainer();

  new MutationObserver(hideGroupContainer).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();

// Hide group posts from the main feed (mobile). The mobile site no longer renders a link to the group in the post's
// header, so a group post is told by its avatar: the square group icon with the author's round avatar over it (a normal
// post starts with one round avatar). The older header link still counts. The whole feed is looked over on every burst
// of changes, since a post's header renders after its container.
(() => {
  const isGroupPost = (p) => {
    if (p.querySelector('h3[data-tti-phase="-1"] a[href*="/groups/"]')) return true;
    const [icon, overlay] = p.querySelectorAll('img');
    return !!(icon && overlay && !icon.classList.contains('rounded') && overlay.classList.contains('rounded'));
  };

  const hideGroupPosts = () => {
    if (window.location.pathname !== '/') return;
    document.querySelectorAll('[data-tracking-duration-id]').forEach(p => {
      if (p.style.display === 'none') return;
      if (isGroupPost(p) && !window.hideFeedPost(p)) p.style.display = 'none';
    });
  };

  hideGroupPosts();

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; hideGroupPosts(); });
  }).observe(document.body, { childList: true, subtree: true });
})();
