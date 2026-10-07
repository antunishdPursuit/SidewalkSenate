import { useEffect, useRef, useState } from "react";

import ReflectionForm from "./ReflectionForm";
import ConnectionView from "./ConnectionView";
import SuggestionView from "./SuggestionView";
import BeforeOuting from "./BeforeOuting";
import PlaceMap, { type Point, type MapPlace } from "./PlaceMap";

import { api } from "./api";
import {
  freshStop,
  editStop,
  acceptReflection,
  acceptDraft,
  choosePlace,
  type Stop,
  type Source,
  type Draft,
} from "./stop-state";
type Case = {
  id: string;
  title: string;
  placeOptions: MapPlace[];
  source: Source;
};
const steps = [
  "Before you go",
  "Back from your outing",
  "Explore the connection",
  "Shape your suggestion",
];
const emptyPlaces: MapPlace[] = [];
function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
export default function App() {
  const [step, setStep] = useState(0);
  const previousStep = useRef(0);
  const navigation = useRef(0);
  useEffect(() => {
    if (previousStep.current !== step) {
      document.getElementById("main")?.focus({ preventScroll: true });
      previousStep.current = step;
    }
  }, [step]);
  const [destination, setDestination] = useState("");
  const [destinationPoint, setDestinationPoint] = useState<Point>();
  const [destinationReviewedLabel, setDestinationReviewedLabel] =
    useState<string>();
  const [headingOut, setHeadingOut] = useState(false);
  const [stops, setStops] = useState<Stop[]>(() => [freshStop()]);
  const [active, setActive] = useState<string>("");
  const [cases, setCases] = useState<Case[]>([]);
  const [sourceError, setSourceError] = useState("");
  const [sourceAttempt, setSourceAttempt] = useState(0);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [draftBusy, setDraftBusy] = useState(false);
  const busy = stops.some((stop) => stop.busy) || draftBusy;
  const dirty =
    !!destination.trim() ||
    !!destinationPoint ||
    stops.some(
      (stop) =>
        stop.place.trim() ||
        stop.observation.trim() ||
        stop.change.trim() ||
        stop.point,
    );
  const current = stops.find((stop) => stop.id === active) || stops[0];
  const project = cases[0];
  useEffect(() => {
    let live = true;
    setSourceLoading(true);
    setSourceError("");
    api("cases")
      .then((data) => {
        if (!Array.isArray(data.cases))
          throw new Error("Reviewed sources unavailable");
        if (live) setCases(data.cases);
      })
      .catch(() => {
        if (live)
          setSourceError(
            "Reviewed sources are unavailable. Your writing is safe here. Retry when the local app is available.",
          );
      })
      .finally(() => {
        if (live) setSourceLoading(false);
      });
    return () => {
      live = false;
    };
  }, [sourceAttempt]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function patch(id: string, changes: Partial<Stop>, invalidate = false) {
    setStops((items) =>
      items.map((stop) =>
        stop.id === id ? editStop(stop, changes, invalidate) : stop,
      ),
    );
  }
  function chooseLocation(
    id: string,
    point: Point | undefined,
    place?: MapPlace,
  ) {
    setStops((items) =>
      items.map((stop) =>
        stop.id === id ? choosePlace(stop, point, place) : stop,
      ),
    );
  }
  function move(index: number) {
    navigation.current++;
    setStep(index);
  }
  function reset() {
    if (
      dirty &&
      !window.confirm(
        "Clear this outing? Your reflections and drafts are not saved.",
      )
    )
      return;
    const first = freshStop();
    setStops([first]);
    setActive(first.id);
    setDestination("");
    setDestinationPoint(undefined);
    setDestinationReviewedLabel(undefined);
    setHeadingOut(false);
    move(0);
  }
  async function connect(stop: Stop) {
    if (busy) return;
    if (!stop.place.trim() || !stop.observation.trim()) {
      patch(stop.id, {
        error: "Add a place and a reflection first. A few words are enough.",
      });
      return;
    }
    if (stop.placeId && !stop.confirmed) {
      patch(stop.id, {
        error:
          "Confirm the reviewed location, or choose somewhere else / not sure.",
      });
      return;
    }
    const revision = stop.revision,
      startedAt = navigation.current;
    patch(stop.id, { busy: true, error: undefined, message: undefined });
    try {
      const result = await api("reflect", {
        place: stop.place,
        observation: stop.observation,
        caseId: stop.placeId ? project?.id : undefined,
        placeId: stop.placeId,
        confirmed: stop.confirmed,
      });
      setStops((items) =>
        items.map((item) =>
          item.id === stop.id ? acceptReflection(item, revision, result) : item,
        ),
      );
      // Editing remains locked during this request. Navigation may change independently.
      if (navigation.current === startedAt) {
        setActive(stop.id);
        move(2);
      }
    } catch (error) {
      patch(stop.id, {
        error:
          error instanceof Error
            ? error.message
            : "Local analysis is unavailable. Your words are still here.",
      });
    } finally {
      patch(stop.id, { busy: false });
    }
  }
  async function formatDraft(stop: Stop) {
    if (busy) return;
    const revision = stop.revision;
    setDraftBusy(true);
    patch(stop.id, { error: undefined, message: undefined });
    try {
      const result = await api("draft", {
        place: stop.place,
        observation: stop.observation,
        change: stop.change,
        reviewed: stop.reviewed,
      });
      setStops((items) =>
        items.map((item) =>
          item.id === stop.id ? acceptDraft(item, revision, result) : item,
        ),
      );
    } catch (error) {
      patch(stop.id, {
        error:
          error instanceof Error
            ? error.message
            : "Draft unavailable. Your words are still here.",
      });
    } finally {
      setDraftBusy(false);
    }
  }
  async function copyDraft(stop: Stop, draft: Draft) {
    try {
      await navigator.clipboard.writeText(
        "Subject: " + draft.subject + "\n\n" + draft.body,
      );
      patch(stop.id, { message: "Draft copied. Nothing has been sent." });
    } catch {
      patch(stop.id, {
        message:
          "Clipboard is unavailable. Select and copy the draft text below.",
      });
    }
  }
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <a className="wordmark" href="#main" onClick={() => move(0)}>
          <span className="mark" aria-hidden="true">
            ss
          </span>
          <span>Sidewalk Senate</span>
        </a>
        <div className="header-actions">
          <span className="local-label">
            <span aria-hidden="true">●</span> Your local notebook
          </span>
          <button className="text-button" onClick={reset} disabled={busy}>
            New outing
          </button>
        </div>
      </header>
      <nav aria-label="Outing steps" className="steps">
        {steps.map((label, index) => (
          <button
            key={label}
            className={step === index ? "step current" : "step"}
            aria-current={step === index ? "step" : undefined}
            onClick={() => move(index)}
          >
            <span className="step-number" aria-hidden="true">
              0{index + 1}
            </span>
            {label}
          </button>
        ))}
      </nav>
      <main id="main" tabIndex={-1}>
        <div className={step < 2 ? "page-heading map-intro" : "page-heading"}>
          <p className="eyebrow">A neighborhood notebook · Queens, NYC</p>
          <h1>
            {step === 0
              ? "Your neighborhood,\nin your own words."
              : step === 1
                ? "What stayed with you?"
                : step === 2
                  ? "A thought meets a plan."
                  : "A small idea for your neighborhood."}
          </h1>
          <p className="intro">
            {step === 0
              ? "Go somewhere you already want to go. Come back with a thought about the place. We’ll help you find where that thought belongs."
              : step === 1
                ? "Tell us what you remember, not what you think you were supposed to notice. One memorable stop is enough."
                : step === 2
                  ? "Your experience comes first. A documented proposal adds context; it doesn’t tell you how to feel."
                  : "Keep your own voice. An idea can begin with a feeling, without pretending to be a finished design."}
          </p>
        </div>
        {sourceError && (
          <div className="error">
            <p role="alert">{sourceError}</p>
            <button
              className="secondary"
              disabled={sourceLoading}
              onClick={() => setSourceAttempt((value) => value + 1)}
            >
              Retry reviewed sources
            </button>
          </div>
        )}
        {step === 1 && (
          <div className="map-stop-target">
            <label htmlFor="map-stop">Choose the stop this map will edit</label>
            <select
              id="map-stop"
              value={current.id}
              disabled={busy}
              onChange={(event) => setActive(event.target.value)}
            >
              {stops.map((stop, index) => (
                <option key={stop.id} value={stop.id}>
                  Stop {index + 1}
                  {stop.place ? " · " + stop.place : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        {step === 1 && (
          <PlaceMap
            target={"Stop " + (stops.indexOf(current) + 1)}
            places={project?.placeOptions || emptyPlaces}
            selected={current.point}
            disabled={busy}
            onChoose={(point, place) =>
              chooseLocation(current.id, point, place)
            }
          />
        )}
        {step === 0 && (
          <BeforeOuting
            destination={destination}
            setDestination={(value) => {
              setDestination(value);
              setDestinationReviewedLabel(undefined);
            }}
            headingOut={headingOut}
            setHeadingOut={setHeadingOut}
            onReturn={() => move(1)}
            project={project}
            places={project?.placeOptions || emptyPlaces}
            point={destinationPoint}
            disabled={busy}
            onChoose={(point, place) => {
              setDestinationPoint(point);
              setDestination(
                place?.label ??
                  (destination === destinationReviewedLabel ? "" : destination),
              );
              setDestinationReviewedLabel(place?.label);
            }}
          />
        )}
        {step === 1 && (
          <ReflectionForm
            stops={stops}
            busy={busy}
            draftBusy={draftBusy}
            sourceLoading={sourceLoading}
            project={project}
            setActive={setActive}
            setStops={setStops}
            patch={patch}
            connect={connect}
            chooseLocation={chooseLocation}
          />
        )}
        {(step === 2 || step === 3) && (
          <>
            <div
              className="stop-picker"
              role="group"
              aria-label="Choose a stop"
            >
              {stops.map((stop, index) => (
                <button
                  className={
                    current.id === stop.id ? "secondary selected" : "secondary"
                  }
                  key={stop.id}
                  onClick={() => {
                    setActive(stop.id);
                  }}
                  aria-pressed={current.id === stop.id}
                >
                  {stop.place || "Stop " + (index + 1)}
                </button>
              ))}
            </div>
            {step === 2 && <ConnectionView current={current} move={move} />}
            {step === 3 && (
              <SuggestionView
                current={current}
                busy={busy}
                draftBusy={draftBusy}
                move={move}
                patch={patch}
                formatDraft={formatDraft}
                copyDraft={copyDraft}
              />
            )}
          </>
        )}
      </main>
      <footer>
        <span>Less time on a screen. More life around you.</span>
        <span>Local prototype · No tracking · No automatic sending</span>
      </footer>
    </div>
  );
}
