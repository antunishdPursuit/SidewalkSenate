export type Point = { lat: number; lng: number };
export type Source = {
  url: string;
  title: string;
  documentDate: string;
  status: string;
};
export type Analysis = {
  reflectionSummary: string;
  connections: {
    claimId: string;
    explanation: string;
    sourceClaim: string;
    citation: string;
  }[];
  suggestion: {
    title: string;
    change: string;
    rationale: string;
    openQuestions: string[];
  };
  notice: string;
};
export type Draft = { subject: string; body: string; notice: string };
export type Stop = {
  id: string;
  place: string;
  placeOwner: "resident" | "reviewed";
  observation: string;
  placeId: string;
  confirmed: boolean;
  point?: Point;
  analysis?: Analysis;
  source?: Source;
  outcome?: string;
  error?: string;
  message?: string;
  busy: boolean;
  change: string;
  changeOwner: "resident" | "model";
  reviewed: boolean;
  draft?: Draft;
  revision: number;
};
export const freshStop = (): Stop => ({
  id: crypto.randomUUID(),
  place: "",
  placeOwner: "resident",
  observation: "",
  placeId: "",
  confirmed: false,
  busy: false,
  change: "",
  changeOwner: "resident",
  reviewed: false,
  revision: 0,
});
// One owner for invalidation and request revisions. Resident writing always survives context edits.
export function editStop(
  stop: Stop,
  changes: Partial<Stop>,
  invalidate = false,
): Stop {
  if (
    "place" in changes &&
    changes.place !== stop.place &&
    !("confirmed" in changes)
  ) {
    changes = { ...changes, confirmed: false };
  }
  if ("place" in changes && !("placeOwner" in changes))
    changes = { ...changes, placeOwner: "resident" };
  const edited = [
    "place",
    "observation",
    "placeId",
    "confirmed",
    "point",
    "change",
    "reviewed",
  ].some(
    (key) =>
      key in changes && changes[key as keyof Stop] !== stop[key as keyof Stop],
  );
  const stale = invalidate
    ? {
        analysis: undefined,
        source: undefined,
        outcome: undefined,
        error: undefined,
        draft: undefined,
        reviewed: false,
        message: undefined,
        ...(stop.changeOwner === "model"
          ? { change: "", changeOwner: "resident" as const }
          : {}),
      }
    : {};
  return {
    ...stop,
    ...stale,
    ...changes,
    revision: stop.revision + (edited ? 1 : 0),
  };
}
export type ReflectionResult = {
  analysis?: Analysis;
  source?: Source;
  status: string;
};
export function acceptReflection(
  stop: Stop,
  revision: number,
  result: ReflectionResult,
): Stop {
  if (stop.revision !== revision) return stop;
  const keepResident = stop.changeOwner === "resident" && !!stop.change.trim();
  return {
    ...stop,
    analysis: result.analysis,
    source: result.source,
    outcome: result.status,
    change: keepResident
      ? stop.change
      : result.analysis?.suggestion.change || "",
    changeOwner: keepResident
      ? "resident"
      : result.analysis
        ? "model"
        : "resident",
    reviewed: false,
    draft: undefined,
    error: undefined,
    message: result.analysis
      ? "Connection ready to review."
      : "No reviewed match. You can still write a suggestion.",
  };
}
export function acceptDraft(stop: Stop, revision: number, draft: Draft): Stop {
  return stop.revision === revision && stop.reviewed
    ? { ...stop, draft, message: "Draft ready. Nothing has been sent." }
    : stop;
}

export function choosePlace(
  stop: Stop,
  point: Point | undefined,
  place?: { id: string; label: string },
): Stop {
  return editStop(
    stop,
    {
      point,
      place: place?.label ?? (stop.placeOwner === "reviewed" ? "" : stop.place),
      placeOwner: place ? "reviewed" : "resident",
      placeId: place?.id || "",
      confirmed: false,
    },
    true,
  );
}
