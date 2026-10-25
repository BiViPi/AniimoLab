// Homeland layout projections. The app owns the current viewbox and user toggles; SVG rendering
// returns them alongside markup, while the pieces builder returns the worker's placement input.
export function createHomelandLayoutView(deps) {
    function render(layout, homeLevel, { whole = false, showMinorGrid = false } = {}) {
        const isVi = deps.getLanguage() === 'vi';
        const coverage = (layout.pieces || []).flatMap(piece => piece.members || [])
            .filter(member => member && member.building && member.mode)
            .map(member => ({
                x: member.x + member.w / 2 - deps.getEnvironmentCoverageRadius(),
                y: member.y + member.h / 2 - deps.getEnvironmentCoverageRadius(),
                w: deps.getEnvironmentCoverageRadius() * 2,
                h: deps.getEnvironmentCoverageRadius() * 2,
                mode: member.mode,
            }));
        const plots = deps.homelandPlots();
        const storages = layout.storages && layout.storages.length > 0 ? layout.storages : [layout.storage];
        const placed = [...storages, ...(layout.pieces || []).flatMap(piece => piece.members || []).filter(Boolean)];
        const minX = whole ? -1 : Math.floor(Math.min(...placed.map(rect => rect.x))) - 3;
        const minY = whole ? -1 : Math.floor(Math.min(...placed.map(rect => rect.y))) - 3;
        const maxX = whole ? Math.max(...plots.map(plot => plot.x + plot.w)) + 1 : Math.ceil(Math.max(...placed.map(rect => rect.x + rect.w))) + 3;
        const maxY = whole ? Math.max(...plots.map(plot => plot.y + plot.h)) + 1 : Math.ceil(Math.max(...placed.map(rect => rect.y + rect.h))) + 3;

        const plotShapes = [...plots].sort((a, b) => (b.number <= homeLevel) - (a.number <= homeLevel)).map(plot => {
            const open = plot.number <= homeLevel;
            return `<g class="layout-plot${open ? '' : ' locked'}"><rect x="${plot.x}" y="${plot.y}" width="${plot.w}" height="${plot.h}" />
            <text x="${plot.x + 0.6}" y="${plot.y + 0.9}" font-size="0.85" font-weight="700" fill="${open ? '#94a3b8' : '#ef4444'}">${open ? (isVi ? 'Lô' : 'Plot') : 'RV'} ${plot.number}</text></g>`;
        }).join('');

        const lines = [];
        if (showMinorGrid) {
            for (let x = minX; x <= maxX; x += 0.25) {
                if (Math.abs(x % 1.0) > 0.05) lines.push(`<line x1="${x}" y1="${minY}" x2="${x}" y2="${maxY}" stroke="#334155" stroke-opacity="0.16" stroke-width="0.02" class="minor-grid" />`);
            }
            for (let y = minY; y <= maxY; y += 0.25) {
                if (Math.abs(y % 1.0) > 0.05) lines.push(`<line x1="${minX}" y1="${y}" x2="${maxX}" y2="${y}" stroke="#334155" stroke-opacity="0.16" stroke-width="0.02" class="minor-grid" />`);
            }
        }
        for (let x = minX; x <= maxX; x++) lines.push(`<line x1="${x}" y1="${minY}" x2="${x}" y2="${maxY}" stroke="#334155" stroke-opacity="0.45" stroke-width="0.04" />`);
        for (let y = minY; y <= maxY; y++) lines.push(`<line x1="${minX}" y1="${y}" x2="${maxX}" y2="${y}" stroke="#334155" stroke-opacity="0.45" stroke-width="0.04" />`);

        const allMembers = layout.pieces.flatMap((piece, pieceIndex) => (piece.members || []).map((member, memberIndex) => ({ ...member, pIdx: pieceIndex, mIdx: memberIndex })));
        const shapes = allMembers.map(member => {
            const districtId = member.district || deps.getFacilityDistrict(member.facility);
            const district = deps.getLayoutDistricts().find(item => item.id === districtId) || { color: '#3b82f6' };
            const storage = storages.find(item => item.id === member.closestStorage) || storages[0];
            const away = storage ? Math.hypot(member.x + member.w / 2 - (storage.x + storage.w / 2), member.y + member.h / 2 - (storage.y + storage.h / 2)) : 0;
            const facilityTitle = deps.getFacilityDisplayName(member.facility);
            const modeTitle = deps.getModeDisplayName(member.mode);
            const detailText = member.jobs ? member.jobs.map(job => deps.prettyItem(job.item)).join(', ')
                : member.crop ? deps.prettyItem(member.crop)
                    : member.building && member.mode ? modeTitle : (isVi ? 'Đang chờ' : 'Idle');
            const statsText = member.weight > 0
                ? (isVi ? `${deps.formatRate(member.weight)} chuyến/giờ · ${away.toFixed(1)} ô tới ${storage?.label || 'SU'}` : `${deps.formatRate(member.weight)} trips/h · ${away.toFixed(1)} tiles to ${storage?.label || 'SU'}`)
                : '';
            const tooltip = deps.tipAttrs(facilityTitle, { detail: detailText, stats: statsText, color: district.color });
            return `<g class="layout-piece" data-type="facility" data-piece-idx="${member.pIdx}" data-member-idx="${member.mIdx}" data-facility="${member.facility}" data-x="${member.x}" data-y="${member.y}" data-orig-x="${member.x}" data-orig-y="${member.y}" ${tooltip}>${deps.renderHomelandSvgFacility(member)}</g>`;
        }).join('');

        const coverageColors = deps.getEnvironmentModeColors();
        const coverageShade = deps.getEnvironmentModeShade();
        const coverageShapes = coverage.map(area => {
            const tint = coverageColors[area.mode] || '#9aa0a8';
            const shade = (0.14 * (coverageShade[area.mode] ?? 1)).toFixed(3);
            return `<rect x="${area.x}" y="${area.y}" width="${area.w}" height="${area.h}" rx="0.5" fill="${tint}" fill-opacity="${shade}" />`;
        }).join('');
        const coverageEdges = coverage.map(area => {
            const tint = coverageColors[area.mode] || '#9aa0a8';
            return `<rect x="${area.x}" y="${area.y}" width="${area.w}" height="${area.h}" rx="0.5" fill="none"
            stroke="${tint}" stroke-opacity="0.85" stroke-dasharray="0.4 0.25" stroke-width="0.08" />`;
        }).join('');

        const viewBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        const svg = `<svg class="layout-svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}" role="img" aria-label="Homeland layout">
        <defs><pattern id="layout-locked" width="1" height="1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="1" class="layout-hatch" /></pattern></defs>
        <g class="env-grid">${lines.join('')}</g>
        <g class="layout-plots">${plotShapes}</g>
        <g class="layout-coverage">${coverageShapes}</g>
        ${shapes}
        <g class="layout-coverage-edges" pointer-events="none">${coverageEdges}</g>
        ${renderPowerNetwork(layout, storages, isVi, deps)}
    </svg>`;
        return { svg, viewBox, whole };
    }

    return { render };
}

