//! Facility tier partitioning engine (`Electric` / `Prismana` / `Manual`) for Mine, Well, and Processors.

use std::collections::{BTreeMap, BTreeSet, HashMap};

use crate::models::{
    Crew, FacilityAssignmentOverride, FacilityCounts, ProductionItem,
    MANUAL_SUFFIX, SPECIALIST_SUFFIX,
};
use super::validation::validation_err;
use super::{JsEmodeTierCount, JsPlanInput};

/// Resolves the 3-way unit split `(electric_count, specialist_count, manual_count)` for a top-tier
/// gathering facility (`Mine` or `Well`), returning a JSON validation error if requested units exceed `total_owned`.
pub(crate) fn resolve_three_way_split(
    facility_name: &str,
    target_level: u32,
    total_owned: u32,
    override_opt: Option<&FacilityAssignmentOverride>,
    emode_count: u32,
    specialist_quota: u32,
    roster_specialists: u32,
) -> Result<(u32, u32, u32), String> {
    if let Some(ovr) = override_opt {
        let e = ovr.electric_count;
        let p = ovr.specialist_count;
        let Some(std) = total_owned.checked_sub(e + p) else {
            return Err(validation_err(format!(
                "Validation error: fixed {} Lv.{} assignment exceeds owned count (electric: {}, specialist: {}, owned: {})",
                facility_name, target_level, e, p, total_owned
            )));
        };
        Ok((e, p, std))
    } else {
        let e = emode_count;
        let Some(rem1) = total_owned.checked_sub(e) else {
            return Err(validation_err(format!(
                "Validation error: E-mode {} count ({}) exceeds owned count ({})",
                facility_name, e, total_owned
            )));
        };
        let p = specialist_quota.min(rem1).min(roster_specialists);
        let std = rem1 - p;
        Ok((e, p, std))
    }
}

/// Synchronizes fixed `facility_overrides` for processing facilities (excluding `Mine` and `Well`)
/// into `emode_tier_counts`, `emode_counts`, and `emode_facilities`.
pub(crate) fn sync_overrides_into_emode_counts(
    input: &JsPlanInput,
    facility_counts: &FacilityCounts,
    requested_by_tier: &BTreeMap<(String, u32), u32>,
    emode_facilities: &mut Vec<String>,
    emode_counts: &mut HashMap<String, u32>,
) -> Vec<JsEmodeTierCount> {
    let mut emode_tier_counts: Vec<JsEmodeTierCount> = requested_by_tier
        .iter()
        .map(|((facility, level), count)| JsEmodeTierCount {
            facility: facility.clone(),
            level: *level,
            count: *count,
        })
        .collect();

    for ovr in &input.facility_overrides {
        if ovr.facility != "Mine" && ovr.facility != "Well" {
            let mut lvl = if ovr.level > 0 {
                ovr.level
            } else {
                facility_counts.get_level(&ovr.facility)
            };
            if let Some(tiers) = input.facilities.get(&ovr.facility) {
                if !tiers.iter().any(|tier| tier.level == lvl && tier.count > 0) {
                    if let Some(best_tier) = tiers.iter().filter(|t| t.count > 0).max_by_key(|t| t.level) {
                        lvl = best_tier.level;
                    }
                }
            }
            if ovr.electric_count > 0 {
                if let Some(existing) = emode_tier_counts
                    .iter_mut()
                    .find(|t| t.facility == ovr.facility && t.level == lvl)
                {
                    existing.count = ovr.electric_count;
                } else {
                    emode_tier_counts.push(JsEmodeTierCount {
                        facility: ovr.facility.clone(),
                        level: lvl,
                        count: ovr.electric_count,
                    });
                }
                emode_counts.insert(ovr.facility.clone(), ovr.electric_count);
                if !emode_facilities.contains(&ovr.facility) {
                    emode_facilities.push(ovr.facility.clone());
                }
            } else {
                emode_counts.remove(&ovr.facility);
                emode_facilities.retain(|f| f != &ovr.facility);
                emode_tier_counts.retain(|t| !(t.facility == ovr.facility && t.level == lvl));
            }
        }
    }

    emode_tier_counts
}

