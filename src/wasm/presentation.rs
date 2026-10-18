//! Output presentation and post-processing for converting solved plans into JavaScript DTOs.

use crate::data::embedded_unverified;
use crate::models::{
    base_item_name, is_resident_facility, FacilityAssignmentOverride, PlanStep, PlanStepStatus,
    ProductionPlan, MANUAL_SUFFIX, SPECIALIST_SUFFIX,
};
use super::preparation::PreparedInput;
use super::{
    JsAniimo, JsAniimoTask, JsLevelUpReport, JsLevelUpRequirement, JsPlanProduct, JsPlanStep,
    JsProductionPlan, JsUnverified,
};

/// Strips partition variant suffix from facility and item names, returning
/// `(is_electric, is_prismana, is_manual)`.
pub(crate) fn strip_partition_variant(
    step: &mut PlanStep,
    overrides: &[FacilityAssignmentOverride],
) -> (bool, bool, bool) {
    let is_electric = step.facility.ends_with(" (Electric)");
    let mut is_prismana = step.facility.ends_with(" (Prismana)");
    let mut is_manual = step.facility.ends_with(" (Manual)");

    if is_electric {
        step.facility = step.facility.trim_end_matches(" (Electric)").to_string();
    } else if is_prismana {
        step.facility = step.facility.trim_end_matches(" (Prismana)").to_string();
        if let Some(name) = step.item_name.as_ref() {
            step.item_name = Some(name.strip_suffix(SPECIALIST_SUFFIX).unwrap_or(name).to_string());
        }
    } else if is_manual {
        step.facility = step.facility.trim_end_matches(" (Manual)").to_string();
        if let Some(name) = step.item_name.as_ref() {
            step.item_name = Some(name.strip_suffix(MANUAL_SUFFIX).unwrap_or(name).to_string());
        }
    }

    if is_resident_facility(&step.facility) {
        if overrides.iter().any(|o| o.facility == step.facility && o.specialist_count > 0) {
            is_prismana = true;
            is_manual = false;
        } else if overrides.iter().any(|o| o.facility == step.facility && o.manual_count > 0) {
            is_manual = true;
            is_prismana = false;
        }
    }

    (is_electric, is_prismana, is_manual)
}

/// Resolves the Aniimo ability for a step using the requirement table and facility fallbacks.
pub(crate) fn resolve_step_ability<'a>(
    step: &PlanStep,
    requirements: &'a crate::models::AniimoRequirements,
) -> &'a str {
    let base_name = step.item_name.as_deref().map(base_item_name).unwrap_or("");
    requirements.get(base_name).map(|(ab, _)| ab).unwrap_or_else(|| {
        match step.facility.as_str() {
            "Well" | "Simmering Pot" | "Keg" => "Water",
            "Chimney Kiln" | "Stove" | "Heat Furnace" => "Fire",
            "Tidewhisper Sandcastle"
            | "Dewy House"
            | "Nimbus Bed"
            | "Starfall Hammock"
            | "Floral Windmill" => "Leisure",
            _ => "Earth",
        }
    })
}

/// The Aniimo work one producing row creates.
pub(crate) fn aniimo_tasks_for(
    step: &PlanStep,
    setup: &crate::models::AniimoSetup,
    requirements: &crate::models::AniimoRequirements,
    grower_steps: &crate::models::GrowerSteps,
) -> Vec<JsAniimoTask> {
    use crate::models::Worker;
    let Some(item) = step.item_name.as_deref() else {
        return Vec::new();
    };
    if step.status != PlanStepStatus::Producing {
        return Vec::new();
    }
    if let Some((ability, _)) = requirements.get(item) {
        let worker = requirements.worker_for_at(item, &step.facility, setup);
        return vec![JsAniimoTask {
            ability: ability.to_string(),
            level: worker.suitability,
            personality_bonus: worker.personality_bonus,
            busy: step.busy_units.unwrap_or(step.facility_count as f64),
            jobs: Vec::new(),
        }];
    }
    let Some(cycle_time) = step.cycle_time.filter(|t| *t > 0.0) else {
        return Vec::new();
    };
    let harvests_per_second = step.facility_count as f64 / cycle_time;
    let mut tasks: Vec<JsAniimoTask> = Vec::new();
    for job in grower_steps.get(item) {
        let level = job.min_level;
        let busy = harvests_per_second * Worker::new(level, false).seconds_for(job.workload, level, true);
        match tasks.iter_mut().find(|t| t.ability == job.ability) {
            Some(task) => {
                task.level = task.level.max(level);
                task.busy += busy;
                if !task.jobs.contains(&job.step) {
                    task.jobs.push(job.step.clone());
                }
            }
            None => tasks.push(JsAniimoTask {
                ability: job.ability.clone(),
                level,
                personality_bonus: false,
                busy,
                jobs: vec![job.step.clone()],
            }),
        }
    }
    tasks
}

