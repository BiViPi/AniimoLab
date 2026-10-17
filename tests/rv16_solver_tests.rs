//! Integration and TDD tests for RV 16 Solver Two-Tier Architecture.
//! Covers TC-01 to TC-07 defined in research/05-ke-hoach-trien-khai-solver-2-tang.md.

use aniimax::exact::{solve_exact, Goal};
use aniimax::wasm::PreparedInput;

fn rv16_base_json(
    emode_mine_count: u32,
    earth_4p_quota: Option<u32>,
    overrides_json: &str,
    roster_earth_4p_count: u32,
) -> String {
    let roster_snippet = if roster_earth_4p_count > 0 {
        format!(
            r#",
            "aniimo": "roster",
            "roster": {{
                "members": [
                    {{
                        "count": {},
                        "abilities": {{ "Earth": 4 }},
                        "personalities": ["Energetic", "Nimble", "Faithful", "Playful"]
                    }},
                    {{
                        "count": 2,
                        "abilities": {{ "Water": 1 }},
                        "personalities": []
                    }}
                ],
                "personalities": {{ "Mine": "Playful" }}
            }}"#,
            roster_earth_4p_count
        )
    } else {
        r#", "aniimo": "best""#.to_string()
    };

    let quota_snippet = if let Some(q) = earth_4p_quota {
        format!(r#", "specialist_quotas": {{ "earth_4p_mines": {} }}"#, q)
    } else {
        String::new()
    };

    format!(
        r#"{{
            "currency": "coins",
            "facilities": {{
                "Farmland": [{{"count": 34, "level": 7}}],
                "Woodland": [{{"count": 17, "level": 5}}],
                "Mine": [{{"count": 8, "level": 5}}],
                "Well": [{{"count": 3, "level": 4}}]
            }},
            "modules": {{
                "ecological_module": 6,
                "kitchen_module": 6,
                "resource_detector": 6,
                "crafting_module": 4
            }},
            "production_aniimo_cap": 26,
            "power_poles": 2,
            "power_grid_rate": 1.2,
            "emode_facilities": ["Mine"],
            "emode_facility_counts": {{ "Mine": {} }},
            "facility_overrides": {}{}{}
        }}"#,
        emode_mine_count,
        overrides_json,
        quota_snippet,
        roster_snippet
    )
}

#[test]
fn test_rv16_tc01_macro_quota_split() {
    // TC-01: 8 Mỏ Lv.5, 3 Prismana Thổ 4P trong Roster, Quota = 3, E-mode = 5.
    // Kỳ vọng: 5 Mỏ Điện E-mode, 3 Mỏ Prismana Thổ 4P.
    let json_str = rv16_base_json(5, Some(3), "[]", 3);
    let prepared = PreparedInput::from_json(&json_str).expect("parse input");

    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine (Electric)", 5),
        5,
        "Expected exactly 5 Mine units in E-mode"
    );
    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine (Prismana)", 5),
        3,
        "Expected exactly 3 Mine units assigned to Prismana Earth 4P"
    );
    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine", 5),
        0,
        "Original Mine tier 5 should be fully partitioned"
    );

    // Kiểm tra trừ lao động trụ điện (26 - 2 = 24)
    assert_eq!(
        prepared.facility_counts.worker_cap(),
        Some(24),
        "Production Aniimo cap must deduct 2 power pole guards"
    );

    // Giải bài toán exact solver để kiểm tra doanh thu
    let plan = solve_exact(
        &prepared.items,
        "coins",
        &prepared.facility_counts,
        &prepared.module_levels,
        Goal::Earn { floors: &[] },
        Some(std::time::Duration::from_secs(60)),
        None,
    )
    .expect("solve exact plan");

    println!("PLAN RECIPE RATES: {:#?}", plan.recipe_rates);
    println!("PLAN UNITS: {:#?}", plan.units);
    println!("PLAN SOLD: {:#?}", plan.sold);
    let prod_plan = aniimax::exact::to_production_plan(&plan, &prepared.items, "coins", &prepared.facility_counts);
    let js_plan = prepared.to_js(prod_plan, None);

    let electric_step = js_plan.coin_items.iter().find(|s| s.facility == "Mine" && s.is_emode);
    assert!(electric_step.is_some(), "Must have an Electric Mine step");
    assert_eq!(electric_step.unwrap().facility_count, 5, "5 Electric mines expected");

    let prismana_step = js_plan.coin_items.iter().find(|s| s.facility == "Mine" && !s.is_emode && s.aniimo.is_some());
    assert!(prismana_step.is_some(), "Must have a Prismana Mine step");
    assert_eq!(prismana_step.unwrap().facility_count, 3, "3 Prismana mines expected");

    let quartz_sold_per_sec = plan.sold.get("quartz_ore").copied().unwrap_or(0.0);
    assert!(
        (quartz_sold_per_sec - 0.024).abs() < 1e-6,
        "Quartz Ore production must be exactly 0.024/s (86.4/h), got {}",
        quartz_sold_per_sec
    );
    let mine_revenue_per_hour = quartz_sold_per_sec * 300.0 * 3600.0;
    assert!(
        (mine_revenue_per_hour - 25920.0).abs() < 1.0,
        "Mine revenue must be 25,920 coins/h, got {}",
        mine_revenue_per_hour
    );
}

