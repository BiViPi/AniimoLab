import { buildLayoutFlows, createHomelandLogisticsSimulation } from './homeland-logistics-simulation.js';
import { createHomelandLayoutView, createHomelandPiecesBuilder } from './homeland-layout-view.js';
import { createHomelandLayoutWorkerController } from './homeland-layout-controller.js';
import { createHomelandLayoutInteractionController } from './homeland-layout-interaction.js';

export function createHomelandUIController({
    document,
    window,
    IntersectionObserver,
    requestAnimationFrame,
    cancelAnimationFrame,
    createWorker = url => new Worker(url, { type: 'module' }),
    workerUrl = 'worker.js',
    homelandPlots = [],
    homelandPlotSize = { w: 10, h: 10 },
    facilityFootprints = {},
    facilityPowerWatts = {},
    environmentModeOrder = ['Warm', 'Scorching', 'Cool', 'Freeze', 'Adequate'],
    environmentModeColors = {},
    environmentModeShade = {},
    environmentCoverageRadius = 2,
    layoutDistricts = [],
    getLastPlan = () => null,
    getLastPlanInput = () => null,
    isSimpleMode = () => true,
    selectedHomeLevel = () => 1,
    homeLevelCovering = () => 1,
    getPowerPoleCount = () => 0,
    isEmodeActive = () => false,
    getRecipes = () => [],
    environmentBuildingSize = () => null,
    simpleSetup = () => ({}),
    getFacilityDistrict = () => '',
    getFacilityDisplayName = x => x,
    getModeDisplayName = x => x,
    prettyItem = x => x,
    formatRate = x => String(x),
    formatNumber = x => String(x),
    tipAttrs = () => '',
    renderHomelandSvgFacility = () => '',
    getFacilityIconUrl = () => '',
    setStep = () => {},
}) {
    let layoutShowsWhole = false;
    let lastLayout = null;

    const homelandPiecesBuilder = createHomelandPiecesBuilder({
        environmentModeOrder,
        environmentBuildingSize,
        getRecipes,
        facilityFootprints,
        facilityPowerWatts,
        simpleSetup,
        getHomeLevel: selectedHomeLevel,
        isSimpleMode,
        getPowerPoleCount,
        isEmodeActive,
    });

    const homelandLayoutWorker = createHomelandLayoutWorkerController({
        createWorker,
    });

    const homelandLayoutInteraction = createHomelandLayoutInteractionController({
        document,
        getLastLayout: () => lastLayout,
        onRedraw: () => { if (lastLayout) drawLayout(lastLayout); },
        onReset: () => {
            const plan = getLastPlan();
            if (plan && plan.success) renderHomelandLayout(plan);
        },
        onWholeChange: checked => { layoutShowsWhole = checked; },
        onStorageCountChange: () => {
            const plan = getLastPlan();
            if (plan && plan.success) renderHomelandLayout(plan);
        },
    });

    const layoutSvgState = homelandLayoutInteraction.state;

    function getPlots() {
        return homelandPlots.flatMap((row, r) => row.map((number, c) => ({
            number,
            x: c * homelandPlotSize.w,
            y: r * homelandPlotSize.h,
            w: homelandPlotSize.w,
            h: homelandPlotSize.h,
        })));
    }

    const homelandLayoutView = createHomelandLayoutView({
        getLanguage: () => window?.i18n && window.i18n.getLang() === 'vi' ? 'vi' : 'en',
        getEnvironmentCoverageRadius: () => environmentCoverageRadius,
        getEnvironmentModeColors: () => environmentModeColors,
        getEnvironmentModeShade: () => environmentModeShade,
        getLayoutDistricts: () => layoutDistricts,
        homelandPlots: getPlots,
        getFacilityDistrict,
        getFacilityDisplayName,
        getModeDisplayName,
        prettyItem,
        formatRate,
        tipAttrs,
        renderHomelandSvgFacility,
        getFacilityIconUrl,
    });

    const homelandLogisticsSimulation = createHomelandLogisticsSimulation({
        document,
        window,
        IntersectionObserver,
        requestAnimationFrame,
        cancelAnimationFrame,
        getRecipes,
        formatNumber,
    });

    function layoutFlows(layout) {
        return buildLayoutFlows(layout);
    }

    function startLayoutSim(svg, flows, stock) {
        homelandLogisticsSimulation.start(svg, flows, stock);
    }

    function stopLayoutSim() {
        homelandLogisticsSimulation.stop();
    }

    function homelandPieces(plan, input) {
        return homelandPiecesBuilder.build(plan, input);
    }

    function layoutHomeLevel() {
        const lastInput = getLastPlanInput();
        return isSimpleMode() ? selectedHomeLevel() : homeLevelCovering(lastInput);
    }

    function homelandSvg(layout, homeLevel) {
        const rendered = homelandLayoutView.render(layout, homeLevel, {
            whole: layoutShowsWhole,
            showMinorGrid: !!document.getElementById('layout-minor-grid')?.checked,
        });
        layoutSvgState.origViewBox = rendered.viewBox;
        layoutSvgState.currentViewBox = { ...rendered.viewBox };
        layoutSvgState.lastWhole = rendered.whole;
        return rendered.svg;
    }

    function drawLayout(drawn) {
        const diagram = document.getElementById('layout-diagram');
        if (!diagram) return;
        diagram.innerHTML = homelandSvg(drawn.layout, drawn.homeLevel);
        homelandLayoutInteraction.init(diagram.querySelector('.layout-svg'));
    }

    function stopLayout() {
        stopLayoutSim();
        homelandLayoutWorker.cancel();
        lastLayout = null;
    }

    function renderHomelandLayout(plan) {
        const card = document.getElementById('layout-card');
        const lastInput = getLastPlanInput();
        if (!plan?.success || !lastInput) {
            if (card) card.style.display = 'none';
            return;
        }
        lastLayout = null;
        stopLayoutSim();
        setStep('layout', 'start');
        if (card) card.style.display = 'block';

        const summaryEl = document.getElementById('layout-summary');
        if (summaryEl) summaryEl.textContent = 'Laying out…';
        const diagramEl = document.getElementById('layout-diagram');
        if (diagramEl) diagramEl.innerHTML = '';

        const { pieces, unplaced } = homelandPieces(plan, lastInput);
        const homeLevel = layoutHomeLevel();
        const cells = getPlots().filter(p => p.number <= homeLevel);
        const suCount = parseInt(document.getElementById('layout-su-count')?.value || '3', 10);
        const payload = { pieces, cells: cells.map(({ x, y, w, h }) => ({ x, y, w, h })), options: { suCount } };

        homelandLayoutWorker.run({
            url: workerUrl.replace('worker.js', 'layout-worker.js'),
            payload,
            onResult: (layout) => {
                try {
                    const members = (layout.pieces || []).flatMap(p => p.members || []).filter(Boolean).map(m => ({ ...m, weight: m.weight || 0 }));
                    const trips = members.reduce((sum, m) => sum + m.weight, 0);
                    const storages = layout.storages || [layout.storage];
                    const walked = members.reduce((sum, m) => {
                        const cx = m.x + m.w / 2;
                        const cy = m.y + m.h / 2;
                        const minDist = Math.min(...storages.map(su => Math.hypot(cx - (su.x + su.w / 2), cy - (su.y + su.h / 2))));
                        return sum + m.weight * minDist;
                    }, 0);
                    const noRoom = [...new Set((layout.unplaced || []).map(item => {
                        const piece = typeof item === 'number' ? pieces[item] : item;
                        if (!piece) return '';
                        if (piece.cluster) {
                            const fac = piece.buildings?.[0]?.facility || piece.members?.[0]?.facility || 'Cluster';
                            return `${fac} and its plots`;
                        }
                        return piece.members?.[0]?.facility || piece.facility || 'Facility';
                    }).filter(Boolean))];
                    const isVi = window?.i18n && window.i18n.getLang() === 'vi';
                    const notes = [
                        noRoom.length ? (isVi ? `Không đủ diện tích trên các lô đất RV ${homeLevel} cho: ${noRoom.join(', ')}.` : `No room found in RV ${homeLevel}'s plots for: ${noRoom.join(', ')}.`) : '',
                        unplaced.length ? (isVi ? `Chưa đặt được, không rõ kích thước: ${unplaced.join(', ')}.` : `Not placed, size unknown: ${unplaced.join(', ')}.`) : '',
                    ].filter(Boolean).join(' ');

                    if (summaryEl) {
                        summaryEl.textContent = `${trips > 0
                            ? (isVi
                                ? `${formatNumber(Math.round(trips))} chuyến/giờ đến Thiết Bị Lưu Trữ (SU), trung bình ${(walked / trips).toFixed(1)} ô mỗi chuyến, trong ${cells.length} lô đất mở tại RV ${homeLevel}.`
                                : `${formatNumber(Math.round(trips))} trips/hour to the Storage Unit, ${(walked / trips).toFixed(1)} tiles each on average, in the ${cells.length} plot${cells.length === 1 ? '' : 's'} open at RV ${homeLevel}.`)
                            : (isVi ? 'Không có sản phẩm nào trong kế hoạch này cần chuyển đến Thiết Bị Lưu Trữ.' : 'Nothing in this plan is carried to the Storage Unit.')}${notes ? ` ${notes}` : ''}`;
                    }
                    lastLayout = { layout, homeLevel };
                    drawLayout(lastLayout);
                    setStep('layout', 'done');
                } catch (err) {
                    console.error('Error rendering homeland layout:', err);
                    const isVi = window?.i18n && window.i18n.getLang() === 'vi';
                    if (summaryEl) {
                        summaryEl.textContent = isVi
                            ? `Lỗi hiển thị sơ đồ: ${err.message || err}`
                            : `Layout rendering error: ${err.message || err}`;
                    }
                    setStep('layout', 'fail');
                }
            },
            onError: (event) => {
                console.error('Homeland layout failed:', event.message || event);
                stopLayout();
                const isVi = window?.i18n && window.i18n.getLang() === 'vi';
                if (summaryEl) {
                    summaryEl.textContent = isVi
                        ? 'Không thể tính toán được sơ đồ bố trí.'
                        : 'The layout couldn\'t be worked out.';
                }
                setStep('layout', 'fail');
            },
        });
    }

    return {
        homelandPlots: getPlots,
        homelandPieces,
        layoutHomeLevel,
        drawLayout,
        renderHomelandLayout,
        stopLayout,
        getLastLayout: () => lastLayout,
        homelandSvg,
        layoutFlows,
        startLayoutSim,
        stopLayoutSim,
        attachHandlers: () => homelandLayoutInteraction.attachHandlers(),
    };
}
