import fs from 'fs';

async function run() {
    const listRes = await fetch('http://localhost:9222/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.url.includes('localhost:8080'));
    if (!pageTab) {
        console.error('No page tab found for localhost:8080');
        process.exit(1);
    }
    console.log('Connecting to', pageTab.webSocketDebuggerUrl);
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
    await send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
    });

    console.log('Reloading page with ignoreCache: true...');
    await send('Page.reload', { ignoreCache: true });
    await new Promise(r => setTimeout(r, 2500));

    console.log('Configuring inputs in page...');
    const setupResult = await send('Runtime.evaluate', {
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

            // Trigger Find Plan
            const btn = document.getElementById('optimize-btn');
            btn.click();
            return {
                rv: hl.value,
                harvestMoon: hm ? hm.checked : null,
                ginsengPorridge: gp ? gp.checked : null
            };
        })()`,
        awaitPromise: true,
        returnByValue: true
    });
    console.log('Configured:', setupResult.result?.value);

    // Wait for solve to complete
    console.log('Waiting for solve completion...');
    let done = false;
    for (let i = 0; i < 20; i++) {
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
            console.log(`Solve finished after ${i + 1}s!`);
            done = true;
            break;
        }
    }

    if (!done) {
        console.warn('Timed out waiting for solve, proceeding with inspection...');
    }

    // Inspect results
    const inspect = await send('Runtime.evaluate', {
        expression: `(() => {
            const levelUpLabel = document.getElementById('level-up-label')?.innerText;
            const levelUpTime = document.getElementById('level-up-time')?.innerText;
            const levelUpLines = [...document.querySelectorAll('.level-up-lines tbody tr')].map(tr => 
                [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
            );
            const surplus = document.querySelector('.level-up-coins')?.innerText;
            const unverified = document.getElementById('plan-unverified')?.innerText;
            
            // Environment category titles
            const titles = [...document.querySelectorAll('.facility-category-title')].map(t => t.innerText.trim());
            const coolingTitles = titles.filter(t => t.includes('làm mát') || t.includes('Cooling') || t.includes('Cool') || t.includes('Mát'));

            // Top banner layout check
            const topBanner = document.querySelector('.results-top-banner');
            const rateCard = topBanner?.querySelector('.rate-card');
            const aniimoCard = topBanner?.querySelector('.aniimo-card');
            const isSideBySide = topBanner && rateCard && aniimoCard && topBanner.contains(rateCard) && topBanner.contains(aniimoCard);

            // Opportunities card check
            const improveCard = document.getElementById('improve-card');

            // Insights check
            const insights = [...document.querySelectorAll('.insight-label')].map(l => l.innerText.trim());

            return {
                levelUpLabel,
                levelUpTime,
                levelUpLines,
                surplus,
                unverified,
                titles,
                coolingTitles,
                isSideBySide,
                improveCardExists: !!improveCard,
                insights
            };
        })()`,
        returnByValue: true
    });

    const data = inspect.result?.value;
    console.log('\n================ VERIFICATION RESULTS ================');
    console.log('1. Level-Up Header:', data?.levelUpLabel);
    console.log('   Level-Up Time:', data?.levelUpTime);
    console.log('   Requirements Table:', data?.levelUpLines);
    console.log('   Surplus:', data?.surplus);
    console.log('   Unverified note:', data?.unverified);
    console.log('\n2. Top Banner Side-By-Side Layout:', data?.isSideBySide ? 'YES (rate-card & aniimo-card both inside .results-top-banner)' : 'NO');
    console.log('\n3. Opportunities (Cơ hội cải thiện) Card Exists:', data?.improveCardExists ? 'YES' : 'NO (Successfully removed)');
    console.log('\n4. Facility Plan Titles:');
    (data?.titles || []).forEach((t, i) => console.log(`   [${i + 1}] ${t}`));
    console.log('\n5. Cooling Unit sections count:', data?.coolingTitles?.length, data?.coolingTitles);
    console.log('\n6. Sidebar Insights:', data?.insights);
    console.log('======================================================\n');

    // Capture screenshots
    const artifactDir = 'C:/Users/Phu Bui/.gemini/antigravity-ide/brain/ba7ce7c8-ee3d-4b4c-a9e2-eec000f846a8';
    
    // Screenshot 1: Top banner
    await send('Runtime.evaluate', { expression: `document.querySelector('.results-top-banner')?.scrollIntoView()` });
    await new Promise(r => setTimeout(r, 600));
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/verified_rv14_top_banner.png`, Buffer.from(shot1.data, 'base64'));
    console.log('Saved top banner screenshot to verified_rv14_top_banner.png');

    // Screenshot 2: Facility Plan
    await send('Runtime.evaluate', { expression: `document.getElementById('facility-plan-container')?.scrollIntoView()` });
    await new Promise(r => setTimeout(r, 600));
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/verified_rv14_facility_plan.png`, Buffer.from(shot2.data, 'base64'));
    console.log('Saved facility plan screenshot to verified_rv14_facility_plan.png');

    ws.close();
}

run().catch(console.error);
