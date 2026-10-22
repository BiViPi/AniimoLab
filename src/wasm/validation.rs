//! Input validation gate for the WASM production plan solver.

use std::collections::{BTreeMap, HashMap, HashSet};

use crate::models::{ANIIMO_RESIDENT_FACILITIES, FacilityCounts};
use super::{empty_production_plan, JsPlanInput};

/// Formats a validation error message as a serialized `JsProductionPlan` JSON string
/// so Web Worker and integration tests can parse `{ "success": false, "error": "..." }`.
pub(crate) fn validation_err(msg: impl Into<String>) -> String {
    serde_json::to_string(&empty_production_plan(false, Some(msg.into()))).unwrap_or_default()
}

/// Validates the explicit strategy contract while retaining compatibility with old payloads.
pub(crate) fn validate_strategy_policy(input: &JsPlanInput) -> Result<(), String> {
    match input.strategy_policy.as_deref() {
        None => Ok(()),
        Some("level_up") if !input.priorities.is_empty() => Err(validation_err(
            "Validation error: LevelUp policy cannot include Endgame priorities",
        )),
        Some("level_up") => Ok(()),
        Some("endgame") if input.home_level != Some(20) => Err(validation_err(
            "Validation error: Endgame policy is only valid at RV20",
        )),
        Some("endgame") if input.level_up.is_some() => Err(validation_err(
            "Validation error: Endgame policy cannot include a LevelUp target",
        )),
        Some("endgame") if input.prioritize_byproducts => Err(validation_err(
            "Validation error: Endgame policy cannot add byproduct floors",
        )),
        Some("endgame") => Ok(()),
        Some(other) => Err(validation_err(format!(
            "Validation error: unknown strategy policy '{other}'",
        ))),
    }
}

/// Ensures none of the 5 resident facilities (`ANIIMO_RESIDENT_FACILITIES`) are configured in Electric mode.
pub(crate) fn validate_resident_facilities_no_emode(
    input: &JsPlanInput,
    emode_facilities: &[String],
    emode_counts: &HashMap<String, u32>,
) -> Result<(), String> {
    for &res_fac in ANIIMO_RESIDENT_FACILITIES {
        if emode_facilities.iter().any(|f| f == res_fac)
            || emode_counts.get(res_fac).copied().unwrap_or(0) > 0
            || input.emode_tier_counts.iter().any(|t| t.facility == res_fac && t.count > 0)
            || input.facility_overrides.iter().any(|o| o.facility == res_fac && o.electric_count > 0)
        {
            return Err(validation_err(format!(
                "Validation error: Resident facility \"{}\" cannot operate in Electric mode",
                res_fac
            )));
        }
    }
    Ok(())
}

