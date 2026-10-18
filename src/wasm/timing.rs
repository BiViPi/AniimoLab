//! Aniimo worker timing, specialist crew filtering, and staffing cap calculation.

use crate::models::{
    base_item_name, is_resident_facility, AniimoRequirements, AniimoSetup, Crew, FacilityCounts,
    GrowerSteps, ProductionItem, Worker,
};
use super::{workers_from, JsPlanInput};

/// Applies worker production times and preserves `workload: Some(...)` for partitioned
/// facilities (`Mine (Prismana/Manual)`, `Well (Prismana/Manual)`) and the 5 resident facilities.
fn apply_partitioned_and_resident_timings(
    items: &mut [ProductionItem],
    input: &JsPlanInput,
    setup: Option<&AniimoSetup>,
    requirements: &AniimoRequirements,
) {
    let manual_bonus = !matches!(setup, Some(AniimoSetup::Minimum));

    for item in items.iter_mut() {
        if item.facility == "Mine (Prismana)" {
            let required = requirements.get(base_item_name(&item.name)).map_or(3, |(_, level)| level);
            let worker = Worker::new(4, true);
            let wl = item.workload.unwrap_or(2700.0);
            item.production_time = worker.seconds_for_item(item, wl, required);
            item.workload = Some(wl);
        } else if item.facility == "Mine (Manual)" {
            let required = requirements.get(base_item_name(&item.name)).map_or(3, |(_, level)| level);
            let worker = Worker::new(3, manual_bonus);
            let wl = item.workload.unwrap_or(2700.0);
            item.production_time = worker.seconds_for_item(item, wl, required);
            item.workload = Some(wl);
        } else if item.facility == "Well (Prismana)" {
            let required = requirements.get(base_item_name(&item.name)).map_or(1, |(_, level)| level);
            let worker = Worker::new(4, true);
            if let Some(wl) = item.workload {
                item.production_time = worker.seconds_for_item(item, wl, required);
                item.workload = Some(wl);
            }
        } else if item.facility == "Well (Manual)" {
            let required = requirements.get(base_item_name(&item.name)).map_or(1, |(_, level)| level);
            let worker = Worker::new(3, manual_bonus);
            if let Some(wl) = item.workload {
                item.production_time = worker.seconds_for_item(item, wl, required);
                item.workload = Some(wl);
            }
        } else if is_resident_facility(&item.facility) {
            let (ability, required) = requirements
                .get(base_item_name(&item.name))
                .unwrap_or(("Leisure", 1));
            let has_specialist_override = input
                .facility_overrides
                .iter()
                .any(|o| o.facility == item.facility && o.specialist_count > 0);
            let has_manual_override = input
                .facility_overrides
                .iter()
                .any(|o| o.facility == item.facility && o.manual_count > 0);

            let worker_opt = if has_specialist_override {
                Some(Worker::new(4, true))
            } else if has_manual_override {
                Some(Worker::new(3, true))
            } else if let Some(s) = setup {
                let ability_level = input.aniimo_levels.get(ability).copied().unwrap_or(4);
                let is_best = matches!(s, AniimoSetup::Best(_));
                if is_best || ability_level >= 4 {
                    Some(Worker::new(4, true))
                } else {
                    Some(Worker::new(3, !matches!(s, AniimoSetup::Minimum)))
                }
            } else {
                // Custom (None, None) without override: preserve speed already applied from `input.workers`
                None
            };

            let wl = item.workload.unwrap_or(item.production_time);
            if let Some(worker) = worker_opt {
                item.production_time = worker.seconds_for_item(item, wl, required);
            }
            item.workload = Some(wl);
        }
    }
}

/// Applies Aniimo worker timings (Roster Crew, AniimoSetup, or Custom Workers) and configures
/// power pole guards and `worker_cap` on `facility_counts`.
pub(crate) fn apply_worker_timings_and_caps(
    input: &JsPlanInput,
    crew: Option<&Crew>,
    setup: Option<&AniimoSetup>,
    requirements: &AniimoRequirements,
    grower_steps: &GrowerSteps,
    facility_counts: &mut FacilityCounts,
    items: Vec<ProductionItem>,
) -> Vec<ProductionItem> {
    let mut items = items;
    match (crew, setup) {
        (Some(crew), _) => {
            items = crate::models::crew_variants(items, crew, requirements, grower_steps);
            facility_counts.set_crew(crew.clone());
            // Anti-Double Staffing: retain only qualified specialist variants
            items.retain(|item| {
                if item.facility == "Mine (Prismana)" {
                    item.crew.and_then(|m| crew.members.get(m)).is_some_and(|aniimo| {
                        aniimo.level("Earth") >= 4 && aniimo.personalities.iter().any(|p| p == "Playful")
                    })
                } else if item.facility == "Well (Prismana)" {
                    item.crew.and_then(|m| crew.members.get(m)).is_some_and(|aniimo| {
                        aniimo.level("Water") >= 4 && aniimo.personalities.iter().any(|p| p == "Faithful")
                    })
                } else {
                    true
                }
            });
        }
        (None, Some(setup)) => {
            requirements.apply(setup, &mut items);
            apply_partitioned_and_resident_timings(&mut items, input, Some(setup), requirements);
        }
        (None, None) => {
            workers_from(&input.workers).apply(requirements, &mut items);
            apply_partitioned_and_resident_timings(&mut items, input, None, requirements);
        }
    }

    let has_emode = !input.emode_facilities.is_empty()
        || input.emode_facility_counts.values().any(|&count| count > 0)
        || input.emode_tier_counts.iter().any(|t| t.count > 0)
        || input.facility_overrides.iter().any(|o| o.electric_count > 0);
    let guards = if has_emode { input.power_poles } else { 0 };
    let roster_guards = if crew.is_some() && guards > 0 { guards } else { 0 };
    facility_counts.set_guards(guards);
    facility_counts.set_roster_guards(roster_guards);
    facility_counts.set_worker_cap(input.production_aniimo_cap.map(|cap| cap.saturating_sub(guards)));

    items
}
