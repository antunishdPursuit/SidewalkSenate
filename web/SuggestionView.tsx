import type { Stop, Draft } from "./stop-state";
type Props = {
  current: Stop;
  busy: boolean;
  draftBusy: boolean;
  move: (index: number) => void;
  patch: (id: string, changes: Partial<Stop>, invalidate?: boolean) => void;
  formatDraft: (stop: Stop) => Promise<void>;
  copyDraft: (stop: Stop, draft: Draft) => Promise<void>;
};
export default function SuggestionView({
  current,
  busy,
  draftBusy,
  move,
  patch,
  formatDraft,
  copyDraft,
}: Props) {
  return (
    <div className="two-column">
      <section className="panel">
        <p className="eyebrow">Your suggestion · Unsent</p>
        <h2>What would you like to change?</h2>
        {!current.place.trim() ? (
          <>
            <p>Add a place and your experience before drafting a suggestion.</p>
            <button className="secondary" onClick={() => move(1)}>
              Back to my reflection
            </button>
          </>
        ) : (
          <>
            <p className="helper">
              For {current.place}. Edit the AI suggestion or write your own. You
              don’t have to agree with the proposal.
            </p>
            <label htmlFor="draft-observation">
              Your experience, in your words
            </label>
            <textarea
              id="draft-observation"
              disabled={busy}
              value={current.observation}
              rows={4}
              maxLength={4000}
              onChange={(event) =>
                patch(current.id, { observation: event.target.value }, true)
              }
            />
            <p className="helper">
              Changing your experience clears its old AI connection and
              generated suggestion. Suggestions you write yourself stay.
            </p>
            <label htmlFor="change">Your suggested change or question</label>
            <textarea
              id="change"
              disabled={busy}
              rows={5}
              value={current.change}
              maxLength={2000}
              onChange={(event) =>
                patch(current.id, {
                  change: event.target.value,
                  changeOwner: "resident",
                  reviewed: false,
                  draft: undefined,
                  message: undefined,
                })
              }
              placeholder="I would like to discuss…"
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                disabled={busy}
                checked={current.reviewed}
                onChange={(event) =>
                  patch(current.id, {
                    reviewed: event.target.checked,
                    draft: undefined,
                  })
                }
              />
              <span>
                I’ve reviewed these words. They represent my own experience and
                suggestion.
              </span>
            </label>
            <p id="draft-help" className="helper">
              Write a suggested change and check the review box to format your
              draft.
            </p>
            <button
              className="primary"
              aria-describedby="draft-help"
              disabled={
                !current.reviewed ||
                !current.change.trim() ||
                !current.observation.trim() ||
                busy
              }
              onClick={() => formatDraft(current)}
            >
              {draftBusy ? "Formatting…" : "Format an unsent draft"}{" "}
              {!draftBusy && <Arrow />}
            </button>
          </>
        )}
        {current.error && (
          <p role="alert" className="error">
            {current.error}
          </p>
        )}
        {current.message && (
          <p role="status" className="notice">
            {current.message}
          </p>
        )}
        {current.draft && (
          <div className="draft">
            <h3>{current.draft.subject}</h3>
            <pre tabIndex={0} aria-label="Unsent draft text">
              {current.draft.body}
            </pre>
            <p className="helper">{current.draft.notice}</p>
            <button
              className="secondary"
              onClick={() => copyDraft(current, current.draft!)}
            >
              Copy draft
            </button>
          </div>
        )}
      </section>
      <aside className="margin-note">
        <span className="hand-note">
          A suggestion, not a finished blueprint.
        </span>
        <p>
          Your experience can start a conversation. It doesn’t need to stand in
          for every neighbor’s opinion.
        </p>
        {current.analysis?.suggestion.openQuestions.length ? (
          <>
            <h3>Questions worth keeping open</h3>
            <ul>
              {current.analysis.suggestion.openQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </>
        ) : null}
        <div className="coverage-note">
          <strong>Where does it go next?</strong>
          <p>
            We haven’t verified a recipient or feedback channel yet. This
            prototype drafts only; it never sends anything.
          </p>
        </div>
      </aside>
    </div>
  );
}
function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
