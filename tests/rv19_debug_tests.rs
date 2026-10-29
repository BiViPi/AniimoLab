use aniimax::exact::{solve_exact, Goal};
use aniimax::wasm::PreparedInput;
use std::time::Duration;

fn build_rv19_input(skip_quick_strawberry: bool, emode_facilities: &[&str], emode_counts: &[(&str, u32)]) -> String {
    let mut exclusions = vec![
        // Woodland crops below tier 6:
        "willow_wood", "bamboo", "lemon", "cherry_blossom", "apple", "maple_syrup", "quick_bamboo",
        "palm_bark", "chestnut", "walnut", "quick_lemon", "natural_rubber", "coconut", "quick_maple_syrup",
        // Quick recipes unlocked:
        "sea_salt", "rice", "wheat", "potato", "bamboo", "lemon", "maple_syrup", "coconut",
        "well_water", "fresh_water", "deep_rock_spring_water", "natural_mineral_spring_water",
        "wool", "aromathyst", "scales"
    ];
    if skip_quick_strawberry {
        exclusions.push("quick_strawberry");
        exclusions.push("strawberry");
    } else {
        exclusions.push("strawberry");
    }

    let exclusions_json = serde_json::to_string(&exclusions).unwrap();

    let emode_facs_json = serde_json::to_string(&emode_facilities).unwrap();
    let emode_counts_map: std::collections::HashMap<&str, u32> = emode_counts.iter().cloned().collect();
    let emode_counts_json = serde_json::to_string(&emode_counts_map).unwrap();

    format!(r#"{{
        "currency": "coins",
        "home_level": 19,
        "facilities": {{
            "Farmland": [{{"count": 40, "level": 7}}],
            "Woodland": [{{"count": 20, "level": 6}}],
            "Mine": [{{"count": 10, "level": 6}}],
            "Well": [{{"count": 4, "level": 5}}],
            "Tidewhisper Sandcastle": [{{"count": 2, "level": 3}}],
            "Dewy House": [{{"count": 2, "level": 2}}],
            "Nimbus Bed": [{{"count": 2, "level": 3}}],
            "Starfall Hammock": [{{"count": 2, "level": 1}}],
            "Floral Windmill": [{{"count": 1, "level": 1}}],
            "Heat Furnace": [{{"count": 3, "level": 1}}],
            "Cooling Unit": [{{"count": 3, "level": 1}}],
            "Sunlamp": [{{"count": 3, "level": 1}}],
            "Carousel Mill": [{{"count": 2, "level": 6}}],
            "Crafting Table": [{{"count": 2, "level": 7}}],
            "Claw Game Cooker": [{{"count": 2, "level": 7}}],
            "Jukebox Dryer": [{{"count": 2, "level": 7}}],
            "Simmering Pot": [{{"count": 2, "level": 6}}],
            "Phonolfactory Table": [{{"count": 2, "level": 6}}],
            "Bouncy Brew Keg": [{{"count": 2, "level": 5}}],
            "Blazing Stove": [{{"count": 2, "level": 5}}],
            "Pickling Jar": [{{"count": 1, "level": 5}}],
            "Joy Wheel Loom": [{{"count": 2, "level": 4}}],
            "Dance Pad Polisher": [{{"count": 1, "level": 3}}],
            "Aniipod Maker": [{{"count": 1, "level": 3}}],
            "Woodworking Bench": [{{"count": 4, "level": 4}}],
            "Chimney Kiln": [{{"count": 4, "level": 4}}]
        }},
        "modules": {{
            "ecological_module": 8,
            "kitchen_module": 7,
            "resource_detector": 8,
            "crafting_module": 7,
            "power_module": 4,
            "plant_research_module": 4,
            "incubation_reaction_module": 1,
            "signal_emitter": 3
        }},
        "production_aniimo_cap": 44,
        "power_poles": 3,
        "power_grid_rate": 1.0,
        "specialist_quotas": {{ "earth_4p_mines": 0, "water_4f_wells": 2 }},
        "facility_overrides": [],
        "emode_facilities": {emode_facs_json},
        "emode_facility_counts": {emode_counts_json},
        "exclude": {exclusions_json},
        "aniimo": "best"
    }}"#)
}

#[test]
fn test_rv19_both_scenarios() {
    println!("\n=================================================");
    println!("Solving Case 1 (WITH Quick Strawberry)");
    println!("=================================================");
    let json1 = build_rv19_input(false, &[], &[]);
    let prep1 = PreparedInput::from_json(&json1).unwrap();
    let plan1 = solve_exact(
        &prep1.items,
        "coins",
        &prep1.facility_counts,
        &prep1.module_levels,
        Goal::Earn { floors: &[] },
        Some(Duration::from_secs(60)),
        None,
    ).expect("solve 1");

    println!("Plan 1 Coin Rate: {:.1}/h", plan1.rate_per_second * 3600.0);
    let prod_plan1 = aniimax::exact::to_production_plan(&plan1, &prep1.items, "coins", &prep1.facility_counts);
    let js_plan1 = prep1.to_js(prod_plan1, None);
    println!("Plan 1 Steps:");
    for s in &js_plan1.coin_items {
        if s.status == "producing" {
            println!("  {:25} : {:30} | count={:2} | busy={:?}", s.facility, s.item_name.as_deref().unwrap_or(""), s.facility_count, s.busy_units);
        }
    }

    println!("\n=================================================");
    println!("Solving Case 2 (SKIP Quick Strawberry)");
    println!("=================================================");
    let json2 = build_rv19_input(true, &[], &[]);
    let prep2 = PreparedInput::from_json(&json2).unwrap();
    let plan2 = solve_exact(
        &prep2.items,
        "coins",
        &prep2.facility_counts,
        &prep2.module_levels,
        Goal::Earn { floors: &[] },
        Some(Duration::from_secs(60)),
        None,
    ).expect("solve 2");

    println!("Plan 2 Coin Rate: {:.1}/h", plan2.rate_per_second * 3600.0);
    let prod_plan2 = aniimax::exact::to_production_plan(&plan2, &prep2.items, "coins", &prep2.facility_counts);
    let js_plan2 = prep2.to_js(prod_plan2, None);
    println!("Plan 2 Steps:");
    for s in &js_plan2.coin_items {
        if s.status == "producing" {
            println!("  {:25} : {:30} | count={:2} | busy={:?}", s.facility, s.item_name.as_deref().unwrap_or(""), s.facility_count, s.busy_units);
        }
    }
}