/// How long `exact`, a level-up plan, takes to cover each of the level-up's costs.
pub(crate) fn level_up_report(
    exact: &crate::exact::ExactPlan,
    items: &[crate::models::ProductionItem],
    level_up: &crate::exact::LevelUp,
    currency: &str,
) -> Option<JsLevelUpReport> {
    let pace = exact.pace.filter(|p| *p > 0.0)?;
    let net = crate::exact::net_rates(exact, items);
    let requirements = level_up
        .cost
        .iter()
        .map(|(name, need)| {
            let have = level_up.stock.iter().filter(|(n, _)| n == name).fold(0.0, |sum, (_, a)| sum + a);
            let per_second =
                if name == currency { exact.rate_per_second } else { net.get(name).copied().unwrap_or(0.0).max(0.0) };
            let short = (need - have).max(0.0);
            let seconds = if short <= 0.0 {
                Some(0.0)
            } else {
                (per_second > 0.0).then(|| short / per_second)
            };
            JsLevelUpRequirement { name: name.clone(), need: *need, have, per_second, seconds }
        })
        .collect();
    let seconds = crate::exact::PACE_UNIT / pace;
    let level_up_item = |name: &str| {
        crate::models::BYPRODUCT_ITEMS.iter().any(|(_, item)| *item == name)
            || items.iter().any(|i| i.name == name && crate::exact::takes_turns(i))
    };
    let mut names: Vec<&str> = net.keys().map(String::as_str).chain(level_up.stock.iter().map(|(n, _)| n.as_str())).collect();
    names.sort_unstable();
    names.dedup();
    let leftovers = names
        .into_iter()
        .filter(|name| level_up_item(name) && !level_up.cost.iter().any(|(n, _)| n == name))
        .filter_map(|name| {
            let have = level_up.stock.iter().filter(|(n, _)| n == name).fold(0.0, |sum, (_, a)| sum + a);
            let left = have + net.get(name).copied().unwrap_or(0.0) * seconds;
            (left >= 1.0).then(|| (name.to_string(), left))
        })
        .collect();
    Some(JsLevelUpReport { seconds, requirements, leftovers })
}

