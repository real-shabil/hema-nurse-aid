# Chemotherapy Nurse Guide

Interactive single-page reference built for hematology-oncology nurses. The app aggregates leukemia protocols, medication teaching points, and bedside dosing calculators into one lightweight tool that runs entirely in the browser.

## Quick Start
- Open `index.html` in any modern desktop or mobile browser.
- No build tooling or dependencies are required—the project is plain HTML/CSS/JavaScript and reads data from local JSON files.

## Features
- Leukemia workflows: Browse ALL, AML, CLL, CML, APL, and lymphoma protocol summaries organized by treatment phase.
- Medication library: Rapid bedside tips covering core chemotherapy agents and supportive medications.
- Clinical calculators: Built-in BMI, BSA, and therapeutic heparin infusion calculators with configurable defaults.
- Offline-ready data: All regimens and calculator settings are stored in JSON so the guide works without network access once opened.
- Responsive UI: Card-based layout adapts cleanly from phones to widescreen workstations.

## Project Structure
- `index.html` – Entry point that renders the navigation scaffold and sections.
- `styles.css` – Responsive card layout, sticky header, and form styling.
- `scripts.js` – Client-side logic for loading JSON assets, rendering protocol cards, and running calculator workflows.
- `protocols.json` – Leukemia/lymphoma regimen data grouped by disease and phase.
- `medications.json` – Medication categories with nursing considerations.
- `calculations.json` – Calculator metadata (labels, placeholders, defaults) consumed by `scripts.js`.
- `settings.json` – Institution-specific overrides for heparin bolus/infusion factors.

## Customizing Content
1. **Protocols & meds:** Extend `protocols.json` or `medications.json` with new sections. The UI renders additional entries automatically.
2. **Calculator behavior:** Add new calculators by defining them in `calculations.json` and handling the logic in `scripts.js` inside the `calculate` dispatcher.
3. **Heparin defaults:** Adjust bolus caps, infusion factors, or tweak the dose adjustment ladder in `settings.json`.
4. **Styling:** Modify `styles.css` to match institutional branding or accessibility requirements.

## Development Tips
- Use a lightweight static server (`python3 -m http.server`) if your browser blocks `fetch` of local JSON files. Hosting all files in the same directory avoids CORS issues.
- Keep JSON files syntactically valid—`scripts.js` depends on successful fetch/parse to populate the interface.
- When adding new calculators, ensure each input has a unique `id` and that the handler validates required fields before producing results.

## Roadmap Ideas
- Add print-friendly protocol summaries for handoff documentation.
- Introduce user preferences (dark mode, font scaling) stored in `localStorage`.
- Integrate additional calculators (e.g., chemo dosing by BSA, creatinine clearance).
- Provide localization support for non-English speaking staff.

## Disclaimer
This tool is a supplemental reference, not a substitute for institutional policy or physician orders. Always verify doses, calculations, and protocols against current clinical guidelines before administering therapy.
