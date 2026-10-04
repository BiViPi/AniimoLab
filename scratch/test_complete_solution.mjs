import fs from 'fs';
import * as pkg from 'file:///E:/Games/AniimoLab/web/pkg/aniimax.js';
import { simpleSetup, FACILITIES, FACILITY_FOOTPRINTS } from 'file:///E:/Games/AniimoLab/web/facility-config.js';

global.document = {
    getElementById: () => ({ checked: false })
};

// 1. Prepare fast layout.js
let layoutCode = fs.readFileSync("E:/Games/AniimoLab/web/layout.js", "utf8");
layoutCode = layoutCode.replace("const CLUSTER_PACK_MOST = 36;", "const CLUSTER_PACK_MOST = 12;");
layoutCode = layoutCode.replace("if (!plots || pack)", "if (pack && plots)");
fs.writeFileSync("E:/Games/AniimoLab/scratch/fast_layout.js", layoutCode);

const { layOutHomeland } = await import("file:///E:/Games/AniimoLab/scratch/fast_layout.js");

const wasm = fs.readFileSync("E:/Games/AniimoLab/web/pkg/aniimax_bg.wasm");
await pkg.default({ module_or_path: wasm });
const input = { ...simpleSetup(14), currency: "coins" };
const plan = JSON.parse(pkg.find_plan(JSON.stringify(input), () => {}));

// Shifted Farmland slots for 2x2 Cooling Unit on 9x9 coverage:
// 2 columns on the right are shifted outward (x = 3.25, 5.25) so their outer edge/corner
// overlaps the 9x9 climate boundary (at x = 5.5) by >= 0.25 tiles, exactly matching the woodland layout.
function getShiftedCoolingFarmlandSlots(shSlot = null) {
    const yCols = [-5.25, -3.25, -1.25, 0.75, 2.75, 4.75];
    const slots = [];
    // Left columns: -5.25, -3.25
    for (const x of [-5.25, -3.25]) {
        for (const y of yCols) slots.push({ x, y, size: 2, facility: 'Farmland' });
    }
    // Left adjacent (above/below CU)
    for (const y of [-5.25, -3.25, 2.75, 4.75]) slots.push({ x: -1.25, y, size: 2, facility: 'Farmland' });
    // Right adjacent (above/below CU)
    for (const y of [-5.25, -3.25, 2.75, 4.75]) slots.push({ x: 1.25, y, size: 2, facility: 'Farmland' });
    // Right shifted columns (x = 3.25, 5.25)
    for (const x of [3.25, 5.25]) {
        for (const y of yCols) slots.push({ x, y, size: 2, facility: 'Farmland' });
    }
    return slots.filter(s => {
        if (!shSlot) return true;
        // Do not overlap Starfall Hammock
        return !(s.x < shSlot.x + shSlot.w && shSlot.x < s.x + s.size && s.y < shSlot.y + shSlot.h && shSlot.y < s.y + s.size);
    }).sort((a, b) => Math.hypot(a.x - 1, a.y - 1) - Math.hypot(b.x - 1, b.y - 1));
}

