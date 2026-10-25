const escapeText = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// The attributes for a diagram piece's tip: its name, then what it's doing and its numbers.
export function tipAttrs(title, { detail = '', stats = '', color = '' } = {}) {
    const attr = (name, value) => value ? ` ${name}="${escapeText(value)}"` : '';
    const label = [title, detail, stats].filter(Boolean).join(', ');
    return `data-tip="${escapeText(title)}"${attr('data-tip-detail', detail)}${attr('data-tip-stats', stats)}${attr('data-tip-color', color)} aria-label="${escapeText(label)}"`;
}

export function createTooltipController({ document, window }) {
    let tipCard = null;
    let tipTarget = null;
    const TIP_SELECTOR = '[data-tip], [data-tip-text], [title]';

    function init() {
        if (tipCard) return tipCard;
        tipCard = document.createElement('div');
        tipCard.className = 'tip-card';
        tipCard.setAttribute('role', 'tooltip');
        tipCard.hidden = true;
        document.body.appendChild(tipCard);
        return tipCard;
    }

    function showTip(el) {
        if (!tipCard) init();
        // A title set since the last hover replaces the one kept aside.
        if (el.hasAttribute('title')) {
            const text = el.getAttribute('title');
            el.removeAttribute('title');
            el.dataset.tipText = text;
            if (!el.hasAttribute('aria-label')) el.setAttribute('aria-description', text);
        }
        if (!el.dataset.tip && !el.dataset.tipText) return hideTip();
        const line = (className, text) => {
            const div = document.createElement('div');
            div.className = className;
            div.textContent = text;
            return tipCard.appendChild(div);
        };
        tipCard.replaceChildren();
        tipCard.classList.toggle('has-swatch', !!el.dataset.tipColor);
        if (el.dataset.tip) {
            const title = line('tip-title', el.dataset.tip);
            if (el.dataset.tipColor) {
                const swatch = document.createElement('span');
                swatch.className = 'tip-swatch';
                swatch.style.background = el.dataset.tipColor;
                if (typeof title.prepend === 'function') {
                    title.prepend(swatch);
                } else if (title.children) {
                    title.children.unshift(swatch);
                }
            }
            if (el.dataset.tipDetail) line('tip-detail', el.dataset.tipDetail);
            if (el.dataset.tipStats) line('tip-stats', el.dataset.tipStats);
        } else {
            line('tip-text', el.dataset.tipText);
        }
        tipTarget = el;
        tipCard.hidden = false;
    }

    function hideTip() {
        tipTarget = null;
        if (tipCard) tipCard.hidden = true;
    }

    // Above the point, centered on it and kept on screen; below it where there's no room above.
    function placeTip(x, y, below = y) {
        if (!tipCard) return;
        const margin = 12;
        const { width, height } = tipCard.getBoundingClientRect();
        const left = Math.min(Math.max(margin, x - width / 2), window.innerWidth - width - margin);
        const top = y - height - 14 >= margin ? y - height - 14 : Math.min(below + 18, window.innerHeight - height - margin);
        tipCard.style.left = `${left}px`;
        tipCard.style.top = `${top}px`;
    }

    function attach() {
        init();
        document.addEventListener('pointerover', (e) => {
            const el = e.target.closest?.(TIP_SELECTOR);
            if (!el) return hideTip();
            if (el !== tipTarget || el.hasAttribute('title')) showTip(el);
            if (tipTarget) placeTip(e.clientX, e.clientY);
        });
        document.addEventListener('pointermove', (e) => {
            if (!tipTarget) return;
            if (!tipTarget.isConnected) return hideTip();
            placeTip(e.clientX, e.clientY);
        }, { passive: true });
        // A tap's tip stays until the next tap; a mouse's goes when it leaves.
        document.addEventListener('pointerout', (e) => {
            if (e.pointerType !== 'touch' && tipTarget && !tipTarget.contains(e.relatedTarget)) hideTip();
        });
        document.addEventListener('focusin', (e) => {
            const el = e.target.closest?.(TIP_SELECTOR);
            if (!el || !e.target.matches(':focus-visible')) return;
            showTip(el);
            const box = el.getBoundingClientRect();
            if (tipTarget) placeTip(box.left + box.width / 2, box.top, box.bottom);
        });
        document.addEventListener('focusout', hideTip);
        window.addEventListener('scroll', hideTip, { passive: true, capture: true });
    }

    return {
        init,
        attach,
        showTip,
        hideTip,
        placeTip,
        get tipCard() { return tipCard; },
        get tipTarget() { return tipTarget; }
    };
}
