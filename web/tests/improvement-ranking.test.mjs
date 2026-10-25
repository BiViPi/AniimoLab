import test from 'node:test';
import assert from 'node:assert/strict';
import { createImprovementCandidateBuilder, createImprovementRankingController, calculateImprovementGain, buildImprovementRankingViewModel } from '../improvement-ranking.js';

function createBuilder(overrides = {}) {
    const dependencies = {
        maxHomeLevel: 3,
        facilities: [{ name: 'Oven', ability: null, hasLevels: true }],
        specialRecipes: [{ name: 'pie', facility: 'Oven' }],
        seasonRecipeNotes: [{ name: 'festival_note', facility: 'Oven' }],
        moduleNames: { kitchen_module: 'Kitchen Module' },
        simpleSetup: level => ({
            facilities: { Oven: [{ count: Math.min(level, 2), level: Math.min(level, 3) }] },
            modules: { kitchen_module: Math.min(level, 3) },
        }),
        getPlanContext: () => ({ simple: true, skipped: new Set(['skipped_recipe']) }),
        getSkippedRecipes: () => new Set(),
        getRoster: () => [],
        getRosterLabel: (_aniimo, index) => `Aniimo ${index + 1}`,
        getLevelledAbilities: () => [],
        defaultLevelFor: () => 4,
        prettyItem: name => name.toUpperCase(),
        escapeText: text => text,
        ...overrides,
    };
    return createImprovementCandidateBuilder(dependencies);
}

test('candidate builder includes unlock and unskip choices only when facility and exclusion rules allow', () => {
    const builder = createBuilder();
    const base = {
        facilities: { Oven: [{ count: 1, level: 1 }] },
        modules: { kitchen_module: 1 },
        exclude: ['pie', 'festival_note', 'skipped_recipe'],
        season: true,
    };
    const candidates = builder.improvementCandidates(base, 'best');

    assert.deepEqual(candidates.map(candidate => candidate.label), [
        'Unlock PIE', 'Recipe Note: FESTIVAL_NOTE', 'Unskip SKIPPED_RECIPE',
    ]);
    assert.deepEqual(candidates[0].input.exclude, ['festival_note', 'skipped_recipe']);
    assert.deepEqual(candidates[2].input.exclude, ['pie', 'festival_note']);
});

test('candidate builder creates incremental advanced facility and module upgrades within covering RV', () => {
    const builder = createBuilder({
        facilities: [
            { name: 'Oven', ability: null, hasLevels: true },
            { name: 'Anchor', ability: null, hasLevels: true },
        ],
        getPlanContext: () => ({ simple: false, skipped: new Set() }),
        simpleSetup: level => ({
            facilities: {
                Oven: [{ count: Math.min(level, 2), level: Math.min(level, 2) }],
                Anchor: [{ count: level >= 2 ? 1 : 0, level: level >= 2 ? 2 : 0 }],
            },
            modules: { kitchen_module: Math.min(level + 1, 3) },
        }),
    });
    const base = {
        facilities: { Oven: [{ count: 1, level: 1 }], Anchor: [{ count: 1, level: 2 }] },
        modules: { kitchen_module: 1 },
        exclude: [],
        season: false,
    };
    assert.equal(builder.homeLevelCovering(base), 2);
    const candidates = builder.improvementCandidates(base, 'best');

    assert.deepEqual(candidates.filter(candidate => candidate.kind === 'Modules').map(candidate => candidate.level), [2, 3]);
    assert.ok(candidates.some(candidate => candidate.group === 'another:Oven' && candidate.level === 2));
    assert.ok(candidates.some(candidate => candidate.group === 'upgrade:Oven' && candidate.level === 2));
});

test('candidate builder trains one roster member at a time without changing other members', () => {
    const builder = createBuilder({
        facilities: [{ name: 'Oven', ability: 'Cooking', hasLevels: true }],
        getLevelledAbilities: () => ['Cooking'],
        getRoster: () => [{ name: 'Alice' }],
        getRosterLabel: aniimo => aniimo.name,
    });
    const base = {
        facilities: { Oven: [{ count: 1, level: 1 }] },
        modules: {},
        exclude: [],
        roster: { members: [{ count: 2, abilities: { Cooking: 2 } }, { count: 1, abilities: { Water: 4 } }] },
    };
    const candidates = builder.improvementCandidates(base, 'roster:0');
    const trained = candidates.filter(candidate => candidate.group === 'roster:0:Cooking');

    assert.deepEqual(trained.map(candidate => candidate.level), [3, 4]);
    assert.equal(trained[0].input.roster.members[0].count, 1);
    assert.equal(trained[0].input.roster.members[1].abilities.Water, 4);
    assert.equal(base.roster.members[0].count, 2);
});

