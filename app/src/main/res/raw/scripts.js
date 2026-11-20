
// Desktop mode identifier
(() => {
    window.isDesktopMode = () => {
        return document.querySelector('html[id="facebook"]') !== null;
    }
})();

// Feed identifier
(() => {
    window.isFeed = () => {
        // ponytail: cheap string check first — the span scan below walks the
        // whole DOM, and every guarded observer calls isFeed per batch.
        const isHomeUrl = window.location.pathname === '/' &&
            (window.location.hostname === 'm.facebook.com' || window.location.hostname === 'www.facebook.com');
        if (!isHomeUrl) return false;

        if (window.isDesktopMode()) return true;

        const hasSpecialButton = Array.from(document.querySelectorAll('[role="button"] span'))
            .some(span => span.textContent === '󱥆');

        return hasSpecialButton;
    };
})();





(function() {
    if (!window.isDesktopMode()) return;

    document.documentElement.style.fontSize = '18px';


    // Do not stick the navbar by default
    (() => {
      const waitForBanner = () => new Promise(resolve => {
        const existing = document.querySelector('div[role="banner"]');
        if (existing) return resolve(existing);

        new MutationObserver((mutations, obs) => {
          for (const { addedNodes } of mutations) {
            for (const node of addedNodes) {
              if (node.nodeType === 1 && node.matches('div[role="banner"]')) {
                obs.disconnect();
                return resolve(node);
              }
            }
          }
        }).observe(document.body, { childList: true, subtree: true });
      });

      const forceAbsolute = el => {
        if (el?.classList.contains('xixxii4')) {
          el.style.setProperty('position', 'absolute', 'important');
        }
      };

      waitForBanner().then(banner => {
        const style = document.createElement('style');
        style.textContent = `
          div[role="banner"].xixxii4,
          div[role="banner"] .xixxii4 {
            position: absolute !important;
          }
        `;
        document.head.appendChild(style);

        forceAbsolute(banner);
        banner.querySelectorAll('.xixxii4').forEach(forceAbsolute);

        new MutationObserver(mutations => {
          for (const m of mutations) {
            if (m.type === 'childList') {
              m.addedNodes.forEach(n => {
                forceAbsolute(n);
                n.querySelectorAll?.('.xixxii4')?.forEach(forceAbsolute);
              });
            } else if (m.type === 'attributes' && m.attributeName === 'class') {
              forceAbsolute(m.target);
            }
          }
        }).observe(banner, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      });
    })();


    // Remove "send" button to save space
    // Remove the third element in the interaction bar if nb is 4
    (function() {
      const parentSelector = '.xbmvrgn.x1diwwjn';
      const childSelector = '.x10b6aqq.x1yrsyyn.xs83m0k';

      function checkAndRemoveThird(parent) {
        const children = parent.querySelectorAll(childSelector);
        if (children.length === 4) children[2].remove();
      }

      document.querySelectorAll(parentSelector).forEach(checkAndRemoveThird);

      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              if (node.matches(parentSelector)) {
                checkAndRemoveThird(node);
              }
              node.querySelectorAll(parentSelector).forEach(checkAndRemoveThird);
            }
          });
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    })();
})();


// Scroll to top on back-press at feed
(() => {
    window.backHandlerNB = () => {

        const dialogs = document.querySelectorAll('div[role="dialog"]');
        const isMenu = document.querySelector('div[role="menu"]')

        function scrollToTop() {
            if (window.scrollY !== 0) {
              // to interrupt any current scroll event.
              document.body.style.overflow = 'hidden';
              setTimeout(() => {
                 document.body.style.overflow = '';
                 window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 30);
              return "scrolling";
           } else return "exit";
        }

        // Messenger chat windows on the desktop site aren't role="dialog": each is a
        // fixed-position box holding a message composer, so the checks below would
        // see nothing open and Back would leave the page (or close the app). Close
        // the last one instead: the right-most button of its header row is "Close
        // chat" in every language. Messages scrolled up under the header have
        // buttons there too, so only buttons that are actually on top count.
        function closeChatWindow() {
            const windows = [];
            document.querySelectorAll('[contenteditable="true"]').forEach((editor) => {
                let box = editor.parentElement;
                while (box && box !== document.body && getComputedStyle(box).position !== 'fixed')
                    box = box.parentElement;
                if (box && box !== document.body && !box.closest('[role="dialog"]') &&
                        box.getBoundingClientRect().width > 0 && !windows.includes(box))
                    windows.push(box);
            });
            const chat = windows[windows.length - 1];
            if (!chat) return false;
            const top = chat.getBoundingClientRect().top;
            let close = null, closeX = -Infinity;
            chat.querySelectorAll('[role="button"]').forEach((button) => {
                const rect = button.getBoundingClientRect();
                if (rect.width === 0 || rect.top < top || rect.top >= top + 56 || rect.left <= closeX)
                    return;
                const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                if (hit && button.contains(hit)) {
                    close = button;
                    closeX = rect.left;
                }
            });
            if (!close) return false;
            close.click();
            return true;
        }

        if (window.isDesktopMode()) {
            if (!isMenu && !dialogs.length && closeChatWindow())
                return "true";
            // The desktop feed used to keep one role="dialog" element around at
            // rest; it now has none, so "nothing open" means no dialog at all.
            if (window.isFeed() && !isMenu && !dialogs.length)
                return scrollToTop();
            else if (isMenu || dialogs.length > 1) {
                const escapeEvent = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    keyCode: 27,
                    which: 27,
                    bubbles: true,
                    cancelable: true
                });
                window.dispatchEvent(escapeEvent);
                return "true";
            } else return "false"
        } else if (window.isFeed() && !isMenu && !dialogs.length) {
            return scrollToTop();
        } else return "false";
    }
})();