/// Validates worksheet facility assignment overrides against owned facility tiers (no silent clamping).
pub(crate) fn validate_facility_overrides(
    input: &JsPlanInput,
    facility_counts: &FacilityCounts,
) -> Result<(), String> {
    let mut seen_override_tiers = HashSet::new();
    for ovr in &input.facility_overrides {
        let requested_level = if ovr.level > 0 {
            ovr.level
        } else {
            facility_counts.get_level(&ovr.facility)
        };

        let key = (ovr.facility.clone(), requested_level);
        if !seen_override_tiers.insert(key) {
            return Err(validation_err(format!(
                "Validation error: duplicate fixed override for \"{}\" Lv.{}",
                ovr.facility, requested_level
            )));
        }

        // FacilityCounts::tiers() supplies a default tier for unknown names;
        // validation must instead use the explicitly owned input tiers.
        let owned_at_level = input
            .facilities
            .get(&ovr.facility)
            .and_then(|tiers| tiers.iter().find(|tier| tier.level == requested_level))
            .map(|tier| tier.count)
            .unwrap_or(0);

        if owned_at_level == 0 {
            let owned_levels = input
                .facilities
                .get(&ovr.facility)
                .map(|tiers| tiers.iter().map(|tier| tier.level).collect::<Vec<_>>())
                .unwrap_or_default();
            return Err(validation_err(format!(
                "Validation error: Facility \"{}\" has no units at Level {} (owned levels: {:?})",
                ovr.facility, requested_level, owned_levels
            )));
        }

        let electric_or_specialist = ovr.electric_count > 0 || ovr.specialist_count > 0;
        if electric_or_specialist && ovr.facility == "Mine" {
            let max_mine_level = facility_counts.get_level("Mine");
            if requested_level != max_mine_level {
                return Err(validation_err(format!(
                    "Validation error: fixed E-mode/specialist assignment for Mine is supported only at its highest tier (Lv.{}), not Lv.{}",
                    max_mine_level, requested_level
                )));
            }
        }
        if electric_or_specialist && ovr.facility == "Well" {
            let supported_level = facility_counts.get_level("Well");
            if requested_level < 3 || requested_level != supported_level {
                return Err(validation_err(format!(
                    "Validation error: fixed E-mode/specialist assignment for Well is supported only at its highest eligible tier (Lv.{}), not Lv.{}",
                    supported_level, requested_level
                )));
            }
        }

        let Some(total_requested) = ovr
            .electric_count
            .checked_add(ovr.specialist_count)
            .and_then(|n| n.checked_add(ovr.manual_count))
        else {
            return Err(validation_err(format!(
                "Validation error: fixed override count overflow for \"{}\" Lv.{}",
                ovr.facility, requested_level
            )));
        };

        if total_requested > owned_at_level {
            return Err(validation_err(format!(
                "Validation error: Fixed override requested {} units (electric: {}, specialist: {}, manual: {}) for \"{}\" Lv.{} exceeding {} owned units at this tier",
                total_requested,
                ovr.electric_count,
                ovr.specialist_count,
                ovr.manual_count,
                ovr.facility,
                requested_level,
                owned_at_level
            )));
        }
    }
    Ok(())
}

/// Aggregates duplicate tier rows in `emode_tier_counts` and validates them against owned tier capacity.
pub(crate) fn aggregate_and_validate_emode_tiers(
    input: &JsPlanInput,
) -> Result<BTreeMap<(String, u32), u32>, String> {
    let mut requested_by_tier: BTreeMap<(String, u32), u32> = BTreeMap::new();
    for tier_req in &input.emode_tier_counts {
        let key = (tier_req.facility.clone(), tier_req.level);
        let entry = requested_by_tier.entry(key).or_default();
        let Some(total) = entry.checked_add(tier_req.count) else {
            return Err(validation_err(format!(
                "Validation error: emode_tier_counts overflow for \"{}\" Lv.{}",
                tier_req.facility, tier_req.level
            )));
        };
        *entry = total;
    }

    for ((facility, level), requested) in &requested_by_tier {
        let owned_at_level = input
            .facilities
            .get(facility)
            .and_then(|tiers| tiers.iter().find(|tier| tier.level == *level))
            .map(|tier| tier.count)
            .unwrap_or(0);

        if owned_at_level == 0 {
            return Err(validation_err(format!(
                "Validation error: emode_tier_counts requested {} units for \"{}\" Lv.{} but facility has no units at this level",
                requested, facility, level
            )));
        }

        if requested > &owned_at_level {
            return Err(validation_err(format!(
                "Validation error: emode_tier_counts requested {} electric units for \"{}\" Lv.{} exceeding owned count of {} units",
                requested, facility, level, owned_at_level
            )));
        }
    }

    Ok(requested_by_tier)
}