test('ranking worker controller partitions candidates, maps progress, and completes after every batch', () => {
    class FakeWorker {
        static workers = [];
        constructor(url, options) { this.url = url; this.options = options; FakeWorker.workers.push(this); }
        postMessage(message) { this.message = message; }
        terminate() { this.terminated = true; }
        emit(data) { this.onmessage?.({ data }); }
    }
    const progress = [];
    const completed = [];
    const controller = createImprovementRankingController({ WorkerImpl: FakeWorker, workerUrl: '/worker.js', workerCount: 2 });
    controller.start({
        measure: 'coins',
        base: { home_level: 12 },
        candidates: [{ input: { id: 0 } }, { input: { id: 1 } }, { input: { id: 2 } }, { input: { id: 3 } }],
        baseTop: 100,
        onProgress: (result, candidateIndex) => progress.push([result.index, candidateIndex]),
        onError: () => assert.fail('successful batches must not error'),
        onComplete: failed => completed.push(failed),
    });

    assert.equal(FakeWorker.workers.length, 2);
    assert.deepEqual(JSON.parse(FakeWorker.workers[0].message.payload).candidates, [{ id: 0 }, { id: 2 }]);
    assert.deepEqual(JSON.parse(FakeWorker.workers[1].message.payload).candidates, [{ id: 1 }, { id: 3 }]);
    assert.equal(FakeWorker.workers[0].message.type, 'rank_improvements');
    assert.equal(JSON.parse(FakeWorker.workers[0].message.payload).baseTop, 100);

    FakeWorker.workers[0].emit({ type: 'progress', count: { index: -1, top: 100 } });
    FakeWorker.workers[0].emit({ type: 'progress', count: { index: 1, top: 110 } });
    assert.deepEqual(progress, [[-1, null], [1, 2]]);
    FakeWorker.workers[0].emit({ type: 'done', ok: true });
    assert.deepEqual(completed, []);
    FakeWorker.workers[1].emit({ type: 'done', ok: true });
    assert.deepEqual(completed, [false]);
    assert.ok(FakeWorker.workers.every(worker => worker.terminated));
});

test('ranking worker controller terminates obsolete workers and ignores their late messages', () => {
    class FakeWorker {
        static workers = [];
        constructor() { FakeWorker.workers.push(this); }
        postMessage(message) { this.message = message; }
        terminate() { this.terminated = true; }
        emit(data) { this.onmessage?.({ data }); }
    }
    const progress = [];
    const controller = createImprovementRankingController({ WorkerImpl: FakeWorker, workerUrl: '/worker.js', workerCount: 1 });
    controller.start({
        measure: 'coins', base: {}, candidates: [{ id: 0 }],
        onProgress: result => progress.push(result), onComplete: () => {}, onError: () => {},
    });
    const oldWorker = FakeWorker.workers[0];
    controller.stop();
    oldWorker.emit({ type: 'progress', count: { index: 0, top: 10 } });

    assert.equal(oldWorker.terminated, true);
    assert.deepEqual(progress, []);
});

test('ranking worker controller marks a failed batch and reports its worker error', () => {
    class FakeWorker {
        constructor() { FakeWorker.instance = this; }
        postMessage() {}
        terminate() { this.terminated = true; }
    }
    let failed = null;
    let errorMessage = '';
    const controller = createImprovementRankingController({ WorkerImpl: FakeWorker, workerUrl: '/worker.js', workerCount: 1 });
    controller.start({
        measure: 'coins', base: {}, candidates: [{}],
        onProgress: () => {},
        onError: error => { errorMessage = error.message; },
        onComplete: value => { failed = value; },
    });
    FakeWorker.instance.onerror({ message: 'worker crashed' });

    assert.equal(errorMessage, 'worker crashed');
    assert.equal(failed, true);
    assert.equal(FakeWorker.instance.terminated, true);
});

