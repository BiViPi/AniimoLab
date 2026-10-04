import fs from 'fs';
import * as pkg from 'file:///E:/Games/AniimoLab/web/pkg/aniimax.js';
import { simpleSetup, FACILITIES, FACILITY_FOOTPRINTS } from 'file:///E:/Games/AniimoLab/web/facility-config.js';

global.document = {
    getElementById: () => ({ checked: false })
};

// Test with layout.js patched for instant speed
let layoutCode = fs.readFileSync("E:/Games/AniimoLab/web/layout.js", "utf8");
layoutCode = layoutCode.replace("const CLUSTER_PACK_MOST = 36;", "const CLUSTER_PACK_MOST = 12;");
layoutCode = layoutCode.replace("if (!plots || pack)", "if (pack && plots)");
fs.writeFileSync("E:/Games/AniimoLab/scratch/fast_layout.js", layoutCode);

const { layOutHomeland } = await import("file:///E:/Games/AniimoLab/scratch/fast_layout.js");

const wasm = fs.readFileSync("E:/Games/AniimoLab/web/pkg/aniimax_bg.wasm");
await pkg.default({ module_or_path: wasm });
const input = { ...simpleSetup(14), currency: "coins" };
const plan = JSON.parse(pkg.find_plan(JSON.stringify(input), () => {}));

// Helper to generate shifted slots for Cooling Unit
function getShiftedCoolingSlots() {
    const yCols = [-5.25, -3.25, -1.25, 0.75, 2.75, 4.75];
    const slots = [];
    // Left columns: -5.25, -3.25
    for (const x of [-5.25, -3.25]) {
        for (const y of yCols) slots.push({ x, y });
    }
    // Left adjacent (above/below CU)
    for (const y of [-5.25, -3.25, 2.75, 4.75]) slots.push({ x: -1.25, y });
    // Right adjacent (above/below CU)
    for (const y of [-5.25, -3.25, 2.75, 4.75]) slots.push({ x: 1.25, y });
    // Right shifted columns (x = 3.25, 5.25 - user requested rightward shift so edge overlaps boundary)
    for (const x of [3.25, 5.25]) {
        for (const y of yCols) slots.push({ x, y });
    }
    return slots.sort((a, b) => Math.hypot(a.x - 1, a.y - 1) - Math.hypot(b.x - 1, b.y - 1));
}

console.log("Shifted slots count:", getShiftedCoolingSlots().length);

// Now test with homeland pieces
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

console.log("Ready to benchmark layout with shifted slots!");