#[test]
fn test_rv16_tc02_worksheet_override_all_electric() {
    // TC-02: Worksheet Overrides khóa cả 8 Mỏ chạy Điện
    let overrides = r#"[{"facility": "Mine", "level": 5, "electric_count": 8, "specialist_count": 0, "manual_count": 0}]"#;
    let json_str = rv16_base_json(5, Some(3), overrides, 3);
    let prepared = PreparedInput::from_json(&json_str).expect("parse input");

    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine (Electric)", 5),
        8,
        "Worksheet override must enforce all 8 mines into E-mode"
    );
    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine (Prismana)", 5),
        0
    );
    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine (Manual)", 5),
        0
    );
}

#[test]
fn test_rv16_tc03_anti_phantom_clamping() {
    // TC-03: Khai gian Quota = 5 nhưng Roster chỉ có 1 Prismana Thổ 4P.
    // Kỳ vọng: Chỉ đúng 1 Mỏ chạy Prismana, 7 mỏ còn lại chuyển sang E-mode / Manual.
    let json_str = rv16_base_json(5, Some(5), "[]", 1);
    let prepared = PreparedInput::from_json(&json_str).expect("parse input");

    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine (Prismana)", 5),
        1,
        "Anti-phantom clamp must cap specialist mines to actual roster count of 1"
    );
}

#[test]
fn test_rv16_power_poles_labor_deduction() {
    // Kiểm tra khi không có E-mode thì cap giữ nguyên 26, có E-mode thì bị trừ đúng 2
    let no_emode_json = r#"{
        "currency": "coins",
        "facilities": { "Mine": [{"count": 8, "level": 5}] },
        "production_aniimo_cap": 26,
        "power_poles": 2,
        "emode_facility_counts": {}
    }"#;
    let prep_no_emode = PreparedInput::from_json(no_emode_json).expect("parse");
    assert_eq!(
        prep_no_emode.facility_counts.worker_cap(),
        Some(26),
        "Without E-mode, power poles should not deduct workers"
    );

    let with_emode_json = r#"{
        "currency": "coins",
        "facilities": { "Mine": [{"count": 8, "level": 5}] },
        "production_aniimo_cap": 26,
        "power_poles": 2,
        "emode_facility_counts": { "Mine": 2 }
    }"#;
    let prep_with_emode = PreparedInput::from_json(with_emode_json).expect("parse");
    assert_eq!(
        prep_with_emode.facility_counts.worker_cap(),
        Some(24),
        "With E-mode active, power poles must deduct guards from cap"
    );
}

