// Places a whole homeland around a single Storage Unit, so the Aniimo hauling each finished batch
// walk as little as they can: a piece's cost is its trips (finished batches) per hour times its
// straight-line distance to the Storage Unit, center to center, and the layout keeps the total low.
//
// Environment buildings keep every plot the plan gives them covered as planned, but not in any set
// arrangement: a plot may go anywhere its footprint overlaps its building's 9x9 coverage square by
// a real area (the rule in coverage.rs), or for two buildings placed to overlap, the zone the plan
// gives it (the first's alone, both, or the second's alone). Temperatures add up where squares
// meet, so no covered plot reaches another building's square, and the squares of different
// buildings don't overlap. Pieces marked `sensitive` (crops that need an environment, grown
// without one) stay out of every square too, so none picks up a temperature it wasn't planned
// for. Anything else, including crops that need no environment, may stand anywhere. Pieces may touch but not overlap, sit on a quarter-tile grid (the smallest step in
// any footprint), and may be turned a quarter at a time.
//
// Busiest pieces for their size go down first, each where it costs least; then each is lifted
// and put back wherever is cheapest with the rest in place, until nothing moves. This is a
// heuristic: it finds a good layout, not a proven best one.

const STEP = 0.25;
const EPSILON = 1e-6;
const CELL = 4;
const RADIUS = 4.5;
// Building positions tried past the first that works, since a building's plots can go anywhere
// in its square and the nearest building isn't always the cheapest; of those, how many also try
// packing the plots afresh, which is slow and seldom beats the plan's own arrangement when a
// building covers many plots.
const CLUSTER_TRIES = 24;
const CLUSTER_PACKS = 2;
const CLUSTER_PACK_MOST = 12;

