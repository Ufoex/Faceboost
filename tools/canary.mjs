#!/usr/bin/env node
// Faceboost live check: the app on a phone against today's real m.facebook.com.
//
// Facebook changes its pages without notice and the page scripts (hide_groups.js, hide_suggested.js, the reel viewer...)
// then stop working quietly. This reads the pages the app is showing, over adb + the WebView's DevTools socket, and says what
// still matches what the scripts rely on. It only reads: nothing is posted, liked or hidden by it. It scrolls the feed a little
// (window.scrollBy) so more posts load; --no-scroll leaves the page as it is.
//
// Run it by hand before a release, or when something looks off (not on a schedule: it needs the phone connected, the app
// logged in, and it uses your account's feed).
//
//   node tools/canary.mjs                  both parts (the feed, then the reel viewer)
//   node tools/canary.mjs --no-reel        the feed only
//   node tools/canary.mjs --no-feed        the reel viewer only
//   node tools/canary.mjs --no-scroll      do not scroll the feed
//   node tools/canary.mjs --package com.ufoex.materialbook   (default: the debug build, then the release one)
//   node tools/canary.mjs --serial 192.168.1.5:35027         (default: the only device adb sees)
//
// Exit code 1 when a check FAILs; WARN means "could not tell" (the feed had none of that kind of post right now).
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const adbArgs = opt('serial') ? ['-s', opt('serial')] : [];
const adb = (...a) => {
  const r = spawnSync('adb', [...adbArgs, ...a], { encoding: 'utf8' });
  if (r.error) { console.error('adb not found'); process.exit(2); }
  return (r.stdout || '').trim();
};

// ---- the phone's WebView
const PACKAGES = opt('package') ? [opt('package')] : ['com.ufoex.materialbook.test', 'com.ufoex.materialbook'];
const ACTIVITY = 'com.eepiemi.materialbook.MainActivity';

if (!/\tdevice$/m.test(adb('devices'))) { console.error('No phone through adb (adb devices shows none ready).'); process.exit(2); }

// The phone must be awake and unlocked: asleep, its network is cut and the pages fail to load (the check would blame the app).
const asleep = () => /mWakefulness=(Asleep|Dozing)/.test(adb('shell', 'dumpsys', 'power'));
const locked = () => /(mDreamingLockscreen=true|keyguardShowing=true|isStatusBarKeyguard=true|mShowingLockscreen=true)/.test(adb('shell', 'dumpsys', 'window'));
if (asleep()) { adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP'); await sleep(2000); }
if (asleep() || locked()) { console.error('The phone is asleep or locked: unlock it (and keep the screen on) and run this again.'); process.exit(2); }

let pkg = null, pid = '';
for (const p of PACKAGES) {
  if (adb('shell', 'pm', 'path', p)) { pkg = p; pid = adb('shell', 'pidof', p); break; }
}
if (!pkg) { console.error('The app is not installed: ' + PACKAGES.join(' / ')); process.exit(2); }
if (!pid) {
  adb('shell', 'am', 'start', '-n', `${pkg}/${ACTIVITY}`);
  for (let i = 0; i < 20 && !pid; i++) { await sleep(1000); pid = adb('shell', 'pidof', pkg); }
  await sleep(6000);
}
if (!pid) { console.error('Could not start ' + pkg); process.exit(2); }
const port = adb('forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid.split(/\s+/)[0]}`);
const tabs = await (await fetch(`http://localhost:${port}/json`)).json();
const tab = tabs.find((t) => t.type === 'page');
if (!tab) { console.error('The app has no page open.'); process.exit(2); }

const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let nextId = 1;
const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); p(m); } };
const ev = (expression) => new Promise((resolve) => {
  const id = nextId++;
  pending.set(id, (m) => resolve(m.result?.exceptionDetails ? { error: m.result.exceptionDetails.exception?.description ?? 'error' } : m.result?.result?.value));
  ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }));
});

// A page that did not load at all (no network): say so once, instead of failing every check below.
const reachable = async () => {
  for (let i = 0; i < 2; i++) {
    const href = await ev('location.href');
    if (typeof href === 'string' && !href.startsWith('chrome-error:') && href !== 'about:blank') return true;
    await ev(`location.href = 'https://m.facebook.com/'`);
    await sleep(8000);
  }
  return false;
};
if (!(await reachable())) { console.error('The app cannot load m.facebook.com (no network on the phone, or Facebook is down).'); process.exit(2); }

// ---- results
let fails = 0, warns = 0;
const report = (level, name, detail = '') => {
  if (level === 'FAIL') fails++;
  if (level === 'WARN') warns++;
  console.log(`${level.padEnd(4)}  ${name}${detail ? '  ' + detail : ''}`);
};
const check = (ok, name, detail) => report(ok ? 'PASS' : 'FAIL', name, detail);
const waitFor = async (expr, ms = 15000) => {
  for (let t = 0; t < ms; t += 500) { if (await ev(expr)) return true; await sleep(500); }
  return false;
};

console.log(`Faceboost live check: ${pkg} (${new Date().toISOString().slice(0, 16).replace('T', ' ')})\n`);

// ---- the app's own scripts are in the page
const loaded = await ev(`({ feedPost: typeof window.hideFeedPost, controls: !!window.__mbReelControls, transition: !!window.__mbReelTransition })`);
check(loaded?.feedPost === 'function', 'scripts.js is loaded (hideFeedPost)');

