# AniimoLab

A modern, high-performance simulation suite, Rust optimization library, and **web application** for production planning in Aniimo Homeland. Calculate mathematically optimal production paths, simulate distributed multi-hub logistics, model electric power grids, and generate precise Homeland layouts.

Powered by the [HiGHS](https://highs.dev) Mixed-Integer Linear Programming (MIP) solver compiled to WebAssembly, AniimoLab solves the entire Homeland problem jointly—simultaneously planning recipes, full-unit plot/machine dedications, climate micro-zones, and electrical grids.

> **Note:** AniimoLab is an advanced fork of [Aniimax](https://github.com/ae-bii/aniimax) by [aebii](https://github.com/ae-bii), extended with multi-hub logistics, power grid simulation, and climate micro-zoning optimizations.

---

## Features

### 🌟 Advanced Web Application

- **Cyber Oasis Interface**: Modern widescreen design with responsive 2-column layout, real-time power gauges, interactive canvas rendering, and dark-mode cyberpunk aesthetic.
- **Exact MIP Optimization**: Employs the HiGHS solver in WebAssembly to prove the global optimum for your facilities, recipes, plot assignments, and environmental coverage without double-counting shared ingredients.
- **Multi-Hub Logistics (3–5 Storage Units)**:
  - Supports deploying 3, 4, or 5 distributed Storage Units across your Homeland.
  - Automatically clusters and assigns facilities to dedicated functional hubs (Central, Agricultural, Workshop, Forestry, Expansion).
  - Routes worker hauling trips to the nearest valid storage hub, cutting walking overhead by up to 58%.
- **Electric Mode (E-Mode) & Power Grid Network**:
  - Full support for E-Mode machine operations (2.2× processing speedup on base 27s processing cycle).
  - Models the **Crackle Generator** (official 2×2 footprint, 11×11 square coverage grid).
  - Simulates **Crackle Power Poles** (1.5×1.5 footprint, 7×7 square relay network) with visual high-voltage power transmission lines.
  - Dynamic power budgeting (600W to 1500W based on Homeland Generator tier).
- **Climate Micro-Zoning & Packing Optimization**:
  - Models Heat Furnaces, Cooling Units, and Sunlamps (9×9 coverage area).
  - Features perimeter-shifted Farmland packing that fits up to 32 Farmland plots and Starfall Hammocks inside a single 9×9 Cooling Unit cluster, eliminating wasteful redundant climate units.
  - Full support for dual-building temperature overlap (Scorching + Cool creating intermediate Warm zones).
- **Flexible Optimization Strategies**:
  - **Most Coins**: Maximizes pure Homeland coin generation per hour.
  - **Next RV Level-Up**: Plans the fastest path to your next RV level (RV 2–20), automatically accounting for raw materials (Wood Blocks, Mineral Sand) and advanced workshop requirements (Standard Planks, Refined Ore, Laminated Beams).
  - **Multi-Priority Ranking**: Prioritize Home Coins, Aniimo EXP, Aniipods, or Harvest Moon Points.
- **Aniimo Workforce Planning**:
  - Calculates exact workforce requirements (ability levels, personalities, and work hours).
  - Supports opposed personality pairs (Instinctive/Energetic, Nimble/Practical, Faithful/Tenacious, Playful/Judicious) for facility bonuses.
  - "My Aniimo" mode to optimize specifically with the exact Aniimo roster you own.
- **Homeland Canvas & Real-Time Traffic Simulation**:
  - Visual Homeland grid canvas with plot boundaries, climate auras, and power grids.
  - Animated worker transport simulation showing logistics traffic between facilities and storage hubs.
- **Why this Plan? & Insights**:
  - Live analytical breakdown explaining primary profit drivers, logistics savings, climate coverage percentage, and grid utilization.

### ⚡ Rust Core Engine & CLI

- High-performance Rust modeling engine with both exact MIP and fast heuristic search algorithms.
- Configurable currency goals, item skip filters, and upgrade module support.
- Fully offline and scriptable via command line.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/tools/install) (1.70 or later)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) (for compiling Rust to WebAssembly)

---

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/AniimoLab.git
   cd AniimoLab
   ```

2. **Build the WebAssembly module:**
   ```bash
   # Windows (PowerShell)
   wasm-pack build --target web --out-dir web/pkg

   # Linux / macOS
   ./build-wasm.sh
   ```

3. **Start the local development server:**
   AniimoLab includes a dedicated Node.js development server that enforces strict `no-cache` headers, preventing stale browser asset caching during development:
   ```bash
   node scratch/server.mjs
   ```
   Open [http://localhost:8000](http://localhost:8000) in your browser.

---

### CLI Usage

Build and run the Rust command-line tool directly:

```bash
# Build release binary
cargo build --release