#[test]
fn test_rv16_tc06_mixed_mine_tiers() {
    // TC-06: Mỏ hỗn hợp cấp độ: 5 Mỏ Cấp 5, 3 Mỏ Cấp 4.
    // Quota Thổ = 3, E-mode = 5.
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Mine": [{"count": 5, "level": 5}, {"count": 3, "level": 4}]
        },
        "modules": { "resource_detector": 5 },
        "production_aniimo_cap": 26,
        "emode_facility_counts": { "Mine": 5 },
        "specialist_quotas": { "earth_4p_mines": 3 },
        "aniimo": "roster",
        "roster": {
            "members": [
                {
                    "count": 3,
                    "abilities": { "Earth": 4 },
                    "personalities": ["Playful"]
                }
            ],
            "personalities": { "Mine": "Playful" }
        }
    }"#;

    let prepared = PreparedInput::from_json(json_str).expect("parse input");
    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine", 4),
        3,
        "Tier 4 mines must NOT be modified or partitioned"
    );
    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine (Electric)", 5),
        5,
        "Tier 5 mines must be partitioned to 5 Electric"
    );
    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine (Prismana)", 5),
        0,
        "No remaining Tier 5 mines available for Prismana"
    );
}

#[test]
fn test_rv16_tc07_generic_setup_without_roster() {
    // TC-07: Setup generic "best", không có Roster.
    let json_str = r#"{
        "currency": "coins",
        "facilities": { "Mine": [{"count": 8, "level": 5}] },
        "production_aniimo_cap": 26,
        "emode_facility_counts": { "Mine": 5 },
        "specialist_quotas": { "earth_4p_mines": 3 },
        "aniimo": "best"
    }"#;

    let prepared = PreparedInput::from_json(json_str).expect("parse input");
    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine (Electric)", 5),
        5
    );
    assert_eq!(
        prepared.facility_counts.get_tier_count("Mine (Prismana)", 5),
        3
    );
}