/// Partitions the highest tier of `Mine` into `Mine (Electric)`, `Mine (Prismana)`, and `Mine (Manual)`
/// when at RV 20+, `max_mine_level >= 5`, or when a fixed Mine override is present.
pub(crate) fn partition_mine(
    input: &JsPlanInput,
    crew: Option<&Crew>,
    facility_counts: &mut FacilityCounts,
    items: &mut Vec<ProductionItem>,
    emode_facilities: &mut Vec<String>,
    emode_counts: &mut HashMap<String, u32>,
) -> Result<(), String> {
    let max_mine_level = facility_counts.get_level("Mine");
    let has_mine_override = input
        .facility_overrides
        .iter()
        .any(|o| o.facility == "Mine" && (o.electric_count > 0 || o.specialist_count > 0));
    let is_rv20_or_mine5 =
        input.home_level.unwrap_or(1) >= 20 || max_mine_level >= 5 || has_mine_override;
    let total_top_mines = if is_rv20_or_mine5 && max_mine_level > 0 {
        facility_counts.get_tier_count("Mine", max_mine_level)
    } else {
        0
    };
    let mut partitioned_mine_items = Vec::new();

    if total_top_mines > 0 {
        let override_opt = input
            .facility_overrides
            .iter()
            .find(|o| o.facility == "Mine" && (o.level == max_mine_level || o.level == 0));
        let emode_req = emode_counts.get("Mine").copied().unwrap_or(0);
        let roster_earth_4p = crew
            .map(|c| c.count_specialist("Earth", 4, "Playful"))
            .unwrap_or(u32::MAX);
        let quota = input.specialist_quotas.earth_4p_mines.unwrap_or(3);

        let (e_count, p_count, std_count) = resolve_three_way_split(
            "Mine",
            max_mine_level,
            total_top_mines,
            override_opt,
            emode_req,
            quota,
            roster_earth_4p,
        )?;

        facility_counts.remove_tier("Mine", max_mine_level);

        if e_count > 0 {
            facility_counts.add_tier("Mine (Electric)", e_count, max_mine_level);
            if !emode_facilities.contains(&"Mine (Electric)".to_string()) {
                emode_facilities.push("Mine (Electric)".to_string());
            }
            emode_counts.insert("Mine (Electric)".to_string(), e_count);
            if let Some(q_ore) = items
                .iter()
                .find(|i| i.facility == "Mine" && i.facility_level == max_mine_level)
            {
                let mut electric_item = q_ore.clone();
                electric_item.facility = "Mine (Electric)".to_string();
                electric_item.emode_base_time = Some(1800.0);
                partitioned_mine_items.push(electric_item);
            }
        }

        if p_count > 0 {
            facility_counts.add_tier("Mine (Prismana)", p_count, max_mine_level);
            if let Some(q_ore) = items
                .iter()
                .find(|i| i.facility == "Mine" && i.facility_level == max_mine_level)
            {
                let mut prismana_item = q_ore.clone();
                prismana_item.name = format!("{}{}", q_ore.name, SPECIALIST_SUFFIX);
                prismana_item.facility = "Mine (Prismana)".to_string();
                prismana_item.emode_base_time = None;
                prismana_item.workload = Some(2700.0);
                partitioned_mine_items.push(prismana_item);
            }
        }

        if std_count > 0 {
            facility_counts.add_tier("Mine (Manual)", std_count, max_mine_level);
            for item in items.iter().filter(|i| i.facility == "Mine") {
                let mut manual_item = item.clone();
                manual_item.name = format!("{}{}", item.name, MANUAL_SUFFIX);
                manual_item.facility = "Mine (Manual)".to_string();
                manual_item.emode_base_time = None;
                partitioned_mine_items.push(manual_item);
            }
        }

        if facility_counts.get_count("Mine") == 0 {
            items.retain(|i| i.facility != "Mine");
            emode_facilities.retain(|f| f != "Mine");
            emode_counts.remove("Mine");
        } else {
            items.retain(|i| !(i.facility == "Mine" && i.facility_level == max_mine_level));
            emode_facilities.retain(|f| f != "Mine");
            emode_counts.remove("Mine");
        }
    }
    items.extend(partitioned_mine_items);
    Ok(())
}

