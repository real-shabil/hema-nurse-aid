/* =========================================================
   🌿 CHEMOTHERAPY NURSE GUIDE — MAIN LOGIC
   ---------------------------------------------------------
   Version:        1.0.1
   Author:         Shabil Mohammed Kozhippattil
   Role:           RN, Hematology/Oncology — KAMC, Jeddah
   File Purpose:   Core navigation, data loading, and UI logic.
   ---------------------------------------------------------
   Responsibilities:
     • Load protocols, medication data, and calculation modules
     • Handle navigation between sections
     • Manage personalized greeting and nurse settings
     • Interface with local JSON data (chemo, heparin, insulin, interactions)
   ---------------------------------------------------------
   Notes:
     ⚙️ Keep fetch paths consistent with /data/ folder structure.
     💡 All section displays are handled via navigateToSection().
     🧩 Extend with new modules (e.g., insulin, warfarin) here.
   ========================================================= */


/* =========================================================
   1️⃣ GLOBAL VARIABLES
   ========================================================= */
let leukemiaProtocols = {};
let medicationsData = {};
let calculationsData = {};
let clinicalGuidelines = {};
let drugInteractionsData = {};


/* =========================================================
   2️⃣ STARTUP HANDLERS
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    personalizeGreeting();
    setupDrugInteractionControls();
    goHome();
});


function personalizeGreeting() {
    let userName = localStorage.getItem("userName");
    if (!userName) {
        userName = prompt("Please enter your name for personalization:");
        if (userName) localStorage.setItem("userName", userName);
    }

    const welcomeEl = document.getElementById("welcomeMessage");
    const introEl = document.getElementById("introText");

    if (welcomeEl) {
        const hour = new Date().getHours();
        let greeting = "Welcome";
        if (hour < 12) greeting = "Good morning";
        else if (hour < 18) greeting = "Good afternoon";
        else greeting = "Good evening";

        welcomeEl.innerHTML = `${greeting}, <strong>${userName || "👩‍⚕️"}</strong>`;

        const changeBtn = document.createElement("button");
        changeBtn.textContent = "Change name";
        changeBtn.className = "change-name-btn";
        changeBtn.onclick = () => {
            const newName = prompt("Enter your name:");
            if (newName) {
                localStorage.setItem("userName", newName);
                location.reload();
            }
        };
        welcomeEl.insertAdjacentElement("afterend", changeBtn);
    }

    if (introEl) {
        introEl.textContent =
            "Choose a section below to access nursing protocols, medications, or quick calculations.";
    }
}


function setupDrugInteractionControls() {
    const checkBtn = document.getElementById("checkInteractionBtn");
    if (checkBtn) {
        checkBtn.addEventListener("click", e => {
            e.preventDefault();
            if (typeof checkDrugInteraction === "function") checkDrugInteraction();
        });
    }

    const clearBtn = document.getElementById("clearInteractionBtn");
    if (clearBtn) {
        clearBtn.addEventListener("click", e => {
            e.preventDefault();
            if (typeof clearDrugInteraction === "function") clearDrugInteraction();
        });
    }

    document.querySelectorAll(".input-drug").forEach(input => {
        input.addEventListener("keydown", ev => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                if (typeof checkDrugInteraction === "function") checkDrugInteraction();
            }
        });
    });
}


/* =========================================================
   3️⃣ INITIAL DATA LOAD
   ========================================================= */
fetch("data/protocols/chemoProtocols.json")
    .then(res => res.json())
    .then(data => {
        leukemiaProtocols = data;
        goHome();
    })
    .catch(err => console.error("Error loading chemoProtocols.json:", err));

fetch("data/medicationsData.json")
    .then(res => res.json())
    .then(data => {
        medicationsData = data;
    })
    .catch(err => console.error("Error loading medicationsData.json:", err));

fetch("data/calculationsData.json")
    .then(res => res.json())
    .then(data => {
        calculationsData = data;
    })
    .catch(err => console.error("Error loading calculationsData.json:", err));

fetch("data/protocols/heparinProtocols.json")
    .then(res => res.json())
    .then(data => {
        if (!clinicalGuidelines || typeof clinicalGuidelines !== "object") clinicalGuidelines = {};
        Object.assign(clinicalGuidelines, data);
        if (typeof window !== "undefined") window.clinicalGuidelines = clinicalGuidelines;
    })
    .catch(err => console.error("Error loading heparinProtocols.json:", err));

