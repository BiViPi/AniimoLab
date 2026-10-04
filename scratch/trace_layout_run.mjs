import fs from 'fs';
import * as pkg from 'file:///E:/Games/AniimoLab/web/pkg/aniimax.js';
import { simpleSetup, FACILITIES, FACILITY_FOOTPRINTS } from 'file:///E:/Games/AniimoLab/web/facility-config.js';
import { layOutHomeland } from 'file:///E:/Games/AniimoLab/web/layout.js';

global.document = {
    getElementById: () => null
};

async function main() {
    const wasm = fs.readFileSync("E:/Games/AniimoLab/web/pkg/aniimax_bg.wasm");
    await pkg.default({ module_or_path: wasm });
    const input = { ...simpleSetup(14), currency: "coins" };
    const plan = JSON.parse(pkg.find_plan(JSON.stringify(input), () => {}));

    const appCode = fs.readFileSync("E:/Games/AniimoLab/web/app.js", "utf8");
    const fnCode = appCode.slice(appCode.indexOf("function homelandPieces("), appCode.indexOf("function homelandSvg("));
    
    const fn = new Function(
        "plan", "input", "ENVIRONMENT_MODE_ORDER", "splitByEnvironmentUnit", "environmentBuildingSize", 
        "tripsPerUnit", "recipeIndex", "FACILITY_FOOTPRINTS", "FACILITIES", "tierCount", 
        "ENVIRONMENT_BUILDING_SIZES", "needsEnvironment", "isSimpleMode", "selectedHomeLevel", 
        fnCode + "; return homelandPieces(plan, input);"
    );
    
    const res = fn(
        plan, input,
        ["Warm", "Scorching", "Cool", "Freeze", "Adequate"],
        (rows, assignmentsForMode) => {
            const units = [];
            assignmentsForMode.forEach(a => {
                (a.layouts || []).forEach(layout => {
                    const remaining = {};
                    layout.forEach(p => { remaining[p.facility] = (remaining[p.facility] || 0) + 1; });
                    units.push({ building: a.building, remaining, rows: [], layout, partner: a.partner || null, zone: a.zone ?? null, pairModes: a.pair_modes || null });
                });
            });
            rows.forEach(step => {
                let remaining = step.facility_count;
                for (const unit of units) {
                    if (remaining <= 0) break;
                    const available = unit.remaining[step.facility] || 0;
                    const take = Math.min(remaining, available);
                    if (take <= 0) continue;
                    unit.remaining[step.facility] -= take;
                    unit.rows.push({ ...step, facility_count: take });
                    remaining -= take;
                }
            });
            units.forEach(unit => {
                const totalByFacility = {};
                unit.layout.forEach(p => { totalByFacility[p.facility] = (totalByFacility[p.facility] || 0) + 1; });
                const takenSoFar = {};
                unit.layout = unit.layout.filter(p => {
                    const unused = unit.remaining[p.facility] || 0;
                    const used = (totalByFacility[p.facility] || 0) - unused;
                    takenSoFar[p.facility] = takenSoFar[p.facility] || 0;
                    if (takenSoFar[p.facility] < used) { takenSoFar[p.facility]++; return true; }
                    return false;
                });
            });
            return units.filter(u => u.rows.length > 0);
        },
        name => (name === "Heat Furnace" || name === "Sunlamp") ? 1.0 : 2.0,
        r => 1,
        [],
        FACILITY_FOOTPRINTS,
        FACILITIES,
        t => (t ? t.reduce((s, x) => s + x.count, 0) : 0),
        { "Heat Furnace": 1.0, "Cooling Unit": 2.0, "Sunlamp": 1.0 },
        () => true,
        () => true,
        () => 14
    );

    const HOMELAND_PLOTS = [
        [7, 8, 9, 10, 11],
        [4, 0, 3, 12, 13],
        [2, 1, 5, 6, 14],
        [15, 16, 17, 18, 19],
        [20, 21, 22, 23, 24]
    ];
    const cells = [];
    HOMELAND_PLOTS.forEach((row, r) => {
        row.forEach((num, c) => {
            if (num <= 14) cells.push({ x: c * 10, y: r * 10, w: 10, h: 10, number: num });
        });
    });

    console.log("Starting layOutHomeland with 3 SUs...");
    const t0 = Date.now();
    const layout = layOutHomeland(res.pieces, cells, { suCount: 3 });
    console.log(`layOutHomeland finished in: ${Date.now() - t0}ms`);
    console.log("Unplaced pieces count:", layout.unplaced.length);
    if (layout.unplaced.length) {
        console.log("Unplaced pieces:", layout.unplaced.map(i => res.pieces[i].cluster ? "Cluster " + res.pieces[i].buildings[0].facility : res.pieces[i].members[0].facility));
    }

    // Check all placed members with facility === "Cooling Unit"
    const members = layout.pieces.flatMap(p => p.members);
    const coolingUnits = members.filter(m => m.facility === "Cooling Unit");
    console.log("Cooling Units placed:", coolingUnits.length);
    coolingUnits.forEach((cu, idx) => {
        console.log(`CU #${idx}: x=${cu.x}, y=${cu.y}, mode=${cu.mode}, building=${cu.building}`);
    });

    // Check Farmlands
    const farmlands = members.filter(m => m.facility === "Farmland");
    console.log("Total Farmlands placed:", farmlands.length);
}
main().catch(console.error);
