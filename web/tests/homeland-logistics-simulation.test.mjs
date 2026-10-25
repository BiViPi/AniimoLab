import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLayoutFlows, createRecipeTerms, createFirstBatchTimeLookup, createHomelandLogisticsSimulation } from '../homeland-logistics-simulation.js';

test('layout flow projection routes each unit to its nearest storage and preserves multi-job data', () => {
    const flows = buildLayoutFlows({
        storages: [{ x: 0, y: 0, w: 2, h: 2 }, { x: 20, y: 0, w: 2, h: 2 }],
        pieces: [{ members: [
            { x: 1, y: 1, w: 2, h: 2, weight: 360, crop: 'radish', cycle: 60 },
            { x: 18, y: 1, w: 2, h: 2, weight: 1, crop: null, cycle: 1 },
            { x: 2, y: 2, w: 1, h: 1, weight: 0, crop: 'idle', cycle: 10 },
        ] }],
    });
    assert.equal(flows.length, 1);
    assert.deepEqual([flows[0].x2, flows[0].y2, flows[0].ring], [1, 1, 0.44]);
    assert.deepEqual(flows[0].jobs, [{ item: 'radish', cycle: 60, rate: 0.1 }]);
});

test('recipe terms normalize quick recipes and first batch lookup accounts for ingredient lead-in', () => {
    const terms = createRecipeTerms([
        { name: 'radish', ingredients: [], yieldAmount: 2 },
        { name: 'quick_tea', ingredients: ['radish', 'water'], amounts: [2], yieldAmount: 3, byproduct: 'tea_leaf', byproductAmount: 1 },
    ]);
    assert.deepEqual(terms('quick_tea'), {
        takes: [['radish', 2], ['water', 1]],
        makes: 'tea', yield: 3, byproduct: ['tea_leaf', 1],
    });
    const first = createFirstBatchTimeLookup([{ jobs: [{ item: 'radish', cycle: 10 }, { item: 'quick_tea', cycle: 20 }] }], terms);
    assert.equal(first('quick_tea'), 30);
    assert.equal(first('radish'), 10);
});

function createSimulationHarness({ reducedMotion = false } = {}) {
    const frames = new Map();
    let nextFrame = 1;
    class FakeObserver {
        constructor(callback) { this.callback = callback; this.disconnected = false; }
        observe(target) { this.target = target; }
        disconnect() { this.disconnected = true; }
    }
    const createClassList = () => ({ values: new Set(), add(value) { this.values.add(value); }, remove(value) { this.values.delete(value); }, toggle(value, enabled) { enabled ? this.values.add(value) : this.values.delete(value); } });
    const line = { classList: createClassList() };
    const fill = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
    const ring = { fill, classList: createClassList(), querySelector: () => fill, removed: false, remove() { this.removed = true; } };
    const layer = { children: [], appendChild(element) { this.children.push(element); } };
    const svg = { isConnected: true, querySelectorAll: selector => selector === '.layout-flow-line' ? [line] : selector === '.layout-ring' ? [ring] : [], querySelector: selector => selector === '.layout-dots' ? layer : null };
    const simToggle = { hidden: false };
    const clock = { title: '', textContent: '' };
    const document = {
        getElementById: id => id === 'layout-sim' ? simToggle : id === 'layout-clock' ? clock : null,
        createElementNS: () => ({ attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, removed: false, remove() { this.removed = true; } }),
    };
    const controller = createHomelandLogisticsSimulation({
        document,
        window: { matchMedia: () => ({ matches: reducedMotion }) },
        IntersectionObserver: FakeObserver,
        requestAnimationFrame: callback => { const id = nextFrame++; frames.set(id, callback); return id; },
        cancelAnimationFrame: id => frames.delete(id),
        getRecipes: () => [{ name: 'pie', ingredients: [], yieldAmount: 1 }],
        formatNumber: String,
    });
    return { controller, frames, svg, line, fill, ring, layer, simToggle, clock };
}

test('simulation advances batch cycles, animates delivery, and releases observer/frame on stop', () => {
    const h = createSimulationHarness();
    h.controller.start(h.svg, [{ x1: 0, y1: 0, x2: 0.5, y2: 0, length: 0.5, jobs: [{ item: 'pie', cycle: 1, rate: 1 }] }], new Map());
    assert.equal(h.simToggle.hidden, false);
    assert.equal(h.frames.size, 1);
    let [frameId, frame] = [...h.frames.entries()][0];
    h.frames.delete(frameId);
    frame(0);
    [frameId, frame] = [...h.frames.entries()][0];
    h.frames.delete(frameId);
    frame(1000);
    assert.equal(h.line.classList.values.has('live'), true);
    assert.equal(h.layer.children.length, 1);
    assert.equal(h.clock.textContent, '0h 00m');
    assert.equal(h.fill.attributes['stroke-dasharray'], '1.000 1');

    const observer = h.controller.getActiveSimulation().observer;
    h.controller.stop();
    assert.equal(observer.disconnected, true);
    assert.equal(h.frames.size, 0);
    assert.equal(h.controller.getActiveSimulation(), null);
});

test('simulation hides and uses static paths when reduced motion is requested', () => {
    const h = createSimulationHarness({ reducedMotion: true });
    h.controller.start(h.svg, [{ jobs: [{ item: 'pie', cycle: 1, rate: 1 }] }], new Map());
    assert.equal(h.simToggle.hidden, true);
    assert.equal(h.line.classList.values.has('live'), true);
    assert.equal(h.ring.removed, true);
    assert.equal(h.controller.getActiveSimulation(), null);
    assert.equal(h.frames.size, 0);
});