fetch("data/protocols/insulinProtocols.json")
    .then(res => res.json())
    .then(data => {
        if (!clinicalGuidelines) clinicalGuidelines = {};
        clinicalGuidelines.insulinProtocol = data.insulinProtocol;
        if (typeof window !== "undefined") window.clinicalGuidelines = clinicalGuidelines;
        console.log("✅ Insulin protocols loaded:", clinicalGuidelines.insulinProtocol);
    })
    .catch(err => console.error("❌ Error loading insulinProtocols.json:", err));

fetch("data/drugInteractions.json")
    .then(res => res.json())
    .then(data => {
        drugInteractionsData = data;
        if (typeof initDrugInteractions === "function") initDrugInteractions(data);
        const statusBadge = document.getElementById("interactionDataStatus");
        if (statusBadge) {
            statusBadge.textContent = "Offline data loaded";
            statusBadge.classList.remove("badge-loading");
            statusBadge.classList.add("badge-success");
        }
    })
    .catch(err => {
        console.error("❌ Error loading drugInteractions.json:", err);
        const statusBadge = document.getElementById("interactionDataStatus");
        if (statusBadge) {
            statusBadge.textContent = "Data unavailable";
            statusBadge.classList.remove("badge-loading");
            statusBadge.classList.add("badge-error");
        }
    });


/* =========================================================
   4️⃣ NAVIGATION FUNCTIONS
   ========================================================= */
function navigateToSection(id) {
    document.querySelectorAll(".container, .section").forEach(section => {
        section.style.display = "none";
    });

    const target = document.getElementById(id);
    if (!target) {
        alert(`Section '${id}' not found.`);
        return goHome();
    }
    target.style.display = "block";

    if (id === "calculations") loadCalculationsMenu();
    if (id === "medications") loadMedicationsMenu();
}

function goHome() {
    navigateToSection("home");
}


/* =========================================================
   5️⃣ LEUKEMIA PROTOCOL FUNCTIONS
   ========================================================= */
function openLeukemiaType(type) {
    navigateToSection("type");
    const titleEl = document.getElementById("typeTitle");
    if (titleEl) titleEl.innerText = `${type} Chemotherapy Protocols`;

    const selected = leukemiaProtocols[type];
    const list = document.getElementById("protocolList");
    if (!list) return;

    list.innerHTML = "";
    if (!selected) {
        list.innerHTML = "<p>No protocols available.</p>";
        return;
    }

    Object.keys(selected).forEach(phase => {
        const phaseDiv = document.createElement("div");
        phaseDiv.classList.add("phase-card");
        phaseDiv.innerHTML = `<h3>${phase}</h3>`;

        selected[phase].forEach(protocol => {
            const protocolDiv = document.createElement("div");
            protocolDiv.classList.add("protocol-card");
            protocolDiv.innerHTML = `
                <h4>${protocol.protocolName}</h4>
                ${protocol.description ? `<p>${protocol.description}</p>` : ""}
                ${
                    protocol.sections && protocol.sections.length
                        ? protocol.sections
                              .map(
                                  section => `
                            <div class="protocol-section">
                                <strong>${section.title}</strong>
                                <ul>${section.drugs.map(drug => `<li>${drug}</li>`).join("")}</ul>
                            </div>`
                              )
                              .join("")
                        : ""
                }
            `;
            phaseDiv.appendChild(protocolDiv);
        });

        list.appendChild(phaseDiv);
    });
}


/* =========================================================
   6️⃣ MEDICATIONS SECTION
   ========================================================= */
function loadMedicationsMenu() {
    const listDiv = document.getElementById("medicationsList");
    if (!listDiv) return;
    listDiv.innerHTML = "";

    Object.keys(medicationsData).forEach(categoryKey => {
        const category = medicationsData[categoryKey];
        const section = document.createElement("div");
        section.classList.add("phase-card");

        section.innerHTML = `
            <h3>${category.title}</h3>
            <p>${category.description}</p>
            ${category.drugs
                .map(
                    drug => `
                    <div class="protocol-card">
                        <h4>${drug.name}</h4>
                        <p><strong>Class:</strong> ${drug.category}</p>
                        <p><strong>Common Route:</strong> ${drug.route}</p>
                        <p><strong>Nursing Tips:</strong> ${drug.keyPoints.join(", ")}</p>
                    </div>`
                )
                .join("")}
        `;
        listDiv.appendChild(section);
    });
}


/* =========================================================
   7️⃣ CALCULATIONS MENU
   ========================================================= */
