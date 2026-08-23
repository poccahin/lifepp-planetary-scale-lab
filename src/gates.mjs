export const ALLOWED_CLAIM_LABELS = Object.freeze(["[M]", "[D]", "[C]", "[A]", "[SIM]", "[EXP]", "[RET]"]);

function gate(id, claimLabel, status, evidence) {
  if (!ALLOWED_CLAIM_LABELS.includes(claimLabel)) throw new Error(`INVALID_CLAIM_LABEL:${claimLabel}`);
  return { gate: id, claim_label: claimLabel, status, evidence };
}

export function evaluateScaleGates({ profile, first, second, faults, buildPlatformAttestations = [] }) {
  const thresholds = profile.thresholds;
  const independentPlatforms = new Set(buildPlatformAttestations
    .filter((entry) => entry.administratively_independent === true && entry.artifact_root === first.candidateRoot)
    .map((entry) => entry.platform_control_domain));
  const topologyPass = first.topology.topology_root === second.topology.topology_root
    && first.profileRoot === second.profileRoot;
  const replayPass = first.candidateRoot === second.candidateRoot;
  const faultPass = faults.every((entry) => entry.recovered === true);
  const s5TopologyPass = first.metrics.region_count >= thresholds.minimum_regions
    && first.metrics.provider_count >= thresholds.minimum_providers
    && first.metrics.architecture_count >= thresholds.minimum_architectures;
  return [
    gate("S0", "[D]", topologyPass && replayPass ? "PASS" : "FAIL_CLOSED", {
      topology_root_equal: topologyPass,
      deterministic_candidate_root_equal: replayPass
    }),
    gate("S1", "[SIM]", first.metrics.logical_identity_capacity >= thresholds.logical_identity_capacity ? "PASS_SIMULATED" : "FAIL_CLOSED", {
      measured: first.metrics.logical_identity_capacity,
      threshold: thresholds.logical_identity_capacity
    }),
    gate("S2", "[SIM]", first.metrics.active_concurrency >= thresholds.active_concurrency
      && first.metrics.sustained_throughput_events_per_second >= thresholds.sustained_throughput_events_per_second ? "PASS_SIMULATED" : "FAIL_CLOSED", {
      active_concurrency: first.metrics.active_concurrency,
      sustained_throughput_events_per_second: first.metrics.sustained_throughput_events_per_second
    }),
    gate("S3", "[SIM]", first.metrics.cross_cell_commitments_per_second >= thresholds.cross_cell_commitments_per_second
      && first.metrics.global_roots_per_second >= thresholds.global_roots_per_second ? "PASS_SIMULATED" : "FAIL_CLOSED", {
      cross_cell_commitments_per_second: first.metrics.cross_cell_commitments_per_second,
      global_roots_per_second: first.metrics.global_roots_per_second
    }),
    gate("S4", "[SIM]", faultPass && replayPass ? "PASS_SIMULATED" : "FAIL_CLOSED", {
      fault_count: faults.length,
      all_faults_recovered: faultPass,
      candidate_incremental_full_replay_equal: replayPass
    }),
    gate("S5", "[EXP]", s5TopologyPass && independentPlatforms.size >= thresholds.independent_build_platforms
      ? "PASS_REPRODUCED"
      : "PENDING_EXTERNAL_REPRODUCTION", {
      emulated_region_provider_architecture_thresholds_pass: s5TopologyPass,
      independent_build_platforms: independentPlatforms.size,
      required_independent_build_platforms: thresholds.independent_build_platforms
    })
  ];
}