#[test]
fn test_rv16_tc05_well_dag_balance() {
    // TC-05: Bảo toàn chuỗi cung ứng DAG & Phân rã Giếng Nước (Well Lv.4)
    // Kịch bản: 3 Giếng Nước Lv.4, 1 Giếng Điện (120W), 1 Giếng Prismana Thủy 4F, 1 Giếng Thủ công.
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Farmland": [{"count": 34, "level": 7}],
            "Woodland": [{"count": 17, "level": 5}],
            "Mine": [{"count": 8, "level": 5}],
            "Well": [{"count": 3, "level": 4}]
        },
        "modules": {
            "ecological_module": 6,
            "kitchen_module": 6,
            "resource_detector": 6,
            "crafting_module": 4
        },
        "production_aniimo_cap": 26,
        "power_poles": 2,
        "power_grid_rate": 1.2,
        "emode_facilities": ["Mine", "Well"],
        "emode_facility_counts": { "Mine": 5, "Well": 1 },
        "specialist_quotas": {
            "earth_4p_mines": 3,
            "water_4f_wells": 1
        },
        "facility_overrides": [],
        "aniimo": "roster",
        "roster": {
            "members": [
                {
                    "count": 3,
                    "abilities": { "Earth": 4 },
                    "personalities": ["Playful"]
                },
                {
                    "count": 1,
                    "abilities": { "Water": 4 },
                    "personalities": ["Faithful"]
                }
            ],
            "personalities": {
                "Mine": "Playful",
                "Well": "Faithful"
            }
        }
    }"#;

    let prepared = PreparedInput::from_json(json_str).expect("parse input");

    // 1. Kiểm tra phân rã Giếng Nước:
    assert_eq!(
        prepared.facility_counts.get_tier_count("Well (Electric)", 4),
        1,
        "Expected 1 Well unit in E-mode"
    );
    assert_eq!(
        prepared.facility_counts.get_tier_count("Well (Prismana)", 4),
        1,
        "Expected 1 Well unit for Water 4F Specialist"
    );
    assert_eq!(
        prepared.facility_counts.get_tier_count("Well (Manual)", 4),
        1,
        "Expected 1 Well unit in Manual mode"
    );
    assert_eq!(
        prepared.facility_counts.get_tier_count("Well", 4),
        0,
        "Well tier 4 should be completely partitioned"
    );

    // 2. Giải solver và kiểm tra DAG flow & tính khả thi:
    let plan = solve_exact(
        &prepared.items,
        "coins",
        &prepared.facility_counts,
        &prepared.module_levels,
        Goal::Earn { floors: &[] },
        Some(std::time::Duration::from_secs(60)),
        None,
    )
    .expect("solve exact plan with partitioned Well");

    assert!(plan.rate_per_second > 0.0, "Plan must earn positive coins/sec");

    let prod_plan = aniimax::exact::to_production_plan(&plan, &prepared.items, "coins", &prepared.facility_counts);
    let js_plan = prepared.to_js(prod_plan, None);

    // 3. Kiểm tra ánh xạ hiển thị cho Well Prismana trong to_js (Water, Level 4, Personality bonus):
    let well_prismana_step = js_plan.coin_items.iter().find(|s| {
        s.facility == "Well" && s.is_specialist && s.aniimo.as_ref().map_or(false, |a| a.ability == "Water")
    });
    assert!(
        well_prismana_step.is_some(),
        "Must have a Well Prismana step with Water ability mapped in to_js"
    );
    let aniimo = well_prismana_step.unwrap().aniimo.as_ref().unwrap();
    assert_eq!(aniimo.ability, "Water");
    assert_eq!(aniimo.level, 4);
    assert!(aniimo.personality_bonus, "Must receive Faithful personality bonus");

    // 4. Kiểm tra ghi đè Worksheet Override cho Well:
    let override_json = r#"{
        "currency": "coins",
        "facilities": {
            "Well": [{"count": 3, "level": 4}]
        },
        "production_aniimo_cap": 26,
        "facility_overrides": [
            {
                "facility": "Well",
                "level": 4,
                "electric_count": 2,
                "specialist_count": 1,
                "manual_count": 0
            }
        ],
        "aniimo": "best"
    }"#;
    let prepared_override = PreparedInput::from_json(override_json).expect("parse override input");
    assert_eq!(
        prepared_override.facility_counts.get_tier_count("Well (Electric)", 4),
        2,
        "Override must enforce 2 electric wells"
    );
    assert_eq!(
        prepared_override.facility_counts.get_tier_count("Well (Prismana)", 4),
        1,
        "Override must enforce 1 specialist well"
    );
    assert_eq!(
        prepared_override.facility_counts.get_tier_count("Well (Manual)", 4),
        0,
        "Override must enforce 0 manual wells"
    );
}

#[test]
fn test_rv15_power_and_guards() {
    // RV15: 2 power poles, 1600W total capacity (800W per pole)
    let rv15_active_json = r#"{
        "currency": "coins",
        "facilities": { "Mine": [{"count": 4, "level": 5}] },
        "production_aniimo_cap": 24,
        "power_poles": 2,
        "power_grid_rate": 1.2,
        "emode_facilities": ["Mine"],
        "emode_facility_counts": { "Mine": 2 }
    }"#;
    let prep_active = PreparedInput::from_json(rv15_active_json).expect("parse rv15 active");
    assert_eq!(
        prep_active.facility_counts.guards(),
        2,
        "RV15 with active E-mode must have 2 guards"
    );
    assert_eq!(
        prep_active.facility_counts.worker_cap(),
        Some(22),
        "RV15 must deduct 2 guards from 24 worker cap -> 22"
    );

    let rv15_inactive_json = r#"{
        "currency": "coins",
        "facilities": { "Mine": [{"count": 4, "level": 5}] },
        "production_aniimo_cap": 24,
        "power_poles": 2,
        "power_grid_rate": 1.2,
        "emode_facilities": [],
        "emode_facility_counts": {}
    }"#;
    let prep_inactive = PreparedInput::from_json(rv15_inactive_json).expect("parse rv15 inactive");
    assert_eq!(
        prep_inactive.facility_counts.guards(),
        0,
        "RV15 with no active E-mode must have 0 guards"
    );
    assert_eq!(
        prep_inactive.facility_counts.worker_cap(),
        Some(24),
        "RV15 without E-mode keeps full 24 worker cap"
    );
}