// ---- the feed
if (!flag('no-feed')) {
  console.log('\nFeed');
  await ev(`location.href = 'https://m.facebook.com/'`);
  await sleep(3000);
  const ok = await waitFor(`document.querySelectorAll('[data-tracking-duration-id]').length > 3`, 25000);
  check(ok, 'the home feed loads');
  if (ok) {
    if (!flag('no-scroll')) {
      for (let i = 0; i < 8; i++) { await ev(`window.scrollBy(0, 800)`); await sleep(900); }
    }
    const feed = await ev(`(() => {
      const rows = [...document.querySelectorAll('[data-tracking-duration-id]')].filter(p => p.parentElement?.getAttribute('data-type') === 'vscroller');
      // a group post: the square group icon with the author's round avatar over it (hide_groups.js)
      const groupish = p => { const [i, o] = p.querySelectorAll('img'); return !!(i && o && !i.classList.contains('rounded') && o.classList.contains('rounded')); };
      const bullets = [...document.querySelectorAll('div[data-mcomponent="TextArea"][data-type="text"][data-tti-phase="-1"] .native-text > span')]
        .map(s => s.textContent.trim()).filter(t => t === '\\u2022' || t === '\\u00b7');
      const reelsHeader = [...document.querySelectorAll('span,div')].some(e => e.children.length === 0 && /^Reels$/.test(e.textContent.trim()));
      return {
        rows: rows.length,
        groupPosts: rows.filter(groupish).length,
        groupHidden: rows.filter(groupish).filter(p => getComputedStyle(p).display === 'none').length,
        bullets: bullets.length,
        reelsHeader,
        vscroller: !!document.querySelector('[data-type="vscroller"]'),
        postViaFn: typeof window.hideFeedPost === 'function' && typeof window.feedPostRows === 'function'
      };
    })()`);
    check(feed.vscroller, 'the feed is a vscroller list');
    check(feed.rows >= 5, 'the feed draws posts as rows', `${feed.rows} rows`);
    check(feed.postViaFn, 'feedPostRows / hideFeedPost are defined');
    if (feed.groupPosts === 0) report('WARN', 'group posts (hide_groups.js)', 'none in this stretch of the feed: could not tell');
    else report('PASS', 'group posts are recognised by their avatar', `${feed.groupPosts} found, ${feed.groupHidden} hidden now (hidden only with Settings > Feed > Groups on)`);
    if (feed.bullets === 0) report('WARN', 'suggested posts (hide_suggested.js)', 'none in this stretch of the feed: could not tell');
    else report('PASS', 'suggested posts show their bullet separator', `${feed.bullets} found`);
    check(feed.reelsHeader, 'the Reels section is in the feed (cards that open the viewer)');
  }
}

// ---- the reel viewer
if (!flag('no-reel')) {
  console.log('\nReel viewer');
  await ev(`location.href = 'https://m.facebook.com/reel/'`);
  await sleep(3000);
  const ok = await waitFor(`!!document.querySelector('.vertically-snappable video')`, 25000);
  check(ok, 'the reel viewer opens with a video (.vertically-snappable video)');
  if (ok) {
    await sleep(2500);
    const v = await ev(`(() => {
      const video = document.querySelector('.vertically-snappable video');
      const item = video.closest('.vscroller > .vertically-snappable');
      const like = [...document.querySelectorAll('[role="button"][data-long-click-action-id]')].filter(b => b.getBoundingClientRect().width);
      const layer = like[0]?.parentElement;
      return {
        playing: !video.paused && video.readyState >= 2,
        item: !!item,
        like: like.length,
        railAndInfo: layer ? layer.children.length : 0,
        seekbar: !!document.querySelector('.seekbar-container'),
        cover: !!item?.querySelector('img.img'),
        ourButtons: ['mb-reel-hide', 'mb-reel-fit', 'materialbook-global-downloader'].map(id => !!document.getElementById(id)),
        controls: !!window.__mbReelControls, transition: !!window.__mbReelTransition
      };
    })()`);
    check(v.playing, 'the reel plays');
    check(v.item, 'the video sits in a .vscroller > .vertically-snappable item');
    check(v.like > 0, 'the like button is found by data-long-click-action-id', `${v.like} found`);
    check(v.railAndInfo >= 4, "the like button's layer holds the rail and the caption", `${v.railAndInfo} children`);
    // /reel/ has no seek bar of its own (reel_controls.js draws one while paused); the normal video viewer has .seekbar-container.
    report(v.seekbar ? 'WARN' : 'PASS', '/reel/ has no seek bar of its own (reel_controls.js adds one when paused)', v.seekbar ? 'Facebook now draws one: the app bar may double it' : '');
    report(v.cover ? 'PASS' : 'WARN', 'the reel has a cover image (img.img)', v.cover ? '' : 'none now: the cover fade is not exercised');
    check(v.controls && v.transition, 'reel_controls.js and reel_transition.js are loaded');
    check(v.ourButtons.slice(0, 2).every(Boolean), "the app's buttons are drawn (eye, fit)");
  }
}

console.log(`\n${fails ? 'FAILED' : 'OK'}: ${fails} failed, ${warns} could not tell`);
ws.close();
process.exit(fails ? 1 : 0);
