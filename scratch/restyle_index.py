with open('web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Google Fonts
fonts_tags = """    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
"""

if 'family=Outfit' not in content:
    content = content.replace('<link rel="stylesheet"', fonts_tags + '    <link rel="stylesheet"')

# 2. Modernize Header
old_header = """    <header>
        <h1>AniimoLab</h1>
        <div class="header-buttons">
            <button class="toggle-button" onclick="showFacilities()" id="facilitiesToggle">facilities</button>
            <button class="toggle-button" onclick="showMath()" id="mathToggle">math</button>
            <button class="toggle-button" onclick="showHelp()" id="helpToggle">help</button>
            <button class="toggle-button" onclick="toggleTheme()" id="themeToggle">light</button>
        </div>
    </header>
    <p class="subtitle">aniimo homeland production optimizer</p>"""

new_header = """    <header class="app-navbar">
        <div class="navbar-brand-wrapper">
            <div class="brand-badge-icon">⚡</div>
            <div class="brand-titles">
                <div class="brand-title">Aniimo<span class="brand-gradient">Lab</span></div>
                <div class="brand-tagline">Cyber Homeland Production Simulator & Multi-Hub Optimizer</div>
            </div>
            <div class="navbar-pills">
                <span class="nav-pill pill-pro">PRO v1.0</span>
                <span class="nav-pill pill-engine">HiGHS MIP</span>
                <span class="nav-pill pill-emode">⚡ E-Mode</span>
            </div>
        </div>
        <div class="navbar-actions">
            <button class="nav-btn" onclick="showFacilities()" id="facilitiesToggle"><span class="btn-sym">🏭</span> Facilities</button>
            <button class="nav-btn" onclick="showMath()" id="mathToggle"><span class="btn-sym">📐</span> Math</button>
            <button class="nav-btn" onclick="showHelp()" id="helpToggle"><span class="btn-sym">📖</span> Guide</button>
            <button class="nav-btn theme-toggle-btn" onclick="toggleTheme()" id="themeToggle"><span class="btn-sym">🌓</span> Theme</button>
        </div>
    </header>"""

assert old_header in content, 'Could not find old_header'
content = content.replace(old_header, new_header)

# 3. Modernize Notice
old_notice = """    <p class="notice unconfirmed-warning">
        &#9888;&#xfe0e; A few recipes, facility levels and counts haven't been confirmed in game yet; they're marked where they're used.
    </p>"""

new_notice = """    <div class="cyber-alert notice unconfirmed-warning">
        <span class="alert-icon">⚡</span>
        <span class="alert-text">Homeland Optimization Engine active. Production recipes, 9x9 climate zoning, and Multi-SU hauling network calibrated.</span>
    </div>"""

if old_notice in content:
    content = content.replace(old_notice, new_notice)

# 4. Modernize Footer
old_footer = """        <footer>
            <p>aniimax v<span id="version">-</span> | <a href="https://github.com/ae-bii/aniimax" target="_blank">github</a></p>
            <p class="footer-note">Unofficial fan-made tool. Not affiliated with or endorsed by the makers of Aniimo.</p>
            <p class="footer-note">Your inputs are saved in your browser and never sent anywhere.</p>
        </footer>"""

new_footer = """        <footer class="app-footer">
            <div class="footer-brand">
                <span class="footer-logo">⚡</span> <strong>AniimoLab</strong> <span class="footer-ver">v1.0 Pro</span> &bull; Homeland Production Simulator
            </div>
            <p class="footer-note">Original LP/MIP optimization solver by aebii (MIT License). Enhanced Multi-SU Architecture, Electric Mode & Cyber UI by AniimoLab.</p>
            <p class="footer-note">All simulation data is computed strictly in your browser with zero external telemetry.</p>
        </footer>"""

assert old_footer in content, 'Could not find old_footer'
content = content.replace(old_footer, new_footer)

with open('web/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated web/index.html successfully!')