#[test]
fn test_roster_guard_reservation() {
    // Roster has 6 members. With 2 power poles active in E-mode, at most 4 members can work production.
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Mine": [{"count": 5, "level": 5}]
        },
        "power_poles": 2,
        "power_grid_rate": 1.2,
        "emode_facilities": ["Mine"],
        "emode_facility_counts": { "Mine": 2 },
        "aniimo": "roster",
        "roster": {
            "members": [
                {
                    "count": 6,
                    "abilities": { "Earth": 4 },
                    "personalities": ["Playful"]
                }
            ],
            "personalities": { "Mine": "Playful" }
        }
    }"#;
    let prep = PreparedInput::from_json(json_str).expect("parse roster");
    assert_eq!(prep.facility_counts.guards(), 2);

    let plan = solve_exact(
        &prep.items,
        "coins",
        &prep.facility_counts,
        &prep.module_levels,
        Goal::Earn { floors: &[] },
        Some(std::time::Duration::from_secs(10)),
        None,
    ).expect("solve exact plan with roster guard reservation");

    // Verify through check_plan that roster guard restriction is satisfied
    let checked = aniimax::exact::check_plan(&plan, &prep.items, "coins", &prep.facility_counts, &prep.module_levels, None);
    assert!(checked.is_ok(), "check_plan must pass with roster guard reservation: {:?}", checked.err());

    let total_guards: f64 = plan.guard_staffing.iter().map(|&(_, v)| v).sum();
    assert!((total_guards - 2.0).abs() < 1e-6, "Must assign exactly 2.0 guards, got {}", total_guards);
}

#[test]
fn test_roster_insufficient_for_guards_infeasible() {
    // Roster has only 1 member. With 2 power poles active in E-mode, guards = 2.
    // The solver must find this infeasible (no plan).
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Mine": [{"count": 2, "level": 5}]
        },
        "power_poles": 2,
        "power_grid_rate": 1.0,
        "emode_facilities": ["Mine"],
        "emode_facility_counts": { "Mine": 1 },
        "aniimo": "roster",
        "roster": {
            "members": [
                {
                    "count": 1,
                    "abilities": { "Earth": 4 },
                    "personalities": ["Playful"]
                }
            ],
            "personalities": { "Mine": "Playful" }
        }
    }"#;
    let prep = PreparedInput::from_json(json_str).expect("parse roster");
    assert_eq!(prep.facility_counts.guards(), 2);

    let plan_opt = solve_exact(
        &prep.items,
        "coins",
        &prep.facility_counts,
        &prep.module_levels,
        Goal::Earn { floors: &[] },
        Some(std::time::Duration::from_secs(5)),
        None,
    );
    assert!(
        plan_opt.is_none(),
        "Solver must return None (infeasible) when roster members (1) < guards (2)"
    );
}