// Enable press and hold caption selection and apply custom selection color
(() => {
  const makeSelectable = (el) => {
    if (el.closest('div[role="button"]')) return;
    el.style.userSelect = 'text';
    el.style.pointerEvents = 'auto';
  };

  const updateText = () => {
    // ponytail: caption-selectable only matters on feed; skip while viewing
    // a post so back-navigation batch doesn't pay this scan.
    if (!window.isFeed()) return;
    document.querySelectorAll('.native-text').forEach(makeSelectable);
  };

  const selectionStyle = document.createElement('style');
  selectionStyle.textContent = `
    .native-text::selection {
      background: #ccc;
      color: black;
    }
  `;
  document.head.appendChild(selectionStyle);

  updateText();

  new MutationObserver(updateText).observe(document.body, {
    childList: true,
    subtree: true
  });
})();

// Enhance Loading Overlay Script
(function() {
    function applyOverlayStyle() {
        const overlays = document.querySelectorAll('.loading-overlay');
        overlays.forEach(overlay => {
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
            // Never let a stuck Facebook loading overlay swallow taps:
            // it sometimes stays full-screen after a navigation is done
            // (e.g. after an account switch), blocking the whole UI.
            overlay.style.pointerEvents = 'none';
        });
    }
    applyOverlayStyle();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length)
                applyOverlayStyle();
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // A full-screen .loading-overlay is Facebook's SPA/spinner layer. On this
    // WebView it sometimes never clears after a navigation or an account
    // switch, permanently covering and blocking the page (the switch actually
    // succeeds, but the UI appears to stay "loading"). Remove a full-screen
    // overlay that lingers after the document has finished loading.
    const coversViewport = (overlay) => {
        const rect = overlay.getBoundingClientRect();
        return (
            rect.width >= window.innerWidth - 2 &&
            rect.height >= window.innerHeight - 2
        );
    };

    const clearStale = () => {
        document.querySelectorAll('.loading-overlay').forEach((overlay) => {
            if (coversViewport(overlay)) overlay.remove();
        });
    };

    // Full document load: once finished, drop any leftover overlay quickly.
    if (document.readyState !== 'complete') {
        window.addEventListener('load', () => setTimeout(clearStale, 1500));
    }

    // SPA transitions (account switch, navigation inside m.facebook.com):
    // let a real transition breathe for a few seconds, then clear it.
    let stuckSince = 0;
    setInterval(() => {
        const overlay = document.querySelector('.loading-overlay');
        if (!overlay || document.readyState !== 'complete' || !coversViewport(overlay)) {
            stuckSince = 0;
            return;
        }
        stuckSince += 1000;
        if (stuckSince >= 3000) {
            overlay.remove();
            stuckSince = 0;
        }
    }, 1000);
})();

// Hide facebook download button and other distractions at login page
(function() {
  function removeDistr() {
    document.querySelector('div[data-bloks-name="bk.components.Flexbox"][style*="background: rgb(255, 255, 255)"].wbloks_1')?.parentElement?.remove();

    document.querySelectorAll(
      'div[data-bloks-name="bk.components.Flexbox"][style*="padding-top: 20px; padding-bottom: 20px"],' +
      'div[data-bloks-name="bk.components.Flexbox"][style*="padding-left: 4px; padding-right: 4px; padding-bottom: 4px"],' +
      'div[data-bloks-name="bk.components.Flexbox"][style*="padding: 10px 12px; background: rgb(255, 255, 255)"],' +
      'div[data-bloks-name="bk.components.Flexbox"][style*="padding: 20px"]'
    )?.forEach(distr => distr.remove());
  }

  removeDistr();

  new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type === 'childList' && m.addedNodes.length) {
        removeDistr();
        break;
      }
    }
  }).observe(document.body, {
    childList: true,
    subtree: true
  });
})();

