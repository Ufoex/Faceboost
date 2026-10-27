// Hide posts Facebook labels as AI content ("AI info" / "Contenido de IA" next to the author).
// Mobile site only: the desktop site's markup is different.
(() => {
    if (window.isDesktopMode()) return;

    const UNIT = 'div[data-tracking-duration-id]';
    const normalize = text => text
        .replace(/[​-‏﻿]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/^[\s·•.]+|[\s·•.]+$/g, '')
        .toLowerCase();
    // Whole labels only: a post that merely mentions "AI info" in its text stays.
    const LABELS = new Set([
        'AI content', 'AI info', 'Made with AI', 'AI-generated', 'AI generated',
        'Contenido de IA', 'Información de IA', 'Información sobre la IA', 'Hecho con IA',
        'Creado con IA', 'Generado con IA', 'Generado por IA',
        'Nội dung AI', 'Thông tin về AI', 'Được tạo bằng AI', 'Tạo bằng AI'
    ].map(normalize));

    // The first short visible texts of a post (its header, where the label sits). Texts can be
    // plain or an <svg><use href="#id"> pointing at a hidden <text> elsewhere in the page;
    // aria-hidden texts are Facebook's decoys and are skipped.
    function headerTexts(unit) {
        const out = [];
        const walker = document.createTreeWalker(unit, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        for (let node; out.length < 8 && (node = walker.nextNode());) {
            let text = null;
            if (node.nodeType === Node.TEXT_NODE) {
                if (!node.parentElement.closest('[aria-hidden="true"]')) text = node.textContent;
            } else if (node.localName === 'use') {
                const ref = (node.getAttribute('href') || node.getAttribute('xlink:href') || '').slice(1);
                text = ref && document.getElementById(ref)?.textContent;
            }
            if (text && text.length <= 40) {
                const clean = normalize(text);
                if (clean) out.push(clean);
            }
        }
        return out;
    }

    function hideAiPosts() {
        if (window.location.pathname !== '/') return;
        document.querySelectorAll(UNIT).forEach(unit => {
            if (unit.style.display === 'none' || unit.querySelector('[role="tab"]')) return;
            if (!headerTexts(unit).some(text => LABELS.has(text))) return;
            unit.style.display = 'none';
            // The mobile feed draws a thin separator before each post.
            const gap = unit.previousElementSibling;
            if (gap && !gap.matches(UNIT) && gap.offsetHeight <= 12) gap.style.display = 'none';
        });
    }

    // The label can appear after the post does, so every post is re-checked, but at most every
    // 300 ms and never inside the mutation callback itself.
    let scheduled = false;
    new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        setTimeout(() => { scheduled = false; hideAiPosts(); }, 300);
    }).observe(document.body, { childList: true, subtree: true });

    hideAiPosts();
})();
