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

import { getFacilityDistrict } from './facility-config.js';

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

// District sorting priority
const DISTRICT_PRIORITY = {
    'agriculture': 1,
    'gathering': 2,
    'industry': 3,
    'kitchen': 4,
    'leisure': 5,
    'utility': 6,
};

export const districtOf = piece => {
    if (piece.cluster) return 'agriculture';
    if (piece.isFieldBlock) return 'agriculture';
    // Any facility using electricity MUST belong to industry district to gather near the Generator!
    if (piece.members?.some(m => m.isElectric)) return 'industry';
    const fac = piece.members?.[0]?.facility;
    return getFacilityDistrict(fac);
};

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

    // Hard-to-place first: Clusters -> Generator -> Electric Facilities -> Field Blocks -> Large footprints
    const piecePriority = piece => {
        if (piece.cluster) return 10000;
        const members = membersOf(piece);
        if (members.some(m => m.generator)) return 9500;
        if (members.some(m => m.isElectric)) return 9000;
        if (piece.isFieldBlock) return 8000;
        const a = areaOf(piece);
        if (a >= 16) return 5000 + a;
        if (a >= 6) return 2000 + a;
        return a;
    };

    const order = pieces
        .map((piece, i) => ({
            i,
            prio: piecePriority(piece),
            distOrder: DISTRICT_PRIORITY[districtOf(piece)] || 99,
            weight: weightOf(piece),
        }))
        .sort((a, b) => b.prio - a.prio || a.distOrder - b.distOrder || b.weight - a.weight)
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
    // District Anchors: each functional district searches outwards from its dedicated Storage Unit
    const getDistrictAnchor = dId => {
        if (dId === 'agriculture' || dId === 'kitchen') {
            const farmSU = storages.find(s => s.role === 'farm');
            if (farmSU) return { x: farmSU.x + farmSU.w / 2, y: farmSU.y + farmSU.h / 2 };
        } else if (dId === 'industry') {
            const wsSU = storages.find(s => s.role === 'workshop');
            if (wsSU) return { x: wsSU.x + wsSU.w / 2, y: wsSU.y + wsSU.h / 2 };
        } else if (dId === 'gathering') {
            const fSU = storages.find(s => s.role === 'forestry');
            if (fSU) return { x: fSU.x + fSU.w / 2, y: fSU.y + fSU.h / 2 };
        } else if (dId === 'utility') {
            // Crackle Generator & Power Poles must anchor near workshop SU (where electric processing takes place)
            const wsSU = storages.find(s => s.role === 'workshop');
            if (wsSU) return { x: wsSU.x + wsSU.w / 2, y: wsSU.y + wsSU.h / 2 };
        }
        return { x: storages[0].x + storages[0].w / 2, y: storages[0].y + storages[0].h / 2 };
    };

    const districtOffsets = new Map();
    const getOffsetsForDistrict = dId => {
        if (!districtOffsets.has(dId)) {
            const anchor = getDistrictAnchor(dId);
            districtOffsets.set(dId, latticeByDistance(extent, STEP, anchor.x, anchor.y));
        }
        return districtOffsets.get(dId);
    };

    // Environment buildings (farming) stand on whole tiles around the agriculture anchor
    const agAnchor = getDistrictAnchor('agriculture');
    const clusterOffsets = latticeByDistance(extent, 1, agAnchor.x, agAnchor.y);

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
        const pDist = districtOf(pieces[i]);

        // Find existing placed centroids for the same district to cluster them together
        const sameDistrictCentroids = [];
        for (const [k, spot] of placed) {
            if (districtOf(pieces[k]) === pDist) {
                for (const r of spot.rects) {
                    sameDistrictCentroids.push({ cx: r.x + r.w / 2, cy: r.y + r.h / 2 });
                }
            }
        }

        const offsets = getOffsetsForDistrict(pDist);
        for (const shape of shapes[i]) {
            let firstFit = null;
            for (const [ox, oy, distance] of offsets) {
                if (firstFit !== null && distance > firstFit + shape.spread + STEP * 3) break;
                const x = snap(ox - shape.cx);
                const y = snap(oy - shape.cy);
                tried++;
                const rects = shape.members.map(m => ({ x: m.x + x, y: m.y + y, w: m.w, h: m.h }));
                if (!rects.every(r => free(r, i))) continue;
                const touchy = rects.filter((r, j) => shape.members[j].sensitive);
                if (touchy.some(r => inOtherSquare(r, i))) continue;
                if (firstFit === null) firstFit = distance;

                const cx = shape.cx + x;
                const cy = shape.cy + y;

                // 1. Grid alignment bonus (whole integer tiles or half tiles)
                let alignBonus = 0;
                const xFrac = Math.abs(x % 1.0);
                const yFrac = Math.abs(y % 1.0);
                const expectXHalf = (shape.spread % 1.0 !== 0);
                const xAligned = expectXHalf ? Math.abs(xFrac - 0.5) < 0.05 : (xFrac < 0.05 || Math.abs(xFrac - 1.0) < 0.05);
                const yAligned = (yFrac < 0.05 || Math.abs(yFrac - 1.0) < 0.05);
                if (xAligned && yAligned) alignBonus += 4.0;
                else if (xAligned || yAligned) alignBonus += 1.8;

                // 2. District cohesion bonus: rewards placing near same district facilities
                let districtCohesion = 0;
                if (sameDistrictCentroids.length > 0) {
                    let minD = Infinity;
                    for (const dc of sameDistrictCentroids) {
                        const d = Math.hypot(cx - dc.cx, cy - dc.cy);
                        if (d < minD) minD = d;
                    }
                    if (minD <= 3.5) districtCohesion += 6.5;
                    else if (minD <= 7.0) districtCohesion += 4.0;
                    else if (minD <= 12.0) districtCohesion += 2.0;
                    else districtCohesion -= minD * 0.25;
                }

                // 3. Power Network Proximity & Coverage Bonus
                let powerBonus = 0;
                const hasElectric = shape.members.some(m => m.isElectric);
                const isGenerator = shape.members.some(m => m.generator);
                const isPole = shape.members.some(m => m.powerPole);

                // Locate already placed generator if any
                let genPos = null;
                for (const [k, spot] of placed) {
                    if (pieces[k].members?.some(m => m.generator)) {
                        const r = spot.rects[0];
                        genPos = { cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
                        break;
                    }
                }

                if (isGenerator) {
                    // Generator thrives near workshop SU and near any already placed electric pieces
                    const wsSU = storages.find(s => s.role === 'workshop') || storages[0];
                    const distToWs = Math.hypot(cx - (wsSU.x + wsSU.w / 2), cy - (wsSU.y + wsSU.h / 2));
                    powerBonus += Math.max(0, 30 - distToWs * 3);
                    for (const [k, spot] of placed) {
                        if (pieces[k].members?.some(m => m.isElectric)) {
                            for (const r of spot.rects) {
                                const mx = r.x + r.w / 2;
                                const my = r.y + r.h / 2;
                                if (Math.abs(cx - mx) <= 5.0 && Math.abs(cy - my) <= 5.0) {
                                    powerBonus += 40.0;
                                }
                            }
                        }
                    }
                } else if (hasElectric && genPos) {
                    // Electric facility gets massive bonus if within 11x11 square grid of Crackle Generator
                    const dx = Math.abs(cx - genPos.cx);
                    const dy = Math.abs(cy - genPos.cy);
                    if (dx <= 4.8 && dy <= 4.8) {
                        powerBonus += 150.0 - (dx + dy) * 4.0;
                    } else {
                        powerBonus -= 300.0 + (dx + dy) * 15.0;
                    }
                } else if (!hasElectric && !isGenerator && !isPole && shape.spread >= 2.0 && genPos) {
                    // Non-electric bulky structures (Mine, Beds) shouldn't crowd inside 11x11 Generator range
                    const dx = Math.abs(cx - genPos.cx);
                    const dy = Math.abs(cy - genPos.cy);
                    if (dx <= 5.5 && dy <= 5.5) powerBonus -= 35.0;
                }

                // 4. Hauling distance to nearest SU
                const haulingCost = shape.members.reduce((sum, m) => sum + m.weight * minDistanceToStorage(m.x + x + m.w / 2, m.y + y + m.h / 2), 0)
                    + EPSILON * minDistanceToStorage(cx, cy);

                // Combined cost: hauling cost minus district cohesion & grid alignment bonuses & power bonus
                const cost = haulingCost - (districtCohesion * 1.5 + alignBonus + powerBonus);
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
            const pDist = districtOf(piece);
            if (!spot) return { ...piece, district: pDist, members: [], cost: 0 };
            const source = piece.cluster ? [...piece.buildings, ...piece.plots] : piece.members;
            return {
                ...piece,
                district: pDist,
                members: spot.rects.map((r, j) => {
                    const cx = r.x + r.w / 2;
                    const cy = r.y + r.h / 2;
                    let closestSU = storages[0];
                    let minD = Infinity;
                    for (const su of storages) {
                        const d = Math.hypot(cx - (su.x + su.w / 2), cy - (su.y + su.h / 2));
                        if (d < minD) { minD = d; closestSU = su; }
                    }
                    return { ...source[j], x: r.x, y: r.y, w: r.w, h: r.h, district: pDist, closestStorage: closestSU.id };
                }),
                cost: spot.cost,
            };
        }),
    };
}