function renderPowerNetwork(layout, storages, isVi, deps) {
    const members = layout.pieces.flatMap(piece => piece.members);
    const generators = members.filter(member => member.facility === 'Crackle Generator' || member.facility === 'Generator' || member.generator);
    const poles = members.filter(member => member.facility === 'Crackle Power Pole' || member.facility === 'Power Pole' || member.powerPole);
    const electricFacilities = members.filter(member => member.isElectric && !member.generator && !member.powerPole);
    if (!generators.length) return renderStorageUnits(storages, isVi, deps);
    let aura = '<g class="generator-power-network" pointer-events="none">';
    generators.forEach((generator, index) => {
        const x = generator.x - (11 - generator.w) / 2;
        const y = generator.y - (11 - generator.h) / 2;
        const center = { x: generator.x + generator.w / 2, y: generator.y + generator.h / 2 };
        aura += `
                        <!-- Crackle Generator #${index + 1} 11x11 Square Grid -->
                        <rect x="${x}" y="${y}" width="11" height="11" rx="0.3" fill="#06b6d4" fill-opacity="0.05" stroke="#06b6d4" stroke-opacity="0.65" stroke-width="0.14" stroke-dasharray="0.8 0.4" />
                        <text x="${center.x}" y="${y - 0.35}" font-size="0.6" fill="#06b6d4" font-weight="700" text-anchor="middle">${isVi ? `⚡ Trụ điện #${index + 1} (11×11 · 1000W)` : `⚡ Generator #${index + 1} (11×11 · 1000W)`}</text>`;
    });
    poles.forEach((pole, index) => {
        const x = pole.x - (7 - pole.w) / 2;
        const y = pole.y - (7 - pole.h) / 2;
        const center = { x: pole.x + pole.w / 2, y: pole.y + pole.h / 2 };
        aura += `
                        <!-- Power Pole #${index + 1} 7x7 Relay Range -->
                        <rect x="${x}" y="${y}" width="7" height="7" rx="0.25" fill="#eab308" fill-opacity="0.04" stroke="#eab308" stroke-opacity="0.55" stroke-width="0.12" stroke-dasharray="0.5 0.25" />
                        <text x="${center.x}" y="${y - 0.25}" font-size="0.5" fill="#eab308" font-weight="600" text-anchor="middle">${isVi ? `⚡ Cột điện #${index + 1} (7×7 Relay)` : `⚡ Power Pole #${index + 1} (7×7 Relay)`}</text>`;
    });
    const powerSpine = generators.map(generator => ({ x: generator.x + generator.w / 2, y: generator.y + generator.h / 2 }));
    [...poles].sort((a, b) => a.x - b.x).forEach(pole => powerSpine.push({ x: pole.x + pole.w / 2, y: pole.y + pole.h / 2 }));
    for (let index = 0; index < powerSpine.length - 1; index++) {
        const start = powerSpine[index];
        const end = powerSpine[index + 1];
        aura += `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#facc15" stroke-width="0.18" stroke-linecap="round" stroke-dasharray="0.6 0.25" stroke-opacity="0.95" />`;
    }
    const powerSources = [...generators, ...poles].map(source => ({ x: source.x + source.w / 2, y: source.y + source.h / 2 }));
    electricFacilities.forEach(facility => {
        const center = { x: facility.x + facility.w / 2, y: facility.y + facility.h / 2 };
        let closest = null;
        let minDistance = Infinity;
        for (const source of powerSources) {
            const distance = Math.hypot(center.x - source.x, center.y - source.y);
            if (distance < minDistance) { minDistance = distance; closest = source; }
        }
        if (closest) aura += `<line x1="${closest.x}" y1="${closest.y}" x2="${center.x}" y2="${center.y}" stroke="#facc15" stroke-width="0.10" stroke-opacity="0.8" stroke-dasharray="0.3 0.15" />
                            <circle cx="${center.x}" cy="${center.y}" r="0.16" fill="#facc15" />
                            <text x="${center.x}" y="${facility.y + facility.h + 0.38}" font-size="0.34" fill="#facc15" font-weight="700" text-anchor="middle" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))">${isVi ? 'Đã đáp ứng yêu cầu ⚡' : 'Power Requirement Met ⚡'}</text>`;
    });
    return `${aura}</g>${renderStorageUnits(storages, isVi, deps)}`;
}

