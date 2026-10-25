export function createHomelandLayoutWorkerController({ createWorker }) {
    let generation = 0;
    let activeWorker = null;

    function cancel() {
        generation++;
        const worker = activeWorker;
        activeWorker = null;
        worker?.terminate();
    }

    function run({ url, payload, onResult = () => {}, onError = () => {} }) {
        cancel();
        const runId = ++generation;
        let worker;

        try {
            worker = createWorker(url);
        } catch (error) {
            onError(error);
            return runId;
        }

        activeWorker = worker;
        let settled = false;
        const isCurrent = () => generation === runId && activeWorker === worker && !settled;
        const release = () => {
            if (!isCurrent()) return false;
            settled = true;
            activeWorker = null;
            worker.terminate();
            return true;
        };

        worker.onmessage = event => {
            if (release()) onResult(event.data, event);
        };
        worker.onerror = event => {
            if (release()) onError(event);
        };

        try {
            worker.postMessage(payload);
        } catch (error) {
            if (release()) onError(error);
        }

        return runId;
    }

    return {
        run,
        cancel,
        isRunning: () => activeWorker !== null,
    };
}
