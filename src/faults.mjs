import { domainHash } from "./canonical.mjs";
import { recoverAgainstPinnedBaseline, replayRoot } from "./replay.mjs";

const ZERO_ROOT = `sha256:${"0".repeat(64)}`;

function clone(events) {
  return structuredClone(events);
}

function campaigns(baseline) {
  return [
    {
      id: "PARTITION",
      mutate(events) {
        const withheld = events.filter((event) => event.region_id === "region-2" && event.epoch === 3);
        return events.filter((event) => !withheld.includes(event)).concat(withheld);
      }
    },
    {
      id: "BYZANTINE",
      mutate(events) {
        events[17].event_root = ZERO_ROOT;
        return events;
      }
    },
    {
      id: "CLOCK_DRIFT",
      mutate(events) {
        events[31].timestamp_ms += 86_400_000;
        return events;
      }
    },
    {
      id: "DUPLICATE",
      mutate(events) {
        return events.concat(events.slice(0, 32));
      }
    },
    {
      id: "REORDER",
      mutate(events) {
        return events.reverse();
      }
    },
    {
      id: "STALE_POLICY",
      mutate(events) {
        events[47].policy_root = domainHash("lifepp:scale-lab:stale-policy:v1", { epoch: -1 });
        return events;
      }
    },
    {
      id: "SYBIL",
      mutate(events) {
        const source = events[63];
        return events.concat([{ ...source, event_id: domainHash("lifepp:scale-lab:sybil:v1", source.event_id) }]);
      }
    },
    {
      id: "STORAGE_EXHAUSTION",
      mutate(events) {
        const noise = Array.from({ length: 2048 }, (_, index) => ({
          ...events[index % events.length],
          event_id: domainHash("lifepp:scale-lab:storage-noise:v1", { index })
        }));
        return events.concat(noise);
      }
    },
    {
      id: "REGIONAL_OUTAGE",
      mutate(events) {
        const delayed = events.filter((event) => event.region_id === "region-4" && event.epoch >= 5 && event.epoch <= 7);
        return events.filter((event) => !delayed.includes(event)).concat(delayed);
      }
    }
  ];
}

export function runFaultCampaigns(baselineEvents, initialRoot, expectedRoot) {
  return campaigns(baselineEvents).map((campaign) => {
    const mutated = campaign.mutate(clone(baselineEvents));
    const recovered = recoverAgainstPinnedBaseline(mutated, baselineEvents);
    const recoveredRoot = replayRoot(recovered.recovered, initialRoot);
    return {
      fault: campaign.id,
      claim_label: "[SIM]",
      injected: true,
      detected_mutations: recovered.detected,
      replay_root: recoveredRoot,
      expected_root: expectedRoot,
      recovered: recoveredRoot === expectedRoot
    };
  });
}
