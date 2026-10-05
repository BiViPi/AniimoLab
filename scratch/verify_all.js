import fs from 'fs';

async function run() {
    const listRes = await fetch('http://localhost:9222/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.url.includes('localhost:8080'));
    if (!pageTab) {
        console.error('No page tab found for localhost:8080');
        process.exit(1);
    }
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

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

    await new Promise(r => ws.onopen = r);
    console.log('Connected to Chrome DevTools Protocol!');

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
    });

    console.log('Reloading page with cache disabled...');
    await send('Page.reload', { ignoreCache: true });
    await new Promise(r => setTimeout(r, 2500));

    console.log('Setting up inputs for RV 14, no Harvest Moon, Ginseng Porridge...');
    const setup = await send('Runtime.evaluate', {
        expression: `(async () => {
            // Set RV 14
            const hl = document.getElementById('home-level');
            hl.value = '14';
            hl.dispatchEvent(new Event('change', { bubbles: true }));

            // Uncheck Harvest Moon
            const hm = document.getElementById('season-on');
            if (hm && hm.checked) {
                hm.checked = false;
                hm.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Check Ginseng Porridge
            const gp = document.querySelector('input[data-special="ginseng_porridge"]');
            if (gp) {
                gp.checked = true;
                gp.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Click Find Plan
            const btn = document.getElementById('optimize-btn');
            btn.click();
            return {
                rv: hl.value,
                hmChecked: hm ? hm.checked : null,
                gpChecked: gp ? gp.checked : null
            };
        })()`,
        awaitPromise: true,
        returnByValue: true
    });
    console.log('Setup result:', setup.result?.value);

    // Wait for solve to finish
    console.log('Waiting for solve to finish...');
    let done = false;
    for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const status = await send('Runtime.evaluate', {
            expression: `(() => {
                const btn = document.getElementById('optimize-btn');
                const results = document.getElementById('results-content');
                const resultsVisible = results && results.style.display !== 'none' && !results.classList.contains('setup-only');
                const btnReady = btn && !btn.disabled;
                return { btnReady, resultsVisible };
            })()`,
            returnByValue: true
        });
        const st = status.result?.value;
        if (st && st.btnReady && st.resultsVisible) {
            console.log(`Solve completed after ${i + 1}s!`);
            done = true;
            break;
        }
    }

    if (!done) {
        console.warn('Timeout waiting for solve, continuing anyway...');
    }

    // Inspect DOM
    const inspect = await send('Runtime.evaluate', {
        expression: `(() => {
            // 1. Check Homeland details
            const simpleSummaryTitle = document.getElementById('simple-summary-title')?.innerText.trim();
            const emodeHint = document.getElementById('emode-simple-hint')?.innerText.trim();
            const chips = [...document.querySelectorAll('#simple-summary .chip')].map(c => c.innerText.trim());
            const assumeTitles = [...document.querySelectorAll('#simple-summary .assume-title')].map(t => t.innerText.trim());

            // 2. Check Facility Plan
            const facilityCatTitles = [...document.querySelectorAll('.facility-category-title')].map(t => t.innerText.trim());
            const coolingSections = facilityCatTitles.filter(t => t.includes('Làm mát') || t.includes('làm mát') || t.includes('Cooling'));
            const heatSections = facilityCatTitles.filter(t => t.includes('Lò nhiệt') || t.includes('Heat Furnace'));
            
            // Check plant plan rows
            const planRows = [...document.querySelectorAll('.facility-plan-table tbody tr')].map(tr => 
                [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
            );

            // 3. Check Seeds card
            const seedCardUnit = document.getElementById('seed-card-unit')?.innerText.trim();
            const seedTableTotal = document.querySelector('#seed-table tfoot td')?.innerText.trim();

            // 4. Check Layout simulator
            const layoutSummary = document.getElementById('layout-summary')?.innerText.trim();
            const suOptions = [...document.querySelectorAll('#layout-su-count option')].map(o => o.innerText.trim());

            // 5. Check Profit Breakdown
            const profitBreakdownFacilities = [...document.querySelectorAll('#profit-breakdown tbody tr td[data-label="Cơ sở"], #profit-breakdown tbody tr td:nth-child(2)')].map(td => td.innerText.trim());

            // 6. Check Insights
            const insights = [...document.querySelectorAll('.insight-item')].map(el => ({
                label: el.querySelector('.insight-label')?.innerText.trim(),
                desc: el.querySelector('.insight-desc')?.innerText.trim()
            }));

            return {
                simpleSummaryTitle,
                emodeHint,
                chips: chips.slice(0, 10),
                coolingUnitsInChips: chips.filter(c => c.includes('Làm mát') || c.includes('Cooling') || c.includes('làm mát')),
                heatFurnacesInChips: chips.filter(c => c.includes('Lò nhiệt') || c.includes('Heat Furnace')),
                assumeTitles,
                facilityCatTitles,
                coolingSections,
                heatSections,
                seedCardUnit,
                seedTableTotal,
                layoutSummary,
                suOptions,
                profitBreakdownFacilities: [...new Set(profitBreakdownFacilities)],
                insights
            };
        })()`,
        returnByValue: true
    });

    const res = inspect.result?.value;
    console.log('\n=================== COMPREHENSIVE VERIFICATION RESULTS ===================');
    console.log('1. HOMELAND SUMMARY:');
    console.log('   Title:', res?.simpleSummaryTitle);
    console.log('   Emode hint:', res?.emodeHint);
    console.log('   Section headings in details:', res?.assumeTitles);
    console.log('   Cooling Unit chip count:', res?.coolingUnitsInChips);
    console.log('   Heat Furnace chip count:', res?.heatFurnacesInChips);
    console.log('   First 10 facility chips:', res?.chips);

    console.log('\n2. FACILITY PLAN TITLES:');
    (res?.facilityCatTitles || []).forEach((t, i) => console.log(`   [${i + 1}] ${t}`));
    console.log('   Cooling Unit sections count:', res?.coolingSections?.length, res?.coolingSections);
    console.log('   Heat Furnace sections count:', res?.heatSections?.length, res?.heatSections);

    console.log('\n3. SEED CARD:');
    console.log('   Unit subtitle:', res?.seedCardUnit);
    console.log('   Footer Total:', res?.seedTableTotal);

    console.log('\n4. 2D LAYOUT SIMULATOR:');
    console.log('   Summary:', res?.layoutSummary);
    console.log('   SU Dropdown options:', res?.suOptions);

    console.log('\n5. PROFIT BREAKDOWN:');
    console.log('   Unique facilities:', res?.profitBreakdownFacilities);

    console.log('\n6. SIDEBAR INSIGHTS:');
    (res?.insights || []).forEach(ins => {
        console.log(`   * ${ins.label}: ${ins.desc.substring(0, 100)}...`);
    });
    console.log('=========================================================================\n');

    // Capture screenshots to artifacts
    const artifactDir = 'C:/Users/Phu Bui/.gemini/antigravity-ide/brain/ba7ce7c8-ee3d-4b4c-a9e2-eec000f846a8';
    
    // Screenshot 1: Homeland & Generator card
    await send('Runtime.evaluate', { expression: `document.querySelector('.config-homeland-card')?.scrollIntoView()` });
    await new Promise(r => setTimeout(r, 600));
    // Open the details to show chips
    await send('Runtime.evaluate', { expression: `document.querySelector('.simple-details').open = true` });
    await new Promise(r => setTimeout(r, 400));
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/verified_homeland_card.png`, Buffer.from(shot1.data, 'base64'));
    console.log('Captured verified_homeland_card.png');

    // Screenshot 2: Facility Plan
    await send('Runtime.evaluate', { expression: `document.getElementById('facility-plan-container')?.scrollIntoView()` });
    await new Promise(r => setTimeout(r, 600));
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/verified_facility_plan_single.png`, Buffer.from(shot2.data, 'base64'));
    console.log('Captured verified_facility_plan_single.png');

    // Screenshot 3: Seeds & Profit cards
    await send('Runtime.evaluate', { expression: `document.getElementById('seed-card')?.scrollIntoView()` });
    await new Promise(r => setTimeout(r, 600));
    const shot3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/verified_seed_and_profit.png`, Buffer.from(shot3.data, 'base64'));
    console.log('Captured verified_seed_and_profit.png');

    // Screenshot 4: 2D Layout card
    await send('Runtime.evaluate', { expression: `document.getElementById('layout-card')?.scrollIntoView()` });
    await new Promise(r => setTimeout(r, 600));
    const shot4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/verified_layout_card.png`, Buffer.from(shot4.data, 'base64'));
    console.log('Captured verified_layout_card.png');

    // Screenshot 5: Top banner (187k rate)
    await send('Runtime.evaluate', { expression: `document.querySelector('.results-top-banner')?.scrollIntoView()` });
    await new Promise(r => setTimeout(r, 600));
    const shot5 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/verified_top_banner_187k.png`, Buffer.from(shot5.data, 'base64'));
    console.log('Captured verified_top_banner_187k.png');

    ws.close();
}

run().catch(console.error);
