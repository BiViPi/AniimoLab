with open('web/layout.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update layOut definition and options handling
old_layout_head = """export function layOut(pieces, options = {}) {
    const { storage = { w: 2, h: 2 }, passes = 6, cells = null } = options;
    const storageRect = { x: -storage.w / 2, y: -storage.h / 2, w: storage.w, h: storage.h };"""

new_layout_head = """export function layOut(pieces, options = {}) {
    const { storage = { w: 2, h: 2 }, passes = 6, cells = null, storages: explicitStorages = null } = options;
    const storages = (explicitStorages && explicitStorages.length > 0)
        ? explicitStorages
        : [{ x: -storage.w / 2, y: -storage.h / 2, w: storage.w, h: storage.h, id: 'su_1', label: 'SU 1 (Central)', role: 'central' }];
    const storageRect = storages[0];"""

assert old_layout_head in content, 'Could not find old_layout_head'
content = content.replace(old_layout_head, new_layout_head)

# 2. Update storage occupation in occupy
old_occupy_storage = "occupy('storage', { rects: [storageRect] });"
new_occupy_storage = """storages.forEach((su, idx) => {
        occupy(`storage_${idx}`, { rects: [su] });
    });
    const minDistanceToStorage = (cx, cy) => {
        let minD = Infinity;
        for (const su of storages) {
            const d = Math.hypot(cx - (su.x + su.w / 2), cy - (su.y + su.h / 2));
            if (d < minD) minD = d;
        }
        return minD;
    };"""

assert old_occupy_storage in content, 'Could not find old_occupy_storage'
content = content.replace(old_occupy_storage, new_occupy_storage)

# 3. Update cost calculation in placeRigid
old_rigid_cost = """const cost = shape.members.reduce((sum, m) => sum + m.weight * centerDistance(m, x, y), 0)
                    // Pieces nobody visits still go as close as they can, to keep the homeland tight.
                    + EPSILON * Math.hypot(shape.cx + x, shape.cy + y);"""

new_rigid_cost = """const cost = shape.members.reduce((sum, m) => sum + m.weight * minDistanceToStorage(m.x + x + m.w / 2, m.y + y + m.h / 2), 0)
                    // Pieces nobody visits still go as close as they can, to keep the homeland tight.
                    + EPSILON * minDistanceToStorage(shape.cx + x, shape.cy + y);"""

assert old_rigid_cost in content, 'Could not find old_rigid_cost'
content = content.replace(old_rigid_cost, new_rigid_cost)

# 4. Update tryCluster cost and calls to assignSlots / packPlots
old_cluster_cost = "const costOf = rects => shape.plots.reduce((sum, p, j) => sum + p.weight * Math.hypot(rects[j].x + p.w / 2, rects[j].y + p.h / 2), 0);"
new_cluster_cost = "const costOf = rects => shape.plots.reduce((sum, p, j) => sum + p.weight * minDistanceToStorage(rects[j].x + p.w / 2, rects[j].y + p.h / 2), 0);"

assert old_cluster_cost in content, 'Could not find old_cluster_cost'
content = content.replace(old_cluster_cost, new_cluster_cost)

old_assign_call = "plots = assignSlots(shape.plots, slots);"
new_assign_call = "plots = assignSlots(shape.plots, slots, storages);"
assert old_assign_call in content, 'Could not find old_assign_call'
content = content.replace(old_assign_call, new_assign_call)

old_pack_call = "const packed = packPlots(shape.plots, own, allowed, r => free(r, i), buildings);"
new_pack_call = "const packed = packPlots(shape.plots, own, allowed, r => free(r, i), buildings, storages);"
assert old_pack_call in content, 'Could not find old_pack_call'
content = content.replace(old_pack_call, new_pack_call)

# 5. Update layOut return to attach closestStorage and return storages
old_layout_return = """    return {
        storage: storageRect,
        unplaced,
        tried,
        pieces: pieces.map((piece, i) => {
            const spot = placed.get(i);
            if (!spot) return { ...piece, members: [], cost: 0 };
            const source = piece.cluster ? [...piece.buildings, ...piece.plots] : piece.members;
            return {
                ...piece,
                members: spot.rects.map((r, j) => ({ ...source[j], x: r.x, y: r.y, w: r.w, h: r.h })),
                cost: spot.cost,
            };
        }),
    };"""

new_layout_return = """    return {
        storage: storageRect,
        storages,
        unplaced,
        tried,
        pieces: pieces.map((piece, i) => {
            const spot = placed.get(i);
            if (!spot) return { ...piece, members: [], cost: 0 };
            const source = piece.cluster ? [...piece.buildings, ...piece.plots] : piece.members;
            return {
                ...piece,
                members: spot.rects.map((r, j) => {
                    const cx = r.x + r.w / 2;
                    const cy = r.y + r.h / 2;
                    let closestSU = storages[0];
                    let minD = Infinity;
                    for (const su of storages) {
                        const d = Math.hypot(cx - (su.x + su.w / 2), cy - (su.y + su.h / 2));
                        if (d < minD) { minD = d; closestSU = su; }
                    }
                    return { ...source[j], x: r.x, y: r.y, w: r.w, h: r.h, closestStorage: closestSU.id };
                }),
                cost: spot.cost,
            };
        }),
    };"""

assert old_layout_return in content, 'Could not find old_layout_return'
content = content.replace(old_layout_return, new_layout_return)

# 6. Update assignSlots implementation
old_assign_fn = """function assignSlots(plots, slots) {
    const result = new Array(plots.length);
    const groups = new Map();
    plots.forEach((p, j) => {
        const key = `${p.facility}|${p.zone}|${p.w}x${p.h}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(j);
    });
    for (const members of groups.values()) {
        const nearest = members.map(j => slots[j]).sort((a, b) => Math.hypot(a.x + a.w / 2, a.y + a.h / 2) - Math.hypot(b.x + b.w / 2, b.y + b.h / 2));
        const busiest = [...members].sort((a, b) => plots[b].weight - plots[a].weight);
        busiest.forEach((j, k) => { result[j] = nearest[k]; });
    }
    return result;
}"""

new_assign_fn = """function assignSlots(plots, slots, storages = []) {
    const result = new Array(plots.length);
    const groups = new Map();
    plots.forEach((p, j) => {
        const key = `${p.facility}|${p.zone}|${p.w}x${p.h}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(j);
    });
    const distToStorage = s => storages.length > 0
        ? Math.min(...storages.map(su => Math.hypot(s.x + s.w / 2 - (su.x + su.w / 2), s.y + s.h / 2 - (su.y + su.h / 2))))
        : Math.hypot(s.x + s.w / 2, s.y + s.h / 2);
    for (const members of groups.values()) {
        const nearest = members.map(j => slots[j]).sort((a, b) => distToStorage(a) - distToStorage(b));
        const busiest = [...members].sort((a, b) => plots[b].weight - plots[a].weight);
        busiest.forEach((j, k) => { result[j] = nearest[k]; });
    }
    return result;
}"""

assert old_assign_fn in content, 'Could not find old_assign_fn'
content = content.replace(old_assign_fn, new_assign_fn)

# 7. Update packPlots implementation
old_pack_head = "function packPlots(plots, squares, allowed, free, buildings) {"
new_pack_head = "function packPlots(plots, squares, allowed, free, buildings, storages = []) {"
assert old_pack_head in content, 'Could not find old_pack_head'
content = content.replace(old_pack_head, new_pack_head)

old_spots_dist = "list.push({ x, y, w, h, distance: Math.hypot(x + w / 2, y + h / 2) });"
new_spots_dist = """const dist = storages.length > 0
                        ? Math.min(...storages.map(su => Math.hypot(x + w / 2 - (su.x + su.w / 2), y + h / 2 - (su.y + su.h / 2))))
                        : Math.hypot(x + w / 2, y + h / 2);
                    list.push({ x, y, w, h, distance: dist });"""
assert old_spots_dist in content, 'Could not find old_spots_dist'
content = content.replace(old_spots_dist, new_spots_dist)

# 8. Update layOutHomeland implementation
old_homeland_fn = """export function layOutHomeland(pieces, cells, storage = { w: 2, h: 2 }) {
    const area = cells.reduce((sum, c) => sum + c.w * c.h, 0);
    const mid = {
        x: cells.reduce((sum, c) => sum + (c.x + c.w / 2) * c.w * c.h, 0) / area,
        y: cells.reduce((sum, c) => sum + (c.y + c.h / 2) * c.w * c.h, 0) / area,
    };
    const byMid = cells
        .map(c => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 }))
        .sort((a, b) => Math.hypot(a.x - mid.x, a.y - mid.y) - Math.hypot(b.x - mid.x, b.y - mid.y));
    const candidates = [mid, ...byMid.slice(0, 4)]
        .map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }))
        .filter((p, i, all) => all.findIndex(q => q.x === p.x && q.y === p.y) === i);
    let best = null;
    let tried = 0;
    for (const at of candidates) {
        const storageRect = { x: at.x - storage.w / 2, y: at.y - storage.h / 2, w: storage.w, h: storage.h };
        if (cells.reduce((sum, c) => sum + overlapArea(storageRect, c), 0) < storage.w * storage.h - EPSILON) continue;
        const relative = cells.map(c => ({ x: c.x - at.x, y: c.y - at.y, w: c.w, h: c.h }));
        const out = layOut(pieces, { storage, cells: relative });
        tried += out.tried;
        const cost = out.pieces.reduce((sum, p) => sum + p.cost, 0);
        const better = !best || out.unplaced.length < best.out.unplaced.length
            || (out.unplaced.length === best.out.unplaced.length && cost < best.cost - EPSILON);
        if (better) best = { out, cost, at };
    }
    const { out, at } = best;
    const move = r => ({ ...r, x: r.x + at.x, y: r.y + at.y });
    return {
        ...out,
        tried,
        storageAt: at,
        storage: move(out.storage),
        pieces: out.pieces.map(p => ({ ...p, members: p.members.map(move) })),
    };
}"""

new_homeland_fn = """export function layOutHomeland(pieces, cells, options = {}) {
    const opts = typeof options === 'object' && options !== null ? options : {};
    const suCount = Math.max(2, Math.min(5, opts.suCount || 3));
    const storageSize = opts.storage || { w: 2, h: 2 };
    const area = cells.reduce((sum, c) => sum + c.w * c.h, 0);
    const mid = {
        x: cells.reduce((sum, c) => sum + (c.x + c.w / 2) * c.w * c.h, 0) / area,
        y: cells.reduce((sum, c) => sum + (c.y + c.h / 2) * c.w * c.h, 0) / area,
    };

    // Sort cells by proximity to center
    const sortedCells = [...cells].sort((a, b) => {
        const da = Math.hypot((a.x + a.w / 2) - mid.x, (a.y + a.h / 2) - mid.y);
        const db = Math.hypot((b.x + b.w / 2) - mid.x, (b.y + b.h / 2) - mid.y);
        return da - db;
    });

    const roles = [
        { id: 'su_1', role: 'central', label: 'SU 1 (Central)', color: '#eab308' },
        { id: 'su_2', role: 'farm', label: 'SU 2 (Farm)', color: '#10b981' },
        { id: 'su_3', role: 'workshop', label: 'SU 3 (Workshop)', color: '#06b6d4' },
        { id: 'su_4', role: 'forestry', label: 'SU 4 (Forestry)', color: '#059669' },
        { id: 'su_5', role: 'expansion', label: 'SU 5 (Expansion)', color: '#8b5cf6' },
    ];

    const homelandStorages = [];
    const usedPositions = [];

    const isValidSpot = (spot) => {
        const rect = { x: spot.x, y: spot.y, w: storageSize.w, h: storageSize.h };
        if (cells.reduce((sum, c) => sum + overlapArea(rect, c), 0) < storageSize.w * storageSize.h - EPSILON) return false;
        for (const existing of usedPositions) {
            if (Math.hypot(spot.x - existing.x, spot.y - existing.y) < 6) return false;
        }
        return true;
    };

    // Place Hub 1 (Central) in sortedCells[0]
    const c0 = sortedCells[0];
    const spot0 = { x: Math.round(c0.x + c0.w / 2 - storageSize.w / 2), y: Math.round(c0.y + c0.h / 2 - storageSize.h / 2) };
    homelandStorages.push({ ...roles[0], ...spot0, w: storageSize.w, h: storageSize.h });
    usedPositions.push(spot0);

    // Place subsequent hubs across distinct open plots or corners
    for (let i = 1; i < suCount; i++) {
        const meta = roles[i] || { id: `su_${i + 1}`, role: 'aux', label: `SU ${i + 1}`, color: '#6366f1' };
        let placedSpot = null;
        if (i < sortedCells.length) {
            const c = sortedCells[i];
            const candidate = { x: Math.round(c.x + c.w / 2 - storageSize.w / 2), y: Math.round(c.y + c.h / 2 - storageSize.h / 2) };
            if (isValidSpot(candidate)) placedSpot = candidate;
        }
        if (!placedSpot) {
            for (const c of sortedCells) {
                const candidates = [
                    { x: Math.round(c.x + 3), y: Math.round(c.y + 3) },
                    { x: Math.round(c.x + c.w - storageSize.w - 3), y: Math.round(c.y + c.h - storageSize.h - 3) },
                    { x: Math.round(c.x + 3), y: Math.round(c.y + c.h - storageSize.h - 3) },
                    { x: Math.round(c.x + c.w - storageSize.w - 3), y: Math.round(c.y + 3) },
                ];
                for (const candidate of candidates) {
                    if (isValidSpot(candidate)) {
                        placedSpot = candidate;
                        break;
                    }
                }
                if (placedSpot) break;
            }
        }
        if (placedSpot) {
            homelandStorages.push({ ...meta, ...placedSpot, w: storageSize.w, h: storageSize.h });
            usedPositions.push(placedSpot);
        }
    }

    const anchor = homelandStorages[0];
    const relativeStorages = homelandStorages.map(su => ({ ...su, x: su.x - anchor.x, y: su.y - anchor.y }));
    const relativeCells = cells.map(c => ({ x: c.x - anchor.x, y: c.y - anchor.y, w: c.w, h: c.h }));

    const out = layOut(pieces, { storages: relativeStorages, cells: relativeCells });
    const move = r => ({ ...r, x: r.x + anchor.x, y: r.y + anchor.y });
    const movedStorages = out.storages.map(move);

    return {
        ...out,
        tried: out.tried,
        storageAt: { x: anchor.x + storageSize.w / 2, y: anchor.y + storageSize.h / 2 },
        storage: movedStorages[0],
        storages: movedStorages,
        pieces: out.pieces.map(p => ({ ...p, members: p.members.map(move) })),
    };
}"""

assert old_homeland_fn in content, 'Could not find old_homeland_fn'
content = content.replace(old_homeland_fn, new_homeland_fn)

with open('web/layout.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated web/layout.js successfully!')