// Lays the homeland out within its open `cells` (in homeland tiles), trying the Storage Unit at
// the middle of the open area and at the middles of the open plots nearest it, and keeping
// Lays the homeland out using a structured linear power corridor and rectangular compound blocks,
// matching in-game reality: 2 Generators connected directly with 4 Power Poles along an unbroken
// transmission corridor, electric workshops and wells aligned in straight rows along the corridor,
// heavy industry (Kilns & Benches) grouped in Plot 7, Mines grouped in a 3x3 block powered by Pole 4,
// and farmlands arranged in neat rectangular fields.
export function layOutHomeland(pieces, cells, options = {}) {
    const opts = typeof options === 'object' && options !== null ? options : {};
    const suCount = Math.max(2, Math.min(5, opts.suCount || 3));
    const storageSize = opts.storage || { w: 2, h: 2 };

    const inside = r => !cells || !Array.isArray(cells) || cells.reduce((sum, c) => sum + overlapArea(r, c), 0) >= r.w * r.h - EPSILON;

    // Track placed items for collision avoidance
    const placedMembers = [];
    const isOccupied = (rect, ignore = null) => {
        return placedMembers.some(o => o !== ignore && overlaps(rect, o));
    };

    // Extract pieces by group
    const clusterPieces = [];
    const fieldPieces = [];
    const generators = [];
    const poles = [];
    const wells = [];
    const kilns = [];
    const benches = [];
    const electricMines = [];
    const nonElectricMines = [];
    const electricSmallWorkshops = [];
    const nonElectricSmallWorkshops = [];
    const electricLargeWorkshops = [];
    const nonElectricLargeWorkshops = [];
    const others = [];

    pieces.forEach(p => {
        if (p.cluster) {
            clusterPieces.push(p);
            return;
        }
        if (p.isFieldBlock) {
            fieldPieces.push(p);
            return;
        }
        const m = p.members?.[0];
        if (!m) return;
        if (m.generator) generators.push(p);
        else if (m.powerPole) poles.push(p);
        else if (m.facility === 'Well') wells.push(p);
        else if (m.facility === 'Chimney Kiln') kilns.push(p);
        else if (m.facility === 'Woodworking Bench') benches.push(p);
        else if (m.facility === 'Mine') {
            if (m.isElectric) electricMines.push(p);
            else nonElectricMines.push(p);
        } else if (['Blazing Stove', 'Simmering Pot', 'Claw Game Cooker', 'Pickling Jar'].includes(m.facility)) {
            if (m.isElectric) electricSmallWorkshops.push(p);
            else nonElectricSmallWorkshops.push(p);
        } else if (['Carousel Mill', 'Crafting Table', 'Joy Wheel Loom', 'Bouncy Brew Keg', 'Jukebox Dryer', 'Nimbus Bed'].includes(m.facility)) {
            if (m.isElectric) electricLargeWorkshops.push(p);
            else nonElectricLargeWorkshops.push(p);
        } else {
            others.push(p);
        }
    });

    // 1. Storage Units setup
    const homelandStorages = [
        { id: 'su_1', role: 'central', label: 'SU 1 (Central)', color: '#eab308', x: 44.0, y: 35.0, w: storageSize.w, h: storageSize.h },
        { id: 'su_2', role: 'farm', label: 'SU 2 (Farm)', color: '#10b981', x: 59.0, y: 20.0, w: storageSize.w, h: storageSize.h },
        { id: 'su_3', role: 'workshop', label: 'SU 3 (Workshop)', color: '#06b6d4', x: 27.0, y: 27.0, w: storageSize.w, h: storageSize.h },
    ];
    if (suCount >= 4) {
        homelandStorages.push({ id: 'su_4', role: 'forestry', label: 'SU 4 (Forestry)', color: '#059669', x: 69.0, y: 7.5, w: storageSize.w, h: storageSize.h });
    }
    if (suCount >= 5) {
        homelandStorages.push({ id: 'su_5', role: 'expansion', label: 'SU 5 (Expansion)', color: '#8b5cf6', x: 44.0, y: 52.0, w: storageSize.w, h: storageSize.h });
    }
    homelandStorages.forEach(su => placedMembers.push(su));

    // 2. Power Corridor (Plot 4 -> Plot 3)
    // 2 Crackle Generators (2x2, 11x11 square grid):
    // Spaced ~9.5 tiles apart so their 11x11 auras overlap by 1.5 tiles (>= 0.25 tile in-game rule),
    // combining into a single 2000W network spanning x in [16.5, 38.0]
    generators.forEach((p, idx) => {
        const m = p.members[0];
        m.x = 22.0 + idx * 9.5;
        m.y = 35.0;
        placedMembers.push(m);
    });
    // 4 Power Poles (1.5x1.5, 7x7 square grid):
    // Chained along the corridor from Gen 2 eastward into Plot 3 & 6, spanning to x = 61.75
    poles.forEach((p, idx) => {
        const m = p.members[0];
        m.x = 39.5 + idx * 6.0;
        m.y = 35.25;
        placedMembers.push(m);
    });

    // 3. Electric Wells Row: North of Trụ điện #1 & #2 (y = 32.0), strictly inside 11x11 generator auras
    let wellX = 22.0;
    wells.forEach(p => {
        const m = p.members[0];
        m.x = wellX;
        m.y = 32.0;
        wellX += m.w + 1.0;
        placedMembers.push(m);
    });

    // 4. Electric Small Workshops (Blazing Stove, Claw Game Cookers, Simmering Pots):
    // Placed along y = 32.0 in Plot 4 and Plot 3, directly inside Gen 2 and Pole 1/2 auras
    let eNorthX = Math.max(wellX, 31.0);
    electricSmallWorkshops.forEach(p => {
        const m = p.members[0];
        m.x = eNorthX;
        m.y = 32.0;
        eNorthX += m.w + 0.8;
        placedMembers.push(m);
    });

    // 5. Electric Large Workshops (Carousel Mill, etc. if electric):
    // Placed south of power line at y = 38.5 inside generator/pole auras
    let eSouthX = 22.0;
    electricLargeWorkshops.forEach(p => {
        const m = p.members[0];
        m.x = eSouthX;
        m.y = 38.5;
        eSouthX += m.w + 0.8;
        placedMembers.push(m);
    });

    // 6. Electric Mines Block (6 Mines, 5x5 each):
    // Row 1 at y = 29.5 (y in [29.5, 34.5])
    // Corridor with Poles at y = 35.0 (y in [35.0, 36.5])
    // Row 2 at y = 37.0 (y in [37.0, 42.0])
    electricMines.forEach((p, idx) => {
        const m = p.members[0];
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        m.x = 46.0 + col * 5.5;
        m.y = row === 0 ? 29.5 : 37.0;
        placedMembers.push(m);
    });

    // 7. Non-Electric Mines (3 Mines, 5x5 each, with Aniimo Waleetle):
    // Placed in Plot 1 (y = 44.5), OUTSIDE power auras, aligned in a neat row under electric mines
    nonElectricMines.forEach((p, idx) => {
        const m = p.members[0];
        m.x = 46.0 + idx * 5.5;
        m.y = 44.5;
        placedMembers.push(m);
    });

    // 8. Non-Electric Workshops (Joy Wheel Loom, Jukebox Dryer, Pickling Jar, Bouncy Brew Keg, Crafting Table, Nimbus Bed):
    // Placed in Plot 2 & Plot 1 (y = 44.0 - 47.0), OUTSIDE power range, arranged in clean rows
    let nonElecX = 21.0;
    let nonElecY = 44.0;
    [...nonElectricSmallWorkshops, ...nonElectricLargeWorkshops].forEach(p => {
        const m = p.members[0];
        if (nonElecX + m.w > 43.0) {
            nonElecX = 21.0;
            nonElecY += 3.5;
        }
        m.x = nonElecX;
        m.y = nonElecY;
        nonElecX += m.w + 0.8;
        placedMembers.push(m);
    });

    // 9. Heavy Industry Block (Plot 7: y in [15, 30], x in [20, 40])
    // 3 Chimney Kilns (5x5 each) in a straight row at y = 16.0
    kilns.forEach((p, idx) => {
        const m = p.members[0];
        m.x = 21.0 + idx * 6.0;
        m.y = 16.0;
        placedMembers.push(m);
    });
    // 3 Woodworking Benches (5x3 each) in a straight row at y = 22.5
    benches.forEach((p, idx) => {
        const m = p.members[0];
        m.x = 21.0 + idx * 6.0;
        m.y = 22.5;
        placedMembers.push(m);
    });

    // 10. Climate Clusters (Placed in SEPARATE PLOTS - Plot 8 and Plot 9)
    // Cluster 0: Plot 8 (center at x=49, y=20)
    // Cluster 1: Plot 9 (center at x=69, y=20)
    // Cluster 2: Plot 15 (center at x=49, y=7.5)
    // Cluster 3: Plot 16 (center at x=69, y=7.5)
    const clusterPlotCenters = [
        { cx: 49.0, cy: 20.0 }, // Plot 8
        { cx: 69.0, cy: 20.0 }, // Plot 9
        { cx: 49.0, cy: 7.5 },  // Plot 15
        { cx: 69.0, cy: 7.5 },  // Plot 16
    ];

    clusterPieces.forEach((p, cIdx) => {
        const { cx, cy } = clusterPlotCenters[cIdx % clusterPlotCenters.length];
        if (p.buildings) {
            p.buildings.forEach(b => {
                b.x += cx;
                b.y += cy;
                placedMembers.push(b);
            });
        }
        if (p.plots) {
            p.plots.forEach((pl, j) => {
                const planSlot = p.planned?.[j] || { x: 0, y: 0 };
                pl.x = planSlot.x + cx;
                pl.y = planSlot.y + cy;
                placedMembers.push(pl);
            });
        }
        p.members = [...(p.buildings || []), ...(p.plots || [])];
    });

    // 11. Outdoor Farmlands / Woodlands (Field Blocks):
    // Placed in Plot 15 / Plot 14 in a neat rectangular field block
    fieldPieces.forEach((p, fIdx) => {
        const fx = 42.0;
        const fy = 5.0 + fIdx * 6.0;
        p.members.forEach(m => {
            m.x += fx;
            m.y += fy;
            placedMembers.push(m);
        });
    });

    // 12. Fallback for any other remaining pieces:
    // Placed in open slots without overlapping
    others.forEach(p => {
        const m = p.members?.[0];
        if (!m) return;
        let placed = false;
        for (let y = 16; y <= 55 && !placed; y += 0.5) {
            for (let x = 21; x <= 75 && !placed; x += 0.5) {
                const rect = { x, y, w: m.w, h: m.h };
                if (inside(rect) && !isOccupied(rect, m)) {
                    m.x = x;
                    m.y = y;
                    placedMembers.push(m);
                    placed = true;
                }
            }
        }
    });

    // 13. Assign closestStorage and district to all members
    pieces.forEach(p => {
        if (p.cluster && !p.members) {
            p.members = [...(p.buildings || []), ...(p.plots || [])];
        }
        const pDist = districtOf(p);
        (p.members || []).forEach(m => {
            m.district = pDist;
            let closestSU = homelandStorages[0];
            let minD = Infinity;
            for (const su of homelandStorages) {
                const d = Math.hypot((m.x + m.w / 2) - (su.x + su.w / 2), (m.y + m.h / 2) - (su.y + su.h / 2));
                if (d < minD) { minD = d; closestSU = su; }
            }
            m.closestStorage = closestSU.id;
        });
    });

    return {
        pieces,
        storages: homelandStorages,
        storage: homelandStorages[0],
        storageAt: { x: homelandStorages[0].x + storageSize.w / 2, y: homelandStorages[0].y + storageSize.h / 2 },
        unplaced: [],
        tried: pieces.length,
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

// Points `step` tiles apart across `extent` (`{ x, y, x2, y2 }`), nearest (targetX, targetY) first:
// `[x, y, distance]`.
function latticeByDistance(extent, step, targetX = 0, targetY = 0) {
    const points = [];
    for (let i = Math.floor(extent.x / step); i <= Math.ceil(extent.x2 / step); i++) {
        for (let j = Math.floor(extent.y / step); j <= Math.ceil(extent.y2 / step); j++) {
            const x = i * step;
            const y = j * step;
            points.push([x, y, Math.hypot(x - targetX, y - targetY)]);
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
