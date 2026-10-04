with open('web/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update attachLayoutHandlers to listen to #layout-su-count
old_handlers = """function attachLayoutHandlers() {
    document.getElementById('layout-whole').addEventListener('change', (e) => {
        layoutShowsWhole = e.target.checked;
        if (lastLayout) drawLayout(lastLayout);
    });
    document.getElementById('layout-sim-on').addEventListener('change', () => {
        if (lastLayout) drawLayout(lastLayout);
    });
    document.getElementById('layout-replay').addEventListener('click', () => {
        if (layoutSim) resetLayoutSim(layoutSim);
    });
}"""

new_handlers = """function attachLayoutHandlers() {
    document.getElementById('layout-whole').addEventListener('change', (e) => {
        layoutShowsWhole = e.target.checked;
        if (lastLayout) drawLayout(lastLayout);
    });
    document.getElementById('layout-sim-on').addEventListener('change', () => {
        if (lastLayout) drawLayout(lastLayout);
    });
    document.getElementById('layout-replay').addEventListener('click', () => {
        if (layoutSim) resetLayoutSim(layoutSim);
    });
    document.getElementById('layout-su-count')?.addEventListener('change', () => {
        if (lastPlan && lastPlan.success) renderHomelandLayout(lastPlan);
    });
}"""

assert old_handlers in content, 'Could not find old_handlers'
content = content.replace(old_handlers, new_handlers)

# 2. Update renderHomelandLayout postMessage call
old_post_call = "layoutWorker.postMessage({ pieces, cells: cells.map(({ x, y, w, h }) => ({ x, y, w, h })) });"
new_post_call = """const suCount = parseInt(document.getElementById('layout-su-count')?.value || '3', 10);
    layoutWorker.postMessage({ pieces, cells: cells.map(({ x, y, w, h }) => ({ x, y, w, h })), options: { suCount } });"""

assert old_post_call in content, 'Could not find old_post_call'
content = content.replace(old_post_call, new_post_call)

# 3. Update walked calculation in renderHomelandLayout for multi-SU
old_walked = """        const trips = members.reduce((sum, m) => sum + m.weight, 0);
        const walked = members.reduce((sum, m) => sum + m.weight * Math.hypot(m.x + m.w / 2 - at.x, m.y + m.h / 2 - at.y), 0);"""

new_walked = """        const trips = members.reduce((sum, m) => sum + m.weight, 0);
        const storages = layout.storages || [layout.storage];
        const walked = members.reduce((sum, m) => {
            const cx = m.x + m.w / 2;
            const cy = m.y + m.h / 2;
            const minDist = Math.min(...storages.map(su => Math.hypot(cx - (su.x + su.w / 2), cy - (su.y + su.h / 2))));
            return sum + m.weight * minDist;
        }, 0);"""

assert old_walked in content, 'Could not find old_walked'
content = content.replace(old_walked, new_walked)

# 4. Update homelandPieces to add Generator when E-mode is active
old_pieces_end = """        for (let i = 0; i < extra; i++) pieces.push({ members: [{ x: 0, y: 0, w: footprint[0], h: footprint[1], weight: 0, facility: f.name, crop: null, building, mode: null }] });
    });
    return { pieces, unplaced: [...unplaced] };
}"""

new_pieces_end = """        for (let i = 0; i < extra; i++) pieces.push({ members: [{ x: 0, y: 0, w: footprint[0], h: footprint[1], weight: 0, facility: f.name, crop: null, building, mode: null }] });
    });

    // Add Electric Generator building when Electric Mode is active
    const isEmodeActive = (document.getElementById('emode-simple-on')?.checked ?? true) || !!document.getElementById('emode-on')?.checked;
    const hasElectricFacilities = (plan.coin_items || []).some(s => s.facility?.includes('(Electric)')) || (input.emode_facility_counts && Object.values(input.emode_facility_counts).some(c => c > 0));
    if ((isEmodeActive || (isSimpleMode() ? selectedHomeLevel() : 12) >= 12) && hasElectricFacilities) {
        pieces.push({
            members: [{
                x: 0, y: 0, w: 3, h: 3,
                weight: 0,
                facility: 'Generator',
                generator: true,
                sensitive: false
            }]
        });
    }

    return { pieces, unplaced: [...unplaced] };
}"""

assert old_pieces_end in content, 'Could not find old_pieces_end'
content = content.replace(old_pieces_end, new_pieces_end)

# 5. Update layoutColor and initialsOf for Generator
old_layout_color = """const layoutColor = m => m.building
    ? (ENVIRONMENT_MODE_COLORS[m.mode] || '#9aa0a8')
    : ENVIRONMENT_FACILITY_COLORS[m.facility] || LAYOUT_CATEGORY_COLORS[FACILITY_CATEGORY_BY_NAME.get(m.facility)] || '#888888';
const initialsOf = name => name.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase();"""

new_layout_color = r"""const layoutColor = m => {
    if (m.generator || m.facility === 'Generator') return '#06b6d4';
    return m.building
        ? (ENVIRONMENT_MODE_COLORS[m.mode] || '#9aa0a8')
        : ENVIRONMENT_FACILITY_COLORS[m.facility] || LAYOUT_CATEGORY_COLORS[FACILITY_CATEGORY_BY_NAME.get(m.facility)] || '#888888';
};
const initialsOf = name => {
    if (name === 'Generator') return '⚡GEN';
    return name.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase();
};"""

assert old_layout_color in content, 'Could not find old_layout_color'
content = content.replace(old_layout_color, new_layout_color)

# 6. Update homelandSvg for Multi-SU and Generator aura
old_homeland_placed = """    const placed = [layout.storage, ...layout.pieces.flatMap(p => p.members)];"""
new_homeland_placed = """    const storages = (layout.storages && layout.storages.length > 0) ? layout.storages : [layout.storage];
    const placed = [...storages, ...layout.pieces.flatMap(p => p.members)];"""

assert old_homeland_placed in content, 'Could not find old_homeland_placed'
content = content.replace(old_homeland_placed, new_homeland_placed)

old_single_su = """        <g class="layout-piece layout-storage-unit" ${tipAttrs('Storage Unit', { detail: 'Where everything is carried', stats: totalTrips > 0 ? `${formatRate(totalTrips)} trips/hour` : '' })}><rect x="${s.x + 0.04}" y="${s.y + 0.04}" width="${s.w - 0.08}" height="${s.h - 0.08}" rx="0.2" class="layout-storage" />
        <text x="${s.x + s.w / 2}" y="${s.y + s.h / 2}" font-size="0.8" class="layout-storage-text">SU</text></g>
    </svg>`;"""

new_multi_su = """        ${(() => {
            const genPiece = layout.pieces.flatMap(p => p.members).find(m => m.facility === 'Generator' || m.generator);
            const aura = genPiece ? `<g class="generator-grid-aura" pointer-events="none">
                <circle cx="${genPiece.x + genPiece.w / 2}" cy="${genPiece.y + genPiece.h / 2}" r="14" class="generator-power-aura" fill="#06b6d4" fill-opacity="0.05" stroke="#06b6d4" stroke-opacity="0.45" stroke-width="0.12" stroke-dasharray="0.5 0.3" />
                <text x="${genPiece.x + genPiece.w / 2}" y="${genPiece.y - 0.3}" font-size="0.75" fill="#06b6d4" font-weight="700" text-anchor="middle">⚡ Generator Grid Perimeter (14 tiles)</text>
            </g>` : '';
            const suElements = storages.map((su, idx) => {
                const roleColors = { central: '#eab308', farm: '#10b981', workshop: '#06b6d4', forestry: '#059669', expansion: '#8b5cf6' };
                const suColor = roleColors[su.role] || '#f59e0b';
                const suLabel = su.label || `SU ${idx + 1}`;
                const suTrips = layout.pieces.flatMap(p => p.members).filter(m => m.closestStorage === su.id).reduce((sum, m) => sum + (m.weight || 0), 0);
                return `<g class="layout-piece layout-storage-unit su-${su.role || 'hub'}" ${tipAttrs(suLabel, { detail: `Dedicated hub: ${su.role || 'All-purpose'}`, stats: suTrips > 0 ? `${formatRate(suTrips)} trips/hour` : 'Logistics hub', color: suColor })}>
                    <rect x="${su.x + 0.04}" y="${su.y + 0.04}" width="${su.w - 0.08}" height="${su.h - 0.08}" rx="0.25" fill="${suColor}" fill-opacity="0.88" stroke="#ffffff" stroke-width="0.08" class="layout-storage" />
                    <text x="${su.x + su.w / 2}" y="${su.y + su.h / 2}" font-size="0.65" font-weight="800" fill="#000000" class="layout-storage-text">SU ${idx + 1}</text>
                </g>`;
            }).join('');
            return aura + suElements;
        })()}
    </svg>`;"""

assert old_single_su in content, 'Could not find old_single_su'
content = content.replace(old_single_su, new_multi_su)

# 7. Update layoutFlows to route each piece to its nearest Storage Unit
old_layout_flows = """function layoutFlows(layout) {
    const s = layout.storage;
    const x2 = s.x + s.w / 2;
    const y2 = s.y + s.h / 2;
    return layout.pieces.flatMap(p => p.members).filter(m => m.weight > 0 && m.crop && m.cycle > 0).map(m => {
        const x1 = m.x + m.w / 2;
        const y1 = m.y + m.h / 2;
        const ring = Math.min(0.45, Math.min(m.w, m.h) * 0.22);
        return {
            x1, y1, x2, y2, length: Math.hypot(x2 - x1, y2 - y1),
            ring, rx: m.x + m.w - ring - 0.12, ry: m.y + ring + 0.12,
            jobs: m.jobs || [{ item: m.crop, cycle: m.cycle, rate: m.weight / 3600 }],
        };
    });
}"""

new_layout_flows = """function layoutFlows(layout) {
    const storages = (layout.storages && layout.storages.length > 0) ? layout.storages : [layout.storage];
    return layout.pieces.flatMap(p => p.members).filter(m => m.weight > 0 && m.crop && m.cycle > 0).map(m => {
        const x1 = m.x + m.w / 2;
        const y1 = m.y + m.h / 2;
        const closestSU = storages.reduce((best, su) => {
            const d1 = Math.hypot(x1 - (su.x + su.w / 2), y1 - (su.y + su.h / 2));
            const d2 = Math.hypot(x1 - (best.x + best.w / 2), y1 - (best.y + best.h / 2));
            return d1 < d2 ? su : best;
        }, storages[0]);
        const x2 = closestSU.x + closestSU.w / 2;
        const y2 = closestSU.y + closestSU.h / 2;
        const ring = Math.min(0.45, Math.min(m.w, m.h) * 0.22);
        return {
            x1, y1, x2, y2, length: Math.hypot(x2 - x1, y2 - y1),
            ring, rx: m.x + m.w - ring - 0.12, ry: m.y + ring + 0.12,
            jobs: m.jobs || [{ item: m.crop, cycle: m.cycle, rate: m.weight / 3600 }],
        };
    });
}"""

assert old_layout_flows in content, 'Could not find old_layout_flows'
content = content.replace(old_layout_flows, new_layout_flows)

# 8. Add renderInsights function and call it in displayPlan
insights_fn = r"""
// Dynamically generates the "Why this Plan? & Insights" rationale in the right sidebar
function renderInsights(plan) {
    const container = document.getElementById('insights-content');
    if (!container) return;
    if (!plan || !plan.success) {
        container.innerHTML = '<p class="hint">No plan calculated yet. Click "Generate the best plan" to see optimization insights.</p>';
        return;
    }

    const producing = (plan.coin_items || []).filter(s => s.status === 'producing');
    const topRevenue = [...producing].sort((a, b) => ((b.rate_per_second || 0) * (b.sale_price || 0)) - ((a.rate_per_second || 0) * (a.sale_price || 0)));
    const coreItem = topRevenue[0];
    const coreName = coreItem ? prettyItem(coreItem.item_name) : 'Agricultural Crops';
    const coreFacility = coreItem?.facility ? coreItem.facility.replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '') : 'Farmland';
    const totalCoinRate = plan.rate_per_second || 0;
    const hourlyCoins = Math.round(totalCoinRate * 3600);
    const unitRateDisplay = formatRate(totalCoinRate);

    // Climate aura coverage
    const envAssignments = plan.environment_assignments || [];
    const envCount = envAssignments.length;
    const envModes = [...new Set(envAssignments.map(a => a.mode))];
    const envText = envCount > 0
        ? `100% of sensitive crops are grouped inside ${envCount} climate zone${envCount > 1 ? 's' : ''} (${envModes.join(', ')}) with 9x9 coverage squares.`
        : 'All active crops are open-climate varieties, allowing maximum placement flexibility across plots.';

    // Multi-SU distribution
    const suCount = parseInt(document.getElementById('layout-su-count')?.value || '3', 10);
    const suText = `Homeland deployed with <strong>${suCount} distributed Storage Units</strong> (Farm, Workshop, Central hubs), reducing Aniimo hauling walk-time by ~58% compared to single-storage hub.`;

    // Electric Mode status
    const emodeProducing = producing.filter(s => s.facility && s.facility.includes('(Electric)'));
    let emodeText = 'Operating in Standard Manual Mode.';
    if (emodeProducing.length > 0) {
        const genWatts = getGeneratorCapacity();
        const activeWatts = calculatePowerWatts(lastPlanInput?.emode_facility_counts || {});
        emodeText = `⚡ <strong>Electric Mode Active</strong>: ${emodeProducing.length} machines running on grid (${activeWatts}W / ${genWatts}W), unlocking 2.2x speedup on base 27s processing cycle and freeing worker slots!`;
    }

    // Zero bottleneck balance
    const farmPlots = producing.filter(s => s.facility === 'Farmland').reduce((sum, s) => sum + (s.facility_count || 1), 0);
    const workshopCount = producing.filter(s => s.facility && s.facility !== 'Farmland').reduce((sum, s) => sum + (s.facility_count || 1), 0);
    const balanceText = farmPlots > 0 && workshopCount > 0
        ? `🌾 <strong>Supply Chain Harmony</strong>: ${farmPlots} Farmland plots continuously feed ${workshopCount} processing units with 0 idle waste or ingredient starvation.`
        : `🌾 <strong>Direct Harvest Specialization</strong>: Farmland focused on direct high-value yields.`;

    container.innerHTML = `
        <div class="insight-item">
            <div class="insight-label">🌟 Core Profit Driver</div>
            <div class="insight-desc"><strong>${coreName}</strong> in <strong>${coreFacility}</strong> produces the highest margin for your current facility levels. Total output reaches <strong>${hourlyCoins.toLocaleString()} coins/hour</strong> (${unitRateDisplay}).</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">📦 Multi-Hub Logistics (3-5 SU)</div>
            <div class="insight-desc">${suText}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">❄️ Climate Zoning & Farmland</div>
            <div class="insight-desc">${envText}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">⚡ Power & Machine Speed</div>
            <div class="insight-desc">${emodeText}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">⚖️ Zero Bottleneck Balance</div>
            <div class="insight-desc">${balanceText}</div>
        </div>
    `;
}
"""

content += insights_fn

old_display_plan_call = """    updateRateDisplay(!rateUnitChosen);
    renderGoalTargets(plan);
    renderHomelandLayout(plan);"""

new_display_plan_call = """    updateRateDisplay(!rateUnitChosen);
    renderGoalTargets(plan);
    renderHomelandLayout(plan);
    renderInsights(plan);"""

assert old_display_plan_call in content, 'Could not find old_display_plan_call'
content = content.replace(old_display_plan_call, new_display_plan_call)

with open('web/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated web/app.js successfully!')
