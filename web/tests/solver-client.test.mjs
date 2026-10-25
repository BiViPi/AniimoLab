import test from 'node:test';
import assert from 'node:assert/strict';
import { createSolverClient } from '../solver-client.js';
import { createAniimoSetupController } from '../plan-controller.js';

class FakeWorker {
    static instances = [];
    constructor(url, options) {
        this.url = url;
        this.options = options;
        this.messages = [];
        this.terminated = false;
        this.constructor.instances.push(this);
    }
    postMessage(message) { this.messages.push(message); }
    terminate() { this.terminated = true; }
    emit(data) { this.onmessage({ data }); }
    fail(message) { this.onerror({ message }); }
}

test('solver client sends worker protocol messages and forwards progress before resolving', async () => {
    FakeWorker.instances = [];
    const client = createSolverClient('./worker.js?v=test', { WorkerImpl: FakeWorker, logger: { error() {} } });
    client.initWorker();
    const progress = [];
    const resultPromise = client.callWorker('find_plan', '{"rv":12}', value => progress.push(value));
    const worker = FakeWorker.instances[0];
    assert.deepEqual(worker.messages[0], { id: 1, type: 'find_plan', payload: '{"rv":12}' });
    worker.emit({ id: 1, type: 'progress', count: 4 });
    assert.deepEqual(progress, [4]);
    worker.emit({ id: 1, type: 'result', ok: true, result: '{"success":true}' });
    assert.equal(await resultPromise, '{"success":true}');
    assert.equal(client.pendingCount, 0);
});

test('restarting the solver rejects pending work and terminates the prior worker', async () => {
    FakeWorker.instances = [];
    const client = createSolverClient('./worker.js?v=test', { WorkerImpl: FakeWorker, logger: { error() {} } });
    client.initWorker();
    const pending = client.callWorker('find_plan', '{}');
    client.restartWorker();
    await assert.rejects(pending, /Cancelled by a newer calculation/);
    assert.equal(FakeWorker.instances[0].terminated, true);
    assert.equal(FakeWorker.instances.length, 2);
    assert.equal(client.pendingCount, 0);
});

test('worker errors reject every pending request and clear the registry', async () => {
    FakeWorker.instances = [];
    const client = createSolverClient('./worker.js?v=test', { WorkerImpl: FakeWorker, logger: { error() {} } });
    client.initWorker();
    const first = client.callWorker('find_plan', '{}');
    const second = client.callWorker('get_version');
    FakeWorker.instances[0].fail('worker crashed');
    await assert.rejects(first, /worker crashed/);
    await assert.rejects(second, /worker crashed/);
    assert.equal(client.pendingCount, 0);
});

test('Aniimo setup controller solves missing setup with current input and displays only selected results', () => {
    class SetupWorker extends FakeWorker {}
    SetupWorker.instances = [];
    let runId = 3;
    let selectedSetup = 'minimum';
    const plans = {};
    let normalized = 0;
    let shown = 0;
    const controller = createAniimoSetupController({
        WorkerImpl: SetupWorker, workerUrl: './worker.js?v=test',
        getPlans: () => plans,
        getLastPlanInput: () => ({ rv: 16, facilities: {} }),
        getRunId: () => runId,
        getSelectedSetup: () => selectedSetup,
        getAniimoInput: setup => ({ aniimo: setup }),
        normalizePlan: plan => { normalized++; plan.normalized = true; },
        showSelectedPlan: () => { shown++; },
    });

    controller.ensurePlanFor('minimum');
    const worker = SetupWorker.instances[0];
    assert.deepEqual(JSON.parse(worker.messages[0].payload), { rv: 16, facilities: {}, aniimo: 'minimum' });
    worker.emit({ id: 1, type: 'progress', count: 2 });
    assert.equal(normalized, 0);
    worker.emit({ id: 1, type: 'result', ok: true, result: '{"success":true}' });
    assert.equal(plans.minimum.normalized, true);
    assert.equal(normalized, 1);
    assert.equal(shown, 1);
    assert.equal(worker.terminated, true);
});

test('Aniimo setup controller cancels prior work and ignores results from an old plan run', () => {
    class SetupWorker extends FakeWorker {}
    SetupWorker.instances = [];
    let runId = 5;
    const plans = {};
    let normalized = 0;
    const controller = createAniimoSetupController({
        WorkerImpl: SetupWorker, workerUrl: './worker.js?v=test',
        getPlans: () => plans,
        getLastPlanInput: () => ({ rv: 18 }),
        getRunId: () => runId,
        getSelectedSetup: () => 'best:test',
        getAniimoInput: setup => ({ aniimo: setup }),
        normalizePlan: () => { normalized++; },
        showSelectedPlan() {},
    });

    controller.ensurePlanFor('best:test');
    const first = SetupWorker.instances[0];
    controller.stopSetupSolve();
    assert.equal(first.terminated, true);
    first.emit({ id: 1, type: 'result', ok: true, result: '{"success":true}' });
    assert.equal(plans['best:test'], undefined);
    assert.equal(normalized, 0);
    controller.ensurePlanFor('best:test');
    const second = SetupWorker.instances[1];
    runId++;
    second.emit({ id: 1, type: 'result', ok: true, result: '{"success":true}' });
    assert.equal(plans['best:test'], undefined);
    assert.equal(normalized, 0);
});