// Make the loading bar's background transparent
(() => {
    const style = document.createElement('style');
    style.textContent = `
    .revamped-progress-bar-color .loading-bar-background { background: transparent; }
    .loading-bar-background { background-color: transparent; }
    `;
    document.head.appendChild(style);
})();

// Guarded: the bundle is re-evaluated on every SPA navigation in the same
// context, so a top-level const would throw "already declared" and abort
// everything below it (settings button, theme notify, download hook).
if (!window._mbBannerObserver) {
    window._mbBannerObserver = new MutationObserver(() => {

      // ponytail: FB's "Mở ứng dụng / Open app" smart banner lives in
      // .bottom.fixed-container — same bucket as the height<80 banner above.
      // Match the button text (not container text) so typing the phrase in
      // the comment composer can't nuke it. Runs before the feed-ready
      // early-return so the banner dies even while the feed is loading.
      const banner = document.querySelector('.bottom.fixed-container');
      const bannerBtn = banner?.querySelector('div[role="button"]');
      if (bannerBtn && /Mở ứng dụng|Open (in )?app/i.test(bannerBtn.textContent || '')) {
        banner.style.display = 'none';
        return;
      }

      if (location.pathname === '/'
      && document.querySelector('div[role="button"][aria-label*="Facebook"]') === null) return;

      const element = banner;
      if (
        element &&
        !element.hasAttribute('data-shift-on-keyboard-shown')
      ) {
        const heightAttr = element.getAttribute('data-actual-height');
        if (heightAttr && parseInt(heightAttr, 10) < 80) {
          element.style.display = 'none';
        }
      }
    });

    window._mbBannerObserver.observe(document.body, { childList: true, subtree: true });
}


// Hold Effect Script
(function() {
  const style = document.createElement('style');
  style.innerHTML = '* { -webkit-tap-highlight-color: rgba(180, 180, 180, 0.35); }';
  document.head.appendChild(style);
})();


/* The below scripts are specific to the com.eepiemi.materialbook application. */

