import PlaceMap, { type MapPlace, type Point } from "./PlaceMap";
import type { Source } from "./stop-state";
type Props = {
  destination: string;
  setDestination: (value: string) => void;
  headingOut: boolean;
  setHeadingOut: (value: boolean) => void;
  onReturn: () => void;
  project?: { source: Source };
  places: MapPlace[];
  point?: Point;
  onChoose: (point: Point, place?: MapPlace) => void;
  disabled: boolean;
};
export default function BeforeOuting({
  destination,
  setDestination,
  headingOut,
  setHeadingOut,
  onReturn,
  project,
  places,
  point,
  onChoose,
  disabled,
}: Props) {
  return (
    <>
      <div className="two-column">
        <section className="panel notebook">
          <p className="eyebrow">01 / A loose plan</p>
          <h2>Where are you headed?</h2>
          <label htmlFor="destination">
            A place, a familiar corner, a plan with friends
          </label>
          <input
            id="destination"
            value={destination}
            maxLength={200}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="A café in Long Island City, then wherever we feel like…"
          />
          {!headingOut ? (
            <>
              <p className="helper">
                No route to reconstruct. No checklist to carry.
              </p>
              <div className="button-row">
                <button className="primary" onClick={() => setHeadingOut(true)}>
                  I’m heading out <Arrow />
                </button>
                <button className="secondary" onClick={onReturn}>
                  I’m already back
                </button>
              </div>
            </>
          ) : (
            <div className="outdoor-note" role="status">
              <h3>That’s enough screen time.</h3>
              <p>
                {destination.trim()
                  ? "Enjoy " + destination.trim() + "."
                  : "Enjoy your plans."}{" "}
                Walk, talk, stop somewhere unexpected. There’s nothing you need
                to record.
              </p>
              <button className="secondary" onClick={onReturn}>
                Back from your outing?
              </button>
            </div>
          )}
        </section>
        <aside className="margin-note">
          <span className="hand-note">A place is more than a pin.</span>
          <p>
            The conversation can wait until you’re home. What felt welcoming?
            What made you leave? What would make you return?
          </p>
          <div className="coverage-note">
            <p className="eyebrow">Our first few pages</p>
            <strong>Court Square, Long Island City</strong>
            <p>
              This prototype knows one dated pedestrian-improvement project.
              Other places are welcome; we’ll be honest when we don’t have a
              matching proposal.
            </p>
            {project && (
              <a href={project.source.url} target="_blank" rel="noreferrer">
                View the March 2026 source <Arrow />
              </a>
            )}
          </div>
        </aside>
      </div>
      {!headingOut && (
        <PlaceMap
          places={places}
          selected={point}
          disabled={disabled}
          onChoose={onChoose}
        />
      )}
    </>
  );
}
function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
