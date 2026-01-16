/* =========================================================
   🌿 CHEMOTHERAPY NURSE GUIDE — MAIN LOGIC
   ========================================================= */


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */
let leukemiaProtocols = {};
let medicationsData = {};
let calculationsData = {};
let clinicalGuidelines = {};
let drugInteractionsData = {};
let currentGameKey = null;


/* =========================================================
   STARTUP HANDLERS
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
    // SHOW MODAL ONLY ON FIRST VISIT
    // =========================================================
    if (!userName) {
        modal.style.display = "flex";
    }

    // Enable submit button only when checkbox is checked
    agreeCheck.onchange = () => {
        submitBtn.disabled = !agreeCheck.checked;
    };

    // =========================================================
    // SAVE NAME & CLOSE MODAL
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
        nameInput.value = userName;
        agreeCheck.checked = false;
        submitBtn.disabled = true;
        modal.style.display = "flex";
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

    })
    .catch(err => console.error("❌ Error loading insulinProtocols.json:", err));

fetch("data/drugInteractions.json")
    .then(res => res.json())
    .then(data => {
        drugInteractionsData = data;
        const checkBtn = document.getElementById("checkInteractionBtn");
        if (checkBtn) checkBtn.disabled = false;
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
   1. NAVIGATION
   ========================================================= */
function navigateToSection(id) {
    // 1. Hide all main containers
    document.querySelectorAll(".container, .section").forEach(section => {
        section.style.display = "none";
    });

    // 2. Determine target ID (Handle nested/dynamic sections)
    let targetId = id;

    // If 'type' is requested, it should display the 'type' section
    // If 'drug-details' is requested, it might be inside 'medications' or its own section

    const target = document.getElementById(targetId);

    if (target) {
        target.style.display = "block";
    } else {
        // Fallback or specific logic for dynamic sections not in initial HTML
        if (id === 'type' || id === 'drug-details') {
            // These are expected to exist if modules loaded correctly.
            // If missing, log warning.
            console.warn(`Target section '${id}' missing from DOM.`);
        } else {
            console.warn(`Section '${id}' not found. Going home.`);
            goHome();
            return;
        }
    }

    // 3. Module specific initializations
    if (id === "calculations") loadCalculationsMenu();
    if (id === "medications" && typeof loadMedicationsMenu === "function") loadMedicationsMenu();

    // 4. Scroll to top
    window.scrollTo(0, 0);

    // 5. Update Bottom Nav State
    // We map the requested ID to the Nav Item ID
    const navMapping = {
        'home': 'nav-home',
        'leukemia': 'nav-leukemia',
        'type': 'nav-leukemia',       // Nested under Protocols
        'medications': 'nav-medications',
        'medType': 'nav-medications', // Nested under Meds
        'calculations': 'nav-calculations',
        'drugInteractions': 'nav-home',
        'games': 'nav-home'
    };

    const activeNavId = navMapping[id] || 'nav-home';
    updateBottomNav(activeNavId);
}

function updateBottomNav(activeNavId) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.id === activeNavId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}


function goHome() {
    navigateToSection("home");
}

/* =========================================================
   🎮 GAMES
   ========================================================= */