(() => {
  const onReady = (fn) => {
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', fn);
     else fn();
  };

  onReady(() => {
    const BUTTON_ID = 'custom-settings-btn';
    const ICON_SVG = `
        <svg width="28" height="28" viewBox="0 -960 960 960"  fill="%FILL%">
            <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm112-260q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Z"/>
        </svg>`;

    const getFillColor = () => {
      const color = document.querySelector('meta[name="theme-color"]')?.content?.toLowerCase();
      return color === '#ffffff' ? '#080809' : '#e4e6eb';
    };

    const updateButtonColor = () => {
      const svg = document.querySelector(`#${BUTTON_ID} svg`);
      if (svg) svg.setAttribute('fill', getFillColor());
    };

    const findInsertionPoint = () => {
      const iconSpan = Array.from(document.querySelectorAll('span'))
        .find(span => span.textContent === '󱥊');
      const container = iconSpan?.closest('div[role="button"]')?.parentNode;

      const desktopTarget = document.querySelector(
        '.x6s0dn4.x78zum5.x1s65kcs.x1n2onr6.x1ja2u2z'
      );

      return { container, desktopTarget };
    };

    const createButton = () => {
      const btn = document.createElement('button');
      btn.id = BUTTON_ID;
      btn.setAttribute('style', `
        position: ${findInsertionPoint().desktopTarget === null ? 'fixed' : 'block'};
        top: 8px;
        right: 100px;
        background: transparent;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        pointer-events: auto;
      `);
      btn.innerHTML = ICON_SVG.replace('%FILL%', getFillColor());
      btn.onclick = () => window.FaceboostPage
        ? window.FaceboostPage.postMessage(JSON.stringify({ call: 'openSettings' }))
        : window.SettingsBridge?.onSettingsToggle?.();
      return btn;
    };

    const insertButton = () => {
      if (document.getElementById(BUTTON_ID)) return;

      const { container, desktopTarget } = findInsertionPoint();
      const button = createButton();

      if (desktopTarget) desktopTarget.insertBefore(button, desktopTarget.firstChild);
      else if (container) container.insertBefore(button, container.firstChild);
    };

    insertButton();

    const observer = new MutationObserver(() => {
      if (!document.getElementById(BUTTON_ID) && isFeed()) {
        insertButton();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // observer for theme-color changes
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      new MutationObserver(updateButtonColor).observe(themeMeta, {
        attributes: true,
        attributeFilter: ['content'],
      });
    }
  });
})();


// Color Extraction Script
(function() {
    const meta = document.querySelector('meta[name="theme-color"]');
    // FaceboostPage: the app's Facebook-only message listener; ThemeBridge: older WebViews.
    const notify = () => window.FaceboostPage
        ? window.FaceboostPage.postMessage(JSON.stringify({ call: 'themeColor', color: meta?.content ?? '' }))
        : window.ThemeBridge?.onThemeColorChanged?.(meta?.content ?? "null");
    if (meta) {
        notify();
        new MutationObserver(() => notify())
            .observe(meta, { attributes: true, attributeFilter: ['content'] });
    }
})();

// File Download Script
// Saves a blob only when the page starts a download with it: a blob: URL on an
// <a download> link that is clicked. Pages create blob URLs for plenty of other
// things (desktop Messenger decrypts every photo of an encrypted chat into one),
// and those must never end up in the public Downloads folder.
(function() {
    if (window._downloadBridgeInitialized) return;
    window._downloadBridgeInitialized = true;
    const blobs = new Map();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    // The blob URL already keeps its blob alive until revoked, so the map
    // holds nothing longer than the page itself does.
    URL.createObjectURL = function(obj) {
        const url = originalCreateObjectURL.call(URL, obj);
        if (obj instanceof Blob) blobs.set(url, obj);
        return url;
    };
    URL.revokeObjectURL = function(url) {
        blobs.delete(url);
        return originalRevokeObjectURL.call(URL, url);
    };

    const save = function(anchor) {
        if (!anchor || !anchor.hasAttribute('download')) return;
        const blob = blobs.get(anchor.href);
        if (!blob) return;
        const reader = new FileReader();
        reader.onloadend = function() {
            if (!reader.result) return;
            // FaceboostDownloads: the app's Facebook-only message listener;
            // DownloadBridge: older WebViews and older app versions.
            if (window.FaceboostDownloads)
                FaceboostDownloads.postMessage(JSON.stringify({ call: 'downloadBase64File', a: reader.result, b: blob.type }));
            else if (window.DownloadBridge)
                DownloadBridge.downloadBase64File(reader.result, blob.type);
        };
        reader.readAsDataURL(blob);
    };
    // Links in the document, clicked by the user or by script.
    document.addEventListener('click', function(e) {
        save(e.target.closest && e.target.closest('a'));
    }, true);
    // Detached links clicked by script (the usual way to trigger a download);
    // connected ones are already handled by the listener above.
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() {
        if (!this.isConnected) save(this);
        return originalClick.call(this);
    };
})();

// Image load fix for media viewer
(function() {
  // When an image is promoted to its own composited layer (will-change,
  // transitions), Android WebView can paint only the top part of a tall
  // photo and never finishes the rest. Keep viewer images out of their own
  // layer; transforms (pinch zoom) still work.
  const style = document.createElement("style");
  style.textContent = `
    div[role="dialog"] img {
      will-change: auto !important;
    }
  `;
  document.head.appendChild(style);

  const isViewerImage = (img) => {
    if (location.pathname.indexOf("/photo") === 0) return true;
    const dialog = img.closest && img.closest('div[role="dialog"]');
    if (!dialog) return false;
    // In the video viewer the visible media is the <video>, not the poster
    // image. Leave video viewers alone so the video element and the download
    // capture logic are never disturbed.
    if (dialog.querySelector && dialog.querySelector("video")) return false;
    return true;
  };

  // Force a fresh GPU texture upload: a sub-pixel scale toggle re-rasterizes
  // the element in place, which fixes the "bottom of a tall photo stays
  // black" compositing glitch without touching the image source.
  const nudgeRepaint = (el) => {
    try {
      el.style.webkitTransform = "scale(0.9999)";
      void el.offsetWidth;
      el.style.webkitTransform = "";
    } catch (e) {}
  };

  // Clear and restore src in the same task: the empty state is never painted
  // and the second decode is served from the image cache, producing a
  // complete texture.
  const reDecode = (img) => {
    if (img._fbRedecoding) return;
    const src = img.currentSrc || img.src;
    if (!src || src.indexOf("data:") === 0) return;
    if (!img.complete || img.naturalWidth <= 0) return;
    img._fbRedecoding = true;
    setTimeout(() => {
      img._fbRedecoding = false;
    }, 600);
    img.src = "";
    void img.offsetWidth;
    img.src = src;
  };

  // Retry a few times: the first attempt can run while the browser is still
  // decoding, so we nudge on every pass and re-decode once the image is
  // definitely complete.
  const heal = (img, attempt) => {
    if (!img.isConnected) return;
    if (attempt > 4) return;
    setTimeout(() => {
      if (!img.isConnected) return;
      if (!(img.complete && img.naturalWidth > 0)) {
        heal(img, attempt + 1);
        return;
      }
      nudgeRepaint(img);
      if (attempt === 1) reDecode(img);
      heal(img, attempt + 1);
    }, attempt === 0 ? 150 : 700);
  };

  const processImage = (img) => {
    if (!(img instanceof HTMLImageElement)) return;
    if (!isViewerImage(img)) return;
    img.loading = "eager";
    const start = () => {
      if (!img.isConnected) return;
      if (!(img.complete && img.naturalWidth > 0)) {
        setTimeout(start, 300);
        return;
      }
      heal(img, 0);
    };
    if (typeof img.decode === "function") {
      img.decode().then(start).catch(start);
    }
    img.addEventListener("load", start, { once: true });
    img.addEventListener("error", start, { once: true });
    setTimeout(start, 600);
  };

  // Facebook sometimes renders the viewer photo as a div with
  // background-image. Nudge those too.
  const processBackgrounds = (dialog) => {
    const candidates = dialog.querySelectorAll('div[style*="background-image"]');
    for (const el of candidates) {
      if (el._fbNudged) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 200 || rect.height < 200) continue;
      el._fbNudged = true;
      setTimeout(() => nudgeRepaint(el), 300);
    }
  };

  const scanViewer = () => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) {
      const images = dialog.querySelectorAll('img[src]');
      for (const img of images) processImage(img);
      processBackgrounds(dialog);
    }
    // Full photo pages (photo.php) render the photo as a normal page element.
    // Heal the largest visible photo so it only re-decodes that one image.
    if (location.pathname.indexOf("/photo") === 0) {
      const images = Array.from(document.querySelectorAll('img[src*="fbcdn"]'))
        .filter((img) => {
          const rect = img.getBoundingClientRect();
          return rect.width > 300 && rect.height > 300;
        })
        .sort((a, b) => {
          const areaA = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
          const areaB = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
          return areaB - areaA;
        });
      if (images[0]) processImage(images[0]);
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches('div[role="dialog"]')) {
          scanViewer();
          return;
        }
        if (node.querySelector) {
          const dialog = node.matches && node.matches('div[role="dialog"]')
            ? node
            : node.querySelector('div[role="dialog"]');
          if (dialog) {
            scanViewer();
            return;
          }
        }
      }
      if (mutation.type === "attributes" && mutation.target.tagName === "IMG") {
        processImage(mutation.target);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset"]
  });

  let rescanTimer = null;
  const scheduleRescan = () => {
    if (rescanTimer) return;
    rescanTimer = setTimeout(() => {
      rescanTimer = null;
      if (document.querySelector('div[role="dialog"]') || location.pathname.indexOf("/photo") === 0) {
        scanViewer();
        scheduleRescan();
      }
    }, 1500);
  };

  scanViewer();
  scheduleRescan();
})();

