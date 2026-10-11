import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
const emptyPlaces: MapPlace[] = [];
export default function App() {
  const [step, setStep] = useState(0);
  const previousStep = useRef(0);
  const navigation = useRef(0);
  const outing = useRef(0);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const removedStopFocus = useRef<string | undefined>(undefined);
  const planningFocus = useRef(false);
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
  useLayoutEffect(() => {
    const id = removedStopFocus.current;
    if (!id) return;
    document.getElementById("stop-" + id)?.focus();
    removedStopFocus.current = undefined;
  }, [active, stops]);

  useLayoutEffect(() => {
    if (planningFocus.current && step === 0 && !headingOut) {
      document.getElementById("destination")?.focus();
      planningFocus.current = false;
    }
  }, [headingOut, step]);
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
  function editPlan() {
    planningFocus.current = true;
    setHeadingOut(false);
    move(0);
  }
  function selectStop(id: string) {
    navigation.current++;
    setActive(id);
  }
  function removeStop(id: string) {
    const index = stops.findIndex(stop => stop.id === id);
    const remaining = stops.filter(stop => stop.id !== id);
    if (index < 0 || !remaining.length) return;
    const next = remaining[Math.min(index, remaining.length - 1)];
    removedStopFocus.current = next.id;
    setStops(remaining);
    selectStop(next.id);
  }
  function requestReset() {
    if (dirty || headingOut || busy) resetDialog.current?.showModal();
    else reset();
  }
  function reset() {
    outing.current++;
    resetDialog.current?.close();
    setDraftBusy(false);
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
    const session = outing.current;
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
      if (session === outing.current) setDraftBusy(false);
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
        <a className="wordmark" href="#main" onClick={editPlan}>
          <span className="mark" aria-hidden="true">
            ss
          </span>
          <span>Sidewalk Senate</span>
        </a>
        <nav aria-label="Outing workspaces" className="workspace-nav">
          <button className={step < 2 ? "step current" : "step"} aria-current={step < 2 ? "page" : undefined} onClick={() => move(step < 2 ? step : 1)}>My outing</button>
          <button className={step >= 2 ? "step current" : "step"} aria-current={step >= 2 ? "page" : undefined} onClick={() => move(2)}>Connection &amp; draft</button>
        </nav>
        <button className="secondary reset-button" onClick={requestReset}>Start over</button>
      </header>
      <dialog ref={resetDialog} aria-labelledby="reset-title" onClose={() => document.querySelector<HTMLButtonElement>('.reset-button')?.focus()}>
        <h2 id="reset-title">Start a new outing?</h2>
        <p>This clears all stops, reflections and drafts. Nothing has been saved.</p>
        {busy && <p className="helper">Pending results will be discarded. Local inference may finish in the background.</p>}
        <div className="button-row"><button className="secondary" autoFocus onClick={() => resetDialog.current?.close()}>Keep this outing</button><button className="primary" onClick={reset}>Clear outing</button></div>
      </dialog>
      <main id="main" tabIndex={-1}>
        <div className={"page-heading map-intro" + (step === 1 ? " outing-heading" : "")}><h1>{step === 0 ? "Turn an outing into a neighborhood idea." : step === 1 ? "My outing" : "Connection & draft"}</h1><p className="intro">{step === 0 ? "Plan something you already want to do, enjoy it away from the screen, then return with a thought. Local AI connects your experience to a proposal where we have a match and helps you draft a suggestion." : step === 1 ? "Start with a place you visited and how it felt." : "Review the connection, then write in your own voice."}</p></div>
        {step < 2 && <div className="outing-modes" role="group" aria-label="Outing mode"><button className={step === 0 ? "secondary selected" : "secondary"} aria-pressed={step === 0} onClick={editPlan}>Before I go</button><button className={step === 1 ? "secondary selected" : "secondary"} aria-pressed={step === 1} onClick={() => move(1)}>I’m back</button></div>}
        {step === 1 && <div className="stop-picker" role="group" aria-label="Choose a stop">{stops.map((stop,index) => <button key={stop.id} className={current.id === stop.id ? "secondary selected" : "secondary"} aria-pressed={current.id === stop.id} onClick={() => selectStop(stop.id)}>{stop.place || "Stop " + (index + 1)}</button>)}</div>}
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
        <div className={step === 1 ? "outing-grid" : undefined}>
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
            onEditPlan={editPlan}
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
            activeId={current.id}
            busy={busy}
            draftBusy={draftBusy}
            sourceLoading={sourceLoading}
            project={project}
            setActive={selectStop}
            setStops={setStops}
            removeStop={removeStop}
            patch={patch}
            connect={connect}
            chooseLocation={chooseLocation}
          />
        )}
        </div>
        {step >= 2 && (
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
                    selectStop(stop.id);
                  }}
                  aria-pressed={current.id === stop.id}
                >
                  {stop.place || "Stop " + (index + 1)}
                </button>
              ))}
            </div>
            <div className="review-grid">
            <ConnectionView current={current} move={move} />
            <SuggestionView
                current={current}
                busy={busy}
                draftBusy={draftBusy}
                move={move}
                patch={patch}
                formatDraft={formatDraft}
                copyDraft={copyDraft}
              />
            </div>
          </>
        )}
      </main>
      <footer>
        <span>Local prototype · Reflections are not saved · Drafts are never sent</span>
      </footer>
    </div>
  );
}
