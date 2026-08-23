import { domainHash } from "./canonical.mjs";
import { buildTopology, flattenCells } from "./topology.mjs";
import { eventRoot, replayRoot } from "./replay.mjs";

export function simulateBaseline(profile) {
  const topology = buildTopology(profile);
  const cells = flattenCells(topology);
  const profileRoot = domainHash("lifepp:scale-lab:profile:v1", profile);
  const policyRoot = domainHash("lifepp:scale-lab:policy:v1", {
    profile_root: profileRoot,
    evidence_class: profile.evidence_class,
    claim_label: profile.claim_label
  });
  const events = [];
  for (let epoch = 0; epoch < profile.epochs; epoch += 1) {
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      const payload = {
        event_id: domainHash("lifepp:scale-lab:event-id:v1", { seed: profile.seed, epoch, cell_id: cell.id }),
        logical_sequence: epoch * cells.length + cellIndex,
        epoch,
        timestamp_ms: epoch * profile.epoch_duration_seconds * 1000,
        cell_id: cell.id,
        field_id: cell.field_id,
        region_id: cell.region_id,
        provider: cell.provider,
        architecture: cell.architecture,
        device_count: cell.device_range.count,
        device_commitment_root: domainHash("lifepp:scale-lab:device-commitment:v1", {
          seed: profile.seed,
          epoch,
          cell_id: cell.id,
          device_range: cell.device_range
        }),
        producer_control_nullifier: domainHash("lifepp:scale-lab:producer-control:v1", { cell_id: cell.id }),
        policy_root: policyRoot,
        claim_label: "[SIM]"
      };
      events.push({ ...payload, event_root: eventRoot(payload) });
    }
  }
  const initialRoot = domainHash("lifepp:scale-lab:genesis-state:v1", {
    topology_root: topology.topology_root,
    profile_root: profileRoot,
    policy_root: policyRoot
  });
  const candidateRoot = replayRoot(events, initialRoot);
  const durationSeconds = profile.epochs * profile.epoch_duration_seconds;
  const metrics = {
    claim_label: "[SIM]",
    logical_identity_capacity: topology.logical_identity_capacity,
    active_concurrency: profile.active_concurrency,
    sustained_throughput_events_per_second: events.length / durationSeconds,
    cross_cell_commitments_per_second: (profile.regions.length * profile.fields_per_region) / profile.epoch_duration_seconds,
    global_roots_per_second: 1 / profile.epoch_duration_seconds,
    event_count: events.length,
    duration_seconds: durationSeconds,
    region_count: profile.regions.length,
    provider_count: new Set(profile.regions.map((region) => region.provider)).size,
    architecture_count: new Set(profile.regions.map((region) => region.architecture)).size
  };
  return { topology, profileRoot, policyRoot, initialRoot, events, candidateRoot, metrics };
}