test('gain scoring measures level-up pace and marks unproven results', () => {
    const result = calculateImprovementGain({
        result: { top: 2.2, proven: false },
        base: { top: 2 },
        measure: 'level_up',
        unit: { multiplier: 1, suffix: '/s' },
        rankMinGain: 1e-3,
        paceUnitSeconds: 86400,
        formatters: {
            formatDuration: seconds => `${Math.round(seconds)}s`,
            formatRate: String,
            formatPercent: fraction => `${(fraction * 100).toFixed(1)}%`,
            priorityLabel: String,
        },
    });

    assert.ok(Math.abs(result.score - (1 + 1 - 2 / 2.2)) < 1e-12);
    assert.match(result.text, /^~−/);
    assert.match(result.text, /level-up/);
});

test('gain scoring ranks primary output first and uses Home Coins as secondary gain', () => {
    const formatters = {
        formatDuration: String,
        formatRate: value => `${value.toFixed(1)}`,
        formatPercent: fraction => `${(fraction * 100).toFixed(1)}%`,
        priorityLabel: () => 'Selected Dish',
    };
    const primary = calculateImprovementGain({
        result: { top: 110, coins: { base: 100, value: 120 } },
        base: { top: 100 }, measure: 'selected_dish', aniipod: null,
        unit: { multiplier: 60, suffix: '/min' }, rankMinGain: 1e-3, paceUnitSeconds: 86400, formatters,
    });
    const secondary = calculateImprovementGain({
        result: { top: 100, coins: { base: 1000, value: 1100 } },
        base: { top: 100 }, measure: 'selected_dish',
        unit: { multiplier: 60, suffix: '/min' }, rankMinGain: 1e-3, paceUnitSeconds: 86400, formatters,
    });

    assert.ok(primary.score > 1);
    assert.equal(primary.text, '+10.0% Selected Dish (+600.0/min)');
    assert.equal(secondary.score, 0.1);
    assert.equal(secondary.text, '+10.0% Home Coins (+6000.0/min)');
});

test('gain scoring rejects below-threshold and incomplete results', () => {
    const options = {
        base: { top: 100 }, measure: 'coins', unit: { multiplier: 1, suffix: '/s' },
        rankMinGain: 1e-3, paceUnitSeconds: 86400,
        formatters: { formatDuration: String, formatRate: String, formatPercent: String, priorityLabel: String },
    };
    assert.equal(calculateImprovementGain({ ...options, result: { top: 100.1 } }), null);
    assert.equal(calculateImprovementGain({ ...options, result: null }), null);
    assert.equal(calculateImprovementGain({ ...options, result: { top: 200 }, base: null }), null);
});

test('ranking view model groups candidate progress and selects the best gain per option', () => {
    const candidates = [
        { kind: 'Aniimo', group: 'earth', family: 'Earth Aniimo', level: 2, label: 'Earth Aniimo Lv.2' },
        { kind: 'Aniimo', group: 'earth', family: 'Earth Aniimo', level: 3, label: 'Earth Aniimo Lv.3' },
        { kind: 'Recipes', label: 'Unlock Pie' },
    ];
    const ranking = { candidates, results: [{ top: 11 }, { top: 13 }, null], base: { top: 10 }, measure: 'coins', done: false, homeLevel: 12 };
    const model = buildImprovementRankingViewModel({ ranking, getGain: result => result ? { score: result.top - 10, text: `+${result.top - 10}` } : null, rankMinGain: 0.001, priorityLabel: () => 'Priority' });
    assert.equal(model.checked, 2);
    assert.equal(model.options, 2);
    assert.match(model.status, /Checking 2 of 3/);
    assert.deepEqual(model.rows.map(row => row.candidate.level ?? row.candidate.label), [3]);
    assert.deepEqual(model.checkedGroups.flatMap(group => group.entries.map(entry => [entry.name, entry.done, entry.gain?.text ?? null])), [
        ['Earth Aniimo Lv.2–3', true, '+3'], ['Unlock Pie', false, null],
    ]);
});

test('ranking view model reports completed empty and unavailable states', () => {
    const empty = buildImprovementRankingViewModel({ ranking: { candidates: [], results: [], measure: 'coins', done: true }, getGain: () => null, rankMinGain: 0.001, priorityLabel: () => 'Priority' });
    assert.equal(empty.status, 'Nothing left to unlock or upgrade.');
    assert.equal(empty.rows.length, 0);
    assert.equal(buildImprovementRankingViewModel({ ranking: null }), null);
});