// Homeland pieces with shifted slots & no unused environment buildings
function testHomelandPieces(plan, input) {
    const pieces = [];
    const placed = {};
    const count = (facility, n = 1) => { placed[facility] = (placed[facility] || 0) + n; };
    const unplaced = new Set();
    const steps = (plan.coin_items || []).filter(s => s.facility);
    const envSteps = steps.filter(s => s.environment && s.status === 'producing');
    const assignments = plan.environment_assignments || [];

    const units = [];
    ["Warm", "Scorching", "Cool", "Freeze", "Adequate"].forEach(mode => {
        const rows = envSteps.filter(s => s.environment === mode);
        if (!rows.length) return;
        
        // Single Cooling Unit for all Cool crops
        const coolAssignments = assignments.filter(a => a.mode === mode);
        if (mode === "Cool" && coolAssignments.length > 0) {
            const hasSH = rows.some(r => r.facility === 'Starfall Hammock');
            const shSlot = hasSH ? { x: 5, y: 5, w: 5, h: 5 } : null;
            const farmlandSlots = getShiftedCoolingFarmlandSlots(shSlot);
            const combinedLayout = [];
            if (hasSH) combinedLayout.push({ facility: 'Starfall Hammock', x: 5, y: 5, size: 5 });
            combinedLayout.push(...farmlandSlots);
            units.push({
                mode,
                unit: {
                    building: 'Cooling Unit',
                    layout: combinedLayout,
                    rows: rows.map(r => ({ ...r })),
                    partner: null,
                    zone: null
                }
            });
            return;
        }

        // Standard split for other modes
        const a = assignments.find(x => x.mode === mode);
        if (a && a.layouts) {
            a.layouts.forEach(layout => {
                units.push({
                    mode,
                    unit: {
                        building: a.building,
                        layout: layout.map(p => ({ ...p })),
                        rows: rows.map(r => ({ ...r })),
                        partner: a.partner || null,
                        zone: a.zone ?? null
                    }
                });
            });
        }
    });

    const placedInBlocks = {};
    units.forEach(({ mode, unit }) => {
        const size = unit.building === 'Heat Furnace' ? 1 : 2;
        const buildings = [{ x: 0, y: 0, w: size, h: size, facility: unit.building, mode, building: true }];
        count(unit.building);
        const plots = [];
        const planned = [];
        
        const crops = {};
        unit.rows.forEach(r => {
            for (let n = 0; n < r.facility_count; n++) (crops[r.facility] ||= []).push({ crop: r.item_name, trips: 1, cycle: r.cycle_time });
        });

        unit.layout.forEach(p => {
            const cropList = crops[p.facility];
            if (cropList && cropList.length > 0) {
                const c = cropList.shift();
                plots.push({ w: p.size, h: p.size, weight: c.trips, cycle: c.cycle, zone: 0, facility: p.facility, crop: c.crop });
                planned.push({ x: p.x, y: p.y });
                count(p.facility);
                placedInBlocks[`${p.facility}|${c.crop}`] = (placedInBlocks[`${p.facility}|${c.crop}`] || 0) + 1;
            }
        });

        pieces.push({ cluster: true, buildings, plots, planned });
    });

    // Everything else (quick rice, etc.)
    steps.forEach(step => {
        let n = step.facility_count;
        if (step.environment && step.status === 'producing') {
            const key = `${step.facility}|${step.item_name}`;
            const taken = Math.min(n, placedInBlocks[key] || 0);
            placedInBlocks[key] = (placedInBlocks[key] || 0) - taken;
            n -= taken;
        }
        const footprint = FACILITY_FOOTPRINTS[step.facility];
        if (!footprint || n <= 0) return;
        for (let i = 0; i < n; i++) {
            pieces.push({ members: [{ x: 0, y: 0, w: footprint[0], h: footprint[1], weight: 1, facility: step.facility, crop: step.item_name }] });
        }
        count(step.facility, n);
    });

    // Owned facilities not in plan - NEVER place unused environment buildings!
    FACILITIES.forEach(f => {
        const owned = input.facilities[f.name]?.reduce((s, x) => s + x.count, 0) || 0;
        const extra = owned - (placed[f.name] || 0);
        if (extra <= 0) return;
        if (f.name === 'Cooling Unit' || f.name === 'Heat Furnace' || f.name === 'Sunlamp') return; // Do not place unused climate buildings
        const footprint = FACILITY_FOOTPRINTS[f.name];
        if (!footprint) return;
        for (let i = 0; i < extra; i++) {
            pieces.push({ members: [{ x: 0, y: 0, w: footprint[0], h: footprint[1], weight: 0, facility: f.name, crop: null }] });
        }
    });

    return { pieces, unplaced };
}

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

const t0 = Date.now();
const { pieces } = testHomelandPieces(plan, input);
console.log(`Homeland pieces created in: ${Date.now() - t0}ms, count=${pieces.length}`);

const t1 = Date.now();
const result = layOutHomeland(pieces, cells, { suCount: 3 });
console.log(`layOutHomeland finished in: ${Date.now() - t1}ms!`);

console.log("Unplaced count:", result.unplaced.length);
const members = result.pieces.flatMap(p => p.members);
const cuList = members.filter(m => m.facility === 'Cooling Unit');
console.log("Cooling Units placed:", cuList.length);
cuList.forEach((cu, i) => console.log(`CU #${i}: pos=(${cu.x}, ${cu.y}), mode=${cu.mode}`));

const ginsengFarmlands = members.filter(m => m.facility === 'Farmland' && m.crop === 'ginseng');
console.log("Ginseng Farmlands placed:", ginsengFarmlands.length);

const quickRiceFarmlands = members.filter(m => m.facility === 'Farmland' && m.crop === 'quick_rice');
console.log("Quick Rice Farmlands placed:", quickRiceFarmlands.length);