// `pieces`: each either
// - `{ members: [{ x, y, w, h, weight, sensitive }] }`, one rigid piece (a facility unit), whose
//   members are relative to its own frame; `sensitive` members stay out of every coverage square;
// - `{ cluster: true, buildings: [{ x, y, w, h }], plots: [{ w, h, weight, zone }], planned:
//   [{ x, y }] }`, environment buildings (one, or two placed to overlap) with the plots they
//   cover: `zone` is 0 for a lone building's plots, else 0, 1 or 2 for the first's zone, the
//   shared one and the second's; `planned` is each plot's place in the plan's own arrangement,
//   in the buildings' frame, used when the plots can't be packed any other way.
// Everything is in tiles, with the Storage Unit's center at the origin. `options.cells`, if
// given, are the open parts of the homeland (disjoint rectangles, in the same frame): every piece
// has to lie within them, though one may span two that meet.
// Returns `{ storage, pieces, unplaced, tried }`: each piece with its members (a cluster's
// buildings then plots) at their final places and its cost, the indices of any piece there was
// no room for, and how many spots were tried.
export function layOut(pieces, options = {}) {
    const { storage = { w: 2, h: 2 }, passes = 6, cells = null, storages: explicitStorages = null } = options;
    const storages = (explicitStorages && explicitStorages.length > 0)
        ? explicitStorages
        : [{ x: -storage.w / 2, y: -storage.h / 2, w: storage.w, h: storage.h, id: 'su_1', label: 'SU 1 (Central)', role: 'central' }];
    const storageRect = storages[0];
    let tried = 0;
    // Within the open cells: the parts of it inside each cell add up to all of it.
    const inside = r => !cells || cells.reduce((sum, c) => sum + overlapArea(r, c), 0) >= r.w * r.h - EPSILON;
    const shapes = pieces.map(piece => (piece.cluster ? clusterOrientations(piece) : orientations(piece.members)));
    const membersOf = piece => (piece.cluster ? [...piece.buildings.map(b => ({ ...b, weight: 0 })), ...piece.plots] : piece.members);
    const weightOf = piece => membersOf(piece).reduce((sum, m) => sum + m.weight, 0);
    const areaOf = piece => membersOf(piece).reduce((sum, m) => sum + m.w * m.h, 0);
    const order = pieces
        .map((piece, i) => ({ i, density: weightOf(piece) / Math.max(areaOf(piece), EPSILON) }))
        .sort((a, b) => b.density - a.density || areaOf(pieces[b.i]) - areaOf(pieces[a.i]))
        .map(p => p.i);

    // Spots to try: the open cells' extent, or with none given, well past what everything needs.
    const totalArea = pieces.reduce((sum, p) => sum + areaOf(p), 0) + storage.w * storage.h;
    const reach = Math.ceil(Math.sqrt(totalArea) * 1.6 + 16);
    const extent = cells
        ? {
            x: Math.min(...cells.map(c => c.x)), y: Math.min(...cells.map(c => c.y)),
            x2: Math.max(...cells.map(c => c.x + c.w)), y2: Math.max(...cells.map(c => c.y + c.h)),
        }
        : { x: -reach, y: -reach, x2: reach, y2: reach };
    const offsets = latticeByDistance(extent, STEP);
    // Environment buildings stand on whole tiles, which is plenty for them and far fewer to try.
    const clusterOffsets = latticeByDistance(extent, 1);

    // What's down: rectangles by piece, found through a coarse grid; coverage squares by cluster;
    // and the rectangles that must stay out of every square.
    const grid = new Map();
    const placedRects = new Map();
    const squares = new Map();
    const sensitive = new Map();
    const occupy = (key, spot) => {
        placedRects.set(key, spot.rects);
        spot.rects.forEach(r => cellsOf(r).forEach(c => {
            if (!grid.has(c)) grid.set(c, new Set());
            grid.get(c).add(key);
        }));
        if (spot.squares) squares.set(key, spot.squares);
        if (spot.sensitive?.length) sensitive.set(key, spot.sensitive);
    };
    const vacate = key => {
        (placedRects.get(key) || []).forEach(r => cellsOf(r).forEach(c => grid.get(c)?.delete(key)));
        placedRects.delete(key);
        squares.delete(key);
        sensitive.delete(key);
    };
    const free = (r, ignore, extra = []) => {
        if (!inside(r)) return false;
        for (const c of cellsOf(r)) {
            for (const other of grid.get(c) || []) {
                if (other === ignore) continue;
                if (placedRects.get(other).some(o => overlaps(r, o))) return false;
            }
        }
        return !extra.some(o => overlaps(r, o));
    };
    const inOtherSquare = (r, ignore) => {
        for (const [key, list] of squares) {
            if (key !== ignore && list.some(s => overlaps(r, s))) return true;
        }
        return false;
    };
    storages.forEach((su, idx) => {
        occupy(`storage_${idx}`, { rects: [su] });
    });
    const minDistanceToStorage = (cx, cy) => {
        let minD = Infinity;
        for (const su of storages) {
            const d = Math.hypot(cx - (su.x + su.w / 2), cy - (su.y + su.h / 2));
            if (d < minD) minD = d;
        }
        return minD;
    };

    const placeRigid = i => {
        let best = null;
        for (const shape of shapes[i]) {
            let firstFit = null;
            for (const [ox, oy, distance] of offsets) {
                if (firstFit !== null && distance > firstFit + shape.spread + STEP) break;
                const x = snap(ox - shape.cx);
                const y = snap(oy - shape.cy);
                tried++;
                const rects = shape.members.map(m => ({ x: m.x + x, y: m.y + y, w: m.w, h: m.h }));
                if (!rects.every(r => free(r, i))) continue;
                const touchy = rects.filter((r, j) => shape.members[j].sensitive);
                if (touchy.some(r => inOtherSquare(r, i))) continue;
                if (firstFit === null) firstFit = distance;
                const rawCost = shape.members.reduce((sum, m) => sum + m.weight * minDistanceToStorage(m.x + x + m.w / 2, m.y + y + m.h / 2), 0)
                    + EPSILON * minDistanceToStorage(shape.cx + x, shape.cy + y);
                
                // Fast O(1) Grid/Chessboard cross-alignment bonus: aligns along SU cross axes & integer block grids
                let alignBonus = 0;
                const su0 = storages[0];
                if (su0) {
                    const suCenterX = su0.x + su0.w / 2;
                    const suCenterY = su0.y + su0.h / 2;
                    if (Math.abs((x + shape.cx) - suCenterX) < 1.5 || Math.abs((y + shape.cy) - suCenterY) < 1.5) {
                        alignBonus += 1.2;
                    }
                }
                // Snap to 1.0 or 2.0 whole grid steps for chessboard block aesthetic
                if (Math.abs(x % 1.0) < 0.05 && Math.abs(y % 1.0) < 0.05) {
                    alignBonus += 0.6;
                }
                const cost = rawCost - Math.min(alignBonus, rawCost * 0.35);
                if (!best || cost < best.cost - EPSILON) best = { cost, x, y, shape, rects, sensitive: touchy };
            }
        }
        return best;
    };

    // A cluster's buildings at `(x, y)` in orientation `shape`, with its plots in the plan's own
    // arrangement (turned with it), the busiest crops on the plots nearest the Storage Unit; with
    // `pack`, also packed afresh nearest the Storage Unit within their zones, if that's cheaper.
    const tryCluster = (i, shape, x, y, pack, clear) => {
        tried++;
        const buildings = shape.buildings.map(b => ({ x: b.x + x, y: b.y + y, w: b.w, h: b.h }));
        const own = buildings.map(b => ({ x: b.x + b.w / 2 - RADIUS, y: b.y + b.h / 2 - RADIUS, w: 2 * RADIUS, h: 2 * RADIUS }));
        if (!clear(buildings, own)) return null;
        const allowed = (r, zone) => {
            const inside = shape.pair ? [[0], [0, 1], [1]][zone] : [0];
            const outside = shape.pair ? [[1], [], [0]][zone] : [];
            return inside.every(k => overlaps(r, own[k])) && outside.every(k => !overlaps(r, own[k])) && !inOtherSquare(r, i);
        };
        const costOf = rects => shape.plots.reduce((sum, p, j) => sum + p.weight * minDistanceToStorage(rects[j].x + p.w / 2, rects[j].y + p.h / 2), 0);
        let plots = null;
        if (shape.planned && shape.planned.length >= shape.plots.length) {
            const slots = shape.plots.map((p, j) => ({ x: shape.planned[j].x + x, y: shape.planned[j].y + y, w: p.w, h: p.h }));
            if (slots.every(r => free(r, i) && !buildings.some(b => overlaps(r, b)))) {
                plots = assignSlots(shape.plots, slots, storages);
                if (!plots.every((r, j) => allowed(r, shape.plots[j].zone))) plots = null;
            }
        }
        // Packing afresh is only tried where the plan's arrangement fits: in crowded ground it
        // mostly fails, and failing is the slow part.
        if (pack && plots) {
            const packed = packPlots(shape.plots, own, allowed, r => free(r, i), buildings, storages);
            if (packed && costOf(packed) < costOf(plots) - EPSILON) plots = packed;
        }
        if (!plots) return null;
        return { cost: costOf(plots), x, y, shape, rects: [...buildings, ...plots], squares: own, sensitive: plots };
    };

    const placeCluster = i => {
        let best = null;
        // Whether buildings standing here are clear, with their squares clear of every other
        // building's square and every crop that must stay uncovered. A lone building stands in
        // the same place in every orientation, so each place is worked out once.
        const known = new Map();
        const clear = (buildings, own) => {
            const key = buildings.map(b => `${b.x},${b.y},${b.w}`).join('|');
            if (!known.has(key)) {
                known.set(key, buildings.every(r => free(r, i))
                    && ![...squares].some(([k, list]) => k !== i && list.some(s => own.some(o => overlaps(o, s))))
                    && ![...sensitive].some(([k, list]) => k !== i && list.some(r => own.some(o => overlaps(o, r)))));
            }
            return known.get(key);
        };
        for (const shape of shapes[i]) {
            let fits = 0;
            for (const [ox, oy] of clusterOffsets) {
                if (fits >= CLUSTER_TRIES) break;
                const pack = fits < CLUSTER_PACKS && shape.plots.length <= CLUSTER_PACK_MOST;
                const spot = tryCluster(i, shape, Math.round(ox - shape.cx), Math.round(oy - shape.cy), pack, clear);
                if (!spot) continue;
                fits++;
                if (!best || spot.cost < best.cost - EPSILON) best = spot;
            }
        }
        return best;
    };

    const place = i => (pieces[i].cluster ? placeCluster(i) : placeRigid(i));
    const placed = new Map();
    const unplaced = [];
    // Nothing moves out while pieces are first put down, so once a piece of some shape finds no
    // room, no later one of that shape will: they're skipped rather than searched for again.
    const noRoom = new Set();
    const shapeOf = i => (pieces[i].cluster ? null : JSON.stringify(pieces[i].members.map(m => [m.x, m.y, m.w, m.h, !!m.sensitive])));
    for (const i of order) {
        const shape = shapeOf(i);
        const spot = shape !== null && noRoom.has(shape) ? null : place(i);
        if (!spot) {
            if (shape !== null) noRoom.add(shape);
            unplaced.push(i);
            continue;
        }
        placed.set(i, spot);
        occupy(i, spot);
    }
    // Lift each piece and put it back where it's cheapest now, until a pass moves nothing.
    for (let pass = 0; pass < passes; pass++) {
        let moved = false;
        for (const i of order) {
            if (!placed.has(i)) continue;
            vacate(i);
            const spot = place(i);
            if (spot && spot.cost < placed.get(i).cost - 1e-9) {
                placed.set(i, spot);
                moved = true;
            }
            occupy(i, placed.get(i));
        }
        if (!moved) break;
    }

    return {
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
    };
}

