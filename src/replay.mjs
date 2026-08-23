import { canonicalize, domainHash } from "./canonical.mjs";

export function eventPayload(event) {
  const { event_root: _eventRoot, ...payload } = event;
  return payload;
}

export function eventRoot(event) {
  return domainHash("lifepp:scale-lab:cell-commitment:v1", eventPayload(event));
}

export function canonicalEventOrder(events) {
  return [...events].sort((left, right) => left.logical_sequence - right.logical_sequence
    || Buffer.from(left.event_id).compare(Buffer.from(right.event_id)));
}

export function replayRoot(events, initialRoot) {
  let stateRoot = initialRoot;
  for (const event of canonicalEventOrder(events)) {
    if (eventRoot(event) !== event.event_root) throw new Error(`INVALID_EVENT_ROOT:${event.event_id}`);
    stateRoot = domainHash("lifepp:scale-lab:incremental-state:v1", {
      previous_state_root: stateRoot,
      event_root: event.event_root,
      logical_sequence: event.logical_sequence
    });
  }
  return stateRoot;
}

export function recoverAgainstPinnedBaseline(candidateEvents, baselineEvents) {
  const candidates = new Map(candidateEvents.map((event) => [event.event_id, event]));
  const baselineIds = new Set(baselineEvents.map((event) => event.event_id));
  let detected = 0;
  const recovered = baselineEvents.map((baseline) => {
    const candidate = candidates.get(baseline.event_id);
    if (!candidate || canonicalize(candidate) !== canonicalize(baseline)) {
      detected += 1;
      return baseline;
    }
    return candidate;
  });
  detected += candidateEvents.filter((event) => !baselineIds.has(event.event_id)).length;
  detected += Math.max(0, candidateEvents.length - new Set(candidateEvents.map((event) => event.event_id)).size);
  return { recovered: canonicalEventOrder(recovered), detected };
}
