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
├── assets/
│   └── css/
│       └── styles.css
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

🔄 How IV Compatibility Data is Updated

  * Hema Nurse Aid itself does not edit data.
  
  * Use the external developer tools:
  
  * IV Web Editor (HTML UI)
  
  * Python Script (update_notes.py)
  
  * Copy the updated drugInteractions.json into /data/
  
  * Commit and push
