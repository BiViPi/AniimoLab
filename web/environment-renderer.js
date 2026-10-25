export function createEnvironmentRenderer(deps) {
    const {
        environmentBuildingSize,
        coverageRadius: ENVIRONMENT_COVERAGE_RADIUS,
        modeColors: ENVIRONMENT_MODE_COLORS,
        modeShade: ENVIRONMENT_MODE_SHADE,
        facilityColors: ENVIRONMENT_FACILITY_COLORS,
        getLanguage,
        tipAttrs,
        getFacilityDisplayName,
        getModeDisplayName,
        prettyItem,
    } = deps;
const ENVIRONMENT_ICON_INK = 'rgba(255, 255, 255, 0.92)';

function flameIcon(cx, cy, size) {
    const s = size;
    return `<path d="M ${cx} ${cy - 0.62 * s}
                     C ${cx + 0.12 * s} ${cy - 0.3 * s} ${cx + 0.42 * s} ${cy - 0.16 * s} ${cx + 0.4 * s} ${cy + 0.12 * s}
                     C ${cx + 0.38 * s} ${cy + 0.42 * s} ${cx + 0.16 * s} ${cy + 0.6 * s} ${cx} ${cy + 0.6 * s}
                     C ${cx - 0.16 * s} ${cy + 0.6 * s} ${cx - 0.4 * s} ${cy + 0.42 * s} ${cx - 0.4 * s} ${cy + 0.1 * s}
                     C ${cx - 0.4 * s} ${cy - 0.1 * s} ${cx - 0.24 * s} ${cy - 0.18 * s} ${cx - 0.18 * s} ${cy - 0.36 * s}
                     C ${cx - 0.1 * s} ${cy - 0.22 * s} ${cx - 0.04 * s} ${cy - 0.3 * s} ${cx} ${cy - 0.62 * s} Z"
                   fill="${ENVIRONMENT_ICON_INK}" />`;
}

function snowflakeIcon(cx, cy, size) {
    const arms = [0, 60, 120].map(angle => {
        const radians = angle * Math.PI / 180;
        const [dx, dy] = [Math.cos(radians) * 0.62 * size, Math.sin(radians) * 0.62 * size];
        return `<line x1="${cx - dx}" y1="${cy - dy}" x2="${cx + dx}" y2="${cy + dy}" />`;
    }).join('');
    return `<g stroke="${ENVIRONMENT_ICON_INK}" stroke-width="${0.17 * size}" stroke-linecap="round">${arms}</g>`;
}

function sunIcon(cx, cy, size) {
    const rays = [0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
        const radians = angle * Math.PI / 180;
        const [dx, dy] = [Math.cos(radians), Math.sin(radians)];
        return `<line x1="${cx + dx * 0.42 * size}" y1="${cy + dy * 0.42 * size}"
                      x2="${cx + dx * 0.64 * size}" y2="${cy + dy * 0.64 * size}" />`;
    }).join('');
    return `<circle cx="${cx}" cy="${cy}" r="${0.28 * size}" fill="${ENVIRONMENT_ICON_INK}" />
            <g stroke="${ENVIRONMENT_ICON_INK}" stroke-width="${0.15 * size}" stroke-linecap="round">${rays}</g>`;
}

// A building's symbol, drawn to fit whatever footprint it has: a Heat Furnace and a Sunlamp sit
// on one tile, so their symbols are half the size of a Cooling Unit's.
function environmentBuildingIcon(building, mode, cx, cy) {
    const scale = environmentBuildingSize(building) / 2;
    // The stronger of a building's two modes shows its symbol twice, as the game does: the main
    // one low and left, a smaller one off its top right, both clear of the building's edge.
    const twice = draw => `${draw(cx - 0.12 * scale, cy + 0.14 * scale, 0.92 * scale)}${draw(cx + 0.38 * scale, cy - 0.32 * scale, 0.56 * scale)}`;
    if (building === 'Heat Furnace') {
        return mode === 'Scorching' ? twice(flameIcon) : flameIcon(cx, cy, scale);
    }
    if (building === 'Cooling Unit') {
        return mode === 'Freeze' ? twice(snowflakeIcon) : snowflakeIcon(cx, cy, scale);
    }
    if (building === 'Sunlamp') {
        return sunIcon(cx, cy, scale);
    }
    return '';
}

