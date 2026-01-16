Hema Nurse Aid

A lightweight, fast, offline-ready medical assistant for nurses, focused on hematology/oncology workflows.
Includes calculators, chemotherapy protocols, games for learning, drug interaction lookups, and clinical tools.

📦 Features
🔹 IV Drug Compatibility Viewer (Read-Only)

  * Reads standardized JSON (drugInteractions.json)
  
  * Displays Solution / Y-Site / Syringe / Admixture compatibility
  
  * Shows professionally-generated summary notes

🔹 Clinical Protocols

  * Chemotherapy protocols
  
  * Heparin, insulin, and warfarin protocols
  
  * Stored as structured JSON under data/protocols/

🔹 Dosage & Infusion Calculators

  * Smart calculators for nursing workflows
  
  * Auto-validated inputs
  
  * Formula-driven outputs

🔹 Mini-Games

  * JSON-driven educational games for student nurses & staff
  
  * Supports daily practice and quick reviews

📁 Project Structure
<code>

Hema_nurse_aid/
│
├── css/
│   └── styles.css
│
├── assets/
│
├── data/
│   ├── drugInteractions.json
│   ├── medicationsData.json
│   ├── calculationsData.json
│   ├── gamesData.json
│   └── protocols/
│       ├── chemoProtocols.json
│       ├── heparinProtocols.json
│       ├── insulinProtocols.json
│       └── warfarinProtocols.json
│
├── images/
│   ├── icon-192.png
│   └── icon-512.png
│
├── js/
│   ├── main.js
│   ├── calculators.js
│   ├── chemoMedications.js
│   ├── chemoProtocols.js
│   ├── drugInteractions.js
│   └── game.js
│
├── index.html
└── README.md
</code>

🔄 How To Update Data

### IV Compatibility Data
* Use the external **IV Web Editor**.
* Generate/Download the updated `drugInteractions.json`.
* Copy the file into `/data/`.

### Chemo Protocols
* Use the external **Chemo Protocol Manager**.
* Load the current `data/protocols/chemoProtocols.json`.
* Make edits via the UI.
* Download the result (e.g., `chemoProtocols.json`).
* Rename to `chemoProtocols.json` and replace the file in `/data/protocols/`.

### Medications
* Use the external **Medication Manager**.
* Load the current `data/medicationsData.json`.
* Make edits via the UI.
* Download the result (e.g., `medicationsData.json`).
* Rename to `medicationsData.json` and replace the file in `/data/`.  

### Committing Changes
* After updating JSON files, commit and push changes to version control to deploy updates.
