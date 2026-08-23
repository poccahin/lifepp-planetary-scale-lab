import { mkdir, readFile, writeFile } from "node:fs/promises";
import { canonicalJson, domainHash } from "../src/canonical.mjs";

const certificate = JSON.parse(await readFile("reports/planetary-scale-evidence-certificate.json", "utf8"));
const run = JSON.parse(await readFile("reports/scale-lab-run.json", "utf8"));
if (certificate.candidate_root !== run.roots.candidate_root) throw new Error("CANDIDATE_ROOT_DIVERGENCE");
if (certificate.planetary_live_scale_proved !== false) throw new Error("LIVE_SCALE_OVERCLAIM");
if (certificate.protocol_finality_proved !== false) throw new Error("PROTOCOL_FINALITY_OVERCLAIM");
if (certificate.transaction_submission !== false || certificate.asset_execution_enabled !== false) {
  throw new Error("ASSET_BOUNDARY_VIOLATION");
}

const payload = {
  artifact_type: "CloudflareBuildPlatformReproduction",
  artifact_version: "1.0.0",
  claim_label: "[EXP]",
  evidence_class: "INDEPENDENT_BUILD_PLATFORM_REPRODUCTION",
  build_platform: "CLOUDFLARE_GIT_BUILD",
  build_executor_control_domain: "cloudflare.com",
  common_project_operator_disclosed: true,
  common_project_operator: "poccahin-current-operator",
  independent_protocol_authority: false,
  observer_seat: false,
  protocol_finality_weight: false,
  source_commit: process.env.CF_PAGES_COMMIT_SHA || "LOCAL_BUILD",
  source_branch: process.env.CF_PAGES_BRANCH || "LOCAL_BUILD",
  candidate_root: certificate.candidate_root,
  certificate_root: certificate.certificate_root,
  run_root: certificate.run_root,
  s0_through_s4_complete: certificate.s0_through_s4_complete,
  s5_status_at_source_commit: certificate.gates.find((gate) => gate.gate === "S5").status,
  planetary_scale_envelope_proved: certificate.planetary_scale_envelope_proved,
  planetary_live_scale_proved: false,
  protocol_finality_proved: false,
  transaction_submission: false,
  asset_execution_enabled: false,
  asset_recovery_executor: "DISARMED"
};
const reproduction = {
  ...payload,
  reproduction_root: domainHash("lifepp:cloudflare-build-platform-reproduction:v1", payload)
};

await mkdir("dist", { recursive: true });
await writeFile("dist/reproduction.json", canonicalJson(reproduction));
await writeFile(
  "dist/index.html",
  `<!doctype html><meta charset="utf-8"><title>Life++ Scale Reproduction</title><pre>${JSON.stringify(reproduction, null, 2)}</pre>`
);
await writeFile("dist/_headers", "/*\n  Cache-Control: public, max-age=60\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: default-src 'none'; style-src 'none'; frame-ancestors 'none'\n");
console.log(JSON.stringify(reproduction));
