with open('web/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

new_styles = """
/* ==========================================================================
   AniimoLab - Modern 2-Column Dashboard & Multi-SU Styles
   ========================================================================== */

.results-dashboard-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(320px, 1fr);
    gap: 1.5rem;
    align-items: start;
    margin-top: 1rem;
}

.results-main-col {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    min-width: 0;
}

.results-sidebar-col {
    position: sticky;
    top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

@media (max-width: 1080px) {
    .results-dashboard-grid {
        grid-template-columns: 1fr;
    }
    .results-sidebar-col {
        position: static;
    }
}

/* Setup-only and Stale state handling */
#results-content.setup-only .results-dashboard-grid {
    display: none !important;
}

#results-content.stale .results-main-col,
#results-content.stale .insights-card,
#results-content.stale #improve-card,
#results-content.stale #goal-section {
    opacity: 0.45;
    pointer-events: none;
}

/* Insights Card ("Why this Plan?") */
.insights-card {
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
    border: 1px solid rgba(16, 185, 129, 0.25);
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.insights-card .card-head {
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    padding-bottom: 0.75rem;
    margin-bottom: 0.85rem;
}

.optimal-pill {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.35);
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    letter-spacing: 0.03em;
}

.insights-body {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
}

.insight-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    padding: 0.65rem 0.85rem;
    transition: background 0.2s, border-color 0.2s;
}

.insight-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(16, 185, 129, 0.3);
}

.insight-label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #34d399;
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.insight-desc {
    font-size: 0.82rem;
    line-height: 1.45;
    color: var(--text-muted, #94a3b8);
}

.insight-desc strong {
    color: var(--text, #f8fafc);
}

/* Multi-Storage Unit Styling in SVG */
.layout-storage-unit.su-central .layout-storage {
    fill: #eab308 !important;
}

.layout-storage-unit.su-farm .layout-storage {
    fill: #10b981 !important;
}

.layout-storage-unit.su-workshop .layout-storage {
    fill: #06b6d4 !important;
}

.layout-storage-unit.su-forestry .layout-storage {
    fill: #059669 !important;
}

.layout-storage-unit.su-expansion .layout-storage {
    fill: #8b5cf6 !important;
}

.layout-storage-unit text {
    fill: #000000 !important;
    font-weight: 800 !important;
    font-size: 0.65px !important;
}

/* Generator & Power Grid Styling */
.generator-power-aura {
    animation: generatorAuraPulse 3s ease-in-out infinite alternate;
}

@keyframes generatorAuraPulse {
    0% {
        stroke-opacity: 0.3;
        fill-opacity: 0.03;
    }
    100% {
        stroke-opacity: 0.75;
        fill-opacity: 0.08;
    }
}

.su-count-select {
    cursor: pointer;
}
"""

if '.results-dashboard-grid' not in css:
    css += new_styles
    with open('web/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print('Appended dashboard and multi-SU styles to web/style.css!')
else:
    print('Styles already present in web/style.css')
