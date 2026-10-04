with open('web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Title and Header
content = content.replace(
    '<title>Aniimax - Aniimo Production Optimizer</title>',
    '<title>AniimoLab - Homeland Production Simulator & Optimizer</title>'
)
content = content.replace(
    '<h1>aniimax</h1>',
    '<h1>AniimoLab</h1>'
)

# 2. Add SU selector in layout-controls
old_layout_controls = """                        <div class="layout-controls">
                            <span class="layout-toggles">
                                <label class="layout-whole"><input type="checkbox" id="layout-whole"> Show the whole homeland</label>
                                <label class="layout-whole"><input type="checkbox" id="layout-sim-on" checked> Simulate</label>
                            </span>
                            <span class="layout-sim" id="layout-sim" hidden><span id="layout-clock">0h 00m</span><button type="button" class="toggle-button small" id="layout-replay">Replay</button></span>
                        </div>"""

new_layout_controls = """                        <div class="layout-controls">
                            <span class="layout-toggles">
                                <label class="layout-whole"><input type="checkbox" id="layout-whole"> Show whole homeland</label>
                                <label class="layout-whole"><input type="checkbox" id="layout-sim-on" checked> Simulate</label>
                                <label class="layout-whole" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                    Storage Units:
                                    <select id="layout-su-count" class="toggle-button small su-count-select">
                                        <option value="3" selected>3 SU (Farm, Workshop, Central)</option>
                                        <option value="4">4 SU (+ Forestry)</option>
                                        <option value="5">5 SU (+ Expansion)</option>
                                    </select>
                                </label>
                            </span>
                            <span class="layout-sim" id="layout-sim" hidden><span id="layout-clock">0h 00m</span><button type="button" class="toggle-button small" id="layout-replay">Replay</button></span>
                        </div>"""

assert old_layout_controls in content, 'Could not find old_layout_controls'
content = content.replace(old_layout_controls, new_layout_controls)

# 3. Update title of layout-card
content = content.replace(
    '<h2>Homeland Layout</h2>',
    '<h2>Homeland 2D Layout Simulator</h2>'
)

# 4. Extract cards inside #results-content
idx_results = content.find('<div id="results-content">')
assert idx_results != -1

idx_aniimo = content.find('<div class="card aniimo-card" id="aniimo-card">', idx_results)
idx_rate = content.find('<div class="card rate-card">', idx_results)
idx_improve = content.find('<div class="card production-steps" id="improve-card"', idx_results)
idx_seed = content.find('<div class="card production-steps" id="seed-card"', idx_results)
idx_profit = content.find('<div class="card production-steps" id="profit-card"', idx_results)

# Facility card is between profit and layout
idx_facility = content.find('<div class="card production-steps">\n                        <h2>What Each Facility Should Do</h2>', idx_results)
if idx_facility == -1:
    idx_facility = content.find('<h2>What Each Facility Should Do</h2>', idx_results)
    idx_facility = content.rfind('<div class="card production-steps">', idx_profit, idx_facility)

idx_layout = content.find('<div class="card production-steps" id="layout-card"', idx_results)
idx_goal = content.find('<div class="card production-steps" id="goal-section">', idx_results)
idx_results_end = content.find('</div>\n            </section>\n        </main>', idx_results)

assert all(x != -1 for x in [idx_aniimo, idx_rate, idx_improve, idx_seed, idx_profit, idx_facility, idx_layout, idx_goal, idx_results_end]), "Card index missing"

aniimo_card = content[idx_aniimo:idx_rate].strip()
rate_card = content[idx_rate:idx_improve].strip()
improve_card = content[idx_improve:idx_seed].strip()
seed_card = content[idx_seed:idx_profit].strip()
profit_card = content[idx_profit:idx_facility].strip()
facility_card = content[idx_facility:idx_layout].strip()
layout_card = content[idx_layout:idx_goal].strip()
goal_card = content[idx_goal:idx_results_end].strip()

insights_card = """                    <div class="card insights-card" id="insights-card">
                        <div class="card-head">
                            <h2>Why this Plan? & Insights</h2>
                            <span class="badge-pill optimal-pill">Optimal Solved</span>
                        </div>
                        <div id="insights-content" class="insights-body">
                            <!-- Populated dynamically by app.js -->
                        </div>
                    </div>"""

new_results_block = f"""<div id="results-content">
                    {rate_card}

                    <div class="results-dashboard-grid">
                        <div class="results-main-col">
                            {layout_card}
                            {facility_card}
                            {seed_card}
                            {profit_card}
                        </div>
                        <div class="results-sidebar-col">
                            {insights_card}
                            {improve_card}
                            {aniimo_card}
                            {goal_card}
                        </div>
                    </div>
                </div>"""

content = content[:idx_results] + new_results_block + content[idx_results_end:]

with open('web/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated web/index.html successfully!')
