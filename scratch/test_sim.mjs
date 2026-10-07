import { FACILITIES, FACILITY_POWER_WATTS, simpleSetup } from '../web/facility-config.js';

// Simulate basePlan at RV 14:
// Facilities producing:
// - Simmering Pot (producing Ginseng Porridge)
// - Carousel Mill (producing Flour, etc.)
// - Jukebox Dryer (producing Dried Lemon, etc.)
// - Crafting Table (producing Flower in Pot, etc.)
// - Well (producing Water)
// Let's test what allocateDynamicEmode produces!

function simulateAllocate(activeCounts, facRevenue, maxWatts = 666) {
    const emodeCounts = {};
    let usedWatts = 0;

    const potWatts = FACILITY_POWER_WATTS['Simmering Pot'] || 60;
    if ((activeCounts['Simmering Pot'] || 0) >= 1 && usedWatts + potWatts <= maxWatts) {
        emodeCounts['Simmering Pot'] = 1;
        usedWatts += potWatts;
    }

    const sortedFacs = Object.keys(activeCounts)
        .filter(f => f !== 'Simmering Pot')
        .sort((a, b) => (facRevenue[b] || 0) - (facRevenue[a] || 0));

    console.log('sortedFacs:', sortedFacs);

    for (const fac of sortedFacs) {
        const w = FACILITY_POWER_WATTS[fac] || 0;
        if (w <= 0) continue;
        const totalUnits = activeCounts[fac];
        for (let u = 0; u < totalUnits; u++) {
            if (usedWatts + w <= maxWatts) {
                emodeCounts[fac] = (emodeCounts[fac] || 0) + 1;
                usedWatts += w;
            } else {
                break;
            }
        }
    }

    return { emodeCounts, usedWatts };
}

// Active processors at RV 14:
// In RV 14:
// Jukebox Dryer: 2 (75W each) -> 150W
// Crafting Table: 2 (75W each) -> 150W
// Carousel Mill: 2 (60W each) -> 120W
// Simmering Pot: 1 (60W) -> 60W
// Total of processors = 150 + 150 + 120 + 60 = 480W (or + 15W = 495W)
// Well: 2 (120W each)
const activeCounts = {
    'Jukebox Dryer': 2,
    'Crafting Table': 2,
    'Carousel Mill': 2,
    'Simmering Pot': 2,
    'Well': 2
};

const facRevenue = {
    'Simmering Pot': 50000,
    'Jukebox Dryer': 40000,
    'Crafting Table': 30000,
    'Carousel Mill': 20000,
    'Well': 0
};

console.log('Result at 666W cap:');
console.log(simulateAllocate(activeCounts, facRevenue, 666));
