import type { ReactNode } from "react";
import PlaceMap, { type MapPlace, type Point } from "./PlaceMap";
type Props = {
  sidebar: ReactNode;
  destination: string;
  setDestination: (value: string) => void;
  headingOut: boolean;
  setHeadingOut: (value: boolean) => void;
  onReturn: () => void;
  onEditPlan: () => void;
  places: MapPlace[];
  point?: Point;
  onChoose: (point: Point, place?: MapPlace) => void;
  disabled: boolean;
};
export default function BeforeOuting({
  sidebar,
  destination,
  setDestination,
  headingOut,
  setHeadingOut,
  onReturn,
  onEditPlan,
  places,
  point,
  onChoose,
  disabled,
}: Props) {
  return (
    <>
      <div className={headingOut ? "outing-grid departure-grid" : "outing-grid outing-with-sidebar"}>
        {sidebar}
        {!headingOut && <PlaceMap places={places} selected={point} disabled={disabled} onChoose={onChoose} />}
        <section className="panel notebook">
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
              <div className="button-row">
                <button className="secondary" onClick={onEditPlan}>Edit my plan</button>
                <button className="primary" onClick={onReturn}>Back from your outing?</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
