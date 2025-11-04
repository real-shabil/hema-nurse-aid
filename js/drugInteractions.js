/* =========================================================
   💉 DRUG INTERACTIONS MODULE
   ---------------------------------------------------------
   Owner:        Shabil Mohammed Kozhippattil
   Description:  Self-contained feature to display and filter
                 offline drug–drug interaction data.
   Dependencies: .result-box, .infusion-final, .suggestion-box
   ========================================================= */

let DI_DATA = {};
let ALL_DRUGS = [];
let INTERACTION_HISTORY = [];
const HISTORY_LIMIT = 5;

/* =========================================================
   1️⃣ INITIALIZATION
   ========================================================= */
function initDrugInteractions(data) {
    DI_DATA = data || {};
    ALL_DRUGS = Object.keys(DI_DATA);

    setupDrugAutocomplete("drugA", "suggestionA");
    setupDrugAutocomplete("drugB", "suggestionB");
    console.log("💉 Drug Interaction Module initialized.");
}

/* =========================================================
   2️⃣ AUTOCOMPLETE LOGIC
   ========================================================= */
function setupDrugAutocomplete(inputId, suggestionId) {
    const input = document.getElementById(inputId);
    const box = document.getElementById(suggestionId);
    if (!input || !box) return;

    input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        box.innerHTML = "";
        if (q.length < 1) return;

        const results = ALL_DRUGS.filter(d => d.toLowerCase().includes(q)).slice(0, 10);
        results.forEach(name => {
            const item = document.createElement("div");
            item.textContent = name;
            item.className = "suggestion-item";
            item.onclick = () => {
                input.value = name;
                box.innerHTML = "";
            };
            box.appendChild(item);
        });
    });

    document.addEventListener("click", e => {
        if (!box.contains(e.target) && e.target !== input) box.innerHTML = "";
    });
}

/* =========================================================
   3️⃣ LOOKUP & DISPLAY
   ========================================================= */
function checkDrugInteraction() {
    const drugA = document.getElementById("drugA").value.trim();
    const drugB = document.getElementById("drugB").value.trim();
    const container = document.getElementById("interactionResult");

    container.innerHTML = "";

    if (!drugA || !drugB) {
        container.innerHTML = `<div class="result-box">Enter both drug names.</div>`;
        return;
    }

    const match =
        (DI_DATA[drugA] && DI_DATA[drugA][drugB]) ||
        (DI_DATA[drugB] && DI_DATA[drugB][drugA]);

    if (!match) {
        container.innerHTML = `
            <div class="result-box">
                <div class="infusion-final">No documented interaction</div>
                <p>This pair is not listed in the current offline dataset.</p>
            </div>`;
        updateInteractionHistory(drugA, drugB, null);
        return;
    }

    const color =
        match.severity.includes("Major") ? "#ff4d4d" :
        match.severity.includes("Moderate") ? "#ffb84d" :
        match.severity.includes("Incompatible") ? "#ff704d" :
        "#4da6ff";

    container.innerHTML = `
        <div class="result-box" style="border-left: 5px solid ${color};">
            <div class="infusion-final">Severity: ${match.severity}</div>
            <p><strong>Type:</strong> ${match.type}</p>
            <p><strong>Description:</strong> ${match.description}</p>
            <p><strong>Nursing Management:</strong> ${match.nursingManagement}</p>
        </div>
    `;
    updateInteractionHistory(drugA, drugB, match);
}

/* =========================================================
   4️⃣ CLEAR & FILTER HELPERS
   ========================================================= */
function clearDrugInteraction() {
    ["drugA", "drugB"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    const container = document.getElementById("interactionResult");
    if (container) container.innerHTML = "";
}

function filterInteractions(query) {
    if (!query) return ALL_DRUGS;
    const q = query.toLowerCase();
    return ALL_DRUGS.filter(d => d.toLowerCase().includes(q));
}

/* =========================================================
   5️⃣ UTILITIES & TESTS
   ========================================================= */
function getInteraction(drugA, drugB) {
    if (!drugA || !drugB) return null;
    return (DI_DATA[drugA] && DI_DATA[drugA][drugB]) ||
           (DI_DATA[drugB] && DI_DATA[drugB][drugA]) || null;
}

function updateInteractionHistory(drugA, drugB, match) {
    const historyContainer = document.getElementById("interactionHistory");
    if (!historyContainer || !drugA || !drugB) return;

    // Keep recording internally if needed but do not display history on the page.
    historyContainer.hidden = true;
    historyContainer.innerHTML = "";
    return;

    const key = [drugA.toLowerCase(), drugB.toLowerCase()].sort().join("|");
    INTERACTION_HISTORY = INTERACTION_HISTORY.filter(entry => entry.key !== key);
    INTERACTION_HISTORY.unshift({
        key,
        drugA,
        drugB,
        match
    });
    if (INTERACTION_HISTORY.length > HISTORY_LIMIT) {
        INTERACTION_HISTORY = INTERACTION_HISTORY.slice(0, HISTORY_LIMIT);
    }
    renderInteractionHistory(historyContainer);
}

function renderInteractionHistory(container) {
    if (!INTERACTION_HISTORY.length) {
        container.hidden = true;
        container.innerHTML = "";
        return;
    }

    // Skip rendering to keep history off the page.
    container.hidden = true;
    container.innerHTML = "";
}

// Quick console validation
console.assert(typeof initDrugInteractions === "function", "initDrugInteractions() missing");