# Find the fastest route to 50,000 coins
cargo run --release -- --target 50000 --currency coins

# Plan with specific facility levels and modules
cargo run --release -- --target 10000 --currency coins \
    --farmland 8 --farmland-level 3 \
    --woodland 4 --woodland-level 3 \
    --carousel-mill 2 --carousel-mill-level 2 \
    --ecological-module 2
```

---

## Deployment to GitHub Pages

This repository is configured with automated GitHub Actions (`.github/workflows/deploy.yml`) to deploy the web application directly to GitHub Pages.

### Setup Instructions

1. Push your code to your GitHub repository on branch `main`:
   ```bash
   git add .
   git commit -m "feat: deploy AniimoLab web app"
   git push origin main
   ```

2. Enable GitHub Pages in your repository settings:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.

3. The workflow will automatically compile the Rust WASM package, bundle the web assets, and deploy to:
   ```
   https://<your-username>.github.io/AniimoLab/
   ```

---

## Project Structure

```
AniimoLab/
├── data/                      # Game production CSV datasets
│   ├── farmland.csv           # Crop recipes, seed costs, growing conditions
│   ├── woodland.csv           # Tree harvesting & wood yields
│   ├── mine.csv               # Mineral extraction & stone data
│   ├── simmering_pot.csv      # Porridge, jams, and syrups
│   ├── jukebox_dryer.csv      # Dried foods and ingredient processing
│   ├── carousel_mill.csv      # Milling and flour recipes
│   └── ...                    # All other facility databases
├── src/                       # Rust optimization engine
│   ├── lib.rs                 # Library exports & engine interface
│   ├── exact.rs               # Mixed-Integer Linear Programming model
│   ├── optimizer.rs           # Fast heuristic solver
│   ├── coverage.rs            # Environmental geometry and tile packing
│   ├── models.rs              # Production data structures
│   ├── wasm.rs                # WebAssembly JavaScript bindings
│   └── main.rs                # CLI entry point
├── web/                       # Web application frontend
│   ├── index.html             # Application UI & layout templates
│   ├── app.js                 # Frontend orchestration, charts & UI logic
│   ├── layout.js              # Multi-hub layout solver & placement algorithm
│   ├── facility-config.js     # Facility footprints, levels, and constants
│   ├── style.css              # Cyber Oasis design system & styling
│   ├── worker.js              # Web Worker running WASM optimizer & HiGHS
│   ├── layout-worker.js       # Background layout placement worker
│   ├── vendor/highs/          # HiGHS solver WebAssembly binaries
│   └── pkg/                   # Compiled Rust WASM package
├── scratch/                   # Helper scripts & development server
│   └── server.mjs             # High-performance no-cache local server
└── .github/workflows/         # CI/CD workflows
    └── deploy.yml             # GitHub Actions Pages deployment
```

---

## Acknowledgements & Attribution

AniimoLab is forked from and builds upon the excellent open-source project **[Aniimax](https://github.com/ae-bii/aniimax)** created by **[@aebii](https://github.com/ae-bii)**.

We express our sincere gratitude to **aebii** for:
- Establishing the core mathematical models, game datasets, and LP/MIP formulation for Aniimo Homeland.
- Providing the foundational WebAssembly architecture and HiGHS solver integration.

AniimoLab modernizes and extends the original work with:
- **Cyber Oasis UI**: Modern widescreen responsive interface, interactive power gauges, and visual insights.
- **Multi-Hub Logistics**: Automated 3–5 Storage Unit clustering and nearest-path hauling optimization.
- **Electric Mode (E-Mode)**: Full power grid simulation with Crackle Generator (11×11) and Power Poles (7×7).
- **Climate Micro-Zoning**: Perimeter-shifted packing fitting up to 32 plots under a single Cooling Unit.
- **Real-Time Traffic**: Animated canvas worker traffic simulation.

In full compliance with the [MIT License](LICENSE), the original copyright notice (`Copyright 2026-Present aebii`) is preserved and respected.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
All original contributions remain Copyright (c) 2026-Present aebii.
Additional enhancements and modifications are Copyright (c) 2026-Present AniimoLab Contributors.
