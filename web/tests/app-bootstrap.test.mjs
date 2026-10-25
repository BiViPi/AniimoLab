import test from 'node:test';
import assert from 'node:assert/strict';

function createMockElement(id = '', tag = 'div') {
    return {
        id,
        tagName: tag.toUpperCase(),
        innerHTML: '',
        textContent: '',
        style: {},
        classList: { add: () => {}, remove: () => {} },
        setAttribute: () => {},
        getAttribute: () => null,
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
    };
}

globalThis.window = globalThis.window || {
    addEventListener: () => {},
    removeEventListener: () => {},
};
globalThis.document = globalThis.document || {
    body: { appendChild: () => {} },
    createElement: tag => createMockElement('', tag),
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
};
globalThis.localStorage = globalThis.localStorage || {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
};
globalThis.Worker = globalThis.Worker || class MockWorker {
    addEventListener() {}
    postMessage() {}
    terminate() {}
};

const { bootstrapApp, handleLanguageChanged } = await import('../app.js');

test('app: bootstrapApp exits early without crashing when optimize-btn and home-level are absent', () => {
    assert.doesNotThrow(() => {
        bootstrapApp();
    });
});

test('app: handleLanguageChanged runs safely', () => {
    assert.doesNotThrow(() => {
        handleLanguageChanged();
    });
});