#[test]
fn test_roster_strict_no_double_counting_between_guard_and_work() {
    // Roster has exactly 2 members. Guards = 2.
    // Facility has 1 Mine (Manual) needing 1 worker.
    // Since both 2 members must be full-time guards, 0 members are left for manual work.
    // The solver must produce 0 mining rate (or idle).
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Mine": [{"count": 2, "level": 5}]
        },
        "power_poles": 2,
        "power_grid_rate": 1.0,
        "emode_facilities": ["Mine"],
        "emode_facility_counts": { "Mine": 1 },
        "aniimo": "roster",
        "roster": {
            "members": [
                {
                    "count": 2,
                    "abilities": { "Earth": 4 },
                    "personalities": ["Playful"]
                }
            ],
            "personalities": { "Mine": "Playful" }
        }
    }"#;
    let prep = PreparedInput::from_json(json_str).expect("parse roster");
    assert_eq!(prep.facility_counts.guards(), 2);

    let plan = solve_exact(
        &prep.items,
        "coins",
        &prep.facility_counts,
        &prep.module_levels,
        Goal::Earn { floors: &[] },
        Some(std::time::Duration::from_secs(5)),
        None,
    ).expect("solve exact plan");

    let total_guards: f64 = plan.guard_staffing.iter().map(|&(_, v)| v).sum();
    assert!((total_guards - 2.0).abs() < 1e-6, "Must assign exactly 2.0 guards");

    // The remaining 1 manual mine cannot be worked because all 2 workers are guards.
    // The only mine producing must be the 1 electric mine (which requires 0 workers).
    let checked = aniimax::exact::check_plan(&plan, &prep.items, "coins", &prep.facility_counts, &prep.module_levels, None);
    assert!(checked.is_ok(), "check_plan must pass: {:?}", checked.err());
}

#[test]
fn test_rv_power_and_guard_boundary_rules() {
    // RV14: 1 pole, 800W. 0 guards when all-off, 1 guard when any-on.
    let rv14_off = r#"{"facilities": {"Mine": [{"count": 2, "level": 4}]}, "power_poles": 1, "emode_facilities": [], "emode_facility_counts": {}, "production_aniimo_cap": 20}"#;
    let p14_off = PreparedInput::from_json(rv14_off).unwrap();
    assert_eq!(p14_off.facility_counts.guards(), 0);
    assert_eq!(p14_off.facility_counts.worker_cap(), Some(20));

    let rv14_on = r#"{"facilities": {"Mine": [{"count": 2, "level": 4}]}, "power_poles": 1, "emode_facilities": ["Mine"], "emode_facility_counts": {"Mine": 1}, "production_aniimo_cap": 20}"#;
    let p14_on = PreparedInput::from_json(rv14_on).unwrap();
    assert_eq!(p14_on.facility_counts.guards(), 1);
    assert_eq!(p14_on.facility_counts.worker_cap(), Some(19));

    // RV20 provisional: 3 poles, 4500W. 0 guards when all-off, 3 guards when any-on.
    let rv20_off = r#"{"facilities": {"Mine": [{"count": 5, "level": 5}]}, "power_poles": 3, "emode_facilities": [], "emode_facility_counts": {}, "production_aniimo_cap": 30}"#;
    let p20_off = PreparedInput::from_json(rv20_off).unwrap();
    assert_eq!(p20_off.facility_counts.guards(), 0);
    assert_eq!(p20_off.facility_counts.worker_cap(), Some(30));

    let rv20_on = r#"{"facilities": {"Mine": [{"count": 5, "level": 5}]}, "power_poles": 3, "emode_facilities": ["Mine"], "emode_facility_counts": {"Mine": 2}, "production_aniimo_cap": 30}"#;
    let p20_on = PreparedInput::from_json(rv20_on).unwrap();
    assert_eq!(p20_on.facility_counts.guards(), 3);
    assert_eq!(p20_on.facility_counts.worker_cap(), Some(27));
}

