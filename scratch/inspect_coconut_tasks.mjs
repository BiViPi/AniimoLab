import fs from 'fs';
import * as pkg from 'file:///E:/Games/AniimoLab/web/pkg/aniimax.js';
import { simpleSetup } from 'file:///E:/Games/AniimoLab/web/facility-config.js';

const wasm = fs.readFileSync("E:/Games/AniimoLab/web/pkg/aniimax_bg.wasm");
await pkg.default({ module_or_path: wasm });
const input = { ...simpleSetup(20), currency: "coins" };
const plan = JSON.parse(pkg.find_plan(JSON.stringify(input), () => {}));

const coconutStep = (plan.coin_items || []).find(s => s.item_name === 'Coconut');
console.log("Coconut step:", JSON.stringify(coconutStep, null, 2));
