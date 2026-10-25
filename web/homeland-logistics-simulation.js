const SIM_BUILD_UP = 10;
const SIM_PACE = 4;
const SIM_STEP = 2;
const SIM_DOT_GAP = 0.12;

export function buildLayoutFlows(layout) {
    const storages = layout.storages && layout.storages.length > 0 ? layout.storages : [layout.storage];
    return layout.pieces.flatMap(piece => piece.members).filter(member => member.weight > 0 && member.crop && member.cycle > 0).map(member => {
        const x1 = member.x + member.w / 2;
        const y1 = member.y + member.h / 2;
        const closestStorage = storages.reduce((best, storage) => {
            const distance = Math.hypot(x1 - (storage.x + storage.w / 2), y1 - (storage.y + storage.h / 2));
            const bestDistance = Math.hypot(x1 - (best.x + best.w / 2), y1 - (best.y + best.h / 2));
            return distance < bestDistance ? storage : best;
        }, storages[0]);
        const x2 = closestStorage.x + closestStorage.w / 2;
        const y2 = closestStorage.y + closestStorage.h / 2;
        const ring = Math.min(0.45, Math.min(member.w, member.h) * 0.22);
        return {
            x1, y1, x2, y2, length: Math.hypot(x2 - x1, y2 - y1),
            ring, rx: member.x + member.w - ring - 0.12, ry: member.y + ring + 0.12,
            jobs: member.jobs || [{ item: member.crop, cycle: member.cycle, rate: member.weight / 3600 }],
        };
    });
}

export function createRecipeTerms(recipes) {
    const getRecipes = typeof recipes === 'function' ? recipes : () => recipes;
    return name => {
        const recipe = getRecipes().find(candidate => candidate.name === name);
        return {
            takes: (recipe?.ingredients || []).map((ingredient, index) => [ingredient, recipe.amounts?.[index] ?? 1]),
            makes: name.replace(/^quick_/, ''),
            yield: recipe?.yieldAmount || 1,
            byproduct: recipe?.byproduct ? [recipe.byproduct, recipe.byproductAmount || 0] : null,
        };
    };
}

export function createFirstBatchTimeLookup(flows, recipeTerms) {
    const batch = new Map();
    flows.flatMap(flow => flow.jobs).forEach(job => batch.set(job.item, Math.min(batch.get(job.item) ?? Infinity, job.cycle)));
    const makers = new Map();
    batch.forEach((_, name) => {
        const terms = recipeTerms(name);
        [terms.makes, terms.byproduct?.[0]].filter(Boolean).forEach(item => makers.set(item, [...(makers.get(item) || []), name]));
    });
    const known = new Map();
    const first = (name, depth = 0) => {
        if (depth > 8) return 0;
        if (!known.has(name)) {
            known.set(name, 0);
            const waits = recipeTerms(name).takes
                .map(([ingredient]) => makers.get(ingredient))
                .filter(Boolean)
                .map(list => Math.min(...list.map(maker => first(maker, depth + 1))));
            known.set(name, Math.max(0, ...waits) + (batch.get(name) || 0));
        }
        return known.get(name);
    };
    return first;
}