// Lays the homeland out within its open `cells` (in homeland tiles), trying the Storage Unit at
// the middle of the open area and at the middles of the open plots nearest it, and keeping
// whichever walks least with everything placed. Returns what `layOut` does, moved into the
// homeland's own frame, plus `storageAt`, the Storage Unit's center.
export function layOutHomeland(pieces, cells, options = {}) {
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
}

// Puts `plots` on `slots` (the plan's own arrangement, one slot per plot, each slot sized for the
// plot that had it): within each facility and zone, the busiest crop takes the slot nearest the
// Storage Unit.
function assignSlots(plots, slots, storages = []) {
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
}

// Packs `plots` (busiest first) where `allowed(rect, zone)` and `free(rect)`, each at the spot
// nearest the Storage Unit, around the cluster's squares; null if one doesn't fit.
function packPlots(plots, squares, allowed, free, buildings, storages = []) {
    const minX = Math.min(...squares.map(s => s.x));
    const minY = Math.min(...squares.map(s => s.y));
    const maxX = Math.max(...squares.map(s => s.x + s.w));
    const maxY = Math.max(...squares.map(s => s.y + s.h));
    const result = new Array(plots.length);
    const taken = [...buildings];
    const order = plots.map((p, j) => j).sort((a, b) => plots[b].weight - plots[a].weight);
    // Every spot a plot of each size could take, nearest the Storage Unit first.
    const spots = new Map();
    const spotsFor = (w, h) => {
        const key = `${w}x${h}`;
        if (!spots.has(key)) {
            const list = [];
            for (let x = snap(minX - w + STEP); x <= maxX - STEP + EPSILON; x += STEP) {
                for (let y = snap(minY - h + STEP); y <= maxY - STEP + EPSILON; y += STEP) {
                    const dist = storages.length > 0
                        ? Math.min(...storages.map(su => Math.hypot(x + w / 2 - (su.x + su.w / 2), y + h / 2 - (su.y + su.h / 2))))
                        : Math.hypot(x + w / 2, y + h / 2);
                    const isAligned = (Math.abs(x % 2) < 0.05) && (Math.abs(y % 2) < 0.05);
                    list.push({ x, y, w, h, distance: dist - (isAligned ? 0.35 : 0) });
                }
            }
            spots.set(key, list.sort((a, b) => a.distance - b.distance));
        }
        return spots.get(key);
    };
    for (const j of order) {
        const p = plots[j];
        const r = spotsFor(p.w, p.h).find(r => allowed(r, p.zone) && !taken.some(t => overlaps(r, t)) && free(r));
        if (!r) return null;
        result[j] = { x: r.x, y: r.y, w: r.w, h: r.h };
        taken.push(result[j]);
    }
    return result;
}

