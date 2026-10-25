export function createHomelandLayoutInteractionController({
    document,
    getLastLayout,
    onRedraw = () => {},
    onReset = () => {},
    onWholeChange = () => {},
    onStorageCountChange = () => {},
}) {
    const state = {
        origViewBox: null,
        currentViewBox: null,
        lastWhole: false,
        isPanning: false,
        panStart: { x: 0, y: 0 },
        isDragging: false,
        dragTarget: null,
        grabOffset: { x: 0, y: 0 },
        customPositions: new Map(),
    };

    function attachHandlers() {
        document.getElementById('layout-whole')?.addEventListener('change', event => {
            onWholeChange(event.target.checked);
            if (getLastLayout()) onRedraw();
        });
        document.getElementById('layout-minor-grid')?.addEventListener('change', () => {
            if (getLastLayout()) onRedraw();
        });
        document.getElementById('layout-su-count')?.addEventListener('change', onStorageCountChange);
    }

    function init(svg) {
        if (!svg) return;

        const zoomLevelEl = document.getElementById('layout-zoom-level');
        const updateZoomDisplay = () => {
            if (!zoomLevelEl || !state.origViewBox || !state.currentViewBox) return;
            const scale = (state.origViewBox.w / state.currentViewBox.w) * 100;
            zoomLevelEl.textContent = `${Math.round(scale)}%`;
        };
        const applyViewBox = () => {
            if (!state.currentViewBox) return;
            const { x, y, w, h } = state.currentViewBox;
            svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
            updateZoomDisplay();
        };

        updateZoomDisplay();

        document.getElementById('layout-zoom-in').onclick = () => {
            if (!state.currentViewBox) return;
            const factor = 0.8;
            const cx = state.currentViewBox.x + state.currentViewBox.w / 2;
            const cy = state.currentViewBox.y + state.currentViewBox.h / 2;
            const nw = state.currentViewBox.w * factor;
            const nh = state.currentViewBox.h * factor;
            state.currentViewBox = { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
            applyViewBox();
        };

        document.getElementById('layout-zoom-out').onclick = () => {
            if (!state.currentViewBox) return;
            const factor = 1.25;
            const cx = state.currentViewBox.x + state.currentViewBox.w / 2;
            const cy = state.currentViewBox.y + state.currentViewBox.h / 2;
            const nw = state.currentViewBox.w * factor;
            const nh = state.currentViewBox.h * factor;
            state.currentViewBox = { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
            applyViewBox();
        };

        document.getElementById('layout-zoom-fit').onclick = () => {
            if (!state.origViewBox) return;
            state.currentViewBox = { ...state.origViewBox };
            applyViewBox();
        };

        document.getElementById('layout-reset-btn').onclick = () => {
            state.customPositions.clear();
            state.origViewBox = null;
            state.currentViewBox = null;
            onReset();
        };

        svg.onwheel = event => {
            event.preventDefault();
            if (!state.currentViewBox) return;
            const rect = svg.getBoundingClientRect();
            const mx = (event.clientX - rect.left) / rect.width;
            const my = (event.clientY - rect.top) / rect.height;

            const factor = event.deltaY < 0 ? 0.85 : 1.18;
            const minW = 6;
            const maxW = (state.origViewBox?.w || 40) * 3;
            const nw = Math.min(maxW, Math.max(minW, state.currentViewBox.w * factor));
            const nh = Math.min(maxW * 0.75, Math.max(minW * 0.75, state.currentViewBox.h * factor));

            state.currentViewBox.x += (state.currentViewBox.w - nw) * mx;
            state.currentViewBox.y += (state.currentViewBox.h - nh) * my;
            state.currentViewBox.w = nw;
            state.currentViewBox.h = nh;
            applyViewBox();
        };

        const getSvgPoint = (clientX, clientY) => {
            const point = svg.createSVGPoint();
            point.x = clientX;
            point.y = clientY;
            return point.matrixTransform(svg.getScreenCTM().inverse());
        };

        svg.onpointerdown = event => {
            if (event.button !== 0 && event.button !== 1) return;
            const pieceEl = event.target.closest('.layout-piece');

            if (pieceEl) {
                event.stopPropagation();
                state.isDragging = true;
                state.dragTarget = pieceEl;
                pieceEl.classList.add('is-dragging');
                pieceEl.parentElement?.appendChild(pieceEl);

                const point = getSvgPoint(event.clientX, event.clientY);
                const curX = parseFloat(pieceEl.getAttribute('data-x') || '0');
                const curY = parseFloat(pieceEl.getAttribute('data-y') || '0');
                state.grabOffset = { x: point.x - curX, y: point.y - curY };
                pieceEl.setPointerCapture?.(event.pointerId);
            } else {
                state.isPanning = true;
                state.panStart = { x: event.clientX, y: event.clientY };
                svg.classList.add('is-panning');
                svg.setPointerCapture?.(event.pointerId);
            }
        };

        svg.onpointermove = event => {
            if (state.isDragging && state.dragTarget) {
                const point = getSvgPoint(event.clientX, event.clientY);
                const minorGrid = !!document.getElementById('layout-minor-grid')?.checked;
                const snap = minorGrid ? 0.25 : 0.5;
                const targetX = Math.round((point.x - state.grabOffset.x) / snap) * snap;
                const targetY = Math.round((point.y - state.grabOffset.y) / snap) * snap;

                const origX = parseFloat(state.dragTarget.getAttribute('data-orig-x') || state.dragTarget.getAttribute('data-x') || '0');
                const origY = parseFloat(state.dragTarget.getAttribute('data-orig-y') || state.dragTarget.getAttribute('data-y') || '0');

                state.dragTarget.setAttribute('transform', `translate(${targetX - origX}, ${targetY - origY})`);
                state.dragTarget.setAttribute('data-cur-x', targetX);
                state.dragTarget.setAttribute('data-cur-y', targetY);
            } else if (state.isPanning) {
                const dx = (event.clientX - state.panStart.x) * (state.currentViewBox.w / svg.clientWidth);
                const dy = (event.clientY - state.panStart.y) * (state.currentViewBox.h / svg.clientHeight);
                state.currentViewBox.x -= dx;
                state.currentViewBox.y -= dy;
                state.panStart = { x: event.clientX, y: event.clientY };
                applyViewBox();
            }
        };

        const finishPointer = event => {
            if (state.isDragging && state.dragTarget) {
                const pieceEl = state.dragTarget;
                pieceEl.classList.remove('is-dragging');
                pieceEl.releasePointerCapture?.(event.pointerId);

                const newX = parseFloat(pieceEl.getAttribute('data-cur-x'));
                const newY = parseFloat(pieceEl.getAttribute('data-cur-y'));
                const drawn = getLastLayout();

                if (!Number.isNaN(newX) && !Number.isNaN(newY) && drawn?.layout) {
                    const storageIndex = pieceEl.getAttribute('data-storage-idx');
                    const pieceIndex = pieceEl.getAttribute('data-piece-idx');
                    const memberIndex = pieceEl.getAttribute('data-member-idx');

                    if (storageIndex !== null && drawn.layout.storages) {
                        const index = parseInt(storageIndex, 10);
                        if (drawn.layout.storages[index]) {
                            drawn.layout.storages[index].x = newX;
                            drawn.layout.storages[index].y = newY;
                            state.customPositions.set(`su_${index}`, { x: newX, y: newY });
                        }
                    } else if (pieceIndex !== null && memberIndex !== null && drawn.layout.pieces) {
                        const piece = parseInt(pieceIndex, 10);
                        const member = parseInt(memberIndex, 10);
                        const layoutMember = drawn.layout.pieces[piece]?.members?.[member];
                        if (layoutMember) {
                            layoutMember.x = newX;
                            layoutMember.y = newY;
                            state.customPositions.set(`${piece}_${member}`, { x: newX, y: newY });
                        }
                    }
                }

                state.isDragging = false;
                state.dragTarget = null;
                if (getLastLayout()) onRedraw();
            } else if (state.isPanning) {
                state.isPanning = false;
                svg.classList.remove('is-panning');
                svg.releasePointerCapture?.(event.pointerId);
            }
        };

        svg.onpointerup = finishPointer;
        svg.onpointercancel = finishPointer;
    }

    return { state, attachHandlers, init };
}
