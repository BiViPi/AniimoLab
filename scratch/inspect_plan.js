import fs from 'fs';

async function main() {
    const listRes = await fetch('http://localhost:9222/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.url.includes('localhost:8080'));
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.id === 1) {
            console.log(JSON.stringify(data.result.result.value, null, 2));
            process.exit(0);
        }
    };

    ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
            expression: `(() => {
                const grid = document.querySelector('.results-dashboard-grid');
                if (!grid) return 'No grid';
                return Array.from(grid.querySelectorAll('.card, .facility-plan-card, section')).map(c => ({
                    title: c.querySelector('h3, h4')?.innerText,
                    headings: Array.from(c.querySelectorAll('h4, h5')).map(h => h.innerText),
                    textSnippet: c.innerText.slice(0, 150)
                }));
            })()`,
            returnByValue: true
        }
    }));
}
main();
