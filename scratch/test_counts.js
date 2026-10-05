import fs from 'fs';

async function main() {
    const listRes = await fetch('http://localhost:9222/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.url.includes('localhost:8080'));
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
        }
    };

    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const msgId = id++;
            pending.set(msgId, { resolve, reject });
            ws.send(JSON.stringify({ id: msgId, method, params }));
        });
    }

    const testResult = await send('Runtime.evaluate', {
        expression: `(async () => {
            try {
                const { simpleSetup } = await import('./facility-config.js');
                const setup = simpleSetup(14);
                
                // Case 1: Heat Furnace = 2, Cooling Unit = 1
                const s1 = JSON.parse(JSON.stringify(setup));
                s1.facilities['Heat Furnace'][0].count = 2;
                s1.facilities['Cooling Unit'][0].count = 1;

                // Case 2: Heat Furnace = 2, Cooling Unit = 2
                const s2 = JSON.parse(JSON.stringify(setup));
                s2.facilities['Heat Furnace'][0].count = 2;
                s2.facilities['Cooling Unit'][0].count = 2;

                const wasm = await import('./pkg/aniimax.js');
                await wasm.default();

                const r1 = JSON.parse(wasm.solve(JSON.stringify(s1), JSON.stringify({
                    homeLevel: 14,
                    season: false,
                    specials: ['ginseng_porridge'],
                    woodByproduct: false
                })));

                const r2 = JSON.parse(wasm.solve(JSON.stringify(s2), JSON.stringify({
                    homeLevel: 14,
                    season: false,
                    specials: ['ginseng_porridge'],
                    woodByproduct: false
                })));

                function extract(res) {
                    const crops = {};
                    if (res.environment_groups) {
                        for (const g of res.environment_groups) {
                            for (const f of g.facilities) {
                                const k = f.recipe || f.facility;
                                crops[k] = (crops[k] || 0) + f.count;
                            }
                        }
                    }
                    if (res.standard_groups) {
                        for (const g of res.standard_groups) {
                            for (const f of g.facilities) {
                                const k = f.recipe || f.facility;
                                crops[k] = (crops[k] || 0) + f.count;
                            }
                        }
                    }
                    return {
                        profit: res.profit_per_hour,
                        crops,
                        buildings: res.environment_groups ? res.environment_groups.map(g => ({
                            building: g.building,
                            mode: g.mode,
                            facs: g.facilities.map(f => f.facility + ': ' + f.count + ' (' + f.recipe + ')')
                        })) : []
                    };
                }

                return {
                    case1_heat2_cool1: extract(r1),
                    case2_heat2_cool2: extract(r2)
                };
            } catch (e) {
                return { error: e.message, stack: e.stack };
            }
        })()`,
        awaitPromise: true,
        returnByValue: true
    });

    console.log(JSON.stringify(testResult.result?.value, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
