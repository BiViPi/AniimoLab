import { chromium } from 'playwright';

async function main() {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    
    console.log('Navigating to http://localhost:8080/...');
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });

    // Set RV 14
    console.log('Setting RV 14...');
    await page.selectOption('#home-level', '14');

    // Uncheck Harvest Moon
    const hmCheckbox = await page.$('#season-toggle');
    if (hmCheckbox && await hmCheckbox.isChecked()) {
        await hmCheckbox.uncheck();
        console.log('Unchecked Harvest Moon.');
    }

    // Check Ginseng Porridge
    console.log('Checking Ginseng Porridge (Cháo nhân sâm)...');
    const porridgeCheckbox = await page.$('input[data-recipe="ginseng_porridge"]');
    if (porridgeCheckbox) {
        if (!await porridgeCheckbox.isChecked()) {
            await porridgeCheckbox.check();
        }
        console.log('Checked ginseng_porridge.');
    } else {
        console.log('Ginseng porridge checkbox not found directly, looking for special recipes...');
    }

    // Click Find the best plan
    console.log('Clicking Find the best plan...');
    await page.click('#optimize-btn');

    // Wait for results
    console.log('Waiting for results...');
    await page.waitForSelector('#results-content:not([style*="display: none"])', { timeout: 15000 });
    await page.waitForTimeout(4000); // Wait for solver to finish

    // Check Cooling Unit count in facility plan
    const coolingHeaders = await page.$$eval('.facility-category-title', titles => titles.map(t => t.innerText));
    console.log('Facility category titles:', coolingHeaders);

    // Take screenshots
    const artifactDir = 'C:/Users/Phu Bui/.gemini/antigravity-ide/brain/ba7ce7c8-ee3d-4b4c-a9e2-eec000f846a8';
    await page.screenshot({ path: `${artifactDir}/test_top_banner_side_by_side.png` });
    
    // Scroll down to facility plan
    const facilityCard = await page.$('.facilities-container');
    if (facilityCard) {
        await facilityCard.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${artifactDir}/test_facility_plan.png` });
    }

    // Check rate card text
    const levelUpLabel = await page.$eval('#level-up-label', el => el.innerText);
    const levelUpTime = await page.$eval('#level-up-time', el => el.innerText);
    console.log('Level-up label:', levelUpLabel);
    console.log('Level-up time:', levelUpTime);

    // Check Aniimo card
    const aniimoTitle = await page.$eval('.aniimo-card h2', el => el.innerText);
    console.log('Aniimo title:', aniimoTitle);

    // Check Insights
    const insightLabels = await page.$$eval('.insight-label', els => els.map(e => e.innerText));
    console.log('Insight labels:', insightLabels);

    await browser.close();
    console.log('Done!');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
