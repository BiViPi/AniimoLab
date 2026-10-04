import fs from 'fs';
import * as pkg from 'file:///E:/Games/AniimoLab/web/pkg/aniimax.js';
import { simpleSetup, FACILITIES, FACILITY_FOOTPRINTS } from 'file:///E:/Games/AniimoLab/web/facility-config.js';

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

    console.log("Total pieces created:", res.pieces.length);
    res.pieces.forEach((p, i) => {
        if (p.cluster) {
            console.log(`Piece #${i} [CLUSTER]: buildings=`, p.buildings.map(b => `${b.facility} (${b.mode})`), `plots count=${p.plots.length}`);
            p.plots.forEach((pl, j) => {
                console.log(`   plot #${j}: facility=${pl.facility}, crop=${pl.crop}, planned=(${p.planned[j]?.x}, ${p.planned[j]?.y})`);
            });
        } else {
            const m = p.members[0];
            if (m.building || m.facility === "Farmland" || m.facility === "Starfall Hammock" || m.facility === "Cooling Unit") {
                console.log(`Piece #${i} [RIGID]: facility=${m.facility}, mode=${m.mode}, crop=${m.crop}`);
            }
        }
    });
}
main().catch(console.error);
