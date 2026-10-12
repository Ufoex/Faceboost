// Reel controls: Facebook's /reel/ viewer only shows Play when paused, while the
// regular video viewer also shows time, a seek bar, fullscreen and volume. Show the
// same kind of bar on reels while the video is paused.
(function() {
    if (window.isDesktopMode && window.isDesktopMode()) return;
    if (window.__mbReelControls) return;
    window.__mbReelControls = true;

    const ICON = {
        full: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
        vol: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z',
        mute: 'M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'
    };
    const svg = (d) => `<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="${d}"/></svg>`;
    const fmt = (s) => {
        s = Math.max(0, Math.floor(s || 0));
        return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    };

    let bar, seek, time, fsBtn, muteBtn, vid = null, dragging = false;

    const build = () => {
        bar = document.createElement('div');
        bar.id = 'mb-reel-controls';
        bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:none;' +
            'padding:10px 16px 12px;box-sizing:border-box;color:#fff;font:600 15px sans-serif;' +
            'background:rgba(0,0,0,.88);';
        bar.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
            '<span id="mb-reel-time">0:00 / 0:00</span>' +
            '<span style="display:flex;gap:18px"><span id="mb-reel-fs">' + svg(ICON.full) + '</span>' +
            '<span id="mb-reel-mute">' + svg(ICON.vol) + '</span></span></div>' +
            '<input id="mb-reel-seek" type="range" min="0" max="1000" value="0" style="width:100%;display:block">';
        document.body.appendChild(bar);
        time = bar.querySelector('#mb-reel-time');
        seek = bar.querySelector('#mb-reel-seek');
        fsBtn = bar.querySelector('#mb-reel-fs');
        muteBtn = bar.querySelector('#mb-reel-mute');

        // Keep Facebook's own tap handlers (play/pause, swipe between reels) from seeing these touches.
        ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup', 'click']
            .forEach(t => bar.addEventListener(t, e => e.stopPropagation()));

        seek.addEventListener('input', () => {
            dragging = true;
            if (vid && isFinite(vid.duration)) vid.currentTime = vid.duration * seek.value / 1000;
        });
        seek.addEventListener('change', () => { dragging = false; });
        fsBtn.addEventListener('click', () => {
            if (!vid) return;
            // The video's container, like Facebook's own fullscreen button: fullscreen on the <video> itself
            // makes Chromium lock the orientation and Facebook then leaves fullscreen right away.
            const el = vid.parentElement || vid;
            const req = el.requestFullscreen || el.webkitRequestFullscreen;
            if (req) req.call(el);
        });
        muteBtn.addEventListener('click', () => {
            if (!vid) return;
            vid.muted = !vid.muted;
            muteBtn.innerHTML = svg(vid.muted ? ICON.mute : ICON.vol);
        });
    };

    // The video that is mostly on screen (reels are one per screen).
    const activeVideo = () => {
        let best = null, area = 0;
        document.querySelectorAll('video').forEach(v => {
            const r = v.getBoundingClientRect();
            const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
            const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
            if (w * h > area) { area = w * h; best = v; }
        });
        return best;
    };

    // Facebook's regular video viewer already has its own range input while paused.
    const hasNativeSeek = () => [...document.querySelectorAll('input[type=range]')].some(i => {
        if (i.id === 'mb-reel-seek') return false;
        const r = i.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(i).opacity !== '0';
    });

    // ---- Hide icons button ----
    const EYE = 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z';
    const EYE_OFF = 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2z';
    const FIT_FULL = 'M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z';
    const FIT_FILL = 'M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z';
    const HEADSET = 'M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z';
    const SKIP_NEXT = 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z';
    // Resize option from the settings (prepended by the app): off = no fit button and no resizing.
    const FIT = !!(window.__mbReel && window.__mbReel.fit);
    let hideBtn, fitBtn, autoBtn, audioBtn, hideOn = false, fit = null, hasMarks = false, offAt = 0, lastV = null, lastMark = 0;

    // Centre-screen feedback: the icon of the option that was just toggled, fading out in ~1 s.
    // A slash over it means "off".
    let flashEl;
    const flash = (d, off) => {
        if (!flashEl) {
            flashEl = document.createElement('div');
            flashEl.id = 'mb-reel-flash';
            flashEl.style.cssText = 'position:fixed;left:50%;top:45%;width:96px;height:96px;margin:-48px 0 0 -48px;' +
                'border-radius:50%;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;' +
                'z-index:2147483000;pointer-events:none;opacity:0';
            document.body.appendChild(flashEl);
        }
        flashEl.innerHTML = '<svg width="56" height="56" viewBox="0 0 24 24" fill="#fff"><path d="' + d + '"/>' +
            (off ? '<path d="M3 3.5L20.5 21" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>' : '') + '</svg>';
        if (flashEl._a) flashEl._a.cancel();
        // pop in, hold, fade out
        flashEl._a = flashEl.animate([
            { opacity: 0, transform: 'scale(.6)', offset: 0 },
            { opacity: 1, transform: 'scale(1.08)', offset: .15 },
            { opacity: 1, transform: 'scale(1)', offset: .25 },
            { opacity: 1, transform: 'scale(1)', offset: .6 },
            { opacity: 0, transform: 'scale(1.25)', offset: 1 }
        ], { duration: 1100, easing: 'ease-out' });
    };

    const style = document.createElement('style');
    style.textContent = 'html.mb-hide-reel-ui [data-mb-hid]{opacity:0 !important;pointer-events:none !important}' +
        'html.mb-hide-reel-ui [data-mb-fade]{opacity:0 !important}' +
        // fade / slide when hiding and showing; the marks stay ~0.45 s after showing so the way back animates too
        '[data-mb-hid],[data-mb-fade]{transition:opacity .3s ease}' +
        '[data-mb-scale]{transition:transform .3s ease}' +
        'html.mb-hide-reel-ui [data-mb-scale]{transform:translateY(var(--mb-y,0px)) scale(var(--mb-k,1)) !important;transform-origin:50% 0 !important}' +
        // fit button: show the whole video (contain) or fill the screen (cover)
        'html.mb-fit-contain video{object-fit:contain !important}' +
        'html.mb-fit-cover video{object-fit:cover !important}';
    document.head.appendChild(style);
    // Button feedback: shrink while pressed, small bounce on tap.
    style.textContent += '#mb-reel-hide,#mb-reel-fit,#mb-reel-auto,#mb-reel-audio,#mb-reel-gear{transition:transform .12s ease-out,background .2s}' +
        '#mb-reel-hide:active,#mb-reel-fit:active,#mb-reel-auto:active,#mb-reel-audio:active{transform:scale(.82);background:rgba(255,255,255,.28) !important}';
    document.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('#mb-reel-hide,#mb-reel-fit,#mb-reel-auto,#mb-reel-audio,#mb-reel-gear');
        if (b) b.animate([{ transform: 'scale(.8)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
    }, true);

    const lca = (els) => {
        let a = els[0];
        while (a && !els.every(e => a.contains(e))) a = a.parentElement;
        return a;
    };

    // Hide everything except the video and the swipe gesture: action icons, user and
    // caption, header, top tab bar, sound chip, download/copy buttons. Found by
    // position and structure, so it does not depend on the page language.
    //  - data-mb-hid : invisible and not tappable (icon groups, header, tab bar)
    //  - data-mb-fade: invisible but still tappable (anything that holds the
    //    tap-to-pause surface, so pausing keeps working)
    const markIcons = (v) => {
        // Nothing marked and hide mode off: skip the DOM query (this runs every 250 ms).
        if (!hideOn && !hasMarks) return;
        if (!hideOn) {
            if (!offAt) offAt = Date.now();
            if (Date.now() - offAt < 450) return;
        }
        offAt = 0;
        hasMarks = hideOn;
        if (hideOn) {
            // Already marked for this reel: re-marking every tick re-runs layout and restarts the transitions.
            if (v === lastV && Date.now() - lastMark < 2000) return;
            lastV = v; lastMark = Date.now();
        } else lastV = null;
        // Re-marking keeps the scale; only turning hide off removes it.
        // While hidden, the old marks stay in place during the pass and only stale ones are removed at
        // the end: clearing first lets a style recalc (elementFromPoint) show the UI for a moment.
        const stale = hideOn ? [...document.querySelectorAll('[data-mb-hid],[data-mb-fade]')] : [];
        const cur = new Set();
        if (!hideOn) document.querySelectorAll('[data-mb-hid],[data-mb-fade],[data-mb-scale]').forEach(e => {
            e.removeAttribute('data-mb-hid');
            e.removeAttribute('data-mb-fade');
            e.removeAttribute('data-mb-scale');
            e.style.removeProperty('--mb-k');
            e.style.removeProperty('--mb-y');
        });
        if (!hideOn) return;
        const cont = v.closest('.vertically-snappable') || v.parentElement;
        const iw = innerWidth, ih = innerHeight;
        // Facebook's thin progress bar (track + played part + buffer) stays visible,
        // like the video itself.
        const seekbox = cont.querySelector('.seekbar-container');
        const inSeek = (e) => !!seekbox && seekbox.contains(e);
        const keep = [v, seekbox].filter(Boolean);
        const holdsKept = (e) => keep.some(k => e.contains(k));
        const hid = (e) => { if (e && !holdsKept(e) && !inSeek(e)) { e.removeAttribute('data-mb-fade'); e.setAttribute('data-mb-hid', ''); cur.add(e); } };

        // element under the screen centre: the tap-to-pause surface lives in its ancestors
        const center = document.elementFromPoint(iw / 2, ih / 2);

        // everything in the reel container that is not the video itself
        const walk = (node) => {
            for (const c of node.children) {
                if (inSeek(c)) continue;
                if (holdsKept(c)) walk(c);
                else if (center && c.contains(center)) { c.removeAttribute('data-mb-hid'); c.setAttribute('data-mb-fade', ''); cur.add(c); }
                else hid(c);
            }
        };
        walk(cont);

        const labelled = [...cont.querySelectorAll('[aria-label]')]
            .filter(e => e.tagName !== 'INPUT' && e.tagName !== 'BUTTON')
            .map(e => ({ e, b: e.getBoundingClientRect() }))
            .filter(o => o.b.width > 0);
        // right-hand action column and bottom profile/caption row: also not tappable
        labelled.filter(o => o.b.left > 0.7 * iw && o.b.width >= 48 && o.b.top > 0.3 * ih).forEach(o => hid(o.e));
        const bottom = labelled.filter(o => o.b.top > 0.8 * ih && o.b.left < 0.7 * iw).map(o => o.e);
        if (bottom.length) {
            const row = lca(bottom);
            if (row && !holdsKept(row) && row.getBoundingClientRect().height < 0.25 * ih) hid(row);
            else bottom.forEach(hid);
        }
        // header (back / search / profile) and the top tab bar
        const top = [...document.querySelectorAll('[aria-label]')]
            .filter(e => e.tagName !== 'INPUT' && e.tagName !== 'BUTTON' && e.getAttribute('role') !== 'tab' &&
                !e.closest('#mb-reel-hide, #mb-reel-controls, #mb-reel-badge, [role="tablist"]'))
            .filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.top < 0.2 * ih; });
        if (top.length) {
            const row = lca(top);
            if (row && !holdsKept(row) && row.getBoundingClientRect().height < 0.2 * ih) hid(row);
            else top.forEach(hid);
        }
        // header title text ("Reels") has no label: hide text nodes in the top strip
        document.querySelectorAll('div, span').forEach(e => {
            if (e.closest('#mb-reel-hide, #mb-reel-controls, #mb-reel-badge, [role="tablist"]')) return;
            if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
            const b = e.getBoundingClientRect();
            if (b.width > 0 && b.top < 0.2 * ih) hid(e);
        });
        // top tab bar: hidden like the rest, and the reel list slides up over its strip and is
        // scaled to fill the screen. Only a transform: the tab bar keeps its layout, because
        // Facebook re-snaps the reels when a container resizes and never restores them properly.
        document.querySelectorAll('[role="tablist"]').forEach(t => {
            hid(t);
            const wrap = t.parentElement;
            const scroller = v.closest('.vscroller');
            if (!wrap || holdsKept(wrap) || !scroller || scroller.hasAttribute('data-mb-scale') || scroller.offsetHeight <= 0) return;
            const top = scroller.getBoundingClientRect().top;
            const k = ih / scroller.offsetHeight;
            if (top > 0 && k > 1.01 && k < 1.3) {
                scroller.setAttribute('data-mb-scale', '');
                scroller.style.setProperty('--mb-y', -top + 'px');
                scroller.style.setProperty('--mb-k', k);
            }
        });
        // our own buttons
        document.querySelectorAll('button[aria-label="Download content"], button[aria-label="Copy image to clipboard"]').forEach(hid);
        stale.forEach(e => { if (!cur.has(e)) { e.removeAttribute('data-mb-hid'); e.removeAttribute('data-mb-fade'); } });
    };

    const setFit = (mode) => {
        fit = mode;
        const root = document.documentElement.classList;
        root.toggle('mb-fit-contain', mode === 'contain');
        root.toggle('mb-fit-cover', mode === 'cover');
        // icon shows what the next tap will do
        if (fitBtn) fitBtn.innerHTML = svg(mode === 'contain' ? FIT_FILL : FIT_FULL);
    };

    const buildFitBtn = () => {
        fitBtn = document.createElement('div');
        fitBtn.id = 'mb-reel-fit';
        fitBtn.style.cssText = 'position:fixed;z-index:2147483000;width:40px;height:40px;border-radius:50%;' +
            'background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;';
        fitBtn.innerHTML = svg(FIT_FULL);
        ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup']
            .forEach(t => fitBtn.addEventListener(t, e => e.stopPropagation()));
        fitBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (fit === null) {
                const v = activeVideo();
                const cur = v ? getComputedStyle(v).objectFit : 'cover';
                setFit(cur === 'cover' ? 'contain' : 'cover');
            } else {
                setFit(fit === 'contain' ? 'cover' : 'contain');
            }
            flash(fit === 'contain' ? FIT_FULL : FIT_FILL, false);
        });
        document.body.appendChild(fitBtn);
    };

    // Auto-scroll on/off for this session; only drawn when the autoscroll script is injected.
    const buildAutoBtn = () => {
        autoBtn = document.createElement('div');
        autoBtn.id = 'mb-reel-auto';
        autoBtn.style.cssText = 'position:fixed;z-index:2147483000;width:40px;height:40px;border-radius:50%;' +
            'background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;';
        autoBtn.innerHTML = svg(SKIP_NEXT);
        ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup']
            .forEach(t => autoBtn.addEventListener(t, e => e.stopPropagation()));
        autoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.__mbAutoScroll) { window.__mbAutoScroll.enabled = !window.__mbAutoScroll.enabled; flash(SKIP_NEXT, !window.__mbAutoScroll.enabled); }
        });
        document.body.appendChild(autoBtn);
    };

    // Keep-audio-with-screen-off for this session (off at every start); only drawn when the
    // reel_bg_audio script is injected. reel_bg_audio.js reads its state.
    const buildAudioBtn = () => {
        audioBtn = document.createElement('div');
        audioBtn.id = 'mb-reel-audio';
        audioBtn.style.cssText = 'position:fixed;z-index:2147483000;width:40px;height:40px;border-radius:50%;' +
            'background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;';
        audioBtn.innerHTML = svg(HEADSET);
        ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup']
            .forEach(t => audioBtn.addEventListener(t, e => e.stopPropagation()));
        audioBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.__mbBgAudio) { window.__mbBgAudio.enabled = !window.__mbBgAudio.enabled; flash(HEADSET, !window.__mbBgAudio.enabled); }
        });
        document.body.appendChild(audioBtn);
    };

    // Settings gear in the reel viewer (Facebook's reel page has no header gear of its own).
    const GEAR = 'M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7.03 7.03 0 00-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z';
    let gearBtn;
    const buildGearBtn = () => {
        gearBtn = document.createElement('div');
        gearBtn.id = 'mb-reel-gear';
        gearBtn.style.cssText = 'position:fixed;z-index:2147483000;width:40px;height:40px;border-radius:50%;' +
            'background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;';
        gearBtn.innerHTML = svg(GEAR);
        ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup']
            .forEach(t => gearBtn.addEventListener(t, e => e.stopPropagation()));
        gearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.FaceboostPage) window.FaceboostPage.postMessage(JSON.stringify({ call: 'openSettings' }));
            else if (window.SettingsBridge && window.SettingsBridge.onSettingsToggle) window.SettingsBridge.onSettingsToggle();
        });
        document.body.appendChild(gearBtn);
    };

    const buildHideBtn = () => {
        hideBtn = document.createElement('div');
        hideBtn.id = 'mb-reel-hide';
        hideBtn.style.cssText = 'position:fixed;z-index:2147483000;width:40px;height:40px;border-radius:50%;' +
            'background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;';
        hideBtn.innerHTML = svg(EYE_OFF);
        ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup']
            .forEach(t => hideBtn.addEventListener(t, e => e.stopPropagation()));
        hideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideOn = !hideOn;
            document.documentElement.classList.toggle('mb-hide-reel-ui', hideOn);
            hideBtn.innerHTML = svg(hideOn ? EYE : EYE_OFF);
            hideBtn.style.opacity = hideOn ? '0.35' : '1';
            flash(hideOn ? EYE_OFF : EYE, false);
            const av = activeVideo();
            if (av) markIcons(av);
        });
        document.body.appendChild(hideBtn);
    };

    // Thumbnail -> video: Facebook hides the poster (class "hidden") the moment the video starts
    // playing, a hard cut. A copy of the poster stays on top for a moment and fades out instead.
    new MutationObserver((muts) => {
        const p = location.pathname;
        if (p.indexOf('/reel/') !== 0 && p.indexOf('/videos/') === -1) return;
        for (const m of muts) {
            const img = m.target;
            if (img.tagName !== 'IMG' || !img.classList.contains('hidden') || (m.oldValue || '').split(' ').indexOf('hidden') !== -1) continue;
            const media = img.parentElement;
            if (!media || !media.closest('.vertically-snappable')) continue;
            // Resuming a paused video also hides the poster: only fade it when the video starts from the beginning.
            const vid = media.closest('.vertically-snappable').querySelector('video');
            if (vid && vid.currentTime > 0.5) continue;
            const r = media.getBoundingClientRect();
            if (!r.width || r.bottom <= 0 || r.top >= innerHeight) continue; // not the reel on screen
            const copy = new Image();
            copy.src = img.currentSrc || img.src;
            copy.className = img.className.replace('hidden', '').trim();
            copy.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;pointer-events:none;' +
                'opacity:1;transition:opacity .3s ease-out';
            media.appendChild(copy);
            requestAnimationFrame(() => requestAnimationFrame(() => { copy.style.opacity = '0'; }));
            setTimeout(() => copy.remove(), 500);
        }
    }).observe(document.body, { attributes: true, attributeOldValue: true, attributeFilter: ['class'], subtree: true });

    // New reel / re-rendered UI while the icons are hidden: mark it right away instead of waiting
    // for the next 250 ms tick, or its interface shows for a moment. Throttled, element nodes only.
    let remarkT = 0, lastRemark = 0;
    new MutationObserver((muts) => {
        if (!hideOn || remarkT) return;
        if (!muts.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && !(n.id && n.id.indexOf('mb-reel') === 0)))) return;
        remarkT = setTimeout(() => {
            remarkT = 0; lastRemark = Date.now();
            const v = activeVideo();
            if (v && hideOn) { lastMark = 0; markIcons(v); }
        }, Math.max(0, 120 - (Date.now() - lastRemark)));
    }).observe(document.body, { childList: true, subtree: true });

    setInterval(() => {
        const path = location.pathname;
        const inReels = path.indexOf('/reel/') === 0 || path.indexOf('/videos/') !== -1 && !!document.querySelector('.vertically-snappable video');
        const active = inReels ? activeVideo() : null;


        // hide-icons button: next to the download button when it exists
        if (active) {
            if (!hideBtn || !hideBtn.isConnected) buildHideBtn();
            const dl = document.querySelector('button[aria-label="Download content"]');
            const r = dl && dl.getBoundingClientRect();
            // A column under the download button (a row would cover Facebook's own header icons).
            hideBtn.style.top = ((r && r.width ? r.top : 70) + 48) + 'px';
            hideBtn.style.left = (r && r.width ? r.left : 345) + 'px';
            hideBtn.style.display = 'flex';
            let slot = 1; // buttons stack under the hide button, skipping the ones that are off
            if (FIT) {
                if (!fitBtn || !fitBtn.isConnected) buildFitBtn();
                fitBtn.style.top = (parseFloat(hideBtn.style.top) + 48 * slot++) + 'px';
                fitBtn.style.left = hideBtn.style.left;
                fitBtn.style.display = 'flex';
                fitBtn.style.opacity = hideOn ? '0.35' : '1';
                if (fit === null) setFit('contain'); // default: whole video, no crop
            } else if (fitBtn) fitBtn.style.display = 'none';
            if (window.__mbAutoScroll) {
                if (!autoBtn || !autoBtn.isConnected) buildAutoBtn();
                autoBtn.style.top = (parseFloat(hideBtn.style.top) + 48 * slot++) + 'px';
                autoBtn.style.left = hideBtn.style.left;
                autoBtn.style.display = 'flex';
                autoBtn.style.opacity = hideOn ? '0.35' : (window.__mbAutoScroll.enabled ? '1' : '0.45');
            } else if (autoBtn) autoBtn.style.display = 'none';
            if (window.__mbBgAudio) {
                if (!audioBtn || !audioBtn.isConnected) buildAudioBtn();
                audioBtn.style.top = (parseFloat(hideBtn.style.top) + 48 * slot++) + 'px';
                audioBtn.style.left = hideBtn.style.left;
                audioBtn.style.display = 'flex';
                audioBtn.style.opacity = hideOn ? '0.35' : (window.__mbBgAudio.enabled ? '1' : '0.45');
            } else if (audioBtn) audioBtn.style.display = 'none';
            if (window.FaceboostPage || window.SettingsBridge) {
                if (!gearBtn || !gearBtn.isConnected) buildGearBtn();
                gearBtn.style.top = (parseFloat(hideBtn.style.top) + 48 * slot++) + 'px';
                gearBtn.style.left = hideBtn.style.left;
                gearBtn.style.display = 'flex';
                gearBtn.style.opacity = hideOn ? '0.35' : '1';
            }
            markIcons(active);
        } else {
            if (hideBtn) hideBtn.style.display = 'none';
            if (fitBtn) fitBtn.style.display = 'none';
            if (autoBtn) autoBtn.style.display = 'none';
            if (audioBtn) audioBtn.style.display = 'none';
            if (gearBtn) gearBtn.style.display = 'none';
            if (fit !== null) setFit(null);
            if (hideOn) {
                hideOn = false;
                document.documentElement.classList.remove('mb-hide-reel-ui');
                if (hideBtn) { hideBtn.innerHTML = svg(EYE_OFF); hideBtn.style.opacity = '1'; }
                offAt = 1; // left the reels: clear the marks right away
                markIcons(document.body);
            }
        }

        // seek bar for reels that don't have Facebook's own
        const v = path.indexOf('/reel/') === 0 ? active : null;
        if (hideOn || !v || !v.paused || !isFinite(v.duration) || v.duration <= 0 || hasNativeSeek()) {
            if (bar) bar.style.display = 'none';
            return;
        }
        if (!bar || !bar.isConnected) build();
        vid = v;
        bar.style.display = 'block';
        time.textContent = fmt(v.currentTime) + ' / ' + fmt(v.duration);
        if (!dragging) seek.value = Math.round(v.currentTime / v.duration * 1000);
        muteBtn.innerHTML = svg(v.muted ? ICON.mute : ICON.vol);
    }, 250);
})();
