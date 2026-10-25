import test from 'node:test';
import assert from 'node:assert/strict';
import { tipAttrs, createTooltipController } from '../tooltip-controller.js';

test('tooltip-controller: tipAttrs formats data-tip attributes and aria-label with escaping', () => {
    const simple = tipAttrs('Heat Furnace');
    assert.equal(simple, 'data-tip="Heat Furnace" aria-label="Heat Furnace"');

    const full = tipAttrs('Cooker <A&B>', {
        detail: 'Baking "Cakes"',
        stats: '120/hr',
        color: '#ff0000',
    });
    assert.match(full, /data-tip="Cooker &lt;A&amp;B&gt;"/);
    assert.match(full, /data-tip-detail="Baking &quot;Cakes&quot;"/);
    assert.match(full, /data-tip-stats="120\/hr"/);
    assert.match(full, /data-tip-color="#ff0000"/);
    assert.match(full, /aria-label="Cooker &lt;A&amp;B&gt;, Baking &quot;Cakes&quot;, 120\/hr"/);
});

function createMockElement(tag = 'div') {
    const element = {
        tagName: tag.toUpperCase(),
        className: '',
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            toggle(c, force) {
                if (force === undefined) {
                    if (this.classes.has(c)) this.classes.delete(c);
                    else this.classes.add(c);
                } else if (force) {
                    this.classes.add(c);
                } else {
                    this.classes.delete(c);
                }
            },
            contains(c) { return this.classes.has(c); }
        },
        attributes: new Map(),
        dataset: {},
        children: [],
        style: {},
        hidden: false,
        isConnected: true,
        setAttribute(k, v) { this.attributes.set(k, String(v)); },
        getAttribute(k) { return this.attributes.get(k) || null; },
        hasAttribute(k) { return this.attributes.has(k); },
        removeAttribute(k) { this.attributes.delete(k); },
        appendChild(child) {
            this.children.push(child);
            return child;
        },
        replaceChildren(...nodes) {
            this.children = [...nodes];
        },
        getBoundingClientRect() {
            return { width: 100, height: 40, left: 10, top: 10, bottom: 50 };
        },
        contains(other) {
            return this === other || this.children.includes(other);
        }
    };
    return element;
}

function createMockEnvironment() {
    const listeners = new Map();
    const body = createMockElement('body');
    const doc = {
        body,
        createElement: (tag) => createMockElement(tag),
        addEventListener: (event, handler, options) => {
            if (!listeners.has(event)) listeners.set(event, []);
            listeners.get(event).push(handler);
        },
        removeEventListener: (event, handler) => {
            const list = listeners.get(event);
            if (list) {
                const idx = list.indexOf(handler);
                if (idx >= 0) list.splice(idx, 1);
            }
        },
    };
    const win = {
        innerWidth: 1024,
        innerHeight: 768,
        addEventListener: (event, handler, options) => {
            if (!listeners.has(event)) listeners.set(event, []);
            listeners.get(event).push(handler);
        },
        removeEventListener: (event, handler) => {
            const list = listeners.get(event);
            if (list) {
                const idx = list.indexOf(handler);
                if (idx >= 0) list.splice(idx, 1);
            }
        }
    };
    return { doc, win, listeners, body };
}

test('tooltip-controller: attaches tipCard to document.body and shows/hides tips', () => {
    const { doc, win } = createMockEnvironment();
    const tooltip = createTooltipController({ document: doc, window: win });
    tooltip.init();

    assert.ok(tooltip.tipCard);
    assert.equal(tooltip.tipCard.className, 'tip-card');
    assert.equal(tooltip.tipCard.getAttribute('role'), 'tooltip');
    assert.equal(tooltip.tipCard.hidden, true);
    assert.equal(doc.body.children.length, 1);

    const targetEl = createMockElement('div');
    targetEl.dataset.tip = 'Machine Unit';
    targetEl.dataset.tipDetail = 'Active';
    targetEl.dataset.tipColor = '#00ff00';

    tooltip.showTip(targetEl);
    assert.equal(tooltip.tipCard.hidden, false);
    assert.equal(tooltip.tipCard.children.length, 2); // title (with swatch) + detail
    assert.equal(tooltip.tipCard.classList.contains('has-swatch'), true);

    tooltip.placeTip(200, 200);
    assert.ok(tooltip.tipCard.style.left);
    assert.ok(tooltip.tipCard.style.top);

    tooltip.hideTip();
    assert.equal(tooltip.tipCard.hidden, true);
});

test('tooltip-controller: converts element title attribute into tip-text and aria-description', () => {
    const { doc, win } = createMockEnvironment();
    const tooltip = createTooltipController({ document: doc, window: win });
    tooltip.init();

    const titleEl = createMockElement('button');
    titleEl.setAttribute('title', 'Help text');

    tooltip.showTip(titleEl);
    assert.equal(titleEl.hasAttribute('title'), false);
    assert.equal(titleEl.dataset.tipText, 'Help text');
    assert.equal(titleEl.getAttribute('aria-description'), 'Help text');
    assert.equal(tooltip.tipCard.hidden, false);
});