// Composer text in Facebook's dark mode: the textarea inherits black text over its black
// background (the post box in groups and on the feed), so what you type can't be seen.
(() => {
    if (document.getElementById('mb-dark-textbox')) return;
    const s = document.createElement('style');
    s.id = 'mb-dark-textbox';
    s.textContent = '.dark-mode textarea.textbox{color:#e4e6eb !important;caret-color:#e4e6eb !important}';
    document.head.appendChild(s);
})();

// Facebook's mobile site is server driven: after the page has been away for a few minutes
// (frozen, its socket closed) the server starts a new session and sends the page to the Home.
// When that happens by itself right after coming back, put the page where it was.
(() => {
    if (window._mbKeepPage) return;
    window._mbKeepPage = true;
    let before = null, hiddenAt = 0, visibleAt = 0, touched = true;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            before = location.href;
            hiddenAt = Date.now();
        } else {
            visibleAt = Date.now();
            touched = false;
        }
    }, true);
    ['touchstart', 'pointerdown', 'keydown'].forEach(e =>
        document.addEventListener(e, () => { touched = true; }, true));
    ['replaceState', 'pushState'].forEach(m => {
        const orig = history[m];
        history[m] = function (state, title, url) {
            const result = orig.apply(this, arguments);
            try {
                if (before && !touched && visibleAt - hiddenAt > 60000 && Date.now() - visibleAt < 15000 &&
                    new URL(url, location.href).pathname === '/' && new URL(before).pathname !== '/') {
                    const back = before;
                    before = null;
                    location.replace(back);
                }
            } catch (e) {}
            return result;
        };
    });
})();


