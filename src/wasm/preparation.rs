//! Plan request preparation pipeline (`PreparedInput::from_json`).

use std::collections::HashMap;

use crate::data::{
    embedded_aniimo_requirements, embedded_grower_steps, embedded_items, embedded_season_items,
};
use crate::models::{
    base_item_name, AniimoRequirements, AniimoSetup, Crew, FacilityCounts, GrowerSteps,
    ModuleLevels, ProductionItem,
};
use super::{
    aniimo_setup_from, empty_production_plan, partition, timing, validation, JsPlanInput,
};

/// Enforces highest-tier crop rule ONLY for Woodland (to maximize Wood Blocks for level-up) at RV < 20.
fn filter_woodland_for_rv(
    input: &JsPlanInput,
    facility_counts: &FacilityCounts,
    items: &mut Vec<ProductionItem>,
) {
    if input.home_level.unwrap_or(1) < 20 {
        let max_woodland = facility_counts.get_level("Woodland");
        items.retain(|item| {
            if item.season.is_some() {
                return true;
            }
            if item.facility == "Woodland" && max_woodland > 0 {
                if input.season && item.name == "apple" {
                    true
                } else {
                    item.facility_level >= max_woodland
                }
            } else {
                true
            }
        });
    }
}

/// Initializes initial E-mode facility lists and per-facility counts from raw input.
fn init_emode_lists(
    input: &JsPlanInput,
    facility_counts: &FacilityCounts,
) -> (Vec<String>, HashMap<String, u32>) {
    let mut emode_facilities = input.emode_facilities.clone();
    let mut emode_counts = input.emode_facility_counts.clone();
    if emode_counts.is_empty() {
        for f in &emode_facilities {
            emode_counts.insert(f.clone(), facility_counts.get_count(f));
        }
    } else {
        for (f, &count) in &emode_counts {
            if count > 0 && !emode_facilities.contains(f) {
                emode_facilities.push(f.clone());
            }
        }
    }
    (emode_facilities, emode_counts)
}

/// A plan request parsed and set up: owned facilities, modules, and items timed for the chosen
/// Aniimo.
pub struct PreparedInput {
    pub input: JsPlanInput,
    pub facility_counts: FacilityCounts,
    pub module_levels: ModuleLevels,
    pub items: Vec<ProductionItem>,
    pub setup: Option<AniimoSetup>,
    /// The player's own Aniimo, when planning with them.
    pub crew: Option<Crew>,
    pub requirements: AniimoRequirements,
    pub grower_steps: GrowerSteps,
}

impl PreparedInput {
    /// Parses `input_json`; on failure, returns the serialized JSON error result.
    pub fn from_json(input_json: &str) -> Result<Self, String> {
        // 1. Parse JSON & build initial facility counts + modules
        let mut input: JsPlanInput = serde_json::from_str(input_json).map_err(|e| {
            serde_json::to_string(&empty_production_plan(false, Some(format!("Invalid input: {}", e))))
                .unwrap_or_default()
        })?;
        let mut facility_counts = input.facility_counts();
        let module_levels = ModuleLevels {
            ecological_module: input.modules.ecological_module,
            kitchen_module: input.modules.kitchen_module,
            resource_detector: input.modules.resource_detector,
            crafting_module: input.modules.crafting_module,
        };

        // 2. Load embedded items & apply RV 1-19 Woodland filter
        let mut items = embedded_items();
        if input.season {
            items.extend(embedded_season_items());
        }
        items.retain(|item| !input.exclude.iter().any(|name| name == base_item_name(&item.name)));
        filter_woodland_for_rv(&input, &facility_counts, &mut items);

        // 3. Validate input & normalize initial E-mode lists
        let crew = match (input.aniimo.as_deref(), &input.roster) {
            (Some(name), Some(roster)) if name.starts_with("roster") => Some(roster.crew()),
            _ => None,
        };
        let (emode_facilities, emode_counts) = init_emode_lists(&input, &facility_counts);
        let requested_by_tier = validation::validate_plan_input(
            &input,
            &facility_counts,
            &emode_facilities,
            &emode_counts,
        )?;

        // 4. Partition facilities (Mine, Well, Processors) & apply E-mode timings
        partition::partition_facilities_and_items(
            &mut input,
            crew.as_ref(),
            &mut facility_counts,
            &mut items,
            &requested_by_tier,
            emode_facilities,
            emode_counts,
        )?;

        // 5. Apply Aniimo worker timings & compute guard/worker caps
        let setup = input
            .aniimo
            .as_deref()
            .and_then(|name| aniimo_setup_from(name, &input.aniimo_levels, &input.workers));
        let requirements = embedded_aniimo_requirements();
        let grower_steps = embedded_grower_steps();
        let items = timing::apply_worker_timings_and_caps(
            &input,
            crew.as_ref(),
            setup.as_ref(),
            &requirements,
            &grower_steps,
            &mut facility_counts,
            items,
        );

        Ok(PreparedInput {
            input,
            facility_counts,
            module_levels,
            items,
            setup,
            crew,
            requirements,
            grower_steps,
        })
    }
}
