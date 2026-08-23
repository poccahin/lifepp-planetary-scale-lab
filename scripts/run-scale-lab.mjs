import { mkdir, readFile, writeFile } from "node:fs/promises";
import { canonicalJson, domainHash } from "../src/canonical.mjs";
import { simulateBaseline } from "../src/simulator.mjs";
import { runFaultCampaigns } from "../src/faults.mjs";
import { evaluateScaleGates } from "../src/gates.mjs";
import { replayRoot } from "../src/replay.mjs";

const profile = JSON.parse(await readFile("config/lab-profile.json", "utf8"));
const buildPlatforms = JSON.parse(await readFile("config/build-platform-attestations.json", "utf8"));
const first = simulateBaseline(profile);
const second = simulateBaseline(profile);
const faults = runFaultCampaigns(first.events, first.initialRoot, first.candidateRoot);
const fullReplayRoot = replayRoot([...first.events].reverse(), first.initialRoot);
const incrementalRoot = replayRoot(first.events, first.initialRoot);
const gates = evaluateScaleGates({
  profile,
  first,
  second,
  faults,
  buildPlatformAttestations: buildPlatforms.attestations
});

const runPayload = {
  artifact_type: "PlanetaryScaleLabRun",
  artifact_version: "1.0.0",
  claim_label: "[SIM]",
  evidence_class: "SIMULATED",
  profile_root: first.profileRoot,
  topology_root: first.topology.topology_root,
  policy_root: first.policyRoot,
  metrics: first.metrics,
  fault_campaigns: faults,
  roots: {
    candidate_root: first.candidateRoot,
    incremental_root: incrementalRoot,
    full_replay_root: fullReplayRoot,
    second_run_candidate_root: second.candidateRoot,
    candidate_incremental_full_replay_equal: first.candidateRoot === incrementalRoot
      && incrementalRoot === fullReplayRoot
      && fullReplayRoot === second.candidateRoot
  },
  gates,
  protocol_finality_proved: false,
  planetary_live_scale_proved: false,
  transaction_submission: false,
  asset_execution_enabled: false,
  asset_recovery_executor: "DISARMED"
};
const run = {
  ...runPayload,
  run_root: domainHash("lifepp:planetary-scale-lab:run:v1", runPayload)
};

const s0ToS4Pass = gates.slice(0, 5).every((entry) => entry.status === "PASS" || entry.status === "PASS_SIMULATED");
const s5Reproduced = gates[5].status === "PASS_REPRODUCED";
const certificatePayload = {
  artifact_type: "PlanetaryScaleEvidenceCertificate",
  artifact_version: "1.0.0",
  claim_label: "[SIM]",
  evidence_class: "SIMULATED",
  certificate_status: s0ToS4Pass && s5Reproduced ? "SCALE_ENVELOPE_REPRODUCED" : "PARTIAL_SIMULATED_FAIL_CLOSED",
  frozen_protocol_heads: {
    claim_label: "[M]",
    pocc: "8902b22c04511ac60d81f9f6e6d24d48350aa4d9",
    ahin: "1dc061616ab16c48cfef1b165f925a2fda99db1c",
    cai: "6048008a0e34897b172a9c3171d34ac12c692ada",
    chainrank: "c2cf581c786eb35fc2f9ec789838db9a98e1829b"
  },
  run_root: run.run_root,
  profile_root: first.profileRoot,
  topology_root: first.topology.topology_root,
  candidate_root: first.candidateRoot,
  incremental_root: incrementalRoot,
  full_replay_root: fullReplayRoot,
  candidate_incremental_full_replay_equal: run.roots.candidate_incremental_full_replay_equal,
  gates,
  s0_through_s4_complete: s0ToS4Pass,
  s5_independent_reproduction_complete: s5Reproduced,
  independent_build_platforms: gates[5].evidence.independent_build_platforms,
  required_independent_build_platforms: gates[5].evidence.required_independent_build_platforms,
  simulated_topology_only: true,
  planetary_scale_envelope_proved: s0ToS4Pass && s5Reproduced,
  planetary_live_scale_proved: false,
  protocol_finality_proved: false,
  autonomous_protocol_merge: false,
  transaction_submission: false,
  asset_execution_enabled: false,
  asset_recovery_executor: "DISARMED"
};
const certificate = {
  ...certificatePayload,
  certificate_root: domainHash("lifepp:planetary-scale-evidence-certificate:v1", certificatePayload)
};

await mkdir("reports", { recursive: true });
await writeFile("reports/scale-lab-run.json", canonicalJson(run));
await writeFile("reports/planetary-scale-evidence-certificate.json", canonicalJson(certificate));
console.log(JSON.stringify({
  run_root: run.run_root,
  certificate_root: certificate.certificate_root,
  s0_through_s4_complete: certificate.s0_through_s4_complete,
  s5_independent_reproduction_complete: certificate.s5_independent_reproduction_complete,
  planetary_scale_envelope_proved: certificate.planetary_scale_envelope_proved,
  planetary_live_scale_proved: certificate.planetary_live_scale_proved
}));
