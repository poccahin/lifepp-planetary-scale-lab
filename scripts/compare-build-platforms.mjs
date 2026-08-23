import { readFile } from "node:fs/promises";

const [leftPath, rightPath] = process.argv.slice(2);
if (!leftPath || !rightPath) throw new Error("TWO_CERTIFICATE_PATHS_REQUIRED");
const left = JSON.parse(await readFile(leftPath, "utf8"));
const right = JSON.parse(await readFile(rightPath, "utf8"));
if (left.certificate_root !== right.certificate_root) throw new Error("BUILD_PLATFORM_ROOT_DIVERGENCE");
if (left.planetary_live_scale_proved !== false || right.planetary_live_scale_proved !== false) throw new Error("LIVE_SCALE_OVERCLAIM");
console.log(JSON.stringify({
  claim_label: "[EXP]",
  artifact_roots_equal: true,
  certificate_root: left.certificate_root,
  build_variants_reproduced: 2,
  independent_build_platforms: left.independent_build_platforms,
  independence_scope: "BUILD_EXECUTOR_INFRASTRUCTURE_ONLY",
  common_project_operator_disclosed: true,
  protocol_authority_implied: false,
  satisfies_s5_independent_reproduction: left.s5_independent_reproduction_complete === true
}));