function renderStorageUnits(storages, isVi, deps) {
    const iconUrl = deps.getFacilityIconUrl('Storage Unit');
    return storages.map((storage, index) => {
        const roleColors = { central: '#eab308', farm: '#10b981', workshop: '#06b6d4', forestry: '#059669', expansion: '#8b5cf6' };
        const color = roleColors[storage.role] || '#f59e0b';
        const roleName = storage.role
            ? (isVi ? (storage.role === 'central' ? 'Trung tâm' : storage.role === 'farm' ? 'Nông trại' : storage.role === 'workshop' ? 'Xưởng' : storage.role === 'forestry' ? 'Lâm nghiệp' : storage.role === 'expansion' ? 'Mở rộng' : storage.role) : (storage.role[0].toUpperCase() + storage.role.slice(1)))
            : (isVi ? 'Đa năng' : 'All-purpose');
        const detail = isVi ? `Thiết bị lưu trữ: ${roleName}` : `Storage Unit: ${roleName}`;
        const label = isVi
            ? (storage.label ? storage.label.replace('Central', 'Trung tâm').replace('Farm', 'Nông trại').replace('Workshop', 'Xưởng').replace('Forestry', 'Lâm nghiệp').replace('Expansion', 'Mở rộng') : `SU ${index + 1}`)
            : (storage.label || `SU ${index + 1}`);
        return `<g class="layout-piece layout-storage-unit su-${storage.role || 'hub'}" data-type="storage" data-storage-idx="${index}" data-x="${storage.x}" data-y="${storage.y}" data-orig-x="${storage.x}" data-orig-y="${storage.y}" ${deps.tipAttrs(label, { detail, color })}>
                    <rect x="${storage.x + 0.04}" y="${storage.y + 0.04}" width="${storage.w - 0.08}" height="${storage.h - 0.08}" rx="0.22" fill="#131c17" fill-opacity="0.65" stroke="${color}" stroke-width="0.06" class="homeland-facility-base" />
                    <image href="${iconUrl}" x="${storage.x + 0.06}" y="${storage.y + 0.04}" width="${storage.w - 0.12}" height="${storage.h - 0.08}" preserveAspectRatio="xMidYMid meet" class="homeland-building-sprite" onerror="this.style.display='none'" />
                    <g class="homeland-su-badge" pointer-events="none"><circle cx="${storage.x + storage.w / 2}" cy="${storage.y + storage.h / 2}" r="0.42" fill="${color}" stroke="#0f172a" stroke-width="0.08" /><text x="${storage.x + storage.w / 2}" y="${storage.y + storage.h / 2 + 0.15}" font-size="0.45" font-weight="800" fill="#0f172a" text-anchor="middle">${index + 1}</text></g>
                </g>`;
    }).join('');
}

