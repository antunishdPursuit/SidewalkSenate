# Sidewalk Senate

A new local-first prototype connecting everyday outings with dated public-space proposals and resident suggestions.

[Source repository](https://github.com/antunishdPursuit/SidewalkSenate) · [Download source ZIP](https://github.com/antunishdPursuit/SidewalkSenate/archive/refs/heads/main.zip)

## Current scope

A local website with two notebook workspaces: **My outing** and **Connection & draft**. A local API and an optional interactive terminal session support the same source-backed workflow. Current coverage is one curated Court Square project with three reference intersections. Other places can still support a resident-written suggestion without an invented proposal match.

No tracking, Gmail, email sending, account connection, live search, analytics or persistent reflection storage is implemented. Nothing here establishes present street conditions or an open consultation. The website is intended to be used briefly before or after an ordinary outing; it requires no phone use or recording while outside.

Requires Node.js 24+. Run npm ci to install the frontend dependencies. No paid API is required.

```powershell
npm ci
npm test
npm run check
npm run build
npm start
```

GET http://127.0.0.1:4178/api/cases lists supported locations and dated source claims.
POST /api/reflect requires JSON with place, observation and optional caseId/placeId/confirmed. An unconfirmed footprint returns choices without inference; no reviewed case returns no_match.
Example after personally confirming the location:

```json
{"place":"Thomson and Jackson","observation":"We liked walking together but felt crowded.","caseId":"court-square-2026","placeId":"thomson-jackson","confirmed":true}
```

The tested runtime is Ollama 0.35.0, serving an explicitly imported Gemma 4 E4B Instruct Q4_0 file under the local alias `local-gemma`. Default endpoint: `http://127.0.0.1:11434/v1/chat/completions`. `LOCAL_MODEL_URL` can select another loopback HTTP chat-completions endpoint, but no cloud endpoint is accepted. Model download/import and startup are explicit user steps. No fallback or automatic retries exist. Inference times out after 120 seconds; one request runs at a time.

POST /api/draft accepts place, observation, change, reviewed:true and formats an unsent resident suggestion. It does not verify a recipient or submit anything.

## Evidence and limits

Source: NYC DOT, Court Square Pedestrian Improvements, March 2026, https://www.nyc.gov/html/dot/downloads/pdf/court-square-cb2-mar2026.pdf (pages 12, 15, 17, 26; reviewed October 7, 2026). The repository contains original short factual summaries and links, not a mirrored PDF. Proposed design and tentative timelines must not be described as implemented.

Deterministic validation prevents unsupported claim IDs and enforces location confirmation. It does not establish that every model-written interpretation is factually entailed. Users must review all AI paraphrases, connections and suggestions. A personal visit is not community consensus or a technical design assessment.

The browser retains reflections in memory for the current session; the API processes requests without saving reflections. Client tools and the model server may have their own logs; verify their configuration before using sensitive text. The API binds to loopback and rejects cross-origin requests. It is not a publicly secured multiuser service.

Run the tests for source-footprint matching, citation validation, local inference boundaries, review requirements and HTTP behavior. Real outdoor testing, recipient verification and broader search remain future work.

## Interactive terminal session

With the local model server running, use: npm run walk. Choose only a location you personally recognize; otherwise select 0. You can discuss an unsupported place and format your own unsent suggestion without any model connection. Original reflections are shown beside AI output. Review and edit the suggestion before formatting it.

## Browser notebook

After npm run build and npm start, open http://127.0.0.1:4178. The server serves the built UI and API from one loopback origin. For frontend development, run npm start and npm run dev in separate terminals; Vite proxies API requests locally.

The notebook supports optional preparation, up to six manually entered stops, source-place confirmation, separate original words and AI interpretations, and editable unsent drafts. User text stays in the browser session and disappears on reload/close; copy anything you want to keep. A leave-page warning reduces accidental loss but is not guaranteed by every browser. No automatic saving, background tracking or email sending exists.

### Workspaces and navigation

- **My outing — Before I go:** optional preparation. Enter a destination in **Where are you headed?**, choose a map marker or point if useful, then select **I’m heading out**. The map disappears for departure. **Edit my plan**, **Before I go**, or the wordmark restores preparation without clearing your destination, pin or existing reflections.
- **My outing — I’m back:** enter a place and how it felt. The sidebar selects the active stop; its map is headed **Stop 1**, **Stop 2**, and so on. **Add another stop** supports up to six stops. Preparing a destination does not create a visited stop or confirm that you went there. The return form’s location selector and explicit checkbox confirm a supported source location.
- **Connection & draft:** read your original words separately from AI interpretation and the dated source. Edit your own suggestion, check the review box, then select **Format an unsent draft**. **Copy draft** copies it; if clipboard access fails, select and copy the visible draft manually. No recipient is verified and nothing is sent.
- **Start over:** choose **Keep this outing** to retain everything, or **Clear outing** to clear all destinations, stops, pins, reflections, suggestions and drafts. Late analysis or formatting results cannot restore a cleared outing. This differs from switching modes, which preserves writing.

Desktop outing screens use a separate left sidebar, a larger central map and a right-hand form. Medium widths place the form below the map beside the sidebar; narrow screens stack sidebar, map and form. The connection and draft workspace uses two columns on wide screens and stacks on narrow screens. Shared CSS tokens own card padding, section gaps, borders and control spacing. These layout rules are implemented; final rendered reflow remains unverified as described below.

Kalam headings are bundled locally from Google Fonts under SIL OFL 1.1; see public/fonts/OFL.txt. Body and editable text use system sans-serif. No remote font requests or analytics are included.

Live search, automatic recipient lookup, multiple-city coverage and partner services are not integrated. Current curated coverage remains one Court Square project. A source connection requires human review and does not establish that a plan is implemented, that a consultation is open, or that your view represents the neighborhood.

## Manual map

Leaflet 1.9.4 displays OpenStreetMap tiles. Green **P** markers identify three sample proposal intersections from the reviewed Court Square project. They are separate from your numbered outing stops and are not project boundaries or a suggested route. A **✓** marks your selected place. Coordinate provenance is recorded in `data/cases.json`.

Click or tap a marker or another point, then check or type its place name in the form. Use Tab to reach the sample markers and Enter or Space to choose one. Arrow keys pan a focused map; plus and minus zoom. The redundant preparation dropdown below the map has been removed; the return form retains its source-location selector. Arbitrary points never imply a proposal match, and supported locations still require explicit confirmation. Changing a place clears its old connection and draft while preserving its reflection.

The map height is `clamp(24rem, 55vh, 36rem)` on wider screens and `24rem` on narrow screens. Selection status and collapsed **Map details** appear below it; attribution remains visible.

No GPS, geocoding, route recording or paid map service is used. OpenStreetMap receives the viewed tile area and network address, not typed reflections. Its background requires internet. If tiles fail, a warning appears and you can still enter a place manually. Browser caching is respected, and tiles are never prefetched. Follow https://operations.osmfoundation.org/policies/tiles/ for any future deployment; the community tile service is best-effort. Automated interaction tests must mock tiles rather than pan/zoom against the public service.

## Reliability checks

Preparation controls occupy the left sidebar beside the map; the map is hidden when heading out. Source loading can be retried without losing writing. Map and dropdown selections share the same location rules, and renaming a reviewed place requires confirmation again. Resident suggestions survive context changes; generated suggestions and drafts are cleared when their inputs change. Pending requests lock editing and cannot override later workspace or stop selection, attach stale results, or restore a reset outing. Removing the active stop selects and focuses a remaining stop form; removal during requests is disabled.

`npm test` includes actual React component interactions in JSDOM as well as state and HTTP checks. Test rendering writes only to ignored `output/ui-test`; it makes no public map-tile requests. These checks do not replace rendered accessibility, real-device, outdoor, or real-model validation.

## Download and run locally

Download the [source ZIP](https://github.com/antunishdPursuit/SidewalkSenate/archive/refs/heads/main.zip), extract it fully, and open a terminal inside the extracted folder containing `package.json`. Git is optional. The source ZIP is not a phone application. No deployment or account is needed.

Install Node.js 24 or newer from https://nodejs.org/en/download. First-time setup needs internet for npm packages; it uses the locked dependency versions. In that folder run:

```powershell
npm run setup
npm run local
```

Open the printed `http://127.0.0.1:4178` address in your browser. Keep the terminal open. Ctrl+C stops the website. Later starts need only `npm run local`. `npm run doctor` checks dependencies, the build and model-service health without starting the website. A missing model is a warning, not an automatic download. If port 4178 is busy, stop your own earlier instance or set another local port (`$env:PORT='4179'` in PowerShell). Do not expose the server to a network or forward its ports.

### Enable real local AI

Install Ollama from https://ollama.com/download/windows (Windows is the tested environment). Model files are separate and are not bundled. The tested model is `ggml-org/gemma-4-E4B-it-GGUF`, revision `b8093469224f83f5c38f691eb906c380e9e63114`, file `gemma-4-E4B-it-Q4_0.gguf`, SHA256 `a555b900214b477d8880e7832e0b8925e139b0159640036b09fe472b6f2097f2`. Download from https://huggingface.co/ggml-org/gemma-4-E4B-it-GGUF/tree/b8093469224f83f5c38f691eb906c380e9e63114 and verify the hash before importing. Gemma 4 has its own Apache-2.0 license; review the publisher's license independently of this project's MIT license. The text-only application does not use the vision projector.

Create a text file named `Modelfile` containing the following, replacing the model path with your own downloaded file (forward slashes work on Windows):

```text
FROM C:/path/to/gemma-4-E4B-it-Q4_0.gguf
PARAMETER num_ctx 4096
```

With Ollama running locally, execute:

```powershell
ollama create local-gemma -f Modelfile
ollama run local-gemma "Reply with hello."
npm run doctor
npm run simulate:real
npm run local
```

The warm-up is real local inference, not a health check. First load may be slower than later requests; one earlier cold run timed out. The checker uses `/v1/models` and verifies the alias exists; it does not certify model identity or answer quality. Do not use a cloud tag or sign in for cloud inference. Keep Ollama bound to loopback; default local port is 11434. No security settings need changing. An unsigned standalone llama.cpp runtime was blocked on the development machine; it is not our recommended setup.

The GGUF is about 4.6 GB; additional memory and disk are required for importing/loading. Hardware requirements and speed vary, so no universal minimum or latency promise is claimed. Tested runtime API supports schema-constrained responses; validation rejects malformed output and unsupported claim IDs. Local services can have their own logs. Original reflections are not saved by this app.

Documentation: https://docs.ollama.com/import and https://docs.ollama.com/api/openai-compatibility.

### Try an outing

At home, optionally enter your plan in **Before I go** and select **I’m heading out**. Close the website and enjoy the outing; no recording or tracking is needed. When home, reopen it and choose **I’m back** (or **I’m already back** in the preparation form). Enter the places you recognize and how they felt. Confirm a reviewed location only if it is genuinely the place you mean. Review AI connections separately from your own words, edit a suggestion, explicitly approve the wording, and format/copy the unsent draft.

Preparation is optional and is not saved across reloads. Maps need internet; already-downloaded application files and local inference do not require a paid API. Unsupported places still support your own suggestion without a fabricated proposal match. Nothing is emailed or submitted.

### Reproduce the labelled simulation

Run `npm run simulate` to see a fictional two-stop outing through the real local HTTP handlers. The script uses an ephemeral loopback server and explicitly labelled mock AI; it does not require a model or make external requests. It prints the source citation and unsent draft, checks the confirmation and review gates, and verifies that an unsupported stop gets no invented match. It stops its own server afterward. This is workflow evidence, not a real visit or evidence of Gemma quality. `npm test` separately exercises the actual React screens, navigation and writing preservation.

### Real inference and quality limits

`npm run simulate:real` runs the same fictional outing using actual local Gemma. It prints the validated AI output and source citations; empty connections are allowed. It fails visibly if the model is missing, loading too slowly, or returns rejected output, without silently using a mock or retrying. `npm run simulate` remains the explicitly labelled deterministic mock workflow. Neither proves a real outdoor visit.

One earlier response inferred inadequate crossing timing from feeling hurried. The application now replaces the model-written rationale with a fixed personal-reflection disclaimer, so that diagnosis cannot appear in that field. This is a narrow deterministic guard, not a guarantee that summaries, connections or suggestions are semantically correct. Review all AI wording beside the original reflection; dated proposals do not establish current street conditions. Positive feedback need not become a request for change.

## License

Original project code is MIT licensed; see LICENSE. Third-party assets, data and model weights retain their own licenses; see THIRD_PARTY_NOTICES.md. Nothing is publicly published by running setup or either simulation.

Release-check observations (October 10, 2026): the maintained real simulation completed with a dated page-17 connection. Additional fictional cases preserved satisfaction without demanding a change, and returned no connection for an unrelated music conversation. The forgotten-location case retained uncertainty in its summary but still assigned the feeling too confidently in its connection. Positive feedback also received a weak location-only connection. These are known semantic limitations: source-ID validation is not proof of relevance or entailment. Human review remains required; do not present these outputs as verified observations or a community view. No real outdoor, screen-reader or actual-phone validation is claimed.

### Optional real-AI interface test

With the local website and documented Gemma model running, use PowerShell:

```powershell
$env:LOCAL_UI_REAL = '1'
npm test
Remove-Item Env:LOCAL_UI_REAL
```

This exercises the actual React components in JSDOM against the local HTTP API
and real model. Clipboard and native dialog mechanics are simulated; it does
not establish visual layout, map tile rendering or OS clipboard permissions.

## Verification and submission status

Documentation updated October 11, 2026 to match the final map/sidebar revision.

- Latest code verification: 32 standard tests passed; the optional real-AI interface test was skipped. TypeScript/production build, server syntax checks and whitespace checks passed.
- Earlier real-Gemma simulations and real-AI React/JSDOM checks exercised source confirmation, dated citations, original writing, review, unsent drafting and reset. These used fictional outings; their semantic limitations are documented above. Recent layout-only changes did not rerun real inference.
- GPT-6 Astra and Claude Opus 5.5 reviewed the spacing implementation from source. Their confirmed findings were corrected. These reviews do not establish rendered layout or accessibility behavior.
- Automated browser verification was unavailable for the latest revision. Final rendered map controls, 320px reflow, 200% zoom, native dialog focus, actual OS clipboard and screen-reader behavior remain unverified. JSDOM simulates clipboard and dialog mechanics. Earlier rendered checks are historical evidence, not verification of the latest layout.
- No real outdoor or actual-phone test is claimed. A real outing, final manual browser rehearsal and demo recording remain pending. A recorded simulation must be labelled as simulated.
- The source repository is on GitHub; the website still runs locally and is not deployed. A demo video and submission write-up are still to be prepared; no challenge post is completed. Publishing source code is separate from deploying the website or submitting the challenge entry.
