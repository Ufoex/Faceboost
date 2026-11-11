// DEBUG BUILDS ONLY (src/debug/res/raw: the release APK has no such resource).
// Records what a bug report needs, one `@@rec {json}` console line per event, which WebView forwards to logcat:
//   adb logcat -d -s chromium | grep '@@rec' | sed 's/.*@@rec //'      (scripts/debug-log.sh saves it to a file)
// touch / scroll / programmatic scrolls (who called) / reel list state (hidden ads, which reel holds the video, paused...)
// / video events / failed requests / page errors / navigation.
(function () {
    if (window.__mbRec) return;
    const T0 = Date.now();
    const log = (ev, data) => {
        try { console.log('@@rec ' + JSON.stringify(Object.assign({ t: Date.now() - T0, ev }, data))); } catch (e) {}
    };
    window.__mbRec = log;
    const scroller = () => document.querySelector('.vscroller');
    const items = () => [...document.querySelectorAll('.vscroller > .vertically-snappable')];
    const path = () => location.pathname.slice(0, 70);
    // H hidden, a ad, V holds a <video>, t has text (an empty one is a row still loading)
    const flag = e => (e.style.display === 'none' ? 'H' : '') + (e.dataset.adHidden ? 'a' : '') + (e.querySelector('video') ? 'V' : '_') + (e.innerText.trim() ? 't' : '-');
    // the caller of a programmatic scroll, without URLs: "advance (<anonymous>:4014:14)"
    const caller = () => new Error().stack.split('\n').slice(3, 5).map(s => s.trim().replace(/https?:\/\/\S*\//, '')).join(' < ');

    log('boot', { url: path(), h: innerHeight, w: innerWidth, dpr: devicePixelRatio, auto: window.__mbAutoScroll && window.__mbAutoScroll.enabled });

    // ---- touch: start, end (with the swipe), cancel. Moves are not logged.
    let down = null;
    const pt = e => { const t = (e.changedTouches || e.touches || [])[0]; return t ? [Math.round(t.clientX), Math.round(t.clientY)] : [0, 0]; };
    document.addEventListener('touchstart', e => { down = { at: Date.now(), p: pt(e) }; log('touch', { k: 'start', p: down.p, n: e.touches.length }); }, { capture: true, passive: true });
    const up = k => e => {
        const p = pt(e), d = down || { at: Date.now(), p };
        log('touch', { k, p, dx: p[0] - d.p[0], dy: p[1] - d.p[1], ms: Date.now() - d.at, n: e.touches.length });
        if (!e.touches.length) down = null;
    };
    document.addEventListener('touchend', up('end'), { capture: true, passive: true });
    document.addEventListener('touchcancel', up('cancel'), { capture: true, passive: true });

    // ---- scroll of the reel list: first event after a pause and where it settles
    let scrolling = 0;
    document.addEventListener('scroll', e => {
        const s = scroller();
        if (!s || e.target !== s) return;
        if (!scrolling) log('scroll', { k: 'start', st: Math.round(s.scrollTop) });
        clearTimeout(scrolling);
        scrolling = setTimeout(() => { scrolling = 0; log('scroll', { k: 'stop', st: Math.round(s.scrollTop) }); }, 300);
    }, { capture: true, passive: true });

    // ---- programmatic scrolls and who made them
    const sii = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...a) { log('scrollIntoView', { opt: a[0], by: caller() }); return sii.apply(this, a); };
    const d = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
    Object.defineProperty(Element.prototype, 'scrollTop', {
        get: d.get,
        set(v) { if (this.classList && this.classList.contains('vscroller') && Math.abs(v - this.scrollTop) > 1) log('scrollTop=', { v: Math.round(v), by: caller() }); d.set.call(this, v); },
        configurable: true
    });

    // ---- video events on any video (they do not bubble: captured on the document)
    ['play', 'playing', 'pause', 'ended', 'error', 'stalled', 'waiting', 'emptied', 'loadstart', 'abort'].forEach(type =>
        document.addEventListener(type, e => {
            const v = e.target;
            if (!(v instanceof HTMLVideoElement)) return;
            const it = v.closest('.vscroller > .vertically-snappable');
            log('video', { type, ct: +v.currentTime.toFixed(1), item: it ? items().indexOf(it) : -1, ad: !!(it && it.dataset.adHidden), rs: v.readyState, err: v.error ? v.error.code : 0 });
        }, true));

    // ---- reel list state, only when it changes (not the playback position)
    let last = '';
    setInterval(() => {
        const s = scroller();
        if (!s) { last = ''; return; }
        const list = items();
        const rest = list.findIndex(e => Math.abs(e.getBoundingClientRect().top - s.getBoundingClientRect().top) < 3);
        const vids = [...document.querySelectorAll('video')].map(v => [v.paused ? 'P' : 'p', v.readyState, v.muted ? 'm' : 'u', v.error ? v.error.code : 0].join(''));
        const cur = { url: path(), st: Math.round(s.scrollTop), at: rest, items: list.map(flag).join(' '), vids: vids.join(','), rows: s.children.length };
        const key = JSON.stringify(cur);
        if (key !== last) { last = key; log('state', cur); }
    }, 400);

    // ---- failed requests (status >= 400 or network error), without the query string
    const bad = (kind, url, why) => log('net', { kind, url: String(url).replace(/^https?:\/\/[^/]*/, '').split('?')[0].slice(0, 90), why });
    const f = window.fetch;
    window.fetch = function (input, init) {
        const url = input && input.url || input;
        return f.apply(this, arguments).then(r => { if (r.status >= 400) bad('fetch', url, r.status); return r; }, err => { bad('fetch', url, String(err)); throw err; });
    };
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, url) {
        this.addEventListener('loadend', () => { if (this.status >= 400 || this.status === 0) bad('xhr', url, this.status); });
        return open.apply(this, arguments);
    };

    // ---- errors, navigation, visibility
    addEventListener('error', e => log('error', { msg: String(e.message).slice(0, 160), at: String(e.filename || '').split('/').pop() + ':' + e.lineno }));
    addEventListener('unhandledrejection', e => log('error', { msg: 'rejection ' + String(e.reason).slice(0, 160) }));
    ['pushState', 'replaceState'].forEach(n => { const o = history[n]; history[n] = function () { const r = o.apply(this, arguments); log('nav', { k: n, url: path() }); return r; }; });
    addEventListener('popstate', () => log('nav', { k: 'popstate', url: path() }));
    document.addEventListener('visibilitychange', () => log('visibility', { v: document.visibilityState }));
})();
