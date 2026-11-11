// Cross-fade between reels. The viewer is a native scroll-snap list (.vscroller): the browser does the drag and the
// snap, Facebook only listens to `scroll`, so nothing changes reel halfway through a drag and there is nothing to
// gate or realign. This only fades by how much of each reel shows: the one leaving becomes transparent while the
// next one is revealed from dark. Opacity is 1 (no style at all) when a reel is at rest.
(function() {
    if (window.__mbReelTransition) return;
    window.__mbReelTransition = true;

    // (same test as reel_gestures.js: a reel viewer opened from a /videos/ link is a reel list too)
    const inReel = () => {
        const p = location.pathname;
        return p.indexOf('/reel/') === 0 || (p.indexOf('/videos/') !== -1 && !!document.querySelector('.vertically-snappable video'));
    };
    // the reels of the list (the same class also marks the tab bar and the pull-to-refresh spinner)
    const items = () => [...document.querySelectorAll('.vscroller > .vertically-snappable')].filter(e => e.offsetHeight > innerHeight * 0.5);
    const fadeOut = (a) => Math.max(0, Math.min(1, 1 - a * 1.18));
    // One curve of the distance from rest, for the reel that leaves and the one that comes in: they match where they cross.
    const opacityFor = (p) => fadeOut(Math.abs(p));

    let raf = 0;
    const loop = () => {
        raf = 0;
        let moving = false;
        const list = document.querySelector('.vscroller');
        const top0 = list ? list.getBoundingClientRect().top : 0;   // where a reel at rest sits (under the tab bar)
        items().forEach(it => {
            const r = it.getBoundingClientRect(), h = r.height || 1, p = (r.top - top0) / h;
            if (r.bottom < top0 - h || r.top > innerHeight + h || Math.abs(p) < 0.01) { if (it.style.opacity) it.style.removeProperty('opacity'); return; }
            if (Math.abs(p) < 1) moving = true;
            it.style.setProperty('opacity', opacityFor(p).toFixed(2));
        });
        if (moving || (window.__mbTouch && window.__mbTouch.down)) raf = requestAnimationFrame(loop);
    };
    ['touchstart', 'touchmove', 'touchend', 'scroll'].forEach(n => document.addEventListener(n, () => { if (inReel() && !raf) raf = requestAnimationFrame(loop); }, { capture: true, passive: true }));
    // The reel that leaves keeps a still of its last video frame, in place, until its video plays again. Facebook has one
    // <video> that moves to whichever reel the scroll is over, and empties it as it goes, so otherwise a reel loses its
    // picture the moment the video leaves it (Facebook also hides the cover of a reel that already played). While the list
    // moves the frame of the reel on screen is kept in memory; when the video leaves, that frame is put in the reel.
    // The still fades with the reel's own position (the opacity set above).
    const snaps = new Map();   // reel -> { c: canvas with its last frame, box: where the video was, fit }
    const REEL = '.vscroller > .vertically-snappable';
    const grab = () => {
        const v = document.querySelector('video');
        if (!v || v.readyState < 2 || !v.videoWidth || v.currentTime < 0.1) return;
        const item = v.closest(REEL);
        if (!item) return;
        let sn = snaps.get(item);
        if (!sn) { sn = { c: document.createElement('canvas') }; snaps.set(item, sn); }
        const k = Math.min(1, 540 / v.videoWidth), w = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
        if (sn.c.width !== w || sn.c.height !== h) { sn.c.width = w; sn.c.height = h; }
        try { sn.c.getContext('2d').drawImage(v, 0, 0, w, h); } catch (e) { return; }   // a video the page can't read: no still
        const vr = v.getBoundingClientRect(), ir = item.getBoundingClientRect();
        sn.box = [vr.left - ir.left, vr.top - ir.top, vr.width, vr.height];
        sn.fit = getComputedStyle(v).objectFit;
        while (snaps.size > 6) { const o = snaps.keys().next().value; snaps.get(o).c.remove(); snaps.delete(o); }
    };
    const showStills = () => snaps.forEach((sn, item) => {
        if (!item.isConnected) { snaps.delete(item); return; }
        const pic = item.querySelector('img.img'), wrap = pic && pic.parentElement;
        if (!wrap || item.querySelector('video') || sn.c.parentElement === wrap) return;
        // In the box that holds the picture, after the cover and before the reel's own interface (name, caption, icons),
        // which paints over it: not on top of everything.
        sn.c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;object-fit:' + sn.fit;
        wrap.appendChild(sn.c);
    });
    let lastGrab = 0;
    document.addEventListener('scroll', (e) => {
        if (!(e.target.classList && e.target.classList.contains('vscroller')) || !inReel()) return;
        if (Date.now() - lastGrab > 100) { lastGrab = Date.now(); grab(); }
        showStills();
    }, { capture: true, passive: true });
    document.addEventListener('touchstart', () => { if (inReel()) grab(); }, { capture: true, passive: true });
    // the video leaves a reel: its frame goes in at once (before the next paint)
    new MutationObserver((muts) => {
        if (!inReel()) return;
        for (const m of muts) for (const n of m.removedNodes) {
            if (n.nodeName === 'VIDEO' || (n.querySelector && n.querySelector('video'))) { showStills(); return; }
        }
    }).observe(document.body, { childList: true, subtree: true });
    // The video plays in its reel: the still goes (a frame later, so the video has drawn) and, if it starts from the
    // beginning, the reel's cover fades out over it. The cover is a copy placed in the reel (so it moves with the reel when
    // it is swiped) and drawn where the video's picture is, filling it (the cover has other proportions than the video,
    // so at its own size it showed offset from the video).
    const FADE_MS = 350;
    document.addEventListener('playing', (e) => {
        const v = e.target, it = v instanceof HTMLVideoElement && v.closest(REEL);
        if (!it) return;
        const sn = snaps.get(it);
        if (sn) requestAnimationFrame(() => requestAnimationFrame(() => { sn.c.remove(); snaps.delete(it); }));
        if (v.currentTime > 0.6 || !inReel()) return;       // a video that resumes, not one that starts
        const pic = it.querySelector('img.img'), wrap = pic && pic.parentElement;
        if (!wrap || !pic.naturalWidth || !v.videoWidth) return;
        const wr = wrap.getBoundingClientRect(), vr = v.getBoundingClientRect();
        let w = vr.width, h = vr.height, l = vr.left - wr.left, t = vr.top - wr.top;
        if (getComputedStyle(v).objectFit === 'contain') {          // the picture, not the box it sits in
            const k = Math.min(vr.width / v.videoWidth, vr.height / v.videoHeight);
            w = v.videoWidth * k; h = v.videoHeight * k; l += (vr.width - w) / 2; t += (vr.height - h) / 2;
        }
        const c = new Image();
        c.src = pic.currentSrc || pic.src;
        c.style.cssText = 'position:absolute;left:' + Math.round(l) + 'px;top:' + Math.round(t) + 'px;width:' + Math.round(w) + 'px;height:' +
            Math.round(h) + 'px;object-fit:cover;pointer-events:none;opacity:1;transition:opacity ' + FADE_MS + 'ms ease-out';
        wrap.appendChild(c);
        requestAnimationFrame(() => requestAnimationFrame(() => { c.style.opacity = '0'; }));
        setTimeout(() => c.remove(), FADE_MS + 150);
    }, true);
})();