function loadCalculationsMenu() {
    const listDiv = document.getElementById("calculationsList");
    if (!listDiv) return;

    listDiv.innerHTML = Object.keys(calculationsData)
        .map(
            key => `
            <div class="card" id="${key}-card">
                <div class="card-header" onclick="openCalculation('${key}', event)">
                    ${calculationsData[key].title}
                </div>
            </div>`
        )
        .join("");
}

function openCalculation(calcKey, event) {
    if (event) event.stopPropagation();

    Object.keys(calculationsData).forEach(key => {
        if (key !== calcKey) {
            const form = document.querySelector(`#${key}-card form`);
            if (form) form.style.display = "none";
        }
    });

    const cardDiv = document.getElementById(`${calcKey}-card`);
    if (!cardDiv) return;

    let existingForm = cardDiv.querySelector("form");
    if (existingForm) {
        existingForm.style.display = existingForm.style.display === "none" ? "flex" : "none";
        return;
    }

    const calc = calculationsData[calcKey];
    if (!calc) return;

    const form = document.createElement("form");
    form.classList.add("calc-form");
    form.onsubmit = e => e.preventDefault();

    const fieldsHtml = (calc.inputFields || [])
        .map(f => {
            const fid = `${f.id}-${calcKey}`;
            if (f.type === "select") {
                if (f.id === "rateUnit") return "";
                const opts = f.options.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
                return `<label for="${fid}">${f.label}</label><select id="${fid}">${opts}</select>`;
            } else if (f.type === "checkbox") {
                return `<label><input type="checkbox" id="${fid}"> ${f.label}</label>`;
            } else {
                if (f.id === "currentRate") {
                    const rateUnitField = calc.inputFields.find(x => x.id === "rateUnit");
                    return `<label for="${fid}">${f.label}</label>
                        <div class="calc-rate-row">
                            <input type="number" id="${fid}" placeholder="${f.placeholder || ""}">
                            <select id="${rateUnitField.id}-${calcKey}">
                                ${rateUnitField.options
                                    .map(o => `<option value="${o.value}">${o.label}</option>`)
                                    .join("")}
                            </select>
                        </div>`;
                } else {
                    return `<label for="${fid}">${f.label}</label>
                        <input type="number" id="${fid}" placeholder="${f.placeholder || ""}">`;
                }
            }
        })
        .join("");

    form.innerHTML = `
        <p>${calc.description || ""}</p>
        ${fieldsHtml}
        <div class="calc-buttons">
            <button type="button" onclick="calculate('${calcKey}')">Calculate</button>
            <button type="button" class="btn-clear" onclick="clearCalculation('${calcKey}')">Clear</button>
        </div>
        <div id="result-${calcKey}" class="calc-result"></div>
    `;

    if (calcKey === "heparin") {
        const bolusOptionHtml = `
            <div class="calc-bolus-option">
                <label><input type="radio" name="bolusOption-${calcKey}" value="with" checked> With bolus</label>
                <label><input type="radio" name="bolusOption-${calcKey}" value="without"> Without bolus</label>
            </div>
        `;

        const content = `
            <p>${calc.description || ""}</p>
            ${fieldsHtml}
            ${bolusOptionHtml}
            <div class="calc-buttons">
                <button type="button" onclick="calculate('${calcKey}')">Calculate</button>
                <button type="button" class="btn-clear" onclick="clearCalculation('${calcKey}')">Clear</button>
            </div>
            <div id="result-${calcKey}" class="calc-result"></div>
        `;
        form.innerHTML = content;
    }

    cardDiv.appendChild(form);
    form.addEventListener("click", e => e.stopPropagation());
}


/* =========================================================
   8️⃣ CALCULATION HANDLER
   ========================================================= */
function calculate(calcKey) {
    const calcFunctions = {
        bmi: calculateBMI,
        bsa: calculateBSA,
        heparin: calculateHeparin,
        insulin: calculateInsulin
    };
    if (calcFunctions[calcKey]) calcFunctions[calcKey](calcKey);
    else console.warn(`No calculator found for key: ${calcKey}`);
}


/* =========================================================
   9️⃣ CLEAR FORM FUNCTION
   ========================================================= */
function clearCalculation(calcKey) {
    const inputs = document.querySelectorAll(`#${calcKey}-card input, #${calcKey}-card select`);
    inputs.forEach(i => (i.type === "checkbox" ? (i.checked = false) : (i.value = "")));
    const resultDiv = document.getElementById(`result-${calcKey}`);
    if (resultDiv) resultDiv.innerHTML = "";
}