// A rigid piece turned 0 to 3 quarter turns, each with its members' weighted center, used to
// sweep it outward, and how far its members spread from that center.
function orientations(members) {
    const seen = new Set();
    const out = [];
    for (let turns = 0; turns < 4; turns++) {
        const turned = members.map(m => turn(m, turns));
        const minX = Math.min(...turned.map(m => m.x));
        const minY = Math.min(...turned.map(m => m.y));
        const shifted = turned.map(m => ({ ...m, x: snap(m.x - minX), y: snap(m.y - minY) }));
        const key = shifted.map(m => `${m.x},${m.y},${m.w},${m.h}`).sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const weight = shifted.reduce((sum, m) => sum + m.weight, 0);
        const areaWeight = shifted.reduce((sum, m) => sum + m.w * m.h, 0);
        const by = weight > EPSILON ? (m => m.weight / weight) : (m => (m.w * m.h) / areaWeight);
        const cx = shifted.reduce((sum, m) => sum + by(m) * (m.x + m.w / 2), 0);
        const cy = shifted.reduce((sum, m) => sum + by(m) * (m.y + m.h / 2), 0);
        const spread = Math.max(...shifted.map(m => Math.hypot(m.x + m.w / 2 - cx, m.y + m.h / 2 - cy)));
        out.push({ turns, members: shifted, cx, cy, spread });
    }
    return out;
}

