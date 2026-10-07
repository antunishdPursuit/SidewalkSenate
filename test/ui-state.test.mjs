import test from "node:test";
import assert from "node:assert/strict";
import {
  freshStop,
  choosePlace,
  editStop,
  acceptReflection,
  acceptDraft,
} from "../web/stop-state.ts";
import { api } from "../web/api.ts";
const analysis = {
  reflectionSummary: "A personal feeling.",
  connections: [],
  suggestion: {
    title: "Discuss",
    change: "Generated suggestion",
    rationale: "Experience",
    openQuestions: [],
  },
  notice: "Review",
};
const result = { status: "matched", analysis };
test("late analysis and draft responses cannot attach to edited inputs", () => {
  const original = {
    ...freshStop(),
    place: "Old place",
    observation: "Original experience",
    reviewed: true,
  };
  const edited = editStop(original, { observation: "New experience" }, true);
  assert.equal(acceptReflection(edited, original.revision, result), edited);
  assert.equal(
    acceptDraft(edited, original.revision, {
      subject: "Old",
      body: "Old",
      notice: "",
    }),
    edited,
  );
});
test("resident suggestions survive context changes and repeated analysis", () => {
  let stop = editStop(
    freshStop(),
    {
      place: "Cafe",
      observation: "We enjoyed sitting",
      change: "My own words",
      changeOwner: "resident",
    },
    true,
  );
  stop = acceptReflection(stop, stop.revision, result);
  assert.equal(stop.change, "My own words");
  stop = editStop(stop, { place: "Another place" }, true);
  assert.equal(stop.change, "My own words");
  assert.equal(stop.reviewed, false);
  assert.equal(stop.analysis, undefined);
  stop = acceptReflection(stop, stop.revision, { status: "no_match" });
  assert.equal(stop.change, "My own words");
});
test("generated suggestions cannot leak into another place or changed reflection", () => {
  const stop = acceptReflection(freshStop(), 0, result);
  assert.equal(stop.changeOwner, "model");
  const changed = editStop(stop, { place: "Unrelated place" }, true);
  assert.equal(changed.change, "");
  assert.equal(changed.analysis, undefined);
  assert.equal(
    acceptReflection(changed, changed.revision, { status: "no_match" }).change,
    "",
  );
  assert.equal(
    editStop(stop, { observation: "Different experience" }, true).change,
    "",
  );
});
test("review changes invalidate a pending draft and ordinary request bookkeeping does not", () => {
  const stop = { ...freshStop(), reviewed: true, change: "Resident words" };
  assert.equal(editStop(stop, { busy: true }).revision, stop.revision);
  const unreviewed = editStop(stop, { reviewed: false, draft: undefined });
  assert.equal(
    acceptDraft(unreviewed, stop.revision, {
      subject: "x",
      body: "x",
      notice: "",
    }),
    unreviewed,
  );
});
test("network, timeout and unreadable responses produce recoverable messages", async () => {
  for (const failure of [
    new TypeError("Failed to fetch"),
    new DOMException("raw timeout", "TimeoutError"),
  ]) {
    await assert.rejects(
      api("cases", undefined, async () => {
        throw failure;
      }),
      /Your words are still here/,
    );
  }
  await assert.rejects(
    api(
      "cases",
      undefined,
      async () => new Response("<html>bad gateway</html>", { status: 502 }),
    ),
    /unreadable response/,
  );
  await assert.rejects(
    api("cases", undefined, async () =>
      Response.json(
        { error: "Try again after the current reflection." },
        { status: 429 },
      ),
    ),
    /Try again after/,
  );
});

test("refining a reviewed place requires confirmation again without losing the selection", () => {
  const stop = {
    ...freshStop(),
    place: "Thomson at Jackson",
    placeId: "thomson-jackson",
    confirmed: true,
  };
  const renamed = editStop(stop, { place: "Another place" }, true);
  assert.equal(renamed.confirmed, false);
  assert.equal(renamed.placeId, "thomson-jackson");
  assert.ok(renamed.revision > stop.revision);
});

test("map and dropdown location selection use the same source and label rules", () => {
  const one = { id: "one", label: "First intersection" },
    two = { id: "two", label: "Second intersection" };
  let stop = choosePlace(freshStop(), { lat: 1, lng: 1 }, one);
  stop = acceptReflection(stop, stop.revision, result);
  stop = choosePlace(stop, { lat: 2, lng: 2 }, two);
  assert.equal(stop.place, two.label);
  assert.equal(stop.placeId, two.id);
  assert.equal(stop.confirmed, false);
  assert.equal(stop.analysis, undefined);
  const arbitrary = choosePlace(stop, { lat: 3, lng: 3 });
  assert.equal(arbitrary.place, "");
  assert.equal(arbitrary.placeId, "");
  assert.equal(arbitrary.analysis, undefined);
  const named = editStop(stop, { place: "My familiar corner" }, true);
  assert.equal(
    choosePlace(named, { lat: 3, lng: 3 }).place,
    "My familiar corner",
  );
});