#[test]
fn test_mixed_tier_partition_single_tier_emode() {
    // Fixture: Woodworking Bench has 1 unit at Lv.3 and 1 unit at Lv.5 (total = 2).
    // E-mode tier counts specifies only 1 unit of Woodworking Bench at Lv.5 runs in E-mode.
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Woodworking Bench": [
                {"count": 1, "level": 3},
                {"count": 1, "level": 5}
            ]
        },
        "power_poles": 0,
        "emode_facilities": ["Woodworking Bench"],
        "emode_tier_counts": [
            {"facility": "Woodworking Bench", "level": 5, "count": 1}
        ]
    }"#;
    let prep = PreparedInput::from_json(json_str).expect("parse mixed tiers");

    // Total units before and after partition must be strictly preserved (1+1=2):
    let e_count = prep.facility_counts.get_count("Woodworking Bench");
    let m_count = prep.facility_counts.get_count("Woodworking Bench (Manual)");
    assert_eq!(e_count + m_count, 2, "Total units must be strictly preserved (1+1=2)");
    assert_eq!(e_count, 1, "Electric Woodworking Bench must have exactly 1 unit");
    assert_eq!(m_count, 1, "Manual Woodworking Bench must have exactly 1 unit");

    // Tier integrity check:
    // Electric Woodworking Bench must retain level 5:
    assert_eq!(prep.facility_counts.get_tier_count("Woodworking Bench", 5), 1);
    assert_eq!(prep.facility_counts.get_tier_count("Woodworking Bench", 3), 0);
    // Manual Woodworking Bench must retain level 3, NOT incorrectly promoted to level 5:
    assert_eq!(prep.facility_counts.get_tier_count("Woodworking Bench (Manual)", 3), 1);
    assert_eq!(prep.facility_counts.get_tier_count("Woodworking Bench (Manual)", 5), 0);

    // Recipes check:
    let has_manual_items = prep.items.iter().any(|i| i.facility == "Woodworking Bench (Manual)");
    let has_electric_items = prep.items.iter().any(|i| i.facility == "Woodworking Bench");
    assert!(has_manual_items, "Must create Woodworking Bench (Manual) items");
    assert!(has_electric_items, "Must keep Woodworking Bench electric items");
}

#[test]
fn test_mixed_tier_partition_both_tiers_emode() {
    // Both Lv.3 and Lv.5 run in E-mode
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Woodworking Bench": [
                {"count": 1, "level": 3},
                {"count": 1, "level": 5}
            ]
        },
        "power_poles": 0,
        "emode_facilities": ["Woodworking Bench"],
        "emode_tier_counts": [
            {"facility": "Woodworking Bench", "level": 3, "count": 1},
            {"facility": "Woodworking Bench", "level": 5, "count": 1}
        ]
    }"#;
    let prep = PreparedInput::from_json(json_str).expect("parse mixed tiers both e");
    assert_eq!(prep.facility_counts.get_count("Woodworking Bench"), 2);
    assert_eq!(prep.facility_counts.get_count("Woodworking Bench (Manual)"), 0);
    assert_eq!(prep.facility_counts.get_tier_count("Woodworking Bench", 3), 1);
    assert_eq!(prep.facility_counts.get_tier_count("Woodworking Bench", 5), 1);
}

#[test]
fn test_mixed_tier_partition_fallback_from_emode_facility_counts() {
    // When emode_tier_counts is empty, fallback allocates from highest level downwards,
    // preserving the distinct tiers without flattening into a single level.
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Woodworking Bench": [
                {"count": 1, "level": 3},
                {"count": 1, "level": 5}
            ]
        },
        "power_poles": 0,
        "emode_facilities": ["Woodworking Bench"],
        "emode_facility_counts": {
            "Woodworking Bench": 1
        }
    }"#;
    let prep = PreparedInput::from_json(json_str).expect("parse mixed tiers fallback");
    assert_eq!(prep.facility_counts.get_count("Woodworking Bench"), 1);
    assert_eq!(prep.facility_counts.get_count("Woodworking Bench (Manual)"), 1);
    assert_eq!(prep.facility_counts.get_tier_count("Woodworking Bench", 5), 1);
    assert_eq!(prep.facility_counts.get_tier_count("Woodworking Bench (Manual)", 3), 1);
}