// A cluster turned 0 to 3 quarter turns and mirrored or not, which turns its plan's arrangement
// with it; swept outward by its first building's center.
function clusterOrientations(cluster) {
    const pair = cluster.buildings.length > 1;
    const out = [];
    const mirror = r => ({ ...r, x: -(r.x + r.w) });
    for (let variant = 0; variant < 8; variant++) {
        const turns = variant % 4;
        const flip = variant >= 4 ? mirror : (r => r);
        const buildings = cluster.buildings.map(b => turn(flip(b), turns));
        const planned = cluster.plots.map((p, j) => turn(flip({ ...cluster.planned[j], w: p.w, h: p.h }), turns));
        const minX = Math.min(...buildings.map(b => b.x));
        const minY = Math.min(...buildings.map(b => b.y));
        const shift = r => ({ ...r, x: snap(r.x - minX), y: snap(r.y - minY) });
        const shifted = buildings.map(shift);
        out.push({
            turns,
            pair,
            buildings: shifted,
            plots: cluster.plots,
            planned: planned.map(shift),
            cx: shifted[0].x + shifted[0].w / 2,
            cy: shifted[0].y + shifted[0].h / 2,
        });
    }
    return out;
}

// A rectangle turned `turns` quarter turns about its frame's origin.
function turn(m, turns) {
    let { x, y, w, h } = m;
    for (let t = 0; t < turns; t++) {
        [x, y, w, h] = [-(y + h), x, h, w];
    }
    return { ...m, x, y, w, h };
}

// Points `step` tiles apart across `extent` (`{ x, y, x2, y2 }`), nearest the origin first:
// `[x, y, distance]`.
function latticeByDistance(extent, step) {
    const points = [];
    for (let i = Math.floor(extent.x / step); i <= Math.ceil(extent.x2 / step); i++) {
        for (let j = Math.floor(extent.y / step); j <= Math.ceil(extent.y2 / step); j++) {
            const x = i * step;
            const y = j * step;
            points.push([x, y, Math.hypot(x, y)]);
        }
    }
    return points.sort((a, b) => a[2] - b[2]);
}

function overlapArea(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
}

const snap = v => Math.round(v / STEP) * STEP;

function centerDistance(m, x, y) {
    return Math.hypot(m.x + x + m.w / 2, m.y + y + m.h / 2);
}

function overlaps(a, b) {
    return a.x < b.x + b.w - EPSILON && b.x < a.x + a.w - EPSILON && a.y < b.y + b.h - EPSILON && b.y < a.y + a.h - EPSILON;
}

function cellsOf(r) {
    const cells = [];
    for (let cx = Math.floor(r.x / CELL); cx <= Math.floor((r.x + r.w - EPSILON) / CELL); cx++) {
        for (let cy = Math.floor(r.y / CELL); cy <= Math.floor((r.y + r.h - EPSILON) / CELL); cy++) {
            cells.push(`${cx},${cy}`);
        }
    }
    return cells;
}
