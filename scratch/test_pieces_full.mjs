import fs from 'fs';
import * as pkg from 'file:///E:/Games/AniimoLab/web/pkg/aniimax.js';
import { simpleSetup, FACILITIES, FACILITY_FOOTPRINTS } from 'file:///E:/Games/AniimoLab/web/facility-config.js';

// Setup minimal DOM mocks
global.document = {
    getElementById: () => ({ checked: false })
};

async function main() {
    const wasm = fs.readFileSync('E:/Games/AniimoLab/web/pkg/aniimax_bg.wasm');
    await pkg.default({ module_or_path: wasm });
    const input = { ...simpleSetup(14), currency: 'coins' };
    const plan = JSON.parse(pkg.find_plan(JSON.stringify(input), () => {}));

    // Read app.js content and extract homelandPieces and its helpers
    const appJs = fs.readFileSync('E:/Games/AniimoLab/web/app.js', 'utf8');
    
    // We can evaluate app.js functions or run in node
    const matchFn = appJs.slice(appJs.indexOf('function homelandPieces('), appJs.indexOf('function placeRigid('));
    
    // Let us write a self-contained runner
    console.log("Ready to inspect homelandPieces");
}
main().catch(console.error);
