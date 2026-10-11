# Third-party material

The root MIT license applies to the project's original code. It does not relicense third-party software, fonts, data or model weights.

- React and React DOM: MIT; https://github.com/facebook/react/blob/main/LICENSE.
- Leaflet: BSD-2-Clause; https://github.com/Leaflet/Leaflet/blob/main/LICENSE.
- Kalam Regular and Bold: SIL Open Font License 1.1. Bundled license: public/fonts/OFL.txt. Fonts are bundled separately from the project's MIT code.
- OpenStreetMap: contributors' map data under ODbL. Intersection coordinate provenance appears in data/cases.json; visible map attribution is retained. https://www.openstreetmap.org/copyright. Live tiles are subject to https://operations.osmfoundation.org/policies/tiles/ and are not bundled or prefetched.
- NYC DOT Court Square Pedestrian Improvements, March 2026: the application links to the official PDF and contains short factual summaries with page references, not a redistributed PDF. Citation/provenance appears in data/cases.json. Do not treat proposed designs or tentative schedules as completed work.
- Gemma 4 E4B Instruct: model weights are separate downloads, not part of the repository or ZIP. Consult the publisher's Apache-2.0 model license: https://ai.google.dev/gemma/docs/gemma_4_license. GGUF source and pinned revision/hash are documented in README.md.
- Ollama: separately installed runtime, not bundled; https://github.com/ollama/ollama/blob/main/LICENSE.

npm dependencies retain their own licenses in their packages. package-lock.json pins the dependency versions. A source ZIP excludes node_modules, runtime executables and model weights; npm run setup installs dependencies from the registry.