/// Partitions the highest tier of `Well` (Lv.3+) into `Well (Electric)`, `Well (Prismana)`, and `Well (Manual)`
/// ONLY when at least one unit runs in Electric or Prismana mode (`e_count > 0 || p_count > 0`).
pub(crate) fn partition_well(
    input: &JsPlanInput,
    crew: Option<&Crew>,
    facility_counts: &mut FacilityCounts,
    items: &mut Vec<ProductionItem>,
    emode_facilities: &mut Vec<String>,
    emode_counts: &mut HashMap<String, u32>,
) -> Result<(), String> {
    let max_well_level = facility_counts.get_level("Well");
    let total_target_wells = if max_well_level >= 3 {
        facility_counts.get_tier_count("Well", max_well_level)
    } else {
        0
    };
    let mut partitioned_well_items = Vec::new();

    if total_target_wells > 0 {
        let override_opt = input
            .facility_overrides
            .iter()
            .find(|o| o.facility == "Well" && (o.level == max_well_level || o.level == 0));
        let emode_req = emode_counts.get("Well").copied().unwrap_or(0);
        let roster_water_4f = crew
            .map(|c| c.count_specialist("Water", 4, "Faithful"))
            .unwrap_or(u32::MAX);
        let quota = input.specialist_quotas.water_4f_wells.unwrap_or(0);

        let (e_count, p_count, std_count) = resolve_three_way_split(
            "Well",
            max_well_level,
            total_target_wells,
            override_opt,
            emode_req,
            quota,
            roster_water_4f,
        )?;

        if e_count > 0 || p_count > 0 {
            facility_counts.remove_tier("Well", max_well_level);

            if e_count > 0 {
                facility_counts.add_tier("Well (Electric)", e_count, max_well_level);
                if !emode_facilities.contains(&"Well (Electric)".to_string()) {
                    emode_facilities.push("Well (Electric)".to_string());
                }
                emode_counts.insert("Well (Electric)".to_string(), e_count);
                for item in items
                    .iter()
                    .filter(|i| i.facility == "Well" && i.facility_level <= max_well_level)
                {
                    let mut electric_item = item.clone();
                    electric_item.facility = "Well (Electric)".to_string();
                    partitioned_well_items.push(electric_item);
                }
            }

            if p_count > 0 {
                facility_counts.add_tier("Well (Prismana)", p_count, max_well_level);
                for item in items
                    .iter()
                    .filter(|i| i.facility == "Well" && i.facility_level <= max_well_level)
                {
                    let mut prismana_item = item.clone();
                    prismana_item.name = format!("{}{}", item.name, SPECIALIST_SUFFIX);
                    prismana_item.facility = "Well (Prismana)".to_string();
                    prismana_item.emode_base_time = None;
                    partitioned_well_items.push(prismana_item);
                }
            }

            if std_count > 0 {
                facility_counts.add_tier("Well (Manual)", std_count, max_well_level);
                for item in items
                    .iter()
                    .filter(|i| i.facility == "Well" && i.facility_level <= max_well_level)
                {
                    let mut manual_item = item.clone();
                    manual_item.name = format!("{}{}", item.name, MANUAL_SUFFIX);
                    manual_item.facility = "Well (Manual)".to_string();
                    manual_item.emode_base_time = None;
                    partitioned_well_items.push(manual_item);
                }
            }

            if facility_counts.get_count("Well") == 0 {
                items.retain(|i| i.facility != "Well");
                emode_facilities.retain(|f| f != "Well");
                emode_counts.remove("Well");
            } else {
                items.retain(|i| !(i.facility == "Well" && i.facility_level == max_well_level));
                emode_facilities.retain(|f| f != "Well");
                emode_counts.remove("Well");
            }
        }
    }
    items.extend(partitioned_well_items);
    Ok(())
}

