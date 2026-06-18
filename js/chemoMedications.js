/* =========================================================
   CHEMOTHERAPY NURSE GUIDE — MEDICATION MODULE (SECURE)
   ========================================================= */

let MEDICATIONS_DATA = null;
const MED_DATA = "data/chemoMedications.json";

const DRUG_CATEGORIES = {
    allMedications: {
        title: "All Medications",
        description: "Comprehensive list of chemotherapy, targeted therapy, and supportive care medications."
    }
};

// HELPER: Securely create elements (Prevents XSS)
const createEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
};

const normalizeMedicationPayload = payload => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.medications)) return payload.medications;
    throw new Error("Unsupported medication data schema.");
};

const addDetailField = (container, label, value) => {
    if (value === undefined || value === null || value === "") return;
    container.appendChild(createEl("div", "med-head", `${label}:`));
    container.appendChild(createEl("div", "med-body", value));
};

const addDetailList = (container, label, items) => {
    if (!Array.isArray(items) || !items.length) return;

    container.appendChild(createEl("div", "med-head", `${label}:`));
    const ul = document.createElement("ul");
    items.forEach(item => ul.appendChild(createEl("li", "med-list", item)));
    container.appendChild(ul);
};

const getMedicationSummary = drug => {
    const risk = drug.nursing_workflow?.during_infusion?.extravasation_management?.risk;
    const source = drug.metadata?.evidence_source;
    return [risk, source].filter(Boolean).join(" | ");
};

/* =========================================================
   LOAD & NAVIGATE
   ========================================================= */
async function loadMedicationData() {
    try {
        const res = await fetch(MED_DATA);
        const payload = await res.json();
        const data = normalizeMedicationPayload(payload);
        data.sort((a, b) => a.name.localeCompare(b.name));
        MEDICATIONS_DATA = data;
        return data;
    } catch (err) {
        console.error("Error loading medications:", err);
    }
}

function getCategoryForDrug(drug) { return "allMedications"; }

