
import fs from 'fs';
import path from 'path';

async function run() {
    const wasmPath = path.resolve('web/pkg/aniimax_bg.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    const wasmModule = await import('../web/pkg/aniimax.js');
    await wasmModule.default({ module_or_path: wasmBuffer });

    console.log('WASM loaded!');
    const keys = Object.keys(wasmModule);
    console.log('Exports:', keys.filter(k => !k.startsWith('__')));
}
run().catch(console.error);