// "Share via..." in Facebook's share sheet: adds a row under Copy link that runs Copy link,
// catches the link Facebook copies, and hands it to Android's share sheet. Only with the app's
// message listener (FaceboostPage). The Copy link row is found by its icon glyph, so it works in
// every language.
(function() {
    if (window.__mbShareVia) return;
    window.__mbShareVia = true;
    const ROW_ID = 'mb-share-via';
    const ROW_HEIGHT = 56;
    const COPY_GLYPH = '\u{F310F}';
    const LABELS = { es: 'Compartir con\u2026', pt: 'Compartilhar com\u2026', fr: 'Partager via\u2026', de: 'Teilen \u00fcber\u2026', it: 'Condividi con\u2026', pl: 'Udost\u0119pnij przez\u2026', he: '\u05e9\u05d9\u05ea\u05d5\u05e3 \u05d1\u05d0\u05de\u05e6\u05e2\u05d5\u05ea\u2026', iw: '\u05e9\u05d9\u05ea\u05d5\u05e3 \u05d1\u05d0\u05de\u05e6\u05e2\u05d5\u05ea\u2026' };
    // The language Facebook is shown in (the page's), not the phone's: they can differ.
    const pick = (labels, fallback) => labels[(document.documentElement.lang || navigator.language || '').slice(0, 2).toLowerCase()] || fallback;
    const SHARE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>';
    const REPLY_GLYPH = '\u{F30FB}';
    const NM_ID = 'mb-copy-nomention';
    const NM_LABELS = {
        es: 'Copiar sin menci\u00f3n',
        pt: 'Copiar sem men\u00e7\u00e3o',
        fr: 'Copier sans mention',
        de: 'Ohne Erw\u00e4hnung kopieren',
        it: 'Copia senza menzione',
        pl: 'Kopiuj bez wzmianki',
        ru: '\u041a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0431\u0435\u0437 \u0443\u043f\u043e\u043c\u0438\u043d\u0430\u043d\u0438\u044f',
        uk: '\u041a\u043e\u043f\u0456\u044e\u0432\u0430\u0442\u0438 \u0431\u0435\u0437 \u0437\u0433\u0430\u0434\u043a\u0438',
        tr: 'Bahsetmeden kopyala',
        id: 'Salin tanpa sebutan',
        ms: 'Salin tanpa sebutan',
        nl: 'Kopi\u00ebren zonder vermelding',
        ro: 'Copiaz\u0103 f\u0103r\u0103 men\u021biune',
        cs: 'Kop\u00edrovat bez zm\u00ednky',
        sv: 'Kopiera utan omn\u00e4mnande',
        da: 'Kopi\u00e9r uden omtale',
        nb: 'Kopier uten omtale',
        no: 'Kopier uten omtale',
        fi: 'Kopioi ilman mainintaa',
        hu: 'M\u00e1sol\u00e1s eml\u00edt\u00e9s n\u00e9lk\u00fcl',
        el: '\u0391\u03bd\u03c4\u03b9\u03b3\u03c1\u03b1\u03c6\u03ae \u03c7\u03c9\u03c1\u03af\u03c2 \u03b1\u03bd\u03b1\u03c6\u03bf\u03c1\u03ac',
        ar: '\u0646\u0633\u062e \u0628\u062f\u0648\u0646 \u0625\u0634\u0627\u0631\u0629',
        he: '\u05d4\u05e2\u05ea\u05e7\u05d4 \u05dc\u05dc\u05d0 \u05ea\u05d9\u05d5\u05d2',
        iw: '\u05d4\u05e2\u05ea\u05e7\u05d4 \u05dc\u05dc\u05d0 \u05ea\u05d9\u05d5\u05d2',
        hi: '\u092c\u093f\u0928\u093e \u092e\u0947\u0902\u0936\u0928 \u0915\u0947 \u0915\u0949\u092a\u0940 \u0915\u0930\u0947\u0902',
        ja: '\u30e1\u30f3\u30b7\u30e7\u30f3\u306a\u3057\u3067\u30b3\u30d4\u30fc',
        ko: '\uba58\uc158 \uc5c6\uc774 \ubcf5\uc0ac',
        zh: '\u590d\u5236\uff08\u4e0d\u542b\u63d0\u53ca\uff09',
        vi: 'Sao ch\u00e9p kh\u00f4ng c\u00f3 l\u01b0\u1ee3t nh\u1eafc',
        th: '\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e42\u0e14\u0e22\u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e01\u0e25\u0e48\u0e32\u0e27\u0e16\u0e36\u0e07',
        fil: 'Kopyahin nang walang banggit',
        tl: 'Kopyahin nang walang banggit',
    };

    // The last text the page put on the clipboard, however it did it.
    let lastCopied = null;
    const remember = (text) => { if (text) lastCopied = String(text); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        const writeText = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = (text) => { remember(text); return writeText(text); };
    }
    const setData = DataTransfer.prototype.setData;
    DataTransfer.prototype.setData = function(type, data) {
        if (/^text(\/plain)?$/i.test(type)) remember(data);
        return setData.call(this, type, data);
    };
    const execCommand = document.execCommand.bind(document);
    document.execCommand = (command, ...args) => {
        if (String(command).toLowerCase() === 'copy') {
            const active = document.activeElement;
            remember(active && 'value' in active ? active.value : String(window.getSelection() || ''));
        }
        return execCommand(command, ...args);
    };

    const shareCopiedLink = (copyButton) => {
        lastCopied = null;
        copyButton.click();
        const started = Date.now();
        const poll = setInterval(() => {
            const link = lastCopied && lastCopied.trim();
            if (link && /^https:\/\//.test(link)) {
                clearInterval(poll);
                window.FaceboostPage.postMessage(JSON.stringify({ call: 'shareLink', url: link }));
            } else if (Date.now() - started > 3000) {
                clearInterval(poll);
            }
        }, 100);
    };

    const findCopyRow = () => {
        const glyph = Array.from(document.querySelectorAll('[role="presentation"] [role="button"] span'))
            .find(span => span.textContent === COPY_GLYPH);
        const copyButton = glyph && glyph.closest('[role="button"]');
        const row = copyButton && copyButton.parentElement;
        return row && row.parentElement ? { copyButton, row } : null;
    };

    // A row under Copy's: its button cloned, with its own label and tap, and an SVG icon (Copy's own
    // glyph when icon is null). The sheet's boxes have fixed heights: they grow to make room for it.
    const addRowAfterCopy = ({ copyButton, row }, id, label, icon, onTap) => {
        const clone = row.cloneNode(true);
        clone.id = id;
        const button = clone.querySelector('[role="button"]');
        if (!button) return;
        const copyLabel = copyButton.getAttribute('aria-label') || '';
        button.setAttribute('aria-label', label);
        // text: the leaf that holds Copy's label; icon: the glyph span
        const leaves = Array.from(button.querySelectorAll('*')).filter(e => e.children.length === 0);
        const iconSpan = leaves.find(e => e.textContent === COPY_GLYPH);
        const textLeaf = leaves.find(e => copyLabel && e.textContent === copyLabel) || leaves.filter(e => e !== iconSpan).pop();
        if (textLeaf) textLeaf.textContent = label;
        if (iconSpan && icon) { iconSpan.textContent = ''; iconSpan.innerHTML = icon; iconSpan.style.fontSize = '0'; }
        // The label's box is sized to Copy's label.
        clone.querySelectorAll('[style*="width"]').forEach(el => {
            if (el !== clone && el !== button && el.textContent === label) el.style.width = 'auto';
        });
        // Facebook's own handlers must not see taps on the copy: they would run Copy twice.
        ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'mouseup'].forEach(type =>
            clone.addEventListener(type, e => e.stopPropagation(), true));
        clone.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onTap();
        }, true);
        row.parentElement.insertBefore(clone, row.nextSibling);

        let el = row.parentElement;
        for (let i = 0; i < 9 && el && el !== document.body; i++, el = el.parentElement) {
            const height = parseFloat(el.style.height);
            if (height >= ROW_HEIGHT * 2) el.style.height = (height + ROW_HEIGHT) + 'px';
        }
    };

    const addRow = () => {
        // Checked here, not at load: the listener object can show up after this script runs.
        if (!window.FaceboostPage || document.getElementById(ROW_ID)) return;
        const copy = findCopyRow();
        if (copy) addRowAfterCopy(copy, ROW_ID, pick(LABELS, 'Share via\u2026'), SHARE_ICON, () => shareCopiedLink(copy.copyButton));
    };

    // "Copy without mention": under Copy in a comment's options sheet (long press), only when the comment
    // starts with mentions (the blue names). It runs Facebook's own Copy and puts on the clipboard what
    // that copied, minus those leading names.
    let pressed = null;   // what the finger last landed on, while no sheet is open
    document.addEventListener('touchstart', e => { if (!document.getElementById(NM_ID)) pressed = e.target; }, { capture: true, passive: true });

    // The leading mentions of the comment holding el: blue-name links at the start of its text
    // (not hashtags or addresses). A comment's text areas (TextArea or ServerTextArea, depending on how Facebook
    // rendered it) come in order: its author's name, then its text.
    const leadingMentions = (el) => {
        let area = null;
        for (let p = el; p && p !== document.body && !area; p = p.parentElement) {
            const found = p.querySelectorAll('[data-mcomponent$="TextArea"]');
            if (found.length > 1) area = found[1];
        }
        if (!area) return [];
        const names = [];
        for (const n of (area.querySelector('.native-text') || area).childNodes) {
            if (n.nodeType === 3 && !n.textContent.trim()) continue;
            const name = n.nodeType === 1 && n.matches('span[role="link"]') ? n.textContent.trim() : '';
            if (!name || /^(#|https?:|www\.)/i.test(name)) break;
            names.push(name);
        }
        return names;
    };

    const copyWithoutMention = (copyButton, names) => {
        lastCopied = null;
        copyButton.click();
        const started = Date.now();
        const poll = setInterval(() => {
            if (!lastCopied && Date.now() - started < 3000) return;
            clearInterval(poll);
            let text = (lastCopied || '').replace(/^\s+/, '');
            if (!text) return;
            for (const name of names) {
                if (!text.startsWith(name)) break;
                text = text.slice(name.length).replace(/^[\s,:;]+/, '');
            }
            if (window.FaceboostPage) window.FaceboostPage.postMessage(JSON.stringify({ call: 'copyText', text }));
            else navigator.clipboard.writeText(text);
        }, 100);
    };

    const addNoMentionRow = () => {
        if (document.getElementById(NM_ID) || !pressed) return;
        const copy = findCopyRow();
        // Only a comment's sheet has a Reply row next to Copy.
        if (!copy || !Array.from(copy.row.parentElement.querySelectorAll('span')).some(s => s.textContent === REPLY_GLYPH)) return;
        const names = leadingMentions(pressed);
        if (names.length) addRowAfterCopy(copy, NM_ID, pick(NM_LABELS, 'Copy without mention'), null, () => copyWithoutMention(copy.copyButton, names));
    };

    let scheduled = false;
    new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => { scheduled = false; addRow(); addNoMentionRow(); });
    }).observe(document.documentElement, { childList: true, subtree: true });
})();