function openMedicationGroup(groupKey, options = {}) {
    const dataReady = MEDICATIONS_DATA ? Promise.resolve(MEDICATIONS_DATA) : loadMedicationData();
    dataReady.then(allDrugs => {
        if (!allDrugs) return;

        if (typeof navigateToSection === "function") {
            navigateToSection("medType");
        }

        const titleEl = document.getElementById("medTypeTitle");
        if (titleEl) {
            titleEl.textContent = DRUG_CATEGORIES[groupKey]?.title || "Medications";
        }
        
        const list = document.getElementById("medicationsList");
        if (!list) return;
        list.replaceChildren();

        allDrugs.forEach((drug, i) => renderMedicationDrug(drug, i, list, options));

        if (options.targetDrugName) {
            const targetCard = list.querySelector(".protocol-highlight");
            if (targetCard) targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });
}

/* =========================================================
   SECURE RENDERING (Bedside Pro Schema)
   ========================================================= */
function renderMedicationDrug(drug, index, mountPoint, options = {}) {
    const targetDrugName = (options.targetDrugName || "").toLowerCase();
    const isTarget = targetDrugName && (drug.name || "").toLowerCase() === targetDrugName;
    const card = createEl("div", "protocol-card info-card");
    card.appendChild(createEl("h4", "", drug.name));
    card.appendChild(createEl("div", "protocol-summary", getMedicationSummary(drug)));

    const details = createEl("div", "protocol-details info-panel");
    details.style.display = isTarget ? "block" : "none";
    card.appendChild(details);

    if (isTarget) {
        details.appendChild(generateDrugDetailHTML(drug));
        card.classList.add("is-active", "protocol-highlight");
    }

    card.addEventListener("click", () => {
        const isClosed = details.style.display === "none";
        document.querySelectorAll(".protocol-details").forEach(d => { d.style.display = "none"; d.parentElement.classList.remove("is-active"); });
        
        if (isClosed) {
            details.replaceChildren();
            details.appendChild(generateDrugDetailHTML(drug));
            details.style.display = "block";
            card.classList.add("is-active");
        }
    });
    mountPoint.appendChild(card);
}

function generateDrugDetailHTML(drug) {
    const container = document.createElement("div");
    const wf = drug.nursing_workflow;
    if (!wf) return createEl("div", "", "Workflow data not available.");

    addDetailField(container, "Critical Safety Alerts", wf.pre_infusion_safety?.fatal_alerts);
    addDetailList(container, "Mandatory Checks", wf.pre_infusion_safety?.mandatory_checks);
    addDetailList(container, "Premeds", wf.pre_infusion_safety?.premeds);

    const em = wf.during_infusion?.extravasation_management;
    if (em) {
        addDetailField(container, `Extravasation (${em.risk || "Not specified"})`, `${em.action || "Not specified"} | Antidote: ${em.antidote || "Not specified"}`);
    }

    addDetailField(container, "Monitoring Frequency", wf.during_infusion?.monitoring_frequency);
    addDetailList(container, "Stop Criteria", wf.during_infusion?.stop_criteria);
    addDetailList(container, "Post-Infusion Nursing Assessment", wf.post_infusion_care?.nursing_assessment);
    addDetailField(container, "Patient Education", wf.post_infusion_care?.patient_education);
    addDetailList(container, "Report to Physician", drug.side_effect_triage?.report_to_physician);
    addDetailList(container, "Manage at Bedside", drug.side_effect_triage?.manage_at_bedside);
    addDetailField(container, "Evidence Source", drug.metadata?.evidence_source);
    addDetailField(container, "Last Updated", drug.metadata?.last_updated);

    return container;
}

/* =========================================================
   SEARCH (Secure)
   ========================================================= */
function performMedicationSearch(rawQuery) {
    const query = (rawQuery || "").trim().toLowerCase();
    const container = document.getElementById("medSearchResults");
    const status = document.getElementById("medSearchStatus");
    if (!container) return;
    container.replaceChildren();

    if (query.length < 2) {
        container.hidden = true;
        if (status) status.textContent = "Type at least 2 letters to search.";
        return;
    }

    if (!MEDICATIONS_DATA) {
        if (status) status.textContent = "Medications are still loading. Try again in a moment.";
        return;
    }

    const matches = MEDICATIONS_DATA.filter(drug => {
        const searchableText = [
            drug.name,
            drug.metadata?.evidence_source,
            drug.nursing_workflow?.pre_infusion_safety?.fatal_alerts,
            drug.nursing_workflow?.during_infusion?.extravasation_management?.risk,
            drug.nursing_workflow?.during_infusion?.monitoring_frequency,
            ...(drug.nursing_workflow?.pre_infusion_safety?.mandatory_checks || []),
            ...(drug.nursing_workflow?.pre_infusion_safety?.premeds || []),
            ...(drug.nursing_workflow?.during_infusion?.stop_criteria || []),
            ...(drug.side_effect_triage?.report_to_physician || []),
            ...(drug.side_effect_triage?.manage_at_bedside || [])
        ].filter(Boolean).join(" ").toLowerCase();

        return searchableText.includes(query);
    });

    container.hidden = false;
    if (status) status.textContent = matches.length
        ? `Found ${matches.length} match${matches.length === 1 ? "" : "es"}.`
        : `No medications found for "${rawQuery}".`;

    matches.forEach(drug => {
        const card = createEl("div", "protocol-card info-card protocol-search-result");
        card.appendChild(createEl("h4", "", drug.name));
        card.addEventListener("click", () => openMedicationGroup("allMedications", { targetDrugName: drug.name }));
        container.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadMedicationData();
    const searchInput = document.getElementById("medSearchInput");
    const searchBtn = document.getElementById("medSearchBtn");
    const clearBtn = document.getElementById("medSearchClear");

    if(searchInput) {
        searchInput.addEventListener("input", (e) => performMedicationSearch(e.target.value));
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                performMedicationSearch(searchInput.value);
            }
        });
    }

    if (searchBtn && searchInput) {
        searchBtn.addEventListener("click", () => performMedicationSearch(searchInput.value));
    }

    if (clearBtn && searchInput) {
        clearBtn.addEventListener("click", () => {
            searchInput.value = "";
            performMedicationSearch("");
            searchInput.focus();
        });
    }
});
