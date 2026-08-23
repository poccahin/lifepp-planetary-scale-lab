# Life++ Planetary Scale Lab

`[SIM]` This is a non-authoritative deterministic scale laboratory. It measures a bounded scale envelope without modifying the frozen Life++ protocol or claiming live planetary deployment.

## Frozen inputs

- `[M]` PoCC: `8902b22c04511ac60d81f9f6e6d24d48350aa4d9`
- `[M]` AHIN: `1dc061616ab16c48cfef1b165f925a2fda99db1c`
- `[M]` CAI: `6048008a0e34897b172a9c3171d34ac12c692ada`
- `[M]` ChainRank: `c2cf581c786eb35fc2f9ec789838db9a98e1829b`

## Model

`[D]` The hierarchy is `Device → Cell → Field → Region → Planet`. The lab separately records logical identity capacity, active concurrency, sustained throughput, cross-cell commitment rate, and global-root rate.

`[SIM]` Region, provider, and hardware labels in the default profile are emulated topology dimensions. They are not evidence of live deployments in those regions or providers.

`[SIM]` Fault campaigns cover partition, Byzantine mutation, clock drift, duplicate delivery, reorder, stale policy, control-nullifier Sybil duplication, storage exhaustion, regional outage, and full replay.

## Gates

- `[D] S0` deterministic topology and canonical roots.
- `[SIM] S1` logical identity envelope.
- `[SIM] S2` concurrency and sustained-throughput envelope.
- `[SIM] S3` cross-cell commitment and global-root envelope.
- `[SIM] S4` fault recovery and candidate/incremental/full replay equality.
- `[EXP] S5` multi-provider/region/architecture evidence plus reproduction by two independent build platforms.

`[A]` S5 remains fail-closed until two administratively independent build platforms reproduce the same artifact root. GitHub runner variants under one provider do not satisfy that condition.

`[EXP]` The Cloudflare Git build runs `npm run cloudflare:build` and publishes only the generated `dist` evidence through an unbound `workers.dev` resource. It has no secret, storage, queue, database, custom-domain, or `ahin.io` route binding and carries no protocol authority.

```text
PLANETARY_LIVE_SCALE_PROVED=false
PLANETARY_SCALE_ENVELOPE_PROVED=false
PROTOCOL_FINALITY_PROVED=false
TRANSACTION_SUBMISSION=false
ASSET_EXECUTION_ENABLED=false
ASSET_RECOVERY_EXECUTOR=DISARMED
```