/// Validates cross-consistency between `facility_overrides`, `emode_tier_counts`, and `emode_facility_counts`.
pub(crate) fn validate_emode_cross_consistency(
    input: &JsPlanInput,
    facility_counts: &FacilityCounts,
    requested_by_tier: &BTreeMap<(String, u32), u32>,
) -> Result<(), String> {
    for ovr in &input.facility_overrides {
        let mut level = if ovr.level > 0 {
            ovr.level
        } else {
            facility_counts.get_level(&ovr.facility)
        };
        if let Some(tiers) = input.facilities.get(&ovr.facility) {
            if !tiers.iter().any(|tier| tier.level == level && tier.count > 0) {
                if let Some(best_tier) = tiers.iter().filter(|t| t.count > 0).max_by_key(|t| t.level) {
                    level = best_tier.level;
                }
            }
        }
        if let Some(tier_count) = requested_by_tier.get(&(ovr.facility.clone(), level)) {
            if *tier_count != ovr.electric_count {
                return Err(validation_err(format!(
                    "Validation error: fixed override electric count ({}) does not match emode_tier_counts ({}) for \"{}\" Lv.{}",
                    ovr.electric_count, tier_count, ovr.facility, level
                )));
            }
        }
    }

    if !input.emode_tier_counts.is_empty() && !input.emode_facility_counts.is_empty() {
        let mut tier_sum_by_fac: HashMap<String, u32> = HashMap::new();
        for ((facility, _level), count) in requested_by_tier {
            let entry = tier_sum_by_fac.entry(facility.clone()).or_default();
            let Some(total) = entry.checked_add(*count) else {
                return Err(validation_err(format!(
                    "Validation error: emode_tier_counts aggregate overflow for \"{}\"",
                    facility
                )));
            };
            *entry = total;
        }
        let mut facilities_to_compare: HashSet<String> =
            input.emode_facility_counts.keys().cloned().collect();
        facilities_to_compare.extend(tier_sum_by_fac.keys().cloned());
        for fac in facilities_to_compare {
            let aggregate = input.emode_facility_counts.get(&fac).copied().unwrap_or(0);
            let tier_sum = tier_sum_by_fac.get(&fac).copied().unwrap_or(0);
            if tier_sum != aggregate {
                return Err(validation_err(format!(
                    "Validation error: emode_tier_counts sum ({}) does not match emode_facility_counts ({}) for facility \"{}\"",
                    tier_sum, aggregate, fac
                )));
            }
        }
    }

    Ok(())
}

/// Main entry point for validating a `JsPlanInput` before facility partitioning.
pub(crate) fn validate_plan_input(
    input: &JsPlanInput,
    facility_counts: &FacilityCounts,
    emode_facilities: &[String],
    emode_counts: &HashMap<String, u32>,
) -> Result<BTreeMap<(String, u32), u32>, String> {
    validate_strategy_policy(input)?;
    validate_resident_facilities_no_emode(input, emode_facilities, emode_counts)?;
    validate_facility_overrides(input, facility_counts)?;
    let requested_by_tier = aggregate_and_validate_emode_tiers(input)?;
    validate_emode_cross_consistency(input, facility_counts, &requested_by_tier)?;
    Ok(requested_by_tier)
}

#[cfg(test)]
mod strategy_policy_tests {
    use super::validate_strategy_policy;
    use crate::wasm::JsPlanInput;

    fn input(json: &str) -> JsPlanInput {
        serde_json::from_str(json).expect("valid test request")
    }

    #[test]
    fn legacy_payload_without_policy_remains_accepted() {
        assert!(validate_strategy_policy(&input(r#"{"home_level":19}"#)).is_ok());
    }

    #[test]
    fn level_up_policy_rejects_endgame_priorities() {
        let result = validate_strategy_policy(&input(
            r#"{"home_level":17,"strategy_policy":"level_up","priorities":["coins"]}"#,
        ));
        assert!(result.unwrap_err().contains("LevelUp policy cannot include Endgame priorities"));
    }

    #[test]
    fn endgame_policy_is_rv20_only_and_excludes_levelup_floors() {
        for json in [
            r#"{"home_level":19,"strategy_policy":"endgame","prioritize_byproducts":false}"#,
            r#"{"home_level":20,"strategy_policy":"endgame","level_up":{"cost":[],"stock":[]},"prioritize_byproducts":false}"#,
            r#"{"home_level":20,"strategy_policy":"endgame","prioritize_byproducts":true}"#,
        ] {
            assert!(validate_strategy_policy(&input(json)).is_err(), "accepted {json}");
        }
        assert!(validate_strategy_policy(&input(
            r#"{"home_level":20,"strategy_policy":"endgame","prioritize_byproducts":false}"#,
        )).is_ok());
    }

    #[test]
    fn unknown_policy_is_rejected() {
        let result = validate_strategy_policy(&input(r#"{"strategy_policy":"mixed"}"#));
        assert!(result.unwrap_err().contains("unknown strategy policy"));
    }
}