/// Partitions processing facilities with partial or full E-mode assignments across owned tiers
/// and applies E-mode production times.
pub(crate) fn partition_processing_facilities(
    emode_tier_counts: &[JsEmodeTierCount],
    power_grid_rate: f64,
    facility_counts: &mut FacilityCounts,
    items: &mut Vec<ProductionItem>,
    emode_facilities: &mut Vec<String>,
    emode_counts: &mut HashMap<String, u32>,
) -> Result<(), String> {
    let mut manual_items = Vec::new();
    let mut facilities_to_partition = BTreeSet::new();
    for t in emode_tier_counts {
        if t.facility != "Mine"
            && !t.facility.starts_with("Mine (")
            && t.facility != "Well"
            && !t.facility.starts_with("Well (")
        {
            facilities_to_partition.insert(t.facility.clone());
        }
    }
    for (fac, &e_count) in emode_counts.iter() {
        if fac != "Mine"
            && !fac.starts_with("Mine (")
            && fac != "Well"
            && !fac.starts_with("Well (")
            && e_count > 0
        {
            facilities_to_partition.insert(fac.clone());
        }
    }

    for fac in facilities_to_partition {
        let existing_tiers = facility_counts.tiers(&fac);
        let total_owned: u32 = existing_tiers.iter().map(|(c, _)| *c).sum();
        if total_owned == 0 {
            continue;
        }

        let mut electric_tiers = Vec::new();
        let mut manual_tiers = Vec::new();

        let has_specific_tiers = emode_tier_counts.iter().any(|t| t.facility == fac);

        if has_specific_tiers {
            let mut tier_map: HashMap<u32, u32> = HashMap::new();
            for t in emode_tier_counts {
                if t.facility == fac {
                    *tier_map.entry(t.level).or_default() += t.count;
                }
            }

            for &(count, level) in &existing_tiers {
                let e_at_level = tier_map.get(&level).copied().unwrap_or(0);
                let Some(m_at_level) = count.checked_sub(e_at_level) else {
                    return Err(validation_err(format!(
                        "Validation error: fixed E-mode assignment {} exceeds owned count {} for \"{}\" Lv.{}",
                        e_at_level, count, fac, level
                    )));
                };
                if e_at_level > 0 {
                    electric_tiers.push((e_at_level, level));
                }
                if m_at_level > 0 {
                    manual_tiers.push((m_at_level, level));
                }
            }
        } else {
            let total_e = emode_counts.get(&fac).copied().unwrap_or(0);
            if total_e > total_owned {
                return Err(validation_err(format!(
                    "Validation error: E-mode count {} exceeds owned count {} for \"{}\"",
                    total_e, total_owned, fac
                )));
            }
            let mut sorted_tiers = existing_tiers.clone();
            sorted_tiers.sort_by(|a, b| b.1.cmp(&a.1));
            let mut rem_e = total_e;
            for (count, level) in sorted_tiers {
                let e_take = rem_e.min(count);
                let m_take = count - e_take;
                rem_e -= e_take;
                if e_take > 0 {
                    electric_tiers.push((e_take, level));
                }
                if m_take > 0 {
                    manual_tiers.push((m_take, level));
                }
            }
        }

        let e_total: u32 = electric_tiers.iter().map(|(c, _)| *c).sum();
        let m_total: u32 = manual_tiers.iter().map(|(c, _)| *c).sum();

        if e_total > 0 && m_total > 0 {
            facility_counts.set_tiers(&fac, electric_tiers);
            let manual_fac_name = format!("{fac} (Manual)");
            facility_counts.set_tiers(&manual_fac_name, manual_tiers);

            for item in items.iter().filter(|i| i.facility == fac) {
                let mut manual_item = item.clone();
                manual_item.name = format!("{}{}", item.name, MANUAL_SUFFIX);
                manual_item.facility = manual_fac_name.clone();
                manual_item.emode_base_time = None;
                manual_items.push(manual_item);
            }
        } else if e_total > 0 && m_total == 0 {
            facility_counts.set_tiers(&fac, electric_tiers);
            facility_counts.set(&format!("{fac} (Manual)"), 0, 1);
            if !emode_facilities.contains(&fac) {
                emode_facilities.push(fac.clone());
            }
        } else if e_total == 0 && m_total > 0 {
            facility_counts.set_tiers(&fac, manual_tiers);
            facility_counts.set(&format!("{fac} (Manual)"), 0, 1);
            emode_facilities.retain(|f| f != &fac);
            emode_counts.remove(&fac);
        }
    }
    items.extend(manual_items);

    items.retain(|item| {
        !(item.facility == "Mine"
            && emode_facilities.iter().any(|f| f == "Mine")
            && item.emode_base_time.is_none())
    });
    crate::models::apply_emode(items, emode_facilities, power_grid_rate);
    Ok(())
}

/// Orchestrates all facility partitioning steps and updates `input.emode_facilities` and `input.emode_facility_counts`.
pub(crate) fn partition_facilities_and_items(
    input: &mut JsPlanInput,
    crew: Option<&Crew>,
    facility_counts: &mut FacilityCounts,
    items: &mut Vec<ProductionItem>,
    requested_by_tier: &BTreeMap<(String, u32), u32>,
    mut emode_facilities: Vec<String>,
    mut emode_counts: HashMap<String, u32>,
) -> Result<(), String> {
    let emode_tier_counts = sync_overrides_into_emode_counts(
        input,
        facility_counts,
        requested_by_tier,
        &mut emode_facilities,
        &mut emode_counts,
    );
    partition_mine(
        input,
        crew,
        facility_counts,
        items,
        &mut emode_facilities,
        &mut emode_counts,
    )?;
    partition_well(
        input,
        crew,
        facility_counts,
        items,
        &mut emode_facilities,
        &mut emode_counts,
    )?;
    partition_processing_facilities(
        &emode_tier_counts,
        input.power_grid_rate,
        facility_counts,
        items,
        &mut emode_facilities,
        &mut emode_counts,
    )?;
    input.emode_facilities = emode_facilities;
    input.emode_facility_counts = emode_counts;
    Ok(())
}
