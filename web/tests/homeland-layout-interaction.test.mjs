import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomelandLayoutInteractionController } from '../homeland-layout-interaction.js';

function createClassList() {
    const values = new Set();
    return {
        add(value) { values.add(value); },
        remove(value) { values.delete(value); },
        contains(value) { return values.has(value); },
    };
}

function createSvg() {
    return {
        attributes: {},
        classList: createClassList(),
        clientWidth: 100,
        clientHeight: 100,
        setAttribute(name, value) { this.attributes[name] = value; },
        getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
        createSVGPoint() {
            return {
                x: 0,
                y: 0,
                matrixTransform() { return { x: this.x, y: this.y }; },
            };
        },
        getScreenCTM() { return { inverse: () => ({}) }; },
        setPointerCapture() {},
        releasePointerCapture() {},
    };
}

function createDocument() {
    const elements = new Map();
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, { classList: createClassList(), addEventListener(type, handler) { this[`on${type}`] = handler; } });
            return elements.get(id);
        },
    };
    return { document, elements };
}

function createController(options = {}) {
    const { document, elements } = createDocument();
    const lastLayout = options.lastLayout || {
        layout: { storages: [], pieces: [{ members: [{ x: 2, y: 2, w: 1, h: 1 }] }] },
        homeLevel: 1,
    };
    const effects = { redraws: 0, resets: 0, whole: [], storageChanges: 0 };
    const controller = createHomelandLayoutInteractionController({
        document,
        getLastLayout: () => lastLayout,
        onRedraw: () => effects.redraws++,
        onReset: () => effects.resets++,
        onWholeChange: checked => effects.whole.push(checked),
        onStorageCountChange: () => effects.storageChanges++,
    });
    return { controller, document, elements, effects, lastLayout };
}

test('layout interactions zoom around the center, fit the original viewbox, and update the zoom label', () => {
    const { controller, document } = createController();
    const svg = createSvg();
    controller.state.origViewBox = { x: 0, y: 0, w: 100, h: 100 };
    controller.state.currentViewBox = { ...controller.state.origViewBox };
    document.getElementById('layout-zoom-level');
    controller.init(svg);

    document.getElementById('layout-zoom-in').onclick();
    assert.deepEqual(controller.state.currentViewBox, { x: 10, y: 10, w: 80, h: 80 });
    assert.equal(document.getElementById('layout-zoom-level').textContent, '125%');

    document.getElementById('layout-zoom-fit').onclick();
    assert.deepEqual(controller.state.currentViewBox, { x: 0, y: 0, w: 100, h: 100 });
    assert.equal(svg.attributes.viewBox, '0 0 100 100');
});

test('layout interactions pan with pointer movement and snap dragged facilities to the selected grid', () => {
    const { controller, elements, effects, lastLayout } = createController();
    const svg = createSvg();
    controller.state.origViewBox = { x: 0, y: 0, w: 100, h: 100 };
    controller.state.currentViewBox = { ...controller.state.origViewBox };
    elements.set('layout-minor-grid', { checked: false });
    controller.init(svg);

    svg.onpointerdown({ button: 0, target: { closest: () => null }, clientX: 10, clientY: 10, pointerId: 1 });
    svg.onpointermove({ clientX: 20, clientY: 30 });
    svg.onpointerup({ pointerId: 1 });
    assert.deepEqual(controller.state.currentViewBox, { x: -10, y: -20, w: 100, h: 100 });

    const attributes = { 'data-x': '2', 'data-y': '2', 'data-orig-x': '2', 'data-orig-y': '2', 'data-piece-idx': '0', 'data-member-idx': '0' };
    const piece = {
        classList: createClassList(),
        parentElement: { appendChild() {} },
        closest: selector => selector === '.layout-piece' ? piece : null,
        getAttribute(name) { return attributes[name] ?? null; },
        setAttribute(name, value) { attributes[name] = String(value); },
        setPointerCapture() {},
        releasePointerCapture() {},
    };
    svg.onpointerdown({ button: 0, target: piece, clientX: 2, clientY: 2, pointerId: 2, stopPropagation() {} });
    svg.onpointermove({ clientX: 4.2, clientY: 4.1 });
    assert.equal(attributes['data-cur-x'], '4');
    assert.equal(attributes['data-cur-y'], '4');
    svg.onpointerup({ pointerId: 2 });

    assert.deepEqual(lastLayout.layout.pieces[0].members[0], { x: 4, y: 4, w: 1, h: 1 });
    assert.equal(effects.redraws, 1);
});

test('layout controls delegate redraw, reset, whole-map, and storage-count changes', () => {
    const { controller, document, effects } = createController();
    controller.attachHandlers();

    document.getElementById('layout-whole').onchange({ target: { checked: true } });
    document.getElementById('layout-minor-grid').onchange();
    document.getElementById('layout-su-count').onchange();

    assert.deepEqual(effects.whole, [true]);
    assert.equal(effects.redraws, 2);
    assert.equal(effects.storageChanges, 1);
});

test('reset clears manual positions and viewbox state before asking the app to rebuild layout', () => {
    const { controller, document, effects } = createController();
    controller.state.origViewBox = { x: 1, y: 1, w: 10, h: 10 };
    controller.state.currentViewBox = { ...controller.state.origViewBox };
    controller.state.customPositions.set('0_0', { x: 3, y: 4 });
    document.getElementById('layout-reset-btn');
    controller.init(createSvg());

    document.getElementById('layout-reset-btn').onclick();

    assert.equal(controller.state.origViewBox, null);
    assert.equal(controller.state.currentViewBox, null);
    assert.equal(controller.state.customPositions.size, 0);
    assert.equal(effects.resets, 1);
});
