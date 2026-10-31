// Reel gestures: hold the video to play it faster (instead of Facebook's copy-link). Double tap,
// by thirds of the screen: left goes back, middle likes (a second time takes the like back),
// right goes forward. Values come from
// window.__mbReel ({rate, skip}) which the app prepends from the settings.
(function() {
    if (window.__mbReelGestures) return;
    window.__mbReelGestures = true;
    const cfg = window.__mbReel || { rate: 2, skip: 10 };
    const HOLD_MS = 350, DOUBLE_MS = 300, MOVE = 12, EDGE = 32;

    const inReel = () => {
        const p = location.pathname;
        return p.indexOf('/reel/') === 0 || (p.indexOf('/videos/') !== -1 && !!document.querySelector('.vertically-snappable video'));
    };
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

    let badge;
    // [x, y]: show it just above the finger (the finger covers its own spot), else top centre.
    const say = (txt, ms, x, y) => {
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'mb-reel-badge';
            badge.style.cssText = 'position:fixed;z-index:2147483000;' +
                'padding:6px 14px;border-radius:16px;background:rgba(0,0,0,.65);color:#fff;font:600 15px sans-serif;' +
                'pointer-events:none;display:none';
            document.body.appendChild(badge);
        }
        if (x === undefined) { badge.style.left = '50%'; badge.style.top = '14%'; badge.style.transform = 'translateX(-50%)'; }
        else {
            badge.style.left = Math.max(40, Math.min(innerWidth - 40, x)) + 'px';
            badge.style.top = Math.max(40, y - 80) + 'px';
            badge.style.transform = 'translate(-50%,-50%)';
        }
        badge.textContent = txt;
        badge.style.display = 'block';
        clearTimeout(badge._t);
        if (ms) badge._t = setTimeout(() => { badge.style.display = 'none'; }, ms);
    };
    const hideBadge = () => { if (badge) badge.style.display = 'none'; };

    // The like button is the only action-rail button with a long-press action (the reaction
    // picker), so it is found without depending on the page language. Reels are stacked: take
    // the one on screen.
    const likeButton = () => {
        let best = null, bestDist = Infinity;
        document.querySelectorAll('[role="button"][data-long-click-action-id]').forEach(b => {
            const r = b.getBoundingClientRect();
            const cy = (r.top + r.bottom) / 2;
            if (!r.width || cy < 0 || cy > innerHeight) return;
            const d = Math.abs(cy - innerHeight / 2);
            if (d < bestDist) { bestDist = d; best = b; }
        });
        return best;
    };
    // Facebook swaps the like icon for a picture (the blue thumb) while the reel is liked; unliked it
    // is a text glyph. Same in every language, unlike the button's label.
    const isLiked = (b) => !!b.querySelector('img');
    // Our own animations, on <body>: Facebook's live inside the action rail, which hide mode makes
    // invisible, so they would never show there.
    const ICON = {
        up: ['M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z', '#1877f2'],
        down: ['M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z', '#cfd2d6'],
        pause: ['M6 19h4V5H6v14zm8-14v14h4V5h-4z', '#ffffff'],
        play: ['M8 5v14l11-7z', '#ffffff'],
        fwd: ['M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z', '#ffffff'],
        back: ['M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z', '#ffffff']
    };
    // An icon (and an optional caption) that pops in at the tap, drifts dx pixels and fades out.
    const pop = (x, y, kind, caption, dx) => {
        const [path, fill] = ICON[kind];
        const el = document.createElement('div');
        el.id = 'mb-reel-anim';
        el.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;width:96px;margin:-48px 0 0 -48px;z-index:2147483000;' +
            'pointer-events:none;display:flex;flex-direction:column;align-items:center;' +
            'filter:drop-shadow(0 2px 6px rgba(0,0,0,.55))';
        el.innerHTML = '<svg viewBox="0 0 24 24" width="96" height="96" fill="' + fill + '"><path d="' + path + '"/></svg>' +
            (caption ? '<span style="margin-top:-6px;color:#fff;font:700 18px sans-serif">' + caption + '</span>' : '');
        document.body.appendChild(el);
        el.animate([
            { transform: 'scale(.3)', opacity: 0 },
            { transform: 'scale(1.15)', opacity: 1, offset: .3 },
            { transform: 'translateX(' + dx * .4 + 'px) scale(1)', opacity: 1, offset: .65 },
            { transform: 'translateX(' + dx + 'px) scale(1.1)', opacity: 0 }
        ], { duration: 800, easing: 'ease-out' }).onfinish = () => el.remove();
    };
    // Double tap in the middle: like, or take the like back when the reel already has one.
    const likeReel = (x, y) => {
        const b = likeButton();
        const liked = !!b && isLiked(b);
        if (b) b.click();
        pop(x, y, liked ? 'down' : 'up', '', liked ? 24 : -24);
    };
    // Which third of the screen: -1 left (back), 0 middle (like), 1 right (forward).
    const zoneOf = (x) => x < innerWidth / 3 ? -1 : x > innerWidth * 2 / 3 ? 1 : 0;

    let st = null, lastTap = null, swallowUntil = 0, replaying = false;

    // A single tap is held back for DOUBLE_MS so a double tap never pauses the video first: Facebook
    // gets the click afterwards, only when no second tap came.
    const replayTap = (tap) => {
        clearTimeout(tap.timer);
        if (!inReel() || !document.contains(tap.target)) return;
        replaying = true;
        try { tap.target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); }
        finally { replaying = false; }
        // Show what the tap did once Facebook (or reel_controls.js's fallback, 80 ms) has toggled it.
        setTimeout(() => pop(tap.x, tap.y, tap.v.paused ? 'pause' : 'play', '', 0), 120);
    };

    const onUI = (t) => !!(t.closest && t.closest('button,a,input,[role=button],[role=link],[role=slider],#mb-reel-controls,[id^=mb-reel-]'));

    document.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1 || !inReel() || onUI(e.target)) { st = null; return; }
        const v = activeVideo();
        if (!v) { st = null; return; }
        const t = e.touches[0];
        // Starting at a screen edge = the system back gesture: it takes the touch without sending moves.
        if (t.clientX < EDGE || t.clientX > innerWidth - EDGE) { st = null; return; }
        st = { x: t.clientX, y: t.clientY, t0: Date.now(), v, held: false, moved: false, target: e.target };
        st.timer = setTimeout(() => {
            if (!st || st.moved) return;
            st.held = true;
            st.rate0 = v.playbackRate;
            v.playbackRate = cfg.rate;
            if (v.paused) v.play();
            say(cfg.rate + 'x', 0, st.x, st.y);
            // Back gesture while holding: no touchend/touchcancel may arrive, but the reel is gone.
            const s = st;
            s.dog = setInterval(() => {
                if (inReel() && document.contains(s.v)) return;
                clearInterval(s.dog);
                if (st === s) st = null;
                s.v.playbackRate = s.rate0 || 1;
                hideBadge();
            }, 200);
            // Cancel Facebook's own long-press (copy link): it sees the touch end here.
            ['touchcancel', 'pointercancel'].forEach(n => {
                try { st.target.dispatchEvent(new Event(n, { bubbles: true, cancelable: true })); } catch (_) {}
            });
        }, HOLD_MS);
    }, { capture: true, passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!st || st.held) return;
        const t = e.touches[0];
        if (Math.abs(t.clientX - st.x) > MOVE || Math.abs(t.clientY - st.y) > MOVE) { st.moved = true; clearTimeout(st.timer); }
    }, { capture: true, passive: true });

    document.addEventListener('touchend', (e) => {
        const s = st; st = null;
        if (!s) return;
        clearTimeout(s.timer); clearInterval(s.dog);
        if (s.held) {
            s.v.playbackRate = s.rate0 || 1;
            hideBadge();
            swallowUntil = Date.now() + 500;
            e.preventDefault(); // no stopPropagation: copy_post_text.js must still see touchend to cancel its 1 s timer
            return;
        }
        if (s.moved || Date.now() - s.t0 > 250) { lastTap = null; return; }
        const now = Date.now();
        const side = zoneOf(s.x);
        if (lastTap && now - lastTap.t < DOUBLE_MS && lastTap.side === side) {
            const v = s.v;
            clearTimeout(lastTap.timer);
            if (side === 0) likeReel(s.x, s.y);
            else {
                if (isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + side * cfg.skip));
                pop(s.x, s.y, side < 0 ? 'back' : 'fwd', cfg.skip + ' s', side * 40);
            }
            swallowUntil = now + 400;
            lastTap = null;
            e.preventDefault();
        } else {
            if (lastTap) replayTap(lastTap); // a tap elsewhere: the earlier one was a single tap
            const tap = lastTap = { t: now, side, target: s.target, x: s.x, y: s.y, v: s.v };
            tap.timer = setTimeout(() => { if (lastTap === tap) lastTap = null; replayTap(tap); }, DOUBLE_MS);
            swallowUntil = now + 150; // the click that follows this touchend is replayed later
        }
    }, { capture: true, passive: false });

    // The system back gesture steals the touch: the page gets a real touchcancel, never a touchend,
    // so drop the hold here. Our own synthetic touchcancel (above) is not trusted and is ignored.
    document.addEventListener('touchcancel', (e) => {
        if (!e.isTrusted) return;
        const s = st; st = null;
        if (!s) return;
        clearTimeout(s.timer); clearInterval(s.dog);
        if (s.held) { s.v.playbackRate = s.rate0 || 1; hideBadge(); swallowUntil = Date.now() + 500; }
    }, { capture: true, passive: true });

    // The click that follows a hold / double tap must not pause the video or open anything.
    ['click', 'pointerup', 'mouseup'].forEach(n => document.addEventListener(n, (e) => {
        if (!replaying && Date.now() < swallowUntil) { e.preventDefault(); e.stopPropagation(); }
    }, true));
    document.addEventListener('contextmenu', (e) => { if (inReel() && !onUI(e.target)) e.preventDefault(); }, true);
})();
