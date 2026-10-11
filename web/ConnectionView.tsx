import type { Stop } from "./stop-state";
type Props = { current: Stop; move: (index: number) => void };
export default function ConnectionView({ current, move }: Props) {
  return (
    <div className="stack">
      <div className="stack">
        {current.busy && (
          <p role="status" className="notice">
            Considering your reflection. You can view other workspaces while you
            wait.
          </p>
        )}
        <section className="panel">
          <p className="eyebrow">Your experience</p>
          <h2>{current.place || "Start with a place"}</h2>
          {current.observation ? (
            <blockquote>{current.observation}</blockquote>
          ) : (
            <p>You haven’t added a reflection for this stop yet.</p>
          )}
          <button className="text-button" onClick={() => move(1)}>
            Edit your original reflection
          </button>
        </section>
        {current.analysis ? (
          <section className="panel">
            <p className="eyebrow">AI interpretation · Review required</p>
            <h2>A possible connection</h2>
            <p>{current.analysis.reflectionSummary}</p>
            {current.analysis.connections.length ? (
              current.analysis.connections.map((connection) => (
                <div className="connection" key={connection.claimId}>
                  <p>{connection.explanation}</p>
                  <p className="source-fact">
                    <strong>Documented proposal:</strong>{" "}
                    {connection.sourceClaim}
                  </p>
                  <a
                    href={connection.citation}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the cited page <Arrow />
                  </a>
                </div>
              ))
            ) : (
              <p>
                The model found no supported connection to this proposal. That
                does not make your experience less useful.
              </p>
            )}
            <p className="helper">{current.analysis.notice}</p>
          </section>
        ) : (
          <section className="panel">
            <p className="eyebrow">
              {current.outcome === "no_match"
                ? "No reviewed match"
                : "No connection yet"}
            </p>
            <h2>
              {current.outcome === "no_match"
                ? "Your thought still belongs here."
                : "Let’s start with your words."}
            </h2>
            <p>
              {current.outcome === "no_match"
                ? "We don’t have a reviewed proposal for this place. You can still write a resident suggestion; we won’t borrow a nearby project to make a match."
                : current.observation
                  ? "Your reflection changed or has not been connected yet. Return to review the place and try again."
                  : "Add a reflection and confirm a supported location, or choose somewhere else / not sure."}
            </p>
            {!current.outcome && (
              <button className="secondary" onClick={() => move(1)}>
                {current.observation
                  ? "Review my reflection"
                  : "Add a reflection"}
              </button>
            )}
          </section>
        )}
      </div>
      <aside className="margin-note">
        {current.source ? (
          <>
            <p className="eyebrow">The dated record</p>
            <h2>What was proposed?</h2>
            <strong>{current.source.title}</strong>
            <p>{current.source.status}</p>
            <a href={current.source.url} target="_blank" rel="noreferrer">
              Open the official document <Arrow />
            </a>
            <p className="helper">
              A proposal is not proof of today’s conditions, an open comment
              period, or completed construction.
            </p>
          </>
        ) : null}
      </aside>
    </div>
  );
}
function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
