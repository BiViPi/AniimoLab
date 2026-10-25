// Owns the main solver worker lifecycle and its request/response registry.
export function createSolverClient(workerUrl, { WorkerImpl = Worker, logger = console } = {}) {
    let worker = null;
    let nextRequestId = 0;
    const pendingRequests = new Map();

    function rejectPending(error) {
        for (const pending of pendingRequests.values()) pending.reject(error);
        pendingRequests.clear();
    }

    function initWorker() {
        worker = new WorkerImpl(workerUrl, { type: 'module' });
        worker.onmessage = event => {
            const { id, type, ok, result, error, count } = event.data;
            const pending = pendingRequests.get(id);
            if (!pending) return;
            if (type === 'progress') {
                pending.onProgress?.(count);
                return;
            }
            pendingRequests.delete(id);
            if (ok) pending.resolve(result);
            else pending.reject(new Error(error));
        };
        worker.onerror = event => {
            const message = event.message || 'The planner stopped';
            logger.error('Worker error:', message);
            rejectPending(new Error(message));
        };
        return worker;
    }

    function restartWorker() {
        worker?.terminate();
        rejectPending(new Error('Cancelled by a newer calculation'));
        return initWorker();
    }

    function callWorker(type, payload, onProgress) {
        return new Promise((resolve, reject) => {
            if (!worker) {
                reject(new Error('Solver worker is not initialized'));
                return;
            }
            const id = ++nextRequestId;
            pendingRequests.set(id, { resolve, reject, onProgress });
            try {
                worker.postMessage({ id, type, payload });
            } catch (error) {
                pendingRequests.delete(id);
                reject(error);
            }
        });
    }

    return {
        initWorker,
        restartWorker,
        callWorker,
        get pendingCount() { return pendingRequests.size; },
    };
}
