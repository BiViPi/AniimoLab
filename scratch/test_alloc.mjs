import { simpleSetup, FACILITIES, FACILITY_POWER_WATTS } from '../web/facility-config.js';

console.log('Well in FACILITIES:', FACILITIES.find(f => f.name === 'Well'));
console.log('FACILITY_POWER_WATTS[Well]:', FACILITY_POWER_WATTS['Well']);

const { facilities } = simpleSetup(14);
console.log('Facilities at RV 14:');
for (const [name, tiers] of Object.entries(facilities)) {
    const total = tiers.reduce((s, t) => s + t.count, 0);
    if (total > 0) console.log(`  ${name}: ${total}`);
}
