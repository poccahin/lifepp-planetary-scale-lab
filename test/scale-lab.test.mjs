import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { simulateBaseline } from "../src/simulator.mjs";
import { runFaultCampaigns } from "../src/faults.mjs";
import { evaluateScaleGates, ALLOWED_CLAIM_LABELS } from "../src/gates.mjs";
import { replayRoot } from "../src/replay.mjs";

const profile = JSON.parse(await readFile(new URL("../config/lab-profile.json", import.meta.url), "utf8"));
const platformAttestations = JSON.parse(await readFile(new URL("../config/build-platform-attestations.json", import.meta.url), "utf8"));

test("Device to Planet topology is deterministic and separately measured", () => {
  const first = simulateBaseline(profile);
  const second = simulateBaseline(profile);
  assert.deepEqual(first.topology.hierarchy, ["Device", "Cell", "Field", "Region", "Planet"]);
  assert.equal(first.metrics.logical_identity_capacity, 98_304);
  assert.equal(first.metrics.active_concurrency, 4_096);
  assert.equal(first.metrics.sustained_throughput_events_per_second, 768);
  assert.equal(first.metrics.cross_cell_commitments_per_second, 48);
  assert.equal(first.metrics.global_roots_per_second, 1);
  assert.equal(first.topology.topology_root, second.topology.topology_root);
  assert.equal(first.candidateRoot, second.candidateRoot);
});

test("candidate, incremental and full replay roots are equal", () => {
  const baseline = simulateBaseline(profile);
  assert.equal(replayRoot(baseline.events, baseline.initialRoot), baseline.candidateRoot);
  assert.equal(replayRoot([...baseline.events].reverse(), baseline.initialRoot), baseline.candidateRoot);
});

test("all required fault campaigns recover to the pinned baseline root", () => {
  const baseline = simulateBaseline(profile);
  const faults = runFaultCampaigns(baseline.events, baseline.initialRoot, baseline.candidateRoot);
  assert.deepEqual(faults.map((entry) => entry.fault), [
    "PARTITION", "BYZANTINE", "CLOCK_DRIFT", "DUPLICATE", "REORDER",
    "STALE_POLICY", "SYBIL", "STORAGE_EXHAUSTION", "REGIONAL_OUTAGE"
  ]);
  assert.ok(faults.every((entry) => entry.recovered === true));
});

test("S0-S4 pass only as deterministic or simulated evidence while S5 fails closed", () => {
  const first = simulateBaseline(profile);
  const second = simulateBaseline(profile);
  const faults = runFaultCampaigns(first.events, first.initialRoot, first.candidateRoot);
  const gates = evaluateScaleGates({ profile, first, second, faults, buildPlatformAttestations: [] });
  assert.deepEqual(gates.map((entry) => entry.gate), ["S0", "S1", "S2", "S3", "S4", "S5"]);
  assert.deepEqual(gates.slice(0, 5).map((entry) => entry.status), ["PASS", "PASS_SIMULATED", "PASS_SIMULATED", "PASS_SIMULATED", "PASS_SIMULATED"]);
  assert.equal(gates[5].status, "PENDING_EXTERNAL_REPRODUCTION");
  assert.ok(gates.every((entry) => ALLOWED_CLAIM_LABELS.includes(entry.claim_label)));
});

test("two genuinely independent matching build attestations satisfy only S5 reproduction", () => {
  const first = simulateBaseline(profile);
  const second = simulateBaseline(profile);
  const faults = runFaultCampaigns(first.events, first.initialRoot, first.candidateRoot);
  const gates = evaluateScaleGates({
    profile,
    first,
    second,
    faults,
    buildPlatformAttestations: [
      { artifact_root: first.candidateRoot, administratively_independent: true, platform_control_domain: "platform-a" },
      { artifact_root: first.candidateRoot, administratively_independent: true, platform_control_domain: "platform-b" }
    ]
  });
  assert.equal(gates[5].status, "PASS_REPRODUCED");
});

test("committed platform attestations disclose the common operator and imply no protocol authority", () => {
  assert.equal(platformAttestations.independent_build_platform_count, 2);
  assert.equal(platformAttestations.common_project_operator_disclosed, true);
  assert.equal(platformAttestations.protocol_authority_implied, false);
  assert.ok(platformAttestations.attestations.every((entry) => entry.independence_scope === "BUILD_EXECUTOR_INFRASTRUCTURE_ONLY"));
  assert.ok(platformAttestations.attestations.every((entry) => entry.independent_protocol_authority === false));
});
