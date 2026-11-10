// Cross-fade between reels. The viewer is a native scroll-snap list (.vscroller): the browser does the drag and the
// snap, Facebook only listens to `scroll`, so nothing changes reel halfway through a drag and there is nothing to
// gate or realign. This only fades by how much of each reel shows: the one leaving becomes transparent while the
// next one is revealed from dark. Opacity is 1 (no style at all) when a reel is at rest.
(function() {
    if (window.__mbReelTransition) return;
    window.__mbReelTransition = true;

    const inReel = () => location.pathname.indexOf('/reel/') === 0;
    // the reels of the list (the same class also marks the tab bar and the pull-to-refresh spinner)
    const items = () => [...document.querySelectorAll('.vscroller > .vertically-snappable')].filter(e => e.offsetHeight > innerHeight * 0.5);
    const fadeIn = (visible) => Math.max(0, Math.min(1, visible * 1.18));
    const fadeOut = (a) => Math.max(0, Math.min(1, 1 - a * 1.18));
    const opacityFor = (p) => { const a = Math.abs(p); return a <= 0.5 ? fadeOut(a) : fadeIn(1 - a); };

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
})();
