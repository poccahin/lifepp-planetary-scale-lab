import { readFile } from "node:fs/promises";
import { domainHash } from "../src/canonical.mjs";

const run = JSON.parse(await readFile("reports/scale-lab-run.json", "utf8"));
const certificate = JSON.parse(await readFile("reports/planetary-scale-evidence-certificate.json", "utf8"));
const { run_root: recordedRunRoot, ...runPayload } = run;
const { certificate_root: recordedCertificateRoot, ...certificatePayload } = certificate;
if (domainHash("lifepp:planetary-scale-lab:run:v1", runPayload) !== recordedRunRoot) throw new Error("RUN_ROOT_MISMATCH");
if (domainHash("lifepp:planetary-scale-evidence-certificate:v1", certificatePayload) !== recordedCertificateRoot) throw new Error("CERTIFICATE_ROOT_MISMATCH");
if (certificate.s0_through_s4_complete !== true) throw new Error("S0_S4_INCOMPLETE");
if (certificate.s5_independent_reproduction_complete !== false) throw new Error("S5_MUST_REMAIN_PENDING");
if (certificate.planetary_scale_envelope_proved !== false || certificate.planetary_live_scale_proved !== false) throw new Error("SCALE_OVERCLAIM");
if (certificate.protocol_finality_proved !== false || certificate.transaction_submission !== false || certificate.asset_execution_enabled !== false) throw new Error("AUTHORITY_BOUNDARY_VIOLATION");
if (certificate.asset_recovery_executor !== "DISARMED") throw new Error("RECOVERY_EXECUTOR_MUST_REMAIN_DISARMED");
console.log(JSON.stringify({ evidence_verified: true, run_root: recordedRunRoot, certificate_root: recordedCertificateRoot }));
