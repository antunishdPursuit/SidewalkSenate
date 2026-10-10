# Sidewalk Senate

A new local-first prototype connecting everyday outings with dated public-space proposals and resident suggestions.

## Current increment

React notebook interface, local API and interactive terminal session. One curated Court Square project with three explicitly confirmed street locations. No tracking, Gmail, email sending, account connection, live search, telemetry or persistent reflection storage. Nothing here establishes present street conditions or an open consultation.

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

A local OpenAI-compatible Gemma server must be listening at http://127.0.0.1:8187/v1/chat/completions. LOCAL_MODEL_URL may override this with another loopback HTTP chat endpoint. The prototype does not download or start a model automatically. No cloud fallback exists. Inference times out after 120 seconds; one request runs at a time.

POST /api/draft accepts place, observation, change, reviewed:true and formats an unsent resident suggestion. It does not verify a recipient or submit anything.

## Evidence and limits

Source: NYC DOT, Court Square Pedestrian Improvements, March 2026, https://www.nyc.gov/html/dot/downloads/pdf/court-square-cb2-mar2026.pdf (pages 12, 15, 17, 26; reviewed October 7, 2026). The repository contains original short factual summaries and links, not a mirrored PDF. Proposed design and tentative timelines must not be described as implemented.

Deterministic validation prevents unsupported claim IDs and enforces location confirmation. It does not establish that every model-written interpretation is factually entailed. Users must review all AI paraphrases, connections and suggestions. A personal visit is not community consensus or a technical design assessment.

All reflections exist only for the request; the server does not save them. Client tools and the model server may have their own logs; verify their configuration before using sensitive text. The API binds to loopback and rejects cross-origin requests. It is not a publicly secured multiuser service.

Run the tests for source-footprint matching, citation validation, local inference boundaries, review requirements and HTTP behavior. Real outdoor testing, recipient verification and broader search remain future work.

## Interactive terminal session

With the local model server running, use: npm run walk. Choose only a location you personally recognize; otherwise select 0. You can discuss an unsupported place and format your own unsent suggestion without any model connection. Original reflections are shown beside AI output. Review and edit the suggestion before formatting it.

## Browser notebook

After npm run build and npm start, open http://127.0.0.1:4178. The server serves the built UI and API from one loopback origin. For frontend development, run npm start and npm run dev in separate terminals; Vite proxies API requests locally.

The notebook supports optional preparation, up to six manually entered stops, source-place confirmation, separate original words and AI interpretations, and editable unsent drafts. User text stays in the browser session and disappears on reload/close; copy anything you want to keep. A leave-page warning reduces accidental loss but is not guaranteed by every browser. No automatic saving, background tracking or email sending exists.

Kalam headings are bundled locally from Google Fonts under SIL OFL 1.1; see public/fonts/OFL.txt. Body and editable text use system sans-serif. No remote font requests or analytics are included.

Live search, automatic recipient lookup, multiple-city coverage and partner services are not integrated. Current curated coverage remains one Court Square project. A source connection requires human review and does not establish that a plan is implemented, that a consultation is open, or that your view represents the neighborhood.

## Manual map
Leaflet 1.9.4 displays free OpenStreetMap tiles. Numbered pins identify three reference intersections in the one reviewed Court Square project, not project boundaries. Coordinate provenance is recorded in data/cases.json. Choose a pin or click elsewhere and name the place. Arbitrary pins never imply a proposal match; reviewed places still require confirmation. After an outing, choose which stop the map edits. Changing a place clears its old connection and draft while preserving its reflection.

No GPS, geocoding, route recording or paid map service is used. OpenStreetMap receives the visible tile area and network address, not typed reflections. The background requires internet; location buttons and text entry remain available without it. Attribution stays visible, browser caching is respected, and tiles are never prefetched. Follow https://operations.osmfoundation.org/policies/tiles/ for deployment; the community tile service is best-effort. Automated interaction tests must mock tiles rather than pan/zoom against the public service.

## Reliability checks

Preparation actions appear before the optional map; the map is hidden when heading out. Source loading can be retried without losing writing. Map and dropdown selections share the same location rules, and renaming a reviewed place requires confirmation again. Resident suggestions survive context changes; generated suggestions and drafts are cleared when their inputs change. Pending requests lock editing and cannot override later navigation or attach stale results.

`npm test` includes actual React component interactions in JSDOM as well as state and HTTP checks. Test rendering writes only to ignored `output/ui-test`; it makes no public map-tile requests. These checks do not replace rendered accessibility, real-device, outdoor, or real-model validation.

## Download and run locally

Download the source ZIP (when the repository is published), extract it fully, and open a terminal inside the extracted folder containing `package.json`. Git is optional. The source ZIP is not a phone application. No deployment or account is needed.

Install Node.js 24 or newer from https://nodejs.org/en/download. First-time setup needs internet for npm packages; it uses the locked dependency versions. In that folder run:

```powershell
npm run setup
npm run local
```

Open the printed `http://127.0.0.1:4178` address in your browser. Keep the terminal open. Ctrl+C stops the website. Later starts need only `npm run local`. `npm run doctor` checks dependencies, the build and model-service health without starting the website. A missing model is a warning, not an automatic download. If port 4178 is busy, stop your own earlier instance or set another local port (`$env:PORT='4179'` in PowerShell). Do not expose the server to a network or forward its ports.

### Enable real local AI

The model and runtime are separate downloads and are not bundled in this source ZIP. Use a Gemma-compatible llama.cpp release and a compatible Gemma Instruct GGUF. Follow the model publisher's license and download instructions; record the chosen model revision and quantization. Current supported API: local `/v1/chat/completions` with JSON-schema response formatting. llama.cpp documentation: https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md. Runtime releases: https://github.com/ggml-org/llama.cpp/releases. Gemma information: https://ai.google.dev/gemma/docs.

With `llama-server` available in your terminal, replace the quoted path with your downloaded Gemma GGUF:

```powershell
llama-server -m "PATH_TO_YOUR_GEMMA_INSTRUCT.gguf" --host 127.0.0.1 --port 8187 -c 4096
```

Keep that separate terminal running, then run `npm run local` in this project. GPU acceleration and optional model-specific arguments depend on your runtime/model; consult their documentation. The earlier development run used Gemma 4 E4B with llama.cpp; this generic command is not a verified installation on every machine. RAM/VRAM needs and speed vary by model and quantization, so no universal hardware minimum is claimed. The setup checker verifies health only; an actual supported-location reflection verifies inference. No closed model fallback exists.

### Try an outing

At home, optionally enter your plan and select **I'm heading out**. Close the website and enjoy the outing; no recording or tracking is needed. When home, reopen it and choose **I'm already back**. Enter the places you recognize and how they felt. Confirm a reviewed location only if it is genuinely the place you mean. Review AI connections separately from your own words, edit a suggestion, explicitly approve the wording, and format/copy the unsent draft.

Preparation is optional and is not saved across reloads. Maps need internet; already-downloaded application files and local inference do not require a paid API. Unsupported places still support your own suggestion without a fabricated proposal match. Nothing is emailed or submitted.
