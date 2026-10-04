with open('web/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace root variables and body down to .disclaimer
idx_start = css.find(':root {')
idx_end = css.find('.disclaimer {')
assert idx_start != -1 and idx_end != -1, f"Indices not found: start={idx_start}, end={idx_end}"

new_header_and_body = """/* ========================================
   AniimoLab - Cyber Oasis Design System
   ======================================== */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --bg: #0a0a0f;
    --surface: #141322;
    --surface-2: #1e1c31;
    --surface-elevated: #26243e;
    --text: #f8fafc;
    --text-muted: #9490b8;
    --border: rgba(139, 92, 246, 0.22);
    --border-hover: rgba(0, 245, 160, 0.45);
    --accent: #00f5a0; /* Neon Mint */
    --accent-violet: #8b5cf6; /* Electric Violet */
    --accent-cyan: #06b6d4; /* Electric Cyan */
    --on-accent: #0a0a0f;
    --success: #00f5a0;
    --error: #f43f5e;
    --warning: #fbbf24;
    --radius: 14px;
    --radius-sm: 8px;
    --radius-lg: 20px;
    --font-heading: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --font-body: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', "Courier New", monospace;
}

.light {
    --bg: #f8fafc;
    --surface: #ffffff;
    --surface-2: #f1f5f9;
    --surface-elevated: #e2e8f0;
    --text: #0f172a;
    --text-muted: #64748b;
    --border: rgba(139, 92, 246, 0.2);
    --accent: #059669;
    --accent-violet: #7c3aed;
    --on-accent: #ffffff;
    --success: #059669;
    --error: #e11d48;
    --warning: #d97706;
}

body {
    accent-color: var(--accent);
    font-family: var(--font-body);
    background-color: var(--bg);
    color: var(--text);
    line-height: 1.55;
    max-width: 1600px;
    width: 95vw;
    margin: 1.5rem auto 3rem;
    padding: 0 1.5rem;
    transition: background-color 0.3s, color 0.3s;
    font-variant-numeric: tabular-nums;
}

h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    letter-spacing: -0.02em;
}

a {
    color: var(--accent);
    text-decoration: none;
    transition: color 0.2s;
}

a:hover {
    color: #38bdf8;
    text-decoration: underline;
}

/* ==========================================================================
   Navbar & Branding (AniimoLab Cyber Oasis)
   ========================================================================== */

.app-navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(180deg, rgba(20, 19, 34, 0.85) 0%, rgba(14, 13, 24, 0.95) 100%);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(139, 92, 246, 0.28);
    border-radius: var(--radius-lg);
    padding: 1rem 1.75rem;
    margin-bottom: 1.75rem;
    box-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.navbar-brand-wrapper {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.brand-badge-icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    background: linear-gradient(135deg, rgba(0, 245, 160, 0.2) 0%, rgba(139, 92, 246, 0.3) 100%);
    border: 1px solid rgba(0, 245, 160, 0.4);
    border-radius: 12px;
    box-shadow: 0 0 15px rgba(0, 245, 160, 0.25);
}

.brand-titles {
    display: flex;
    flex-direction: column;
}

.brand-title {
    font-family: var(--font-heading);
    font-size: 1.75rem;
    font-weight: 800;
    line-height: 1.1;
    color: var(--text);
    letter-spacing: -0.03em;
}

.brand-gradient {
    background: linear-gradient(135deg, #00f5a0 0%, #a855f7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    padding-left: 2px;
}

.brand-tagline {
    font-size: 0.78rem;
    color: var(--text-muted);
    font-weight: 500;
}

.navbar-pills {
    display: flex;
    gap: 0.5rem;
    margin-left: 0.75rem;
}

.nav-pill {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.pill-pro {
    background: rgba(139, 92, 246, 0.15);
    color: #c084fc;
    border: 1px solid rgba(139, 92, 246, 0.35);
}

.pill-engine {
    background: rgba(6, 182, 212, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(6, 182, 212, 0.35);
}

.pill-emode {
    background: rgba(0, 245, 160, 0.15);
    color: #00f5a0;
    border: 1px solid rgba(0, 245, 160, 0.4);
    box-shadow: 0 0 10px rgba(0, 245, 160, 0.2);
}

.navbar-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.nav-btn {
    cursor: pointer;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.55rem 1rem;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-btn:hover {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.45);
    color: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
}

.theme-toggle-btn {
    border-color: rgba(0, 245, 160, 0.25);
}
.theme-toggle-btn:hover {
    border-color: rgba(0, 245, 160, 0.5);
    box-shadow: 0 4px 12px rgba(0, 245, 160, 0.2);
}

/* Cyber Alert Banner */
.cyber-alert {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(20, 19, 34, 0.6);
    border: 1px solid rgba(0, 245, 160, 0.25);
    border-radius: var(--radius-sm);
    padding: 0.75rem 1.25rem;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    color: #f8fafc;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.alert-icon {
    font-size: 1.1rem;
    color: #00f5a0;
    filter: drop-shadow(0 0 6px #00f5a0);
}

/* Card Styling Upgrade */
.card {
    background: linear-gradient(180deg, rgba(20, 19, 34, 0.88) 0%, rgba(14, 13, 24, 0.96) 100%) !important;
    border: 1px solid rgba(139, 92, 246, 0.2) !important;
    border-radius: var(--radius) !important;
    padding: 1.5rem !important;
    box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
    transition: border-color 0.2s;
}

.card:hover {
    border-color: rgba(139, 92, 246, 0.35) !important;
}

.card h2 {
    font-family: var(--font-heading) !important;
    font-weight: 700 !important;
    font-size: 1.25rem !important;
    color: #f8fafc !important;
    letter-spacing: -0.02em !important;
}

/* CTA Button (#optimize-btn) */
#optimize-btn {
    background: linear-gradient(135deg, #00f5a0 0%, #00d287 40%, #8b5cf6 100%) !important;
    color: #0a0a0f !important;
    font-family: var(--font-heading) !important;
    font-size: 1.15rem !important;
    font-weight: 800 !important;
    letter-spacing: 0.02em !important;
    padding: 1rem 2.25rem !important;
    border: none !important;
    border-radius: var(--radius) !important;
    box-shadow: 0 4px 25px -2px rgba(0, 245, 160, 0.45), 0 0 20px rgba(139, 92, 246, 0.3) !important;
    cursor: pointer !important;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

#optimize-btn:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 35px rgba(0, 245, 160, 0.65), 0 0 30px rgba(139, 92, 246, 0.5) !important;
    filter: brightness(1.1) !important;
}

#optimize-btn:active {
    transform: translateY(0px) scale(0.98) !important;
}

/* Form Controls & Inputs */
input[type="number"],
input[type="text"],
select {
    background: var(--surface-2, #1e1c31) !important;
    border: 1px solid rgba(139, 92, 246, 0.28) !important;
    color: #f8fafc !important;
    border-radius: var(--radius-sm) !important;
    padding: 0.6rem 0.85rem !important;
    font-family: var(--font-body) !important;
    font-size: 0.9rem !important;
    transition: border-color 0.2s, box-shadow 0.2s !important;
}

input[type="number"]:focus,
input[type="text"]:focus,
select:focus {
    border-color: #00f5a0 !important;
    box-shadow: 0 0 0 3px rgba(0, 245, 160, 0.25) !important;
    outline: none !important;
}

/* Footer Upgrade */
.app-footer {
    margin-top: 3.5rem;
    padding: 2rem 1.5rem;
    text-align: center;
    background: linear-gradient(180deg, rgba(20, 19, 34, 0.4) 0%, rgba(10, 10, 15, 0.9) 100%);
    border-top: 1px solid rgba(139, 92, 246, 0.18);
    border-radius: var(--radius-lg);
}

.footer-brand {
    font-family: var(--font-heading);
    font-size: 1.15rem;
    color: #f8fafc;
    margin-bottom: 0.5rem;
}

.footer-ver {
    background: rgba(139, 92, 246, 0.2);
    color: #c084fc;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    margin-left: 0.35rem;
}

.footer-note {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
}

"""

css = new_header_and_body + css[idx_end:]

with open('web/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('Updated web/style.css with Cyber Oasis theme!')
