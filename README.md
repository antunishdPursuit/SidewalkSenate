# Sidewalk Senate

A new local-first prototype connecting everyday outings with dated public-space proposals and resident suggestions.

## Current increment

Local API and interactive terminal session; browser interface pending. One curated Court Square project with three explicitly confirmed street locations. No tracking, Gmail, email sending, account connection, live search, telemetry or persistent reflection storage. Nothing here establishes present street conditions or an open consultation.

Requires Node.js 24+. No package installation or paid API is needed for this increment.

```powershell
npm test
npm run check
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
