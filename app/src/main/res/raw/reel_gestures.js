// Reel gestures: hold the video to play it faster (instead of Facebook's copy-link),
// double tap the left/right half to go back/forward. Values come from window.__mbReel
// ({rate, skip}) which the app prepends from the settings.
(function() {
    if (window.__mbReelGestures) return;
    window.__mbReelGestures = true;
    const cfg = window.__mbReel || { rate: 2, skip: 10 };
    const HOLD_MS = 350, DOUBLE_MS = 300, MOVE = 12;

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
    const say = (txt, ms) => {
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'mb-reel-badge';
            badge.style.cssText = 'position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:2147483000;' +
                'padding:6px 14px;border-radius:16px;background:rgba(0,0,0,.65);color:#fff;font:600 15px sans-serif;' +
                'pointer-events:none;display:none';
            document.body.appendChild(badge);
        }
        badge.textContent = txt;
        badge.style.display = 'block';
        clearTimeout(badge._t);
        if (ms) badge._t = setTimeout(() => { badge.style.display = 'none'; }, ms);
    };
    const hideBadge = () => { if (badge) badge.style.display = 'none'; };

    let st = null, lastTap = null, swallowUntil = 0;

    const onUI = (t) => !!(t.closest && t.closest('button,a,input,[role=button],[role=link],[role=slider],#mb-reel-controls,[id^=mb-reel-]'));

    document.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1 || !inReel() || onUI(e.target)) { st = null; return; }
        const v = activeVideo();
        if (!v) { st = null; return; }
        const t = e.touches[0];
        st = { x: t.clientX, y: t.clientY, t0: Date.now(), v, held: false, moved: false, target: e.target, wasPaused: v.paused };
        st.timer = setTimeout(() => {
            if (!st || st.moved) return;
            st.held = true;
            st.rate0 = v.playbackRate;
            v.playbackRate = cfg.rate;
            if (v.paused) v.play();
            say(cfg.rate + 'x');
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
        clearTimeout(s.timer);
        if (s.held) {
            s.v.playbackRate = s.rate0 || 1;
            hideBadge();
            swallowUntil = Date.now() + 500;
            e.preventDefault(); // no stopPropagation: copy_post_text.js must still see touchend to cancel its 1 s timer
            return;
        }
        if (s.moved || Date.now() - s.t0 > 250) { lastTap = null; return; }
        const now = Date.now();
        const side = s.x < innerWidth / 2 ? -1 : 1;
        if (lastTap && now - lastTap.t < DOUBLE_MS && lastTap.side === side) {
            const v = s.v;
            if (isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + side * cfg.skip));
            say((side < 0 ? '-' : '+') + cfg.skip + 's', 600);
            // the first tap already toggled play/pause: put it back
            const was = lastTap.wasPaused;
            setTimeout(() => { if (v.paused !== was) was ? v.pause() : v.play(); }, 80);
            swallowUntil = now + 400;
            lastTap = null;
            e.preventDefault();
        } else {
            lastTap = { t: now, side, wasPaused: s.wasPaused };
        }
    }, { capture: true, passive: false });

    // The click that follows a hold / double tap must not pause the video or open anything.
    ['click', 'pointerup', 'mouseup'].forEach(n => document.addEventListener(n, (e) => {
        if (Date.now() < swallowUntil) { e.preventDefault(); e.stopPropagation(); }
    }, true));
    document.addEventListener('contextmenu', (e) => { if (inReel() && !onUI(e.target)) e.preventDefault(); }, true);
})();
