import fs from 'fs';

async function run() {
    const listRes = await fetch('http://localhost:9222/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.url.includes('localhost:8080'));
    if (!pageTab) {
        console.log('No tab found');
        return;
    }
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    function send(method, params = {}) {
        return new Promise((resolve) => {
            const msgId = id++;
            const handler = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.id === msgId) {
                    ws.removeEventListener('message', handler);
                    resolve(msg.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: msgId, method, params }));
        });
    }
    const expr = `
        (async () => {
            const btn = document.getElementById('optimize-btn');
            if (btn) btn.click();
            let attempts = 0;
            while (attempts < 30) {
                await new Promise(r => setTimeout(r, 500));
                attempts++;
                const rows = document.querySelectorAll('#plan-table tbody tr');
                if (rows.length > 0) break;
            }
            const tableRows = Array.from(document.querySelectorAll('#plan-table tbody tr')).map(tr => 
                Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim()).join(' | ')
            );
            const levelUp = document.querySelector('.level-up-card')?.innerText;
            const rates = Array.from(document.querySelectorAll('.rate-row, .level-up-item')).map(r => r.innerText.replace(/\\s+/g, ' '));
            return { tableRows, levelUp, rates };
        })()
    `;
    const evalRes = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    console.log('DATA:', JSON.stringify(evalRes.result.value, null, 2));
    ws.close();
}
run().catch(console.error);