#[test]
fn test_mixed_tier_partition_with_fixed_override() {
    // 2 units at Lv.3 and 2 units at Lv.5. Override explicitly sets 1 unit of Lv.3 to electric.
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Woodworking Bench": [
                {"count": 2, "level": 3},
                {"count": 2, "level": 5}
            ]
        },
        "power_poles": 0,
        "facility_overrides": [
            {
                "facility": "Woodworking Bench",
                "level": 3,
                "electric_count": 1,
                "specialist_count": 0
            }
        ]
    }"#;
    let prep = PreparedInput::from_json(json_str).expect("parse mixed tiers override");
    assert_eq!(prep.facility_counts.get_count("Woodworking Bench"), 1);
    assert_eq!(prep.facility_counts.get_count("Woodworking Bench (Manual)"), 3);
    assert_eq!(prep.facility_counts.get_tier_count("Woodworking Bench", 3), 1);
    assert_eq!(prep.facility_counts.get_tier_count("Woodworking Bench (Manual)", 3), 1);
    assert_eq!(prep.facility_counts.get_tier_count("Woodworking Bench (Manual)", 5), 2);
}

#[test]
fn test_override_unowned_level_validation_error() {
    // Facility Mine only owned at Lv.5. User overrides at Lv.4 -> must fail validation!
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Mine": [{"count": 3, "level": 5}]
        },
        "facility_overrides": [
            {
                "facility": "Mine",
                "level": 4,
                "electric_count": 1,
                "specialist_count": 0,
                "manual_count": 0
            }
        ]
    }"#;
    let res = PreparedInput::from_json(json_str);
    assert!(res.is_err(), "PreparedInput must return Err for unowned level override");
    let err_str = res.err().unwrap();
    assert!(err_str.contains("Validation error"), "Error must contain 'Validation error', got: {}", err_str);
    assert!(err_str.contains("Level 4"), "Error must mention Level 4, got: {}", err_str);
}

#[test]
fn test_override_level_overflow_validation_error() {
    // Facility Mine owned 3 units at Lv.5. User overrides 4 electric units -> must fail validation!
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Mine": [{"count": 3, "level": 5}]
        },
        "facility_overrides": [
            {
                "facility": "Mine",
                "level": 5,
                "electric_count": 4,
                "specialist_count": 0,
                "manual_count": 0
            }
        ]
    }"#;
    let res = PreparedInput::from_json(json_str);
    assert!(res.is_err(), "PreparedInput must return Err for tier overflow override");
    let err_str = res.err().unwrap();
    assert!(err_str.contains("Validation error"), "Error must contain 'Validation error', got: {}", err_str);
    assert!(err_str.contains("exceeding 3 owned units at this tier"), "Error must mention 3 owned units, got: {}", err_str);
}

#[test]
fn test_emode_tier_counts_unowned_level_validation_error() {
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Woodworking Bench": [{"count": 2, "level": 5}]
        },
        "emode_facilities": ["Woodworking Bench"],
        "emode_tier_counts": [
            {"facility": "Woodworking Bench", "level": 3, "count": 1}
        ]
    }"#;
    let res = PreparedInput::from_json(json_str);
    assert!(res.is_err(), "PreparedInput must return Err for unowned tier in emode_tier_counts");
    let err_str = res.err().unwrap();
    assert!(err_str.contains("Validation error"), "Error must contain 'Validation error', got: {}", err_str);
    assert!(err_str.contains("Lv.3 but facility has no units"), "Error must mention Lv.3, got: {}", err_str);
}

#[test]
fn test_emode_tier_counts_aggregate_mismatch_validation_error() {
    let json_str = r#"{
        "currency": "coins",
        "facilities": {
            "Woodworking Bench": [{"count": 3, "level": 5}]
        },
        "emode_facilities": ["Woodworking Bench"],
        "emode_facility_counts": {
            "Woodworking Bench": 3
        },
        "emode_tier_counts": [
            {"facility": "Woodworking Bench", "level": 5, "count": 2}
        ]
    }"#;
    let res = PreparedInput::from_json(json_str);
    assert!(res.is_err(), "PreparedInput must return Err for tier sum vs aggregate count mismatch");
    let err_str = res.err().unwrap();
    assert!(err_str.contains("Validation error"), "Error must contain 'Validation error', got: {}", err_str);
    assert!(err_str.contains("does not match emode_facility_counts"), "Error must mention mismatch, got: {}", err_str);
}
