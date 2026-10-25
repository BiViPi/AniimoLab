import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomelandLayoutWorkerController } from '../homeland-layout-controller.js';

function createWorkerFactory() {
    const workers = [];
    return {
        workers,
        createWorker(url) {
            const worker = {
                url,
                terminated: false,
                messages: [],
                onmessage: null,
                onerror: null,
                terminate() { this.terminated = true; },
                postMessage(message) { this.messages.push(message); },
                send(data) { this.onmessage?.({ data }); },
                fail(error) { this.onerror?.(error); },
            };
            workers.push(worker);
            return worker;
        },
    };
}

test('layout worker controller preserves the request and delivers the active result once', () => {
    const factory = createWorkerFactory();
    const controller = createHomelandLayoutWorkerController({ createWorker: factory.createWorker });
    const payload = { pieces: [{ members: [] }], cells: [{ x: 0, y: 0, w: 10, h: 10 }], options: { suCount: 3 } };
    const results = [];

    controller.run({ url: '/layout-worker.js?v=test', payload, onResult: result => results.push(result) });
    const worker = factory.workers[0];
    const result = { storage: { x: 0, y: 0 }, pieces: [] };
    worker.send(result);
    worker.send({ stale: true });

    assert.deepEqual(worker.messages, [payload]);
    assert.deepEqual(results, [result]);
    assert.equal(worker.terminated, true);
    assert.equal(controller.isRunning(), false);
});

test('a late message from a replaced worker cannot terminate or overwrite the active worker result', () => {
    const factory = createWorkerFactory();
    const controller = createHomelandLayoutWorkerController({ createWorker: factory.createWorker });
    const results = [];

    controller.run({ url: '/layout-worker.js?run=1', payload: { run: 1 }, onResult: result => results.push(result) });
    const oldWorker = factory.workers[0];
    const staleHandler = oldWorker.onmessage;
    controller.run({ url: '/layout-worker.js?run=2', payload: { run: 2 }, onResult: result => results.push(result) });
    const currentWorker = factory.workers[1];

    staleHandler({ data: { run: 'late' } });
    currentWorker.send({ run: 2 });

    assert.equal(oldWorker.terminated, true);
    assert.equal(currentWorker.terminated, true);
    assert.deepEqual(results, [{ run: 2 }]);
});

test('cancel terminates the current worker and ignores a message delivered afterward', () => {
    const factory = createWorkerFactory();
    const controller = createHomelandLayoutWorkerController({ createWorker: factory.createWorker });
    const results = [];

    controller.run({ url: '/layout-worker.js', payload: {}, onResult: result => results.push(result) });
    const worker = factory.workers[0];
    const lateHandler = worker.onmessage;
    controller.cancel();
    lateHandler({ data: { tooLate: true } });

    assert.equal(worker.terminated, true);
    assert.deepEqual(results, []);
    assert.equal(controller.isRunning(), false);
});

test('an active worker error is surfaced once and releases the worker', () => {
    const factory = createWorkerFactory();
    const controller = createHomelandLayoutWorkerController({ createWorker: factory.createWorker });
    const errors = [];

    controller.run({ url: '/layout-worker.js', payload: {}, onError: error => errors.push(error) });
    const worker = factory.workers[0];
    const error = { message: 'layout failed' };
    worker.fail(error);
    worker.fail({ message: 'duplicate' });

    assert.equal(worker.terminated, true);
    assert.deepEqual(errors, [error]);
    assert.equal(controller.isRunning(), false);
});