window.openGame = function openGame(gameKey) {


    const panel = document.getElementById("gameContent");
    if (!panel) {
        console.error("[Games] ❌ #gameContent not found in DOM.");
        return;
    }

    const isSameOpen =
        currentGameKey === gameKey && !panel.hasAttribute("hidden");

    // If same game clicked again → collapse panel
    if (isSameOpen) {

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
   CALCULATIONS MENU
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
            const card = document.getElementById(`${key}-card`);
            if (form) form.style.display = "none";
            if (card) card.classList.remove("is-expanded");
        }
    });

    const cardDiv = document.getElementById(`${calcKey}-card`);
    if (!cardDiv) return;

    let existingForm = cardDiv.querySelector("form");
    if (existingForm) {
        const isHidden = existingForm.style.display === "none";
        existingForm.style.display = isHidden ? "flex" : "none";

        if (isHidden) cardDiv.classList.add("is-expanded");
        else cardDiv.classList.remove("is-expanded");

        return;
    }

    // First time opening
    cardDiv.classList.add("is-expanded");

    const calc = calculationsData[calcKey];
    if (!calc) return;

    const form = document.createElement("form");
    form.classList.add("calc-form");
    form.onsubmit = e => e.preventDefault();


    // === SPECIAL HANDLING FOR HEPARIN LAYOUT ===
    if (calcKey === "heparin") {
        // 1. Common Inputs found in config (Weight, Syringe are needed for both)
        // We will manually construct the HTML for better control
        const fWeight = calc.inputFields.find(x => x.id === "weight");
        const fSyringe = calc.inputFields.find(x => x.id === "syringe");
        const fUseInitial = calc.inputFields.find(x => x.id === "useInitial");
        const fOrderedRate = calc.inputFields.find(x => x.id === "orderedRate");
        const fAptt = calc.inputFields.find(x => x.id === "aptt");
        const fCurrentRate = calc.inputFields.find(x => x.id === "currentRate");
        const fRateUnit = calc.inputFields.find(x => x.id === "rateUnit");

        // Helper helper to generate simple input HTML
        const mkInput = (field, id) => `<label for="${id}">${field.label}</label><input type="number" id="${id}" class="input-field" placeholder="${field.placeholder || ""}">`;
        const mkSelect = (field, id) => `<label for="${id}">${field.label}</label><select id="${id}" class="input-field">${field.options.map(o => `<option value="${o.value}">${o.label}</option>`).join("")}</select>`;

        const weightHtml = mkInput(fWeight, `${fWeight.id}-${calcKey}`);
        const syringeHtml = mkSelect(fSyringe, `${fSyringe.id}-${calcKey}`);

        // 2. Initial Infusion Section Card
        const initialCardHtml = `
            <div class="calc-section-card initial-section">
                <p style="margin-top:0; font-size:0.9rem; color:#00695c;">
                    <strong>Start Here:</strong> Check this box if starting a NEW infusion.
                </p>
                <label class="checkbox-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="${fUseInitial.id}-${calcKey}" onchange="toggleHeparinInitial(this, '${calcKey}')"> 
                    <span style="font-weight:bold;">${fUseInitial.label}</span>
                </label>

                <div id="initialFields-${calcKey}" style="display:none; margin-top:12px; padding-top:12px; border-top:1px dashed #b2dfdb;">
                    ${mkInput(fOrderedRate, `${fOrderedRate.id}-${calcKey}`)}
                </div>
            </div>
        `;

        // 3. Regular (Continuous) Section Card
        const regularCardHtml = `
             <div class="calc-section-card continuous-section">
                <h4 style="margin:0 0 10px; color:#555;">Continuous Monitoring & Adjustment</h4>
                ${mkInput(fAptt, `${fAptt.id}-${calcKey}`)}
                
                <label for="${fCurrentRate.id}-${calcKey}">${fCurrentRate.label}</label>
                <div class="calc-rate-row">
                    <input type="number" id="${fCurrentRate.id}-${calcKey}" class="input-field" placeholder="${fCurrentRate.placeholder || ""}">
                    <select id="${fRateUnit.id}-${calcKey}" class="input-field">
                        ${fRateUnit.options.map(o => `<option value="${o.value}">${o.label}</option>`).join("")}
                    </select>
                </div>
             </div>
        `;

        const sourceHtml = calc.source ? `
            <div class="protocol-source info-panel" style="margin-top: 10px;">
                <strong>Source:</strong> ${calc.source}
            </div>` : "";

        form.innerHTML = `
            <p>${calc.description || ""}</p>
            
            <!-- Shared / Top Inputs -->
            <!-- Shared / Top Inputs -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                 <div style="display:flex; flex-direction:column; justify-content: space-between; height: 100%;">${weightHtml}</div>
                 <div style="display:flex; flex-direction:column; justify-content: space-between; height: 100%;">${syringeHtml}</div>
            </div>

            <!-- Bolus Option (Moved Outside) -->
            <div style="margin-bottom: 12px; background: #fdfdfd; padding: 10px; border-radius: 8px; border: 1px solid #eee;">
                <label style="display:block; margin-bottom:6px; color:#555;">Bolus Preference</label>
                <div class="calc-bolus-option" style="margin:0;">
                    <label><input type="radio" name="bolusOption-${calcKey}" value="with" checked> With bolus</label>
                    <label><input type="radio" name="bolusOption-${calcKey}" value="without"> Without bolus</label>
                </div>
            </div>

            <!-- Initial Section -->
            ${initialCardHtml}

            <!-- Continuous Section -->
            ${regularCardHtml}

            <div class="calc-buttons">
                <button type="button" onclick="calculate('${calcKey}')">Calculate</button>
                <button type="button" class="btn-clear" onclick="clearCalculation('${calcKey}')">Clear</button>
            </div>
            <div id="result-${calcKey}" class="calc-result info-panel"></div>
            ${sourceHtml}
        `;

    } else {
        // === GENERIC LAYOUT FOR OTHERS (BMI, Insulin, etc) ===
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

        const sourceHtml = calc.source ? `
        <div class="protocol-source info-panel" style="margin-top: 10px;">
            <strong>Source:</strong> ${calc.source}
        </div>` : "";

        form.innerHTML = `
        <p>${calc.description || ""}</p>
        ${fieldsHtml}
        <div class="calc-buttons">
            <button type="button" onclick="calculate('${calcKey}')">Calculate</button>
            <button type="button" class="btn-clear" onclick="clearCalculation('${calcKey}')">Clear</button>
        </div>
        <div id="result-${calcKey}" class="calc-result info-panel"></div>
        ${sourceHtml}
    `;
    }

    cardDiv.appendChild(form);
    form.addEventListener("click", e => e.stopPropagation());
}

// Helper to toggle initial section visibility
window.toggleHeparinInitial = function (checkbox, calcKey) {
    const div = document.getElementById(`initialFields-${calcKey}`);
    const regularSection = document.querySelector(`#${calcKey}-card .continuous-section`);
    if (div) {
        div.style.display = checkbox.checked ? "block" : "none";
    }
};


/* =========================================================
   CALCULATION HANDLER
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
   CLEAR FORM FUNCTION
   ========================================================= */
function clearCalculation(calcKey) {
    const inputs = document.querySelectorAll(`#${calcKey}-card input, #${calcKey}-card select`);
    inputs.forEach(i => (i.type === "checkbox" ? (i.checked = false) : (i.value = "")));
    const resultDiv = document.getElementById(`result-${calcKey}`);
    if (resultDiv) resultDiv.innerHTML = "";
}