impl PreparedInput {
    /// Converts a single `PlanStep` into a `JsPlanStep` with clean facility/item names and resolved Aniimo metadata.
    pub fn step_to_js(&self, mut step: PlanStep) -> JsPlanStep {
        let (is_electric_variant, is_prismana_variant, is_manual_variant) =
            strip_partition_variant(&mut step, &self.input.facility_overrides);

        let is_emode = is_electric_variant
            || (!is_manual_variant
                && !is_prismana_variant
                && !is_resident_facility(&step.facility)
                && (self.input.emode_facilities.contains(&step.facility)
                    || self.input.emode_facility_counts.get(&step.facility).copied().unwrap_or(0) > 0));

        // With the player's roster, the row names the member working it.
        let from_crew = match (&self.crew, step.crew, &step.item_name) {
            (Some(crew), Some(member), Some(item)) => crew.members.get(member).and_then(|aniimo| {
                let (ability, _) = self.requirements.get(item)?;
                let bonus = crate::models::has_personality_bonus(&step.facility)
                    && crew.personalities.get(&step.facility).is_some_and(|p| aniimo.personalities.contains(p));
                Some(JsAniimo { ability: ability.to_string(), level: aniimo.level(ability), personality_bonus: bonus })
            }),
            _ => None,
        };

        let aniimo = if is_emode {
            None
        } else if is_prismana_variant {
            let ability = resolve_step_ability(&step, &self.requirements);
            Some(JsAniimo {
                ability: ability.to_string(),
                level: 4,
                personality_bonus: true,
            })
        } else if is_manual_variant {
            let ability = resolve_step_ability(&step, &self.requirements);
            let bonus = crate::models::has_personality_bonus(&step.facility);
            Some(JsAniimo {
                ability: ability.to_string(),
                level: 3,
                personality_bonus: bonus,
            })
        } else if is_resident_facility(&step.facility) && step.status == PlanStepStatus::Producing {
            from_crew.or_else(|| {
                let base_name = step.item_name.as_deref().map(base_item_name).unwrap_or("");
                let (ability, _) = self.requirements.get(base_name).unwrap_or(("Leisure", 1));
                let ability_level = self.input.aniimo_levels.get(ability).copied().unwrap_or(4);
                let is_best = matches!(self.setup, Some(crate::models::AniimoSetup::Best(_)));
                let (level, bonus) = if is_best || ability_level >= 4 {
                    (4, true)
                } else if let Some(setup) = &self.setup {
                    (3, !matches!(setup, crate::models::AniimoSetup::Minimum))
                } else if let Some(w) = self.input.workers.get(&step.facility) {
                    (w.suitability, w.personality_bonus)
                } else {
                    (3, true)
                };
                Some(JsAniimo {
                    ability: ability.to_string(),
                    level,
                    personality_bonus: bonus,
                })
            })
        } else {
            from_crew.or_else(|| match (&self.setup, &step.item_name) {
                (Some(setup), Some(item)) if step.status == PlanStepStatus::Producing => {
                    self.requirements.get(item).map(|(ability, _)| {
                        let worker = self.requirements.worker_for_at(item, &step.facility, setup);
                        JsAniimo {
                            ability: ability.to_string(),
                            level: worker.suitability,
                            personality_bonus: worker.personality_bonus,
                        }
                    })
                }
                (None, Some(item)) if step.status == PlanStepStatus::Producing => {
                    self.requirements.get(item).map(|(ability, _)| {
                        let (level, bonus) = if let Some(w) = self.input.workers.get(&step.facility) {
                            (w.suitability, w.personality_bonus)
                        } else {
                            (1, false)
                        };
                        JsAniimo {
                            ability: ability.to_string(),
                            level,
                            personality_bonus: bonus,
                        }
                    })
                }
                _ => None,
            })
        };

        let aniimo_tasks = if is_emode {
            Vec::new()
        } else {
            self.setup
                .as_ref()
                .map(|setup| aniimo_tasks_for(&step, setup, &self.requirements, &self.grower_steps))
                .unwrap_or_default()
        };

        JsPlanStep {
            aniimo,
            aniimo_tasks,
            is_emode,
            is_specialist: is_prismana_variant,
            is_manual: is_manual_variant,
            ..step.into()
        }
    }

    /// The result the web page shows for `plan`, with each row's Aniimo; `proof` is the exact
    /// planner's `(proven optimal, upper bound)`, if it made the plan.
    pub fn to_js(&self, plan: ProductionPlan, proof: Option<(bool, f64)>) -> JsProductionPlan {
        let listed = embedded_unverified();
        let mut unverified: Vec<JsUnverified> = plan
            .coin_items
            .iter()
            .filter(|step| step.status == PlanStepStatus::Producing)
            .filter_map(|step| {
                let item = step.item_name.as_ref()?;
                listed
                    .iter()
                    .any(|(name, facility)| name == item && *facility == step.facility)
                    .then(|| JsUnverified { facility: step.facility.clone(), item_name: item.clone() })
            })
            .collect();
        unverified.sort_by(|a, b| (&a.facility, &a.item_name).cmp(&(&b.facility, &b.item_name)));
        unverified.dedup_by(|a, b| a.facility == b.facility && a.item_name == b.item_name);

        let coin_items = plan
            .coin_items
            .into_iter()
            .map(|step| self.step_to_js(step))
            .collect();

        let income_streams: Vec<JsPlanProduct> = plan
            .income_streams
            .into_iter()
            .map(|stream| {
                let points = self.items.iter().find(|i| i.name == stream.item_name).and_then(|i| i.season).map_or(0.0, |s| s.points);
                JsPlanProduct { points, ..stream.into() }
            })
            .collect();

        // The exact planner sets its own (see `exact_plan`); this is for the backup planner's.
        let season_points = self.input.season.then(|| income_streams.iter().map(|s| s.units_per_second * s.points).sum());

        JsProductionPlan {
            success: true,
            error: None,
            currency: plan.currency,
            rate_per_second: plan.rate_per_second,
            coin_items,
            income_streams,
            byproduct_rates: plan.byproduct_rates,
            environment_assignments: plan.environment_assignments.into_iter().map(Into::into).collect(),
            candidates_evaluated: plan.candidates_evaluated,
            trial_solves: plan.trial_solves,
            proven_optimal: proof.map(|(proven, _)| proven),
            upper_bound: proof.map(|(_, bound)| bound),
            unverified,
            level_up: None,
            priorities: vec![],
            season_points,
            staffing: Vec::new(),
            guards: self.facility_counts.guards(),
            guard_staffing: Vec::new(),
        }
    }
}