// Facebook's "Facebook is better on the app" sheet (Get app / Not now), put over the feed when the
// app opens: pressed away with its second button, as the user would. Recognized by its shape, in
// any language: a dialog screen whose bottom sheet holds a picture, one title and exactly two
// buttons, and nothing to type in. Only a sheet that came up by itself, not just after a tap: one
// the user opened (a confirmation) is left to them.
// Guarded: the bundle is re-evaluated on every SPA navigation in the same context.
if (!window._mbAppPromptObserver) {
    const APP_PROMPT_TAP_MS = 2000;
    let lastTapAt = 0;
    document.addEventListener('pointerdown', () => { lastTapAt = Date.now(); }, true);
    const seenSheets = new WeakSet();
    const dismissAppPrompt = () => {
        const sheet = document.querySelector('.dialog-screen .bottom.fixed-container');
        if (!sheet || seenSheets.has(sheet)) return;
        const buttons = sheet.querySelectorAll('[role="button"]');
        if (buttons.length !== 2 || sheet.querySelectorAll('h1').length !== 1 || !sheet.querySelector('img')
            || sheet.querySelector('input, textarea, [contenteditable]')) return;
        seenSheets.add(sheet);
        if (Date.now() - lastTapAt < APP_PROMPT_TAP_MS) return;
        buttons[1].click();
    };
    let promptScheduled = false;
    window._mbAppPromptObserver = new MutationObserver(() => {
        if (promptScheduled) return;
        promptScheduled = true;
        requestAnimationFrame(() => { promptScheduled = false; dismissAppPrompt(); });
    });
    window._mbAppPromptObserver.observe(document.documentElement, { childList: true, subtree: true });
}