export function createHomelandLogisticsSimulation(deps) {
    const recipeTerms = createRecipeTerms(deps.getRecipes);
    let active = null;

    function hasMaterials(sim, job) {
        return job.terms.takes.every(([item, amount]) => !sim.made.has(item) && !sim.stock.has(item) || (sim.store.get(item) || 0) >= amount);
    }

    function startJob(sim, unit, at) {
        const job = unit.jobs.find(candidate => candidate.pace >= 1 - 1e-9 && hasMaterials(sim, candidate));
        if (!job) return;
        job.terms.takes.forEach(([item, amount]) => {
            if (sim.made.has(item) || sim.stock.has(item)) sim.store.set(item, (sim.store.get(item) || 0) - amount);
        });
        job.pace -= 1;
        unit.job = job;
        unit.started = at;
        unit.until = at + job.cycle;
    }

    function deliver(sim, unit, age) {
        unit.line?.classList.add('live');
        const walk = unit.flow.length / SIM_PACE;
        if (age >= walk || sim.real - age - unit.lastDot < SIM_DOT_GAP) return;
        unit.lastDot = sim.real - age;
        const element = deps.document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        element.setAttribute('r', '0.2');
        element.setAttribute('class', 'layout-dot');
        sim.layer.appendChild(element);
        sim.dots.push({ el: element, flow: unit.flow, age });
    }

    function step(sim, dt) {
        const from = sim.game;
        sim.game += dt;
        const order = [...sim.units];
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        for (const unit of order) {
            unit.jobs.forEach(job => { job.pace = Math.min(1 + job.rate * SIM_STEP, job.pace + job.rate * dt); });
            while (unit.until != null && unit.until <= sim.game) {
                const { makes, byproduct, yield: amount } = unit.job.terms;
                sim.store.set(makes, (sim.store.get(makes) || 0) + amount);
                if (byproduct) sim.store.set(byproduct[0], (sim.store.get(byproduct[0]) || 0) + byproduct[1]);
                deliver(sim, unit, (sim.game - unit.until) / sim.speed);
                unit.free = unit.until;
                unit.until = null;
                unit.job = null;
                startJob(sim, unit, unit.free);
            }
            if (unit.until == null) startJob(sim, unit, Math.max(from, unit.free));
        }
    }

    function showRing(unit, progress, waiting) {
        if (!unit.ring) return;
        unit.fill.setAttribute('stroke-dasharray', `${progress.toFixed(3)} 1`);
        unit.ring.classList.toggle('waiting', waiting);
    }

    function showClock(seconds) {
        const minutes = Math.floor(seconds / 60);
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor(minutes / 60) % 24;
        const text = `${days ? `${days}d ` : ''}${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
        const clock = deps.document.getElementById('layout-clock');
        if (clock.textContent !== text) clock.textContent = text;
    }

    function tick(sim, now) {
        sim.frame = 0;
        if (active !== sim || !sim.svg.isConnected) return;
        const dt = sim.last == null ? 0 : Math.min(now - sim.last, 100) / 1000;
        sim.last = now;
        const until = sim.game + dt * sim.speed;
        while (sim.game < until - 1e-9) step(sim, Math.min(SIM_STEP, until - sim.game));
        sim.real += dt;
        sim.units.forEach(unit => {
            const busy = unit.until != null;
            showRing(unit, busy ? Math.min(1, (sim.game - unit.started) / unit.job.cycle) : 0, !busy && unit.jobs.some(job => job.pace >= 1 - 1e-9));
        });
        sim.dots = sim.dots.filter(dot => {
            dot.age += dt;
            const along = dot.age * SIM_PACE / dot.flow.length;
            if (along >= 1) {
                dot.el.remove();
                return false;
            }
            dot.el.setAttribute('cx', (dot.flow.x1 + (dot.flow.x2 - dot.flow.x1) * along).toFixed(2));
            dot.el.setAttribute('cy', (dot.flow.y1 + (dot.flow.y2 - dot.flow.y1) * along).toFixed(2));
            return true;
        });
        showClock(sim.game);
        if (sim.visible) sim.frame = deps.requestAnimationFrame(time => tick(sim, time));
        else sim.last = null;
    }

    function reset(sim) {
        sim.game = 0;
        sim.real = 0;
        sim.last = null;
        sim.store = new Map(sim.stock);
        sim.units.forEach(unit => {
            unit.jobs.forEach(job => { job.pace = 1; });
            unit.job = null;
            unit.until = null;
            unit.free = 0;
            unit.lastDot = -Infinity;
            unit.line?.classList.remove('live');
            showRing(unit, 0, false);
        });
        sim.dots.forEach(dot => dot.el.remove());
        sim.dots = [];
        showClock(0);
        if (!sim.frame) sim.frame = deps.requestAnimationFrame(now => tick(sim, now));
    }

    function stop() {
        if (!active) return;
        deps.cancelAnimationFrame(active.frame);
        active.observer?.disconnect();
        active = null;
    }

    function start(svg, flows, stock) {
        stop();
        const reducedMotion = deps.window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        deps.document.getElementById('layout-sim').hidden = !svg || flows.length === 0 || reducedMotion;
        if (!svg || flows.length === 0) return;
        const lines = [...svg.querySelectorAll('.layout-flow-line')];
        const rings = [...svg.querySelectorAll('.layout-ring')];
        if (reducedMotion) {
            lines.forEach(line => line.classList.add('live'));
            rings.forEach(ring => ring.remove());
            return;
        }
        const first = createFirstBatchTimeLookup(flows, recipeTerms);
        const latest = Math.max(...flows.flatMap(flow => flow.jobs).map(job => first(job.item)));
        const speed = Math.min(3600, Math.max(60, latest / SIM_BUILD_UP));
        const units = flows.map((flow, index) => ({
            flow,
            jobs: flow.jobs.map(job => ({ ...job, terms: recipeTerms(job.item) })),
            line: lines[index], ring: rings[index], fill: rings[index]?.querySelector('.ring-fill'),
        }));
        const made = new Set(units.flatMap(unit => unit.jobs).flatMap(job => [job.terms.makes, job.terms.byproduct?.[0]].filter(Boolean)));
        const sim = { svg, units, speed, stock, made, layer: svg.querySelector('.layout-dots'), dots: [], frame: 0, visible: true };
        active = sim;
        deps.document.getElementById('layout-clock').title = `Game time since everything was set up, at ${deps.formatNumber(Math.round(speed))}× speed`;
        sim.observer = new deps.IntersectionObserver(([entry]) => {
            sim.visible = entry.isIntersecting;
            if (sim.visible && !sim.frame && active === sim) sim.frame = deps.requestAnimationFrame(now => tick(sim, now));
        });
        sim.observer.observe(svg);
        reset(sim);
    }

    return { start, stop, getActiveSimulation: () => active };
}
