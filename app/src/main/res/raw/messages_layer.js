// Messages layer (desktop site in its own WebView over the feed): tell the app when the
// page navigates in-page (pushState/replaceState/popstate) to somewhere outside Messages,
// so it can close the layer and open that page in the main, mobile view. WebView does not
// report those navigations as page loads.
(() => {
  if (window.__mbMessagesLayerHooked) return;
  window.__mbMessagesLayerHooked = true;

  // The Facebook logo in the header leads home and would reload the feed: it becomes a close
  // button in the same circle style as the header's other buttons. The colors are read from a
  // neighbouring header button, so it follows light, dark and OLED themes by itself.
  const X_PATH = 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';
  const X_ICON = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="' + X_PATH + '"/></svg>') + '")';
  const LOGO = '[role="banner"] a[href="/"][role="link"]';
  const style = document.createElement('style');
  style.textContent =
    LOGO + '{display:flex !important;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;' +
      'background-color:var(--mb-x-bg,rgba(255,255,255,.1)) !important}' +
    LOGO + ' svg{display:none !important}' +
    LOGO + '::after{content:"";width:20px;height:20px;background-color:var(--mb-x-fg,#e2e5e9);' +
      '-webkit-mask:' + X_ICON + ' center/contain no-repeat;mask:' + X_ICON + ' center/contain no-repeat}';
  (document.head || document.documentElement).appendChild(style);
  const syncColors = () => {
    const ref = Array.from(document.querySelectorAll('[role="banner"] [role="button"]')).find(b => {
      const r = b.getBoundingClientRect();
      return r.width >= 36 && r.width <= 44 && r.left > 100 && b.querySelector('svg') &&
        getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)';
    });
    if (!ref) return;
    const root = document.documentElement.style;
    root.setProperty('--mb-x-bg', getComputedStyle(ref).backgroundColor);
    root.setProperty('--mb-x-fg', getComputedStyle(ref.querySelector('svg')).fill);
  };
  setInterval(syncColors, 1000);
  syncColors();
  // Tapping it closes the layer (the feed underneath is untouched) instead of going home.
  document.addEventListener('click', (e) => {
    if (!(e.target.closest && e.target.closest(LOGO))) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      if (window.FaceboostPage) window.FaceboostPage.postMessage(JSON.stringify({ call: 'leftMessages', url: 'https://www.facebook.com/' }));
      else if (window.MessagesBridge) window.MessagesBridge.onLeftMessages('https://www.facebook.com/');
    } catch (err) {}
  }, true);

  const check = () => {
    try {
      if (/^\/(messages|messenger|login|checkpoint)/.test(location.pathname)) return;
      if (window.FaceboostPage) window.FaceboostPage.postMessage(JSON.stringify({ call: 'leftMessages', url: location.href }));
      else if (window.MessagesBridge) window.MessagesBridge.onLeftMessages(location.href);
    } catch (e) {}
  };
  ['pushState', 'replaceState'].forEach((k) => {
    const orig = history[k];
    history[k] = function () {
      const r = orig.apply(this, arguments);
      setTimeout(check, 0);
      return r;
    };
  });
  window.addEventListener('popstate', check);
})();
