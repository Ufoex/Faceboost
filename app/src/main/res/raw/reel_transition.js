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
        // The video is back in this reel (moved in by Facebook, which fires no `playing`): the still goes once it has a frame.
        const rv = item.querySelector('video');
        if (rv) { if (rv.readyState >= 2 && rv.videoWidth) { sn.c.remove(); snaps.delete(item); } return; }
        const pic = item.querySelector('img.img'), wrap = pic && pic.parentElement;
        if (!wrap || sn.c.parentElement === wrap) return;
        // In the box that holds the picture, after the cover and before the reel's own interface (name, caption, icons),
        // which paints over it: not on top of everything.
        sn.c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;object-fit:' + sn.fit;
        wrap.appendChild(sn.c);
    });
    setInterval(() => { if (snaps.size && inReel()) showStills(); }, 300);
    // Opening a reel (from the feed or a link): the whole viewer (header and buttons too) fades in. Opacity only: a zoom
    // moves the list while the cover copy below is placed from its position, and the two showed offset.
    // Opening a reel from the feed: the viewer opens out from the card that was tapped (its rectangle, rounded corners
    // flattening) instead of replacing the feed at once. clip-path, not scale: the video is not stretched. The card is the
    // first thing around the tap that is card sized. A reel opened some other way (link, Reels tab) has no card: it fades in.
    let card = null, wasIn = false, cardRect = null;   // cardRect: where this viewer opened from, where it closes to
    // What the feed was showing when the tap landed: the id, where its video was and a copy of its current frame. The viewer then
    // continues the same video (seek) and the copy flies from the feed's place to the viewer's (the "hero" below).
    let feedShot = null, heroEl = null, playback = null;
    const idOfPath = () => { const m = location.pathname.match(/\/(?:reel|videos)\/(?:[^/]+\/)?(\d{8,})\/?$/); return m && m[1]; };
    const heroStyle = document.createElement('style');
    heroStyle.textContent = 'html.mb-hero body{visibility:hidden !important}html.mb-hero{background:#000 !important}';
    document.head.appendChild(heroStyle);
    // Noted at pointerdown: for a normal video Facebook navigates before the click arrives. A video at the page's whole width
    // counts (only a box as big as the screen does not).
    const noteCard = (e) => {
        if (inReel()) return;
        const box = e.target.closest && e.target.closest('[data-video-id]');
        const fv = box && box.querySelector('video');
        const fr = fv && frameOf(fv);
        if (fr) {
            feedShot = { id: box.getAttribute('data-video-id'), t: fv.currentTime, at: Date.now(), playing: !fv.paused, ...fr };
            playback = { id: feedShot.id, t: feedShot.t, at: feedShot.at, playing: feedShot.playing };
        }
        for (let n = e.target; n && n !== document.body; n = n.parentElement) {
            const r = n.getBoundingClientRect();
            if (r.width >= 120 && r.height >= 150 && !(r.width >= innerWidth * 0.98 && r.height >= innerHeight * 0.9)) { card = { r, t: Date.now() }; return; }
        }
        card = null;
    };
    document.addEventListener('pointerdown', noteCard, true);
    document.addEventListener('click', noteCard, true);
    // Facebook keeps the reel list it had, and where it was left, for the same address: a card that opens a reel showed the last
    // one watched in the earlier visit (opened at 2, then 5, then 9 of the list...), not the one tapped. The reel whose id is
    // in the address is brought to the top of the viewer. Not once a finger is on the screen.
    const showTargetReel = () => {
        const T = window.__mbTouch;
        if (T && (T.down || Date.now() - T.endAt < 1000)) return;
        const m = location.pathname.match(/\/(?:reel|videos)\/(?:[^/]+\/)?(\d{8,})\/?$/);
        if (!m) return;
        const items = [...document.querySelectorAll('.vscroller > .vertically-snappable')].filter(e => e.offsetHeight > 200 && getComputedStyle(e).display !== 'none');
        const target = items.find(e => e.querySelector('[data-video-id="' + m[1] + '"]'));
        if (!target) return;
        if (Math.abs(target.getBoundingClientRect().top - target.parentElement.getBoundingClientRect().top) > 3) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    };
    // Started the moment the address changes (Facebook navigates with pushState), before the viewer is drawn: a poll came
    // late and the cover showed at full brightness for a moment before the animation began.
    // The "hero": a copy of the feed video's frame sits where the video was, and once the viewer's video is on screen it flies to
    // the viewer's place and fades out when that video shows, so the video you were watching seems to be the one that opens.
    const startHero = (shot) => {
        const root = document.documentElement, r = shot.rect;
        const el = heroEl = document.createElement('div');
        el.id = 'mb-hero';
        el.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;overflow:hidden;background:#000;border-radius:12px;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
        shot.cv.style.cssText = 'display:block;width:100%;height:100%;object-fit:' + shot.fit;
        el.appendChild(shot.cv);
        root.appendChild(el);
        root.classList.add('mb-hero');
        setTimeout(() => { if (heroEl === el && !el._flying) endHero(el); }, 1600);   // the viewer never came: give the page back
    };
    const endHero = (el) => {
        if (heroEl === el) heroEl = null;
        el.remove();
        document.documentElement.classList.remove('mb-hero');
    };
    const maybeStartHero = () => {
        if (heroEl || wasIn || !feedShot) return;
        const id = idOfPath();
        if (!id || id !== feedShot.id || Date.now() - feedShot.at > 6000) return;
        const s0 = feedShot; feedShot = null;
        startHero(s0);
    };
    const flyHero = (el) => {
        el._flying = true;
        const t0 = Date.now();
        const step = () => {
            if (heroEl !== el) return;
            const v = document.querySelector('.vertically-snappable video');
            if (!v && Date.now() - t0 < 1500) { requestAnimationFrame(step); return; }
            showTargetReel();
            [200, 500, 1000].forEach(ms => setTimeout(showTargetReel, ms));
            const to = v && v.getBoundingClientRect();
            document.documentElement.classList.remove('mb-hero');
            document.body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
            if (!to || !to.width) { endHero(el); return; }
            const r = el.getBoundingClientRect();
            const px = (b, rad) => ({ left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px', borderRadius: rad });
            el.animate([px(r, '12px'), px(to, '0px')], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).onfinish = () => {
                const t1 = Date.now();
                const out = () => {
                    if (heroEl !== el) return;
                    const nv = document.querySelector('.vertically-snappable video');
                    if (!(nv && nv.readyState >= 2 && nv.currentTime > 0.05 && !nv.paused) && Date.now() - t1 < 1000) { setTimeout(out, 50); return; }
                    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }).onfinish = () => endHero(el);
                };
                out();
            };
        };
        step();
    };
    const entering = () => {
        const now = inReel();
        // the viewer is gone and no history call told us (Facebook may have kept its own reference to them): close it from here
        if (!now && wasIn) closeViewer();
        if (now && !wasIn && (maybeStartHero(), heroEl)) {
            // the feed video's frame flies into the viewer (see the hero above)
            const c = card && Date.now() - card.t < 4000 ? card.r : null;
            card = null; cardRect = c;
            flyHero(heroEl);
        } else if (now && !wasIn) {
            const c = card && Date.now() - card.t < 4000 ? card.r : null;
            card = null; cardRect = c;
            // The viewer is drawn some time after the address changes (up to a second or more on a slow load): the animation
            // waits for its first video, so the opening is not used up on an empty screen. Hidden meanwhile; shown anyway after 1.5 s.
            const root = document.documentElement, t0 = Date.now();
            const from = c ? 'inset(' + Math.round(c.top) + 'px ' + Math.round(innerWidth - c.right) + 'px ' + Math.round(innerHeight - c.bottom) + 'px ' + Math.round(c.left) + 'px round 18px)' : null;
            root.style.opacity = '0';
            const go = () => {
                if (!document.querySelector('.vertically-snappable video') && Date.now() - t0 < 1500) { requestAnimationFrame(go); return; }
                showTargetReel();
                [200, 500, 1000].forEach(ms => setTimeout(showTargetReel, ms));   // Facebook may put its remembered position back a moment later
                root.style.opacity = '';
                if (from) root.animate([{ clipPath: from, opacity: 0 }, { opacity: 1, offset: .6 }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' });
                else root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
            };
            go();
        }
        wasIn = now;
    };
    // The frame of the video on screen as a small canvas, with where it sits; null when there is none to take.
    const frameOf = (v) => {
        if (!v || v.readyState < 2 || !v.videoWidth) return null;
        const k = Math.min(1, 540 / v.videoWidth), cv = document.createElement('canvas');
        cv.width = Math.round(v.videoWidth * k); cv.height = Math.round(v.videoHeight * k);
        try { cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height); } catch (e) { return null; }
        const r = v.getBoundingClientRect();
        return { cv, left: r.left, top: r.top, width: r.width, height: r.height, rect: r, fit: getComputedStyle(v).objectFit };
    };
    const frameOfActiveVideo = () => {
        let v = null, area = 0;
        document.querySelectorAll('video').forEach(e => {
            const r = e.getBoundingClientRect();
            const a = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
            if (a > area) { area = a; v = e; }
        });
        return frameOf(v);
    };
    let lastShot = null;
    setInterval(() => { if (wasIn && !document.hidden) lastShot = frameOfActiveVideo() || lastShot; else if (!wasIn) lastShot = null; }, 600);

    // Leaving the viewer (Back): a still of the video's frame closes over the page into the card it opened from (or fades
    // out when it did not open from one). Runs when the address changes (Back calls replaceState while the viewer is still
    // drawn; by `popstate` Facebook has already removed it), before Facebook swaps the viewer for the feed.
    const closeViewer = () => {
        const p = location.pathname;
        if (!wasIn || p.indexOf('/reel/') === 0 || p.indexOf('/videos/') !== -1) return;
        // The app's own buttons (fixed on the page) would show over the page the closing opens up, until reel_controls.js
        // hides them on its next poll: they fade out with it.
        const root = document.documentElement;
        root.classList.add('mb-closing');
        setTimeout(() => root.classList.remove('mb-closing'), 600);
        // The video's frame now, or the one kept a moment ago when Facebook has already taken the viewer off the page (some
        // exits reach here only at popstate, with no video left).
        const shotNow = frameOfActiveVideo();
        const shot = shotNow || lastShot;
        if (!shot) return;
        const cv = shot.cv, c = cardRect;
        cv.style.cssText = 'position:absolute;left:' + shot.left + 'px;top:' + shot.top + 'px;width:' + shot.width + 'px;height:' + shot.height + 'px;object-fit:' + shot.fit;
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#000;pointer-events:none';
        ov.appendChild(cv);
        document.body.appendChild(ov);
        const to = c ? 'inset(' + Math.round(c.top) + 'px ' + Math.round(innerWidth - c.right) + 'px ' + Math.round(innerHeight - c.bottom) + 'px ' + Math.round(c.left) + 'px round 18px)' : 'inset(0px round 0px)';
        // the opposite of opening: it shrinks into the card while it fades out, over the whole movement
        const a = ov.animate([
            { clipPath: 'inset(0px round 0px)', opacity: 1 },
            { clipPath: to, opacity: 0 }
        ], { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' });
        a.onfinish = () => ov.remove();
    };
    // reel_controls.js's buttons wait, unseen, for their place while this class is on (it sets it too, polling every 250 ms): set from
    // the address right away, since the download button shows (top right) as soon as the viewer is drawn. It takes the class off again
    // if the page turns out not to be a viewer.
    const viewerClass = () => {
        const p = location.pathname;
        const viewer = p.indexOf('/reel/') === 0 || p.indexOf('/videos/') !== -1;
        if (viewer) window.__mbViewerAt = Date.now();   // reel_controls.js leaves the class alone for a moment (see its poll)
        document.documentElement.classList.toggle('mb-in-reels', viewer);
    };
    ['pushState', 'replaceState'].forEach(n => {
        const f = history[n];
        history[n] = function() { const r = f.apply(this, arguments); maybeStartHero(); viewerClass(); closeViewer(); entering(); return r; };
    });
    window.addEventListener('popstate', () => { maybeStartHero(); viewerClass(); closeViewer(); entering(); });
    // A normal video opens the same viewer on a /videos/ address, which counts as the viewer only once its reel is drawn:
    // looked for as it is added, before it is painted, so the opening starts without a frame of the bare viewer.
    new MutationObserver(() => { if (!wasIn && location.pathname.indexOf('/videos/') !== -1) entering(); })
        .observe(document.body, { childList: true, subtree: true });
    setInterval(entering, 100);     // a /videos/ link only counts once its reels are in the page
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
    // `playing` comes just after the video paints its first frame, so hiding it there left one frame of video on screen
    // before the fade. It is hidden from `loadeddata`, a step earlier (`playing` then clears it or fades it in).
    document.addEventListener('loadeddata', (e) => {
        const v = e.target;
        if (!(v instanceof HTMLVideoElement) || !v.requestVideoFrameCallback || !inReel() || !v.closest(REEL)) return;
        // The video the feed was playing goes on from where it was (Facebook starts it from where the tap landed; a moment has
        // passed since): the viewer's copy is moved to the present.
        const id = idOfPath();
        if (playback && id && id === playback.id && Date.now() - playback.at < 8000) {
            const want = playback.t + (playback.playing ? (Date.now() - playback.at) / 1000 : 0) + 0.1;
            playback = null;
            if (isFinite(v.duration) && want > 0.5 && want < v.duration - 1 && want - v.currentTime > 0.3) v.currentTime = want;
        }
        v.style.opacity = '0';
        setTimeout(() => { if (v.style.opacity === '0' && !v.getAnimations().length) v.style.opacity = ''; }, 1500);   // never stays hidden
    }, true);
    document.addEventListener('playing', (e) => {
        const v = e.target, it = v instanceof HTMLVideoElement && v.closest(REEL);
        if (!it) return;
        const sn = snaps.get(it);
        if (sn) requestAnimationFrame(() => requestAnimationFrame(() => { sn.c.remove(); snaps.delete(it); }));
        if (v.currentTime > 0.6 || !inReel()) { v.style.opacity = ''; return; }       // a video that resumes, not one that starts
        const pic = it.querySelector('img.img'), wrap = pic && pic.parentElement;
        if (!wrap || !pic.naturalWidth || !v.videoWidth) {
            // No cover of ours to cross-fade from: the video stays transparent from `playing` until it presents its first frame
            // (~250 ms later, when whatever is under it, Facebook's picture or black, gets replaced) and fades in from there.
            if (v.requestVideoFrameCallback) {
                let done = false;
                // the inline 0 stays until the animation ends (dropping it here showed one frame of the whole video before the fade began)
                const fin = () => {
                    if (done) return; done = true;
                    const a = v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: 'ease-out', fill: 'forwards' });
                    a.onfinish = () => { v.style.opacity = ''; a.cancel(); };
                };
                v.style.opacity = '0';
                v.requestVideoFrameCallback(fin);
                setTimeout(fin, 900);       // a video that never presents a frame must not stay hidden
            }
            return;
        }
        const wr = wrap.getBoundingClientRect(), vr = v.getBoundingClientRect();
        let w = vr.width, h = vr.height, l = vr.left - wr.left, t = vr.top - wr.top;
        if (getComputedStyle(v).objectFit === 'contain') {          // the picture, not the box it sits in
            const k = Math.min(vr.width / v.videoWidth, vr.height / v.videoHeight);
            w = v.videoWidth * k; h = v.videoHeight * k; l += (vr.width - w) / 2; t += (vr.height - h) / 2;
        }
        v.style.opacity = '';       // the cover copy holds the place until the video shows
        const c = new Image();
        c.src = pic.currentSrc || pic.src;
        c.style.cssText = 'position:absolute;left:' + Math.round(l) + 'px;top:' + Math.round(t) + 'px;width:' + Math.round(w) + 'px;height:' +
            Math.round(h) + 'px;object-fit:cover;pointer-events:none;opacity:1;transition:opacity ' + FADE_MS + 'ms ease-out';
        wrap.appendChild(c);
        // `playing` comes ~200 ms before the video paints its first frame: fading from there ended before any video showed and
        // the cover cut to it. The fade starts on the first frame the video really presents.
        let started = false;
        const go = () => {
            if (started) return; started = true;
            requestAnimationFrame(() => requestAnimationFrame(() => { c.style.opacity = '0'; }));
            setTimeout(() => c.remove(), FADE_MS + 150);
        };
        setTimeout(go, 900);        // no frame callback (old WebView) or a video that never presents
        if (v.requestVideoFrameCallback) {
            let tries = 0;
            const cb = (_, md) => { if (md.mediaTime > 0.03 || tries++ > 8) go(); else v.requestVideoFrameCallback(cb); };
            v.requestVideoFrameCallback(cb);
        } else go();
    }, true);
})();