// Feed posts (mobile site). A post is a run of rows of the feed's list (data-type="vscroller")
// sharing a data-tracking-duration-id: one card (data-dcm-id="1") on a post opened from a link,
// its header, text and action rows apart on Home (since 2026-10-30), each row tracked. The
// hide_* scripts and adblock.js hide a whole post through hideFeedPost, from any element in it.
(() => {
    const TRACKED = '[data-tracking-duration-id]';

    // The rows of the post holding el, top to bottom; none outside a feed post.
    window.feedPostRows = el => {
        let row = el?.closest?.(TRACKED);
        while (row && row.parentElement?.getAttribute('data-type') !== 'vscroller') {
            row = row.parentElement?.closest(TRACKED);
        }
        if (!row) return [];
        const id = row.getAttribute('data-tracking-duration-id');
        const same = r => r?.getAttribute('data-tracking-duration-id') === id;
        const rows = [row];
        for (let r = row.previousElementSibling; same(r); r = r.previousElementSibling) rows.unshift(r);
        for (let r = row.nextElementSibling; same(r); r = r.nextElementSibling) rows.push(r);
        return rows;
    };

    // Hides the post holding el and the thin gap row above it; false outside a feed post.
    window.hideFeedPost = el => {
        const rows = window.feedPostRows(el);
        if (!rows.length) return false;
        const gap = rows[0].previousElementSibling;
        if (gap && !gap.matches(TRACKED) && gap.offsetHeight <= 1) gap.style.display = 'none';
        rows.forEach(r => { r.style.display = 'none'; });
        return true;
    };
})();

// The elements matching selector in root: the document, or an element and what's in it. For MutationObservers that
// look again only at what changed (material_you.js, amoled_black.js), not at the whole page on every change.
window.mbWithin = (root, selector) => {
    const found = Array.from(root.querySelectorAll(selector));
    if (root.matches && root.matches(selector)) found.unshift(root);
    return found;
};

// Finger state shared by the reel scripts: window.__mbTouch = { down, endAt }.
(() => {
    if (window.__mbTouch) return;
    const T = window.__mbTouch = { down: false, endAt: 0 };
    const opts = { capture: true, passive: true };
    document.addEventListener('touchstart', (e) => { T.down = e.touches.length > 0; }, opts);
    const up = (e) => { T.down = e.touches.length > 0; T.endAt = Date.now(); };
    document.addEventListener('touchend', up, opts);
    document.addEventListener('touchcancel', up, opts);
})();
