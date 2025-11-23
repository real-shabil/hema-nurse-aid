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
let currentGameKey = null;


/* =========================================================
   2️⃣ STARTUP HANDLERS
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    personalizeGreeting();
    setupDrugInteractionControls();
    loadMedicationData();
    goHome();
});


function personalizeGreeting() {
    const modal = document.getElementById("onboardingModal");
    const submitBtn = document.getElementById("onboardSubmit");
    const agreeCheck = document.getElementById("agreeCheck");
    const nameInput = document.getElementById("onboardName");

    let userName = localStorage.getItem("userName");

    // =========================================================
    // 1️⃣ SHOW MODAL ONLY ON FIRST VISIT
    // =========================================================
    if (!userName) {
        modal.style.display = "flex";
    }

    // Enable submit button only when checkbox is checked
    agreeCheck.onchange = () => {
        submitBtn.disabled = !agreeCheck.checked;
    };

    // =========================================================
    // 2️⃣ SAVE NAME & CLOSE MODAL
    // =========================================================
    submitBtn.onclick = () => {
        const name = nameInput.value.trim();

        if (name.length < 2) {
            alert("Please enter a valid name.");
            return;
        }

        localStorage.setItem("userName", name);
        modal.style.display = "none";
        updateGreeting(name);
    };

    // If user already has a name → show greeting immediately
    if (userName) {
        updateGreeting(userName);
    }
}

function updateGreeting(userName) {
    const welcomeEl = document.getElementById("welcomeMessage");
    const modal = document.getElementById("onboardingModal");
    const nameInput = document.getElementById("onboardName");
    const agreeCheck = document.getElementById("agreeCheck");
    const submitBtn = document.getElementById("onboardSubmit");

    // If the element doesn't exist (e.g., user isn't on home section), exit
    if (!welcomeEl) return;

    // Create dynamic greeting based on time
    const hour = new Date().getHours();
    let greeting = "Welcome";

    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";
    else greeting = "Good evening";

    welcomeEl.innerHTML = `${greeting}, <strong>${userName}</strong>`;

    // ===========================================
    // Add or update the "Edit Name" button
    // ===========================================
    let editBtn = document.querySelector(".change-name-btn");

    // If not present → create it
    if (!editBtn) {
        editBtn = document.createElement("button");
        editBtn.className = "change-name-btn";
        editBtn.textContent = "Edit Name";
        welcomeEl.insertAdjacentElement("afterend", editBtn);
    }

    // Edit button: reopen modal with name prefilled
    editBtn.onclick = () => {
        nameInput.value = userName;      // Prefill with current name
        agreeCheck.checked = false;      // Reset checkbox for safety
        submitBtn.disabled = true;       // Disable until checkbox checked
        modal.style.display = "flex";    // Open modal
    };
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
}

function goHome() {
    navigateToSection("home");
}


/* =========================================================
   🎮 GAMES
   ========================================================= */

/* =========================================================
   🎮 GAMES
   ========================================================= */

window.openGame = function openGame(gameKey) {
    console.log("[Games] openGame called with:", gameKey);

    const panel = document.getElementById("gameContent");
    if (!panel) {
        console.error("[Games] ❌ #gameContent not found in DOM.");
        return;
    }

    const isSameOpen =
        currentGameKey === gameKey && !panel.hasAttribute("hidden");

    // If same game clicked again → collapse panel
    if (isSameOpen) {
        console.log("[Games] Same game clicked, collapsing panel.");
        panel.setAttribute("hidden", "");
        panel.innerHTML = "";
        currentGameKey = null;
        return;
    }

    currentGameKey = gameKey;
    panel.removeAttribute("hidden");

    // Wrap game inside a card for UI consistency
    panel.innerHTML = `
        <div class="game-wrapper-card">
            <h3 class="game-title">
                ${gameKey === "wordle" ? "Wordle" : "Game"}
            </h3>
            <div id="gameInner" class="game-inner"></div>
        </div>
    `;

    const inner = document.getElementById("gameInner");
    if (!inner) {
        console.error("[Games] ❌ #gameInner not found after rendering.");
        return;
    }

    if (gameKey === "wordle") {
        if (typeof loadWordle === "function") {
            console.log("[Games] Calling loadWordle...");
            loadWordle(inner);

        } else {
            console.error("[Games] ❌ loadNurseWordle is not a function.");
            inner.innerHTML = "<p>Wordle module unavailable.</p>";
        }
    } else {
        inner.innerHTML = "<p>Game not available yet.</p>";
    }

    if (panel.scrollIntoView) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
};



/* =========================================================
   7️⃣ CALCULATIONS MENU
   ========================================================= */
function loadCalculationsMenu() {
    const listDiv = document.getElementById("calculationsList");
    if (!listDiv) return;

    listDiv.innerHTML = Object.keys(calculationsData)
        .map(key => {
            const calc = calculationsData[key];
            return `
                <div class="phase-card" id="${key}-card">
                    <button type="button"
                            class="phase-toggle"
                            onclick="openCalculation('${key}', event)">
                        <h3>${calc.title}</h3>
                        <span class="collapsible-icon" aria-hidden="true">+</span>
                    </button>
                    <!-- The form will be injected here by openCalculation() -->
                </div>
            `;
        })
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
                return `<label for="${fid}">${f.label}</label><select id="${fid}" class="input-field">${opts}</select>`;
            } else if (f.type === "checkbox") {
                return `<label><input type="checkbox" id="${fid}"> ${f.label}</label>`;
            } else {
                if (f.id === "currentRate") {
                    const rateUnitField = calc.inputFields.find(x => x.id === "rateUnit");
                    return `<label for="${fid}">${f.label}</label>
                        <div class="calc-rate-row">
                            <input type="number" id="${fid}" class="input-field" placeholder="${f.placeholder || ""}">
                            <select id="${rateUnitField.id}-${calcKey}" class="input-field">
                                ${rateUnitField.options
                                    .map(o => `<option value="${o.value}">${o.label}</option>`)
                                    .join("")}
                            </select>
                        </div>`;
                } else {
                    return `<label for="${fid}">${f.label}</label>
                        <input type="number" id="${fid}" class="input-field" placeholder="${f.placeholder || ""}">`;
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
        <div id="result-${calcKey}" class="calc-result info-panel"></div>
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
            <div id="result-${calcKey}" class="calc-result info-panel"></div>
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
        heparin: calculateHeparin,
        insulin: calculateInsulin,
        bodySize: calculateBodySize
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