export function splitEnvironmentRowsByUnit(rows, assignmentsForMode) {
    const units = [];
    assignmentsForMode.forEach(assignment => {
        (assignment.layouts || []).forEach(layout => {
            const remaining = {};
            layout.forEach(plot => { remaining[plot.facility] = (remaining[plot.facility] || 0) + 1; });
            units.push({ building: assignment.building, remaining, rows: [], layout, partner: assignment.partner || null, zone: assignment.zone ?? null, pairModes: assignment.pair_modes || null });
        });
    });
    rows.forEach(step => {
        let remaining = step.facility_count;
        for (const unit of units) {
            if (remaining <= 0) break;
            const available = unit.remaining[step.facility] || 0;
            const take = Math.min(remaining, available);
            if (take <= 0) continue;
            unit.remaining[step.facility] -= take;
            unit.rows.push({ ...step, facility_count: take });
            remaining -= take;
        }
    });
    units.forEach(unit => {
        const totalByFacility = {};
        unit.layout.forEach(plot => { totalByFacility[plot.facility] = (totalByFacility[plot.facility] || 0) + 1; });
        const takenSoFar = {};
        unit.layout = unit.layout.filter(plot => {
            const unused = unit.remaining[plot.facility] || 0;
            const used = (totalByFacility[plot.facility] || 0) - unused;
            takenSoFar[plot.facility] = takenSoFar[plot.facility] || 0;
            if (takenSoFar[plot.facility] < used) {
                takenSoFar[plot.facility]++;
                return true;
            }
            return false;
        });
    });
    return units.filter(unit => unit.rows.length > 0);
}

function tripsPerUnit(step) {
    if (step.status !== 'producing' || !step.cycle_time || !step.facility_count) return 0;
    const busy = step.busy_units ?? step.facility_count;
    return (busy / step.cycle_time / step.facility_count) * 3600;
}

