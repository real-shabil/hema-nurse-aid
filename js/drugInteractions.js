/* =========================================================
   DRUG INTERACTION MODULE
   ========================================================= */

let DI_DATA = {};
let ALL_DRUGS = [];

/* =========================================================
   INITIALIZATION
   ========================================================= */
function initDrugInteractions(data) {
    DI_DATA = data || {};
    ALL_DRUGS = Object.keys(DI_DATA).filter(
        k => ![
            "schemaVersion",
            "biDirectional",
            "compatibilityKeys",
            "lastUpdate"
        ].includes(k)
    );

    setupDrugAutocomplete("drugA", "suggestionA");
    setupDrugAutocomplete("drugB", "suggestionB");

}

/* =========================================================
   AUTOCOMPLETE
   ========================================================= */
function setupDrugAutocomplete(inputId, suggestionId) {
    const input = document.getElementById(inputId);
    const box = document.getElementById(suggestionId);
    if (!input || !box) return;

    input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        box.textContent = "";

        if (q.length < 1) {
            box.classList.remove("show");   // only hide when input empty
            return;
        }

        const results = ALL_DRUGS.filter(d => d.toLowerCase().includes(q)).slice(0, 10);

        if (results.length === 0) {
            box.classList.remove("show");   // hide if nothing to show
            return;
        }


        box.classList.add("show");

        results.forEach(name => {
            const item = document.createElement("div");
            item.textContent = name;
            item.className = "suggestion-item";

            item.onclick = () => {
                input.value = name;
                box.textContent = "";
                box.classList.remove("show");
            };

            box.appendChild(item);
        });
    });


    document.addEventListener("click", e => {
        if (!box.contains(e.target) && e.target !== input) {
            box.textContent = "";
            box.classList.remove("show");
        }
    });
}

/* =========================================================
   LOOKUP & DISPLAY
   ========================================================= */
function checkDrugInteraction() {
    const drugA = document.getElementById("drugA").value.trim();
    const drugB = document.getElementById("drugB").value.trim();
    const container = document.getElementById("interactionResult");
    container.textContent = "";

    if (!drugA || !drugB) {
        const div = document.createElement("div");
        div.className = "result-box";
        div.textContent = "Enter both drug names.";
        container.appendChild(div);
        return;
    }

    const match =
        (DI_DATA[drugA] && DI_DATA[drugA][drugB]) ||
        (DI_DATA[drugB] && DI_DATA[drugB][drugA]);

    if (!match) {
        container.innerHTML = `
            <div class="result-box" style="border-left: 5px solid #6c757d;">
                <div class="infusion-final">No documented compatibility</div>
                <p>This pair is not listed in the offline dataset.</p>
                <div class="calc-result info-panel">No compatibility data available — use dedicated line for safety.</div>
            </div>`;
        return;
    }

    const yVal = getCompatValue(match, "ySite");

    const colorMap = {
        "Compatible": "#28a745",
        "Incompatible": "#dc3545",
        "Variable": "#ff9800",
        "No Data": "#6c757d"
    };

    const borderColor = colorMap[yVal] || "#6c757d";


    renderInteractionResult(drugA, drugB, match);

    function renderInteractionResult(drugA, drugB, result) {
        const box = document.getElementById("interactionResult");
        if (!box) return;

        const ySiteValue = getCompatValue(result, "ySite");
        const badge = getBadge(ySiteValue);

        box.innerHTML = `
            <div class="protocol-card info-card interaction-card">

                <h4 class="interaction-title">
                    ${drugA} + ${drugB}
                </h4>

                <div class="interaction-badge">Y-Connect: ${badge}</div>

                <div class="protocol-details info-panel" style="display:block;">
                    ${makeRow("Solution", getCompatValue(result, "solution"))}
                    ${makeRow("Y-Connect", ySiteValue)}
                    ${makeRow("Syringe", getCompatValue(result, "syringe"))}
                    ${makeRow("Admixture", getCompatValue(result, "admixture"))}

                    ${result.notes ? `<div class="med-section"><strong>Notes:</strong> ${result.notes}</div>` : ""}
                    ${result.source ? `<div class="protocol-source info-panel" style="margin-top: 8px;"><strong>Source:</strong> ${result.source}</div>` : ""}
                </div>
            </div>
        `;

    }

    function makeRow(label, value) {
        return `
            <div class="interaction-row">
                <strong>${label}:</strong> ${getBadge(value)}
            </div>
        `;
    }

    function getBadge(status) {
        const map = {
            "Compatible": "🟩 Compatible",
            "Incompatible": "🟥 Incompatible",
            "Variable": "🟧 Variable",
            "No Data": "⬜ No Data",
            "N/A": "⬜ N/A"
        };
        return map[status] || "⬜ No Data";
    }
}

/* =========================================================
   CLEAR
   ========================================================= */
function clearDrugInteraction() {
    ["drugA", "drugB"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    const container = document.getElementById("interactionResult");
    if (container) container.textContent = "";
}

/* =========================================================
   UTILITIES
   ========================================================= */
function getCompatValue(entry, route) {
    const compat = entry && typeof entry.compatibility === "object"
        ? entry.compatibility
        : {};

    const value = compat[route];

    // If value exists, use it; otherwise default to "No Data"
    return value || "No Data";
}

function getInteraction(drugA, drugB) {
    if (!drugA || !drugB) return null;
    return (DI_DATA[drugA] && DI_DATA[drugA][drugB]) ||
        (DI_DATA[drugB] && DI_DATA[drugB][drugA]) || null;
}

console.assert(typeof initDrugInteractions === "function", "initDrugInteractions() missing");