function renderEnvironmentDiagram(layout, mode, building, rows = [], unit = null, zones = null) {
    if (!layout || layout.length === 0) return '';
    const margin = 5;
    const half = ENVIRONMENT_COVERAGE_RADIUS + margin;
    const buildingSize = environmentBuildingSize(building);
    const buildingCenter = buildingSize / 2;
    // Centered on the building's own center (it sits at (0,0)-(size,size)), not world origin.
    const viewMin = buildingCenter - half;
    const viewSize = half * 2;
    const coverageMin = buildingCenter - ENVIRONMENT_COVERAGE_RADIUS;
    const coverageSize = ENVIRONMENT_COVERAGE_RADIUS * 2;
    const tint = ENVIRONMENT_MODE_COLORS[mode] || '#9aa0a8';
    // Two buildings placed to overlap: the plots shown are one of the three zones they make, in
    // a frame with this building at the origin and its partner dx tiles along and dy tiles up.
    const dx = unit && unit.partner ? unit.partner[1] : 0;
    const dy = unit && unit.partner ? unit.partner[2] : 0;
    const zone = unit && unit.partner ? unit.zone : null;
    const partnerSize = unit && unit.partner ? environmentBuildingSize(unit.partner[0]) : buildingSize;
    const partnerCenter = partnerSize / 2;
    const partnerMin = {
        x: partnerCenter - ENVIRONMENT_COVERAGE_RADIUS + dx,
        y: partnerCenter - ENVIRONMENT_COVERAGE_RADIUS + dy,
    };
    const viewWidth = Math.max(viewSize, partnerMin.x + coverageSize + margin - viewMin);
    const viewHeight = Math.max(viewSize, partnerMin.y + coverageSize + margin - viewMin);
    // Each building covers its own 9x9 square; this zone is the part of them that gives this
    // temperature: only the first's, only the second's, or where the two meet.
    const modes = unit && unit.pairModes ? unit.pairModes : null;
    const tintOf = m => ENVIRONMENT_MODE_COLORS[m] || '#9aa0a8';
    const shadeOf = (m, opacity) => (opacity * (ENVIRONMENT_MODE_SHADE[m] ?? 1)).toFixed(3);
    // Where the two coverage squares cross. It is always a rectangle; each building's own zone is
    // its square with that rectangle taken out, which is an L unless the buildings line up.
    const shared = {
        x: Math.max(coverageMin, partnerMin.x),
        y: Math.max(coverageMin, partnerMin.y),
        w: Math.min(coverageMin, partnerMin.x) + coverageSize - Math.max(coverageMin, partnerMin.x),
        h: Math.min(coverageMin, partnerMin.y) + coverageSize - Math.max(coverageMin, partnerMin.y),
    };
    const box = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
    // A zone as one path: the shared rectangle on its own, or a square with it cut out (two
    // subpaths, which the even-odd rule reads as the difference).
    const zonePath = z => {
        if (z === 1) return box(shared.x, shared.y, shared.w, shared.h);
        const own = z === 2 ? box(partnerMin.x, partnerMin.y, coverageSize, coverageSize)
            : box(coverageMin, coverageMin, coverageSize, coverageSize);
        return `${own}${box(shared.x, shared.y, shared.w, shared.h)}`;
    };

    // Gridlines like the game's: stronger on whole tiles, very faint on the quarter tiles
    // facilities snap to.
    const gridLines = [];
    for (let t = Math.ceil(viewMin * 4) / 4; t <= viewMin + Math.max(viewWidth, viewHeight); t += 0.25) {
        // Every other tile line is a major one, in step with the 2x2 buildings.
        const cls = !Number.isInteger(t) ? 'quarter' : t % 2 === 0 ? 'tile major' : 'tile';
        if (t <= viewMin + viewWidth) {
            gridLines.push(`<line class="${cls}" x1="${t}" y1="${viewMin}" x2="${t}" y2="${viewMin + viewHeight}" />`);
        }
        if (t <= viewMin + viewHeight) {
            gridLines.push(`<line class="${cls}" x1="${viewMin}" y1="${t}" x2="${viewMin + viewWidth}" y2="${t}" />`);
        }
    }

    // Plots nearest the building first, each matched to a plan row of its facility type. On a
    // shared map every zone matches its own rows to its own plots.
    const distance = p => Math.hypot(p.x + p.size / 2 - buildingCenter, p.y + p.size / 2 - buildingCenter);
    const matchCrops = (plots, plotRows) => {
        const queue = {};
        plotRows.forEach(r => {
            if (!r.item_name) return;
            (queue[r.facility] = queue[r.facility] || []).push({ item: r.item_name, left: r.facility_count });
        });
        return [...plots].sort((a, b) => distance(a) - distance(b)).map(p => {
            const q = queue[p.facility];
            while (q && q.length && q[0].left <= 0) q.shift();
            if (!q || !q.length) return { ...p, crop: null };
            q[0].left--;
            return { ...p, crop: q[0].item };
        });
    };
    const assigned = zones ? zones.flatMap(z => matchCrops(z.layout, z.rows)) : matchCrops(layout, rows);
    const crops = [...new Set(assigned.map(p => `${p.facility}|${p.crop}`))];
    const cropsPerFacility = {};
    crops.forEach(key => {
        const facility = key.split('|')[0];
        cropsPerFacility[facility] = (cropsPerFacility[facility] || 0) + 1;
    });
    const numbered = Object.values(cropsPerFacility).some(n => n > 1);
    const numberOf = key => crops.indexOf(key) + 1;

    // A small inset keeps edge-touching plots visibly separate; purely cosmetic.
    const inset = 0.08;
    const rects = assigned.map(p => {
        const color = ENVIRONMENT_FACILITY_COLORS[p.facility] || '#888888';
        const size = p.size - inset * 2;
        const initials = numbered && p.crop
            ? `<text x="${p.x + p.size / 2}" y="${p.y + p.size / 2}" font-size="${Math.min(0.9, p.size * 0.4)}">${numberOf(`${p.facility}|${p.crop}`)}</text>`
            : '';
        return `<g class="env-plot" ${tipAttrs(getFacilityDisplayName(p.facility), { detail: p.crop ? prettyItem(p.crop) : '', color })}>
            <rect x="${p.x + inset}" y="${p.y + inset}" width="${size}" height="${size}" rx="0.25" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="0.06" />${initials}</g>`;
    }).join('');

    const counts = {};
    assigned.forEach(p => {
        const key = `${p.facility}|${p.crop}`;
        counts[key] = (counts[key] || 0) + 1;
    });
    // What the colours mean: the coverage, then each crop with how many plots it gets here.
    const swatch = (color, label) => `
        <span class="env-legend-item">
            <span class="env-legend-swatch coverage" style="background:${color}33;border-color:${color}"></span>${label}
        </span>`;
    // On a shared map the heading already names both buildings and what they're set to; the
    // legend only has to say what the middle is and which crop is which.
    const isVi = getLanguage() === 'vi';
    const coverageLegend = modes
        ? (zones
            ? []
            : [
                swatch(tintOf(modes[0]), `${getFacilityDisplayName(building)}: ${getModeDisplayName(modes[0])}`),
                swatch(tintOf(modes[1]), `${getFacilityDisplayName(unit.partner[0])}: ${getModeDisplayName(modes[1])}`),
                swatch(tint, zone === 1
                    ? (isVi ? `${getModeDisplayName(mode)} nơi cả hai bao phủ` : `${mode} where both reach`)
                    : (isVi ? `${getModeDisplayName(mode)}, ô đất kế hoạch này` : `${mode}, this plan's plots`)),
            ])
        : [swatch(tint, isVi ? `Phạm vi ${getModeDisplayName(mode)}` : `${mode} coverage`)];
    const legend = coverageLegend.concat(Object.entries(counts).map(([key, n]) => {
        const [facility, crop] = key.split('|');
        const facName = getFacilityDisplayName(facility);
        // The number a plot carries in the diagram reads as part of the facility's name, as the
        // plots themselves do: "Farmland 1: Sugarcane".
        const named = `${facName}${numbered ? ` <b>${numberOf(key)}</b>` : ''}`;
        const name = crop && crop !== 'null' ? `${named}: ${prettyItem(crop)}` : named;
        return `
        <span class="env-legend-item">
            <span class="env-legend-swatch" style="background:${ENVIRONMENT_FACILITY_COLORS[facility] || '#888888'}"></span>${name} ×${n}
        </span>`;
    })).join('');

    return `
        <div class="env-diagram">
            <svg viewBox="${viewMin} ${viewMin} ${viewWidth} ${viewHeight}" role="img" aria-label="${getFacilityDisplayName(building)} layout, ${getModeDisplayName(mode)} coverage">
                <g class="env-grid">${gridLines.join('')}</g>
                <rect x="${coverageMin}" y="${coverageMin}" width="${coverageSize}" height="${coverageSize}"
                      fill="${modes ? tintOf(modes[0]) : tint}" fill-opacity="${shadeOf(modes ? modes[0] : mode, 0.12)}" />
                ${modes ? `<rect x="${partnerMin.x}" y="${partnerMin.y}" width="${coverageSize}" height="${coverageSize}"
                      fill="${tintOf(modes[1])}" fill-opacity="${shadeOf(modes[1], 0.12)}" />` : ''}
                ${rects}
                ${(zones || [{ mode, zone }]).map(z => {
        const path = z.zone === null || z.zone === undefined
            ? box(coverageMin, coverageMin, coverageSize, coverageSize)
            : zonePath(z.zone);
        const zoneTint = tintOf(z.mode);
        return `<path class="env-coverage-top" d="${path}" fill-rule="evenodd"
                      fill="${zoneTint}" fill-opacity="${shadeOf(z.mode, 0.3)}" stroke="${zoneTint}" stroke-opacity="0.9" stroke-dasharray="0.35,0.25" stroke-width="0.1" />`;
    }).join('')}
                ${modes ? `<rect x="${coverageMin}" y="${coverageMin}" width="${coverageSize}" height="${coverageSize}" fill="none"
                      stroke="${tintOf(modes[0])}" stroke-opacity="0.55" stroke-width="0.07" />
                    <rect x="${partnerMin.x}" y="${partnerMin.y}" width="${coverageSize}" height="${coverageSize}" fill="none"
                      stroke="${tintOf(modes[1])}" stroke-opacity="0.55" stroke-width="0.07" />` : ''}
                <g class="env-building" ${tipAttrs(getFacilityDisplayName(building), { detail: getModeDisplayName(modes ? modes[0] : mode), color: modes ? tintOf(modes[0]) : tint })}>
                    <rect x="0.05" y="0.05" width="${buildingSize - 0.1}" height="${buildingSize - 0.1}" rx="0.3"
                          fill="${modes ? tintOf(modes[0]) : tint}" stroke="currentColor" stroke-opacity="0.6" stroke-width="0.08" />
                    ${environmentBuildingIcon(building, modes ? modes[0] : mode, buildingCenter, buildingCenter)}
                </g>
                ${unit && unit.partner ? `<g class="env-building" ${tipAttrs(getFacilityDisplayName(unit.partner[0]), { detail: getModeDisplayName(modes ? modes[1] : mode), color: tintOf(modes ? modes[1] : mode) })}>
                    <rect x="${dx + 0.05}" y="${dy + 0.05}" width="${partnerSize - 0.1}" height="${partnerSize - 0.1}" rx="0.3"
                          fill="${modes ? tintOf(modes[1]) : tint}" stroke="currentColor" stroke-opacity="0.6" stroke-width="0.08" />
                    ${environmentBuildingIcon(unit.partner[0], modes ? modes[1] : mode, dx + partnerCenter, dy + partnerCenter)}
                </g>` : ''}
            </svg>
            <div class="env-legend">${legend}</div>
        </div>
    `;
}

    return { renderDiagram: renderEnvironmentDiagram };
}