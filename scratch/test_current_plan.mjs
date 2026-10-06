import { chromium } from 'playwright';

async function main() {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:8080/');
    await page.selectOption('#home-level', '14');
    const hmCheckbox = await page.$('#season-toggle');
    if (hmCheckbox && await hmCheckbox.isChecked()) await hmCheckbox.uncheck();
    const porridgeCheckbox = await page.$('input[data-recipe="ginseng_porridge"]');
    if (porridgeCheckbox && !await porridgeCheckbox.isChecked()) await porridgeCheckbox.check();
    await page.click('#optimize-btn');
    await page.waitForTimeout(6000);
    const planText = await page.evaluate(() => {
        return {
            rate: document.querySelector('.rate-value')?.innerText,
            summary: Array.from(document.querySelectorAll('.summary-metric, .plan-step, .facility-block')).map(r => r.innerText.replace(/\n+/g, ' | ')),
            environment: Array.from(document.querySelectorAll('.environment-summary, .environment-assignment')).map(r => r.innerText.replace(/\n+/g, ' | '))
        };
    });
    console.log('Results:', JSON.stringify(planText, null, 2));
    await browser.close();
}
main().catch(console.error);