export function createHomelandPiecesBuilder(deps) {
    const getRecipes = deps.getRecipes;
    const recipeFor = item => getRecipes().find(recipe => recipe.name === item);

    function build(plan, input) {
        const pieces = [];
        const placed = {};
        const count = (facility, amount = 1) => { placed[facility] = (placed[facility] || 0) + amount; };
        const unplaced = new Set();
        const steps = (plan.coin_items || []).filter(step => step.facility && step.status === 'producing' && Boolean(step.item_name));
        const envSteps = steps.filter(step => step.environment);
        const assignments = plan.environment_assignments || [];

        const units = [];
        deps.environmentModeOrder.forEach(mode => {
            const rows = envSteps.filter(step => step.environment === mode);
            if (!rows.length) return;
            const modeUnits = splitEnvironmentRowsByUnit(rows, assignments.filter(assignment => assignment.mode === mode));
            modeUnits.forEach(unit => units.push({ mode, unit }));
        });
        const blocks = new Map();
        units.forEach(({ mode, unit }, index) => {
            const key = unit.partner ? `${unit.building}|${unit.partner.join(',')}|${index}` : `#${index}`;
            const pairKey = unit.partner
                ? [...blocks.keys()].find(candidate => candidate.startsWith(`${unit.building}|${unit.partner.join(',')}|`) && !blocks.get(candidate).parts.some(part => part.zone === unit.zone))
                : null;
            const block = blocks.get(pairKey) || { mode, unit, parts: [] };
            block.parts.push({ zone: unit.zone ?? 0, layout: unit.layout, rows: unit.rows });
            blocks.set(pairKey || key, block);
        });
        const placedInBlocks = {};
        blocks.forEach(({ mode, unit, parts }) => {
            const size = deps.environmentBuildingSize(unit.building);
            const buildings = [{ x: 0, y: 0, w: size, h: size, facility: unit.building, mode: unit.pairModes ? unit.pairModes[0] : mode, building: true }];
            count(unit.building);
            if (unit.partner) {
                const partnerSize = deps.environmentBuildingSize(unit.partner[0]);
                buildings.push({ x: unit.partner[1], y: unit.partner[2], w: partnerSize, h: partnerSize, facility: unit.partner[0], mode: unit.pairModes ? unit.pairModes[1] : mode, building: true });
                count(unit.partner[0]);
            }
            const plots = [];
            const planned = [];
            parts.forEach(({ zone, layout: originalLayout, rows }) => {
                let layout = originalLayout;
                if (unit.building === 'Cooling Unit' && rows.some(row => row.facility === 'Farmland')) {
                    const starfall = layout.find(plot => plot.facility === 'Starfall Hammock');
                    const yColumns = [-5.25, -3.25, -1.25, 0.75, 2.75, 4.75];
                    const shiftedSlots = [];
                    for (const x of [-5.25, -3.25]) for (const y of yColumns) shiftedSlots.push({ x, y, size: 2, facility: 'Farmland' });
                    for (const y of [-5.25, -3.25, 2.75, 4.75]) shiftedSlots.push({ x: -1.25, y, size: 2, facility: 'Farmland' });
                    for (const y of [-5.25, -3.25, 2.75, 4.75]) shiftedSlots.push({ x: 1.25, y, size: 2, facility: 'Farmland' });
                    for (const x of [3.25, 5.25]) for (const y of yColumns) shiftedSlots.push({ x, y, size: 2, facility: 'Farmland' });
                    const validSlots = shiftedSlots.filter(slot => {
                        if (!starfall) return true;
                        const hammockSize = starfall.size || 5;
                        return !(slot.x < starfall.x + hammockSize && starfall.x < slot.x + slot.size && slot.y < starfall.y + hammockSize && starfall.y < slot.y + slot.size);
                    }).sort((a, b) => a.y - b.y || a.x - b.x);
                    layout = starfall ? [{ ...starfall }, ...validSlots] : validSlots;
                }
                const crops = {};
                rows.forEach(row => {
                    for (let index = 0; index < row.facility_count; index++) (crops[row.facility] ||= []).push({ crop: row.item_name, trips: tripsPerUnit(row), cycle: row.cycle_time });
                });
                layout.forEach(plot => {
                    const crop = (crops[plot.facility] || []).shift();
                    if (!crop) return;
                    plots.push({ w: plot.size, h: plot.size, weight: crop.trips, cycle: crop.cycle, zone: unit.partner ? zone : 0, facility: plot.facility, crop: crop.crop });
                    planned.push({ x: plot.x, y: plot.y });
                    count(plot.facility);
                    placedInBlocks[`${plot.facility}|${crop.crop}`] = (placedInBlocks[`${plot.facility}|${crop.crop}`] || 0) + 1;
                });
                Object.entries(crops).forEach(([facility, remainingCrops]) => {
                    while (remainingCrops.length > 0) {
                        const crop = remainingCrops.shift();
                        const size = facility === 'Woodland' ? 4 : 2;
                        const extraSlots = [
                            { x: 3.25, y: -5.25 }, { x: 3.25, y: 4.75 }, { x: 5.25, y: -3.25 }, { x: 5.25, y: 2.75 },
                            { x: -5.25, y: -5.25 }, { x: -5.25, y: 4.75 }, { x: 1.25, y: 4.75 }, { x: -1.25, y: 4.75 },
                        ];
                        const slot = extraSlots[planned.length % extraSlots.length];
                        plots.push({ w: size, h: size, weight: crop.trips, cycle: crop.cycle, zone: unit.partner ? zone : 0, facility, crop: crop.crop });
                        planned.push(slot);
                        count(facility);
                        placedInBlocks[`${facility}|${crop.crop}`] = (placedInBlocks[`${facility}|${crop.crop}`] || 0) + 1;
                    }
                });
            });
            pieces.push({ cluster: true, buildings, plots, planned });
        });

        const isElectric = stepOrRow => {
            if (!stepOrRow) return false;
            if (stepOrRow.mode === 'electric' || stepOrRow.is_emode) return true;
            const facility = stepOrRow.facility || '';
            if (typeof facility === 'string' && facility.includes('(Electric)')) return true;
            const baseFacility = facility.replace(/\s*\((Electric|Manual|Điện|Thủ công)\)$/i, '').trim();
            const item = stepOrRow.item_name || '';
            if (typeof item === 'string') {
                if (item.includes('__electric') || item.includes('Siêu Tốc') || item.includes('Chế độ điện')) return true;
                if (baseFacility === 'Well' && (item.startsWith('quick_') || item.includes('Nước Sạch'))) return true;
                if (baseFacility === 'Simmering Pot' && (item.includes('ginseng_porridge') || item.includes('Cháo Nhân Sâm'))) {
                    const currentLevel = deps.isSimpleMode() ? deps.getHomeLevel() : (input.home_level || 14);
                    if (currentLevel >= 12) return true;
                }
                if (baseFacility === 'Carousel Mill' && (item.includes('milled_rice') || item.includes('Gạo Xay'))) {
                    const currentLevel = deps.isSimpleMode() ? deps.getHomeLevel() : (input.home_level || 14);
                    if (currentLevel >= 12) return true;
                }
            }
            if (stepOrRow.aniimo && stepOrRow.aniimo !== 'Chế độ điện' && stepOrRow.aniimo !== 'Electric') return false;
            if (stepOrRow.mode === 'manual' || stepOrRow.mode === 'prismana') return false;
            return false;
        };
        const takesTurns = step => step.status === 'producing' && !!recipeFor(step.item_name)?.turns;
        const turnGroups = new Map();
        steps.filter(takesTurns).forEach(step => turnGroups.set(step.facility, [...(turnGroups.get(step.facility) || []), step]));
        turnGroups.forEach((rows, facility) => {
            const footprint = deps.facilityFootprints[facility];
            if (!footprint) { unplaced.add(facility); return; }
            const busy = rows.reduce((sum, row) => sum + (row.busy_units ?? row.facility_count ?? 1), 0);
            const explicitCount = rows.reduce((sum, row) => sum + (row.facility_count || 1), 0);
            const baseFacility = facility.replace(/\s*\((Electric|Manual|Điện|Thủ công)\)$/i, '').trim();
            const ownedList = deps.simpleSetup(deps.getHomeLevel()).facilities[baseFacility];
            const ownedMax = Array.isArray(ownedList) ? ownedList.reduce((sum, tier) => sum + (tier.count || 0), 0) : 0;
            const rawCount = Math.max(explicitCount, Math.ceil(busy - 1e-6));
            const countUnits = ownedMax > 0 ? Math.min(ownedMax, rawCount) : rawCount;
            const jobs = rows.filter(row => row.cycle_time > 0).map(row => ({ item: row.item_name, cycle: row.cycle_time, rate: (row.busy_units ?? row.facility_count) / row.cycle_time / countUnits }));
            const weight = jobs.reduce((sum, job) => sum + job.rate * 3600, 0);
            const electric = rows.some(row => isElectric(row));
            const powerWatts = electric ? (deps.facilityPowerWatts[baseFacility] || 0) : 0;
            for (let index = 0; index < countUnits; index++) {
                pieces.push({ members: [{ x: 0, y: 0, w: footprint[0], h: footprint[1], weight, jobs, cycle: jobs[0]?.cycle, facility, crop: jobs[0]?.item ?? null, sensitive: false, isElectric: electric, powerWatts }] });
            }
            count(facility, countUnits);
        });

        const outdoorFarmlands = [];
        const outdoorWoodlands = [];
        steps.filter(step => !takesTurns(step)).forEach(step => {
            let countForStep = step.facility_count;
            if (step.environment && step.status === 'producing') {
                const key = `${step.facility}|${step.item_name}`;
                const taken = Math.min(countForStep, placedInBlocks[key] || 0);
                placedInBlocks[key] = (placedInBlocks[key] || 0) - taken;
                countForStep -= taken;
            }
            const footprint = deps.facilityFootprints[step.facility];
            if (!footprint) { if (countForStep > 0) unplaced.add(step.facility); return; }
            const baseFacility = step.facility.replace(/\s*\((Electric|Manual|Điện|Thủ công)\)$/i, '').trim();
            const electric = isElectric(step);
            const powerWatts = electric ? (deps.facilityPowerWatts[baseFacility] || 0) : 0;
            const growing = step.status === 'producing';
            if (baseFacility === 'Farmland' || baseFacility === 'Woodland') {
                const field = baseFacility === 'Farmland' ? outdoorFarmlands : outdoorWoodlands;
                for (let index = 0; index < countForStep; index++) field.push({
                    weight: tripsPerUnit(step), cycle: step.cycle_time, facility: step.facility,
                    crop: growing ? step.item_name : null, sensitive: false, isElectric: false, powerWatts: 0,
                });
                count(step.facility, countForStep);
                return;
            }
            for (let index = 0; index < countForStep; index++) {
                pieces.push({ members: [{
                    x: 0, y: 0, w: footprint[0], h: footprint[1], weight: tripsPerUnit(step), cycle: step.cycle_time,
                    facility: step.facility, crop: growing ? step.item_name : null,
                    sensitive: growing && !!recipeFor(step.item_name)?.environment, isElectric: electric, powerWatts,
                }] });
            }
            count(step.facility, countForStep);
        });

        function packFieldChunk(items, slotWidth, slotHeight, maxChunkSize = 32) {
            if (!items.length) return;
            items.sort((a, b) => (b.crop || '').localeCompare(a.crop || '') || (b.weight || 0) - (a.weight || 0));
            for (let start = 0; start < items.length; start += maxChunkSize) {
                const chunk = items.slice(start, start + maxChunkSize);
                const total = chunk.length;
                let columns = 2;
                if (total <= 2) columns = total;
                else if (total <= 4) columns = 2;
                else if (total === 5 || total === 6) columns = 3;
                else if (total === 7 || total === 8) columns = 4;
                else if (total === 9) columns = 3;
                else if (total === 10) columns = 5;
                else if (total >= 11 && total <= 16) columns = 4;
                else columns = Math.min(6, Math.ceil(Math.sqrt(total)));
                const members = chunk.map((member, index) => ({
                    ...member, x: (index % columns) * slotWidth, y: Math.floor(index / columns) * slotHeight,
                    w: slotWidth, h: slotHeight,
                }));
                pieces.push({ members, isFieldBlock: true, facility: items[0].facility });
            }
        }
        packFieldChunk(outdoorFarmlands, 2, 2, 32);
        packFieldChunk(outdoorWoodlands, 4, 4, 8);

        const hasElectricFacilities = (plan.coin_items || []).some(step => step.facility?.includes('(Electric)'))
            || (input.emode_facility_counts && Object.values(input.emode_facility_counts).some(count => count > 0))
            || pieces.some(piece => piece.members?.some(member => member.isElectric));
        const currentLevel = deps.isSimpleMode() ? deps.getHomeLevel() : (input.home_level || 14);
        if ((deps.isEmodeActive() || currentLevel >= 12) && hasElectricFacilities) {
            const generatorCount = currentLevel >= 18 ? 3 : (currentLevel >= 16 ? 2 : 1);
            const poleCount = currentLevel >= 12 ? deps.getPowerPoleCount(currentLevel) : 0;
            for (let index = 0; index < generatorCount; index++) pieces.push({ members: [{
                x: 0, y: 0, w: 2, h: 2, weight: 0, facility: 'Crackle Generator', generator: true,
                genIndex: index, sensitive: false, isElectric: false, powerWatts: 0,
            }] });
            for (let index = 0; index < poleCount; index++) pieces.push({ members: [{
                x: 0, y: 0, w: 1.5, h: 1.5, weight: 0, facility: 'Crackle Power Pole', powerPole: true,
                poleIndex: index, sensitive: false, isElectric: false, powerWatts: 0,
            }] });
        }
        return { pieces, unplaced: [...unplaced] };
    }

    return { build };
}
