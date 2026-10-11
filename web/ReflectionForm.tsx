import type { Dispatch, SetStateAction } from "react";
import type { Stop } from "./stop-state";
import type { MapPlace, Point } from "./PlaceMap";
import { freshStop } from "./stop-state";
type Props = {
  stops: Stop[];
  activeId: string;
  busy: boolean;
  draftBusy: boolean;
  sourceLoading: boolean;
  project?: { placeOptions: MapPlace[] };
  setActive: (id: string) => void;
  setStops: Dispatch<SetStateAction<Stop[]>>;
  patch: (id: string, changes: Partial<Stop>, invalidate?: boolean) => void;
  connect: (stop: Stop) => Promise<void>;
  chooseLocation: (
    id: string,
    point: Point | undefined,
    place?: MapPlace,
  ) => void;
};

export default function ReflectionForm({
  stops,
  activeId,
  busy,
  draftBusy,
  sourceLoading,
  project,
  setActive,
  setStops,
  patch,
  connect,
  chooseLocation,
}: Props) {
  return (
    <div className="reflection-workspace">
      <section aria-label="Your stops" className="stop-list">
        {stops.filter(stop => stop.id === activeId).map((stop) => (
          <article
            className="panel stop-card"
            key={stop.id}
            onFocus={() => setActive(stop.id)}
          >
            <div className="section-top">
              <p className="eyebrow">
                Stop {String(stops.indexOf(stop) + 1).padStart(2, "0")}
              </p>
              {stops.length > 1 && (
                <button
                  className="text-button"
                  disabled={stop.busy || draftBusy}
                  onClick={() => {
                    if (
                      (stop.place ||
                        stop.observation ||
                        stop.change ||
                        stop.point) &&
                      !window.confirm(
                        "Remove this stop and its unsaved reflection?",
                      )
                    )
                      return;
                    setStops((items) =>
                      items.filter((item) => item.id !== stop.id),
                    );
                  }}
                >
                  Remove stop {stops.indexOf(stop) + 1}
                </button>
              )}
            </div>
            <fieldset disabled={busy}>
              <legend className="sr-only">Stop {stops.indexOf(stop) + 1} reflection</legend>
              <label htmlFor={"place-" + stop.id}>
                Where did you spend time?
              </label>
              <input
                id={"place-" + stop.id}
                value={stop.place}
                maxLength={200}
                onChange={(event) =>
                  patch(stop.id, { place: event.target.value }, true)
                }
                placeholder="A street, plaza, park, or landmark"
              />
              <label htmlFor={"observation-" + stop.id}>
                What did it feel like to be there?
              </label>
              <textarea
                id={"observation-" + stop.id}
                value={stop.observation}
                maxLength={4000}
                rows={5}
                onChange={(event) =>
                  patch(stop.id, { observation: event.target.value }, true)
                }
                placeholder="We stayed longer than we expected. There was room to sit together, but…"
              />
              <p className="helper">
                Enjoyment, discomfort, a wish, or “I don’t remember.” Your words
                are enough.
              </p>
              <label htmlFor={"location-" + stop.id}>
                Is this one of our reviewed locations?
              </label>
              <select
                id={"location-" + stop.id}
                disabled={sourceLoading || !project || busy}
                value={stop.placeId}
                onChange={(event) => {
                  const place = project?.placeOptions.find(
                    (item) => item.id === event.target.value,
                  );
                  chooseLocation(stop.id, place?.coordinates, place);
                }}
              >
                <option value="">Somewhere else / not sure</option>
                {project?.placeOptions.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.label}
                  </option>
                ))}
              </select>
              {stop.placeId && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={stop.confirmed}
                    onChange={(event) =>
                      patch(stop.id, { confirmed: event.target.checked }, true)
                    }
                  />
                  <span>
                    I recognize this as the location I mean. This does not
                    confirm where every observation happened.
                  </span>
                </label>
              )}
            </fieldset>
            {stop.message && (
              <p role="status" className="notice">
                {stop.message}
              </p>
            )}
            {stop.error && (
              <p role="alert" className="error">
                {stop.error}
              </p>
            )}
            <button
              className="primary"
              disabled={busy}
              onClick={() => connect(stop)}
            >
              {stop.busy
                ? "Considering your reflection…"
                : "Find the connection"}{" "}
              {!stop.busy && <Arrow />}
            </button>
          </article>
        ))}
        <button
          className="secondary add-stop"
          disabled={busy || stops.length >= 6}
          onClick={() => {
            const stop = freshStop();
            setStops((items) => [...items, stop]);
            setActive(stop.id);
            requestAnimationFrame(() =>
              document.getElementById("place-" + stop.id)?.focus(),
            );
          }}
        >
          + Add another stop
        </button>
      </section>

    </div>
  );
}
function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
