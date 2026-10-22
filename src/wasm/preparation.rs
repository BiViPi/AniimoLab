//! Plan request preparation pipeline (`PreparedInput::from_json`).

use std::collections::{BTreeMap, HashMap};

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
    /// Exact active recipes and their facility counts for worksheet-only mode changes.
    pub fixed_recipe_units: Option<BTreeMap<String, u32>>,
}

fn fixed_recipe_units(input: &JsPlanInput, items: &[ProductionItem], counts: &FacilityCounts) -> Result<Option<BTreeMap<String, u32>>, String> {
    if input.fixed_plan_lines.is_empty() {
        return Ok(None);
    }

    let mut fixed = BTreeMap::new();
    for line in &input.fixed_plan_lines {
        let base_facility = line.facility.as_str();
        // E-mode conversion clears workload on electric recipe clones. Do not use that
        // transformed workload flag to classify a facility as unworked: Mine/Well and
        // processors still need their Manual/Prismana recipe variants.
        let is_unworked_facility = crate::models::is_resident_facility(base_facility)
            || matches!(base_facility, "Farmland" | "Woodland");
        let (facility, item_suffix) = match line.mode.as_str() {
            "electric" if base_facility == "Mine" || base_facility == "Well" =>
                (format!("{base_facility} (Electric)"), ""),
            "manual" if !is_unworked_facility => (format!("{base_facility} (Manual)"), crate::models::MANUAL_SUFFIX),
            "manual" => (base_facility.to_string(), ""),
            "prismana" if !is_unworked_facility =>
                (format!("{base_facility} (Prismana)"), crate::models::SPECIALIST_SUFFIX),
            "electric" | "prismana" => (base_facility.to_string(), ""),
            mode => return Err(validation::validation_err(format!("Unknown worksheet mode '{mode}' for {base_facility}"))),
        };
        let expected_item = format!("{}{item_suffix}", line.item_name);
        let recipe = items.iter().find(|item| {
            item.facility == facility
                && crate::models::base_item_name(&item.name) == crate::models::base_item_name(&expected_item)
                && counts.can_produce(&item.facility, item.facility_level)
                && line.crew.map_or(item.crew.is_none(), |member| item.crew == Some(member))
        });
        let Some(recipe) = recipe else {
            return Err(validation::validation_err(format!(
                "Cannot keep worksheet line: {base_facility} making {} in {} mode is unavailable with the selected Aniimo setup.",
                line.item_name, line.mode
            )));
        };
        let locked_units = if crate::exact::takes_turns(recipe) { 0 } else { line.facility_count };
        *fixed.entry(recipe.name.clone()).or_insert(0) += locked_units;
    }
    Ok(Some(fixed))
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

        for required in input.required_emode_tiers.iter().filter(|tier| tier.count > 0) {
            if facility_counts.get_tier_count(&required.facility, required.level) < required.count {
                return Err(validation::validation_err(format!(
                    "Required E-mode tier {} Lv.{} has fewer assigned units than required ({})",
                    required.facility, required.level, required.count
                )));
            }
            if !items.iter().any(|item| {
                item.facility == required.facility
                    && item.facility_level == required.level
                    && facility_counts.can_produce(&item.facility, item.facility_level)
                    && item.module_requirement.as_ref().is_none_or(|(module, level)| module_levels.can_use(module, *level))
                    && item.production_time > 0.0
            }) {
                return Err(validation::validation_err(format!(
                    "Required E-mode tier {} Lv.{} has no available production recipe",
                    required.facility, required.level
                )));
            }
        }

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
        let fixed_recipe_units = fixed_recipe_units(&input, &items, &facility_counts)?;

        Ok(PreparedInput {
            input,
            facility_counts,
            module_levels,
            items,
            setup,
            crew,
            requirements,
            grower_steps,
            fixed_recipe_units,
        })
    }
}
