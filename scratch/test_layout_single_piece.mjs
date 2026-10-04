import fs from 'fs';
import * as pkg from 'file:///E:/Games/AniimoLab/web/pkg/aniimax.js';
import { simpleSetup, FACILITIES, FACILITY_FOOTPRINTS } from 'file:///E:/Games/AniimoLab/web/facility-config.js';

async function main() {
    const wasm = fs.readFileSync('E:/Games/AniimoLab/web/pkg/aniimax_bg.wasm');
    await pkg.default({ module_or_path: wasm });
    const input = { ...simpleSetup(14), currency: 'coins' };
    const plan = JSON.parse(pkg.find_plan(JSON.stringify(input), () => {}));

    const a = plan.environment_assignments.find(a => a.mode === 'Cool');
    const layout = a.layouts[0];

    console.log("Cool unit layout length:", layout.length);
    console.log("Starfall Hammock in layout:", layout.find(p => p.facility === 'Starfall Hammock'));
    console.log("Farmlands in layout count:", layout.filter(p => p.facility === 'Farmland').length);
}
main().catch(console.error);
