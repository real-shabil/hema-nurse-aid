/* =========================================================
   CHEMOTHERAPY NURSE GUIDE — MEDICATION MODULE
   ========================================================= */

let MEDICATIONS_DATA = null;
const MED_DATA = "data/chemoMedications.json";

// CATEGORY MAPPING
const DRUG_CATEGORIES = {
    allMedications: {
        title: "All Medications",
        description: "Comprehensive list of chemotherapy, targeted therapy, and supportive care medications.",
        keywords: [] // Matches everything
    }
};

/* =========================================================
   LOAD MEDICATION DATA
   ========================================================= */
async function loadMedicationData() {
    try {
        const res = await fetch(MED_DATA);
        const data = await res.json();

        // Sort data alphabetically by name
        data.sort((a, b) => a.name.localeCompare(b.name));
        MEDICATIONS_DATA = data;
        return data;
    } catch (err) {
        console.error("Error loading chemoMedications.json:", err);
        const container = document.getElementById("medicationsList");
        if (container) container.innerHTML = `<p class="error-message">Failed to load medications. Please try again.</p>`;
    }
}

function getCategoryForDrug(drug) {
    // Simple pass-through: all drugs belong to the single category
    return "allMedications";
}

/* =========================================================
   OPEN GROUP (Called from HTML Buttons)
   ========================================================= */
function openMedicationGroup(groupKey, options = {}) {
    const dataReady = MEDICATIONS_DATA ? Promise.resolve(MEDICATIONS_DATA) : loadMedicationData();

    dataReady.then(allDrugs => {
        if (!allDrugs) return;

        // Filter drugs for this group
        const groupConfig = DRUG_CATEGORIES[groupKey] || DRUG_CATEGORIES.supportiveTherapy;
        const filteredDrugs = allDrugs.filter(drug => {
            const cat = getCategoryForDrug(drug);
            return cat === groupKey;
        });

        // Use the title/desc from config
        const displayGroup = {
            title: groupConfig.title,
            description: groupConfig.description,
            drugs: filteredDrugs
        };

        // UI Navigation
        if (typeof navigateToSection === "function") {
            navigateToSection("medType");
        }

        const titleEl = document.getElementById("medTypeTitle");
        if (titleEl) {
            titleEl.textContent = displayGroup.title;
        }

        const list = document.getElementById("medicationsList");
        if (!list) return;
        list.innerHTML = "";

        if (filteredDrugs.length === 0) {
            list.innerHTML = `<p class="empty-message">No medications found in this category.</p>`;
            return;
        }

        renderMedicationGroup(displayGroup, groupKey, 0, list, options);

        // Scroll to specific drug if requested (from search)
        if (options.targetDrugName) {
            setTimeout(() => {
                const normalizedTarget = options.targetDrugName.toLowerCase();
                // Find element by data-name attribute or similar
                const cards = list.querySelectorAll(".protocol-card h4");
                for (let h4 of cards) {
                    if (h4.textContent.toLowerCase() === normalizedTarget) {
                        const targetCard = h4.closest(".protocol-card");
                        if (targetCard) {
                            targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
                            targetCard.classList.add("protocol-pulse");
                            targetCard.click(); // Expand it
                            setTimeout(() => targetCard.classList.remove("protocol-pulse"), 1600);
                        }
                        break;
                    }
                }
            }, 350);
        }
    });
}


/* =========================================================
   RENDER GROUP CARD container
   Using existing CSS classes (.phase-card) for consistency
   ========================================================= */
function renderMedicationGroup(groupObj, groupKey, index, mountPoint, options = {}) {
    // Create one big Card that is already open or contains the list
    // In the original UI, "Groups" were collapsible. Here we are INSIDE a group view ("medType" section).
    // So we just render the list of cards directly, OR we wrap them in a description block.

    // Let's render the description
    const descBox = document.createElement("div");
    descBox.className = "phase-card";
    // Force it expanded and without toggle button since we are already inside the category view
    descBox.innerHTML = `
        <div class="phase-content" style="max-height: none; opacity: 1; padding-top: 5px; display: block;">
            <p class="phase-description"><strong>Description:</strong> ${groupObj.description}</p>
        </div>
    `;
    mountPoint.appendChild(descBox);

    // Now render list of drugs below description
    groupObj.drugs.forEach((drug, i) => {
        renderMedicationDrug(drug, i, mountPoint);
    });
}

/* =========================================================
   RENDER INDIVIDUAL DRUG CARD
   ========================================================= */
function renderMedicationDrug(drug, index, mountPoint) {
    const card = document.createElement("div");
    card.classList.add("protocol-card", "info-card");

    // Header
    const header = document.createElement("h4");
    header.textContent = drug.name;
    card.appendChild(header);

    // Subtitle (Class)
    const sub = document.createElement("div");
    sub.className = "protocol-summary";
    sub.textContent = drug.class;
    card.appendChild(sub);

    // Hidden Details
    const details = document.createElement("div");
    details.classList.add("protocol-details", "info-panel");
    details.style.display = "none";
    details.innerHTML = generateDrugDetailHTML(drug);

    card.appendChild(details);
    mountPoint.appendChild(card);

    // Click to toggle
    card.addEventListener("click", () => {
        const isOpen = details.style.display === "block";

        // Close all others first
        document.querySelectorAll(".protocol-details").forEach(d => {
            d.style.display = "none";
            // Also remove active class from parent card if needed
            if (d.parentElement) {
                d.parentElement.classList.remove("is-active");
            }
        });

        // Toggle current
        details.style.display = isOpen ? "none" : "block";
        card.classList.toggle("is-active", !isOpen);
    });
}

/* =========================================================
   GENERATE DETAIL HTML
   ========================================================= */
function generateDrugDetailHTML(drug) {
    // Helper for arrays of objects
    const renderList = (items, renderer) => {
        if (!items || items.length === 0) return "";
        return `<ul class="med-list">${items.map(renderer).join("")}</ul>`;
    };

    let html = "";

    // Basic Info
    html += `<div class="med-head">Route:</div>`;
    html += `<div class="med-body">${drug.routes || "—"}</div>`;

    html += `<div class="med-head">Indication:</div>`;
    html += `<div class="med-body">${drug.indication || "—"}</div>`;

    if (drug.extravasation_risk) {
        let riskClass = "";
        const risk = drug.extravasation_risk.toLowerCase();
        if (risk.includes("vesicant")) riskClass = "color: var(--color-danger); font-weight:bold;";
        else if (risk.includes("irritant")) riskClass = "color: var(--color-text-warning-dark);";

        html += `<div class="med-head">Extravasation Risk:</div>`;
        html += `<div class="med-body" style="${riskClass}">${drug.extravasation_risk}</div>`;
    }

    // Side Effects
    if (drug.side_effects && drug.side_effects.length > 0) {
        html += `<div class="med-head">Common Side Effects:</div>`;
        html += `<div class="med-body">`;

        // Check if side_effects is a list of objects or strings.
        if (typeof drug.side_effects[0] === 'string') {
            html += `<ul class="med-list">${drug.side_effects.map(s => `<li>${s}</li>`).join("")}</ul>`;
        } else {
            let effectsHtml = "";
            drug.side_effects.forEach(obj => {
                if (obj.type && (obj.notes || obj.description)) {
                    effectsHtml += `<li><b>${obj.type}:</b> ${obj.notes || obj.description}</li>`;
                } else {
                    Object.entries(obj).forEach(([key, value]) => {
                        const label = key.charAt(0).toUpperCase() + key.slice(1);
                        effectsHtml += `<li><b>${label}:</b> ${value}</li>`;
                    });
                }
            });
            html += `<ul class="med-list">${effectsHtml}</ul>`;
        }
        html += `</div>`;
    }

    // Premedications
    if (drug.premedications && drug.premedications.length > 0) {
        html += `<div class="med-head">Premedications:</div>`;
        html += `<div class="med-body">`;
        html += renderList(drug.premedications, (p) =>
            `<li><b>${p.drug}</b> (${p.route}): ${p.timing}</li>`
        );
        html += `</div>`;
    }

    // Prophylaxis
    if (drug.required_prophylaxis && drug.required_prophylaxis.length > 0) {
        html += `<div class="med-head">Required Prophylaxis:</div>`;
        html += `<div class="med-body">`;
        html += renderList(drug.required_prophylaxis, (p) =>
            `<li><b>${p.type}:</b> ${p.notes}</li>`
        );
        html += `</div>`;
    }

    // Supportive Care
    if (drug.supportive_care && drug.supportive_care.length > 0) {
        html += `<div class="med-head">Supportive Care & Monitoring:</div>`;
        html += `<div class="med-body">`;
        html += renderList(drug.supportive_care, (s) =>
            `<li><b>${s.type}:</b> ${s.notes}</li>`
        );
        html += `</div>`;
    }

    // Source
    if (drug.source) {
        html += `<div class="med-source"><strong>Source:</strong> <em>${drug.source}</em></div>`;
    }

    return html;
}

/* =========================================================
   SEARCH FUNCTIONALITY
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    initMedicationSearch();
});

function initMedicationSearch() {
    const input = document.getElementById("medSearchInput");
    const searchBtn = document.getElementById("medSearchBtn");
    const clearBtn = document.getElementById("medSearchClear");

    if (!input) return;

    const runSearch = () => performMedicationSearch(input.value);

    if (searchBtn) searchBtn.addEventListener("click", runSearch);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });
    input.addEventListener("input", () => {
        if (input.value.trim().length < 2) {
            renderMedicationSearchResults([], { statusText: "Type at least 2 letters to search." });
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            input.value = "";
            renderMedicationSearchResults([], { statusText: "Cleared." });
        });
    }
}

function performMedicationSearch(rawQuery) {
    const query = (rawQuery || "").trim().toLowerCase();
    if (query.length < 2) {
        renderMedicationSearchResults([], { statusText: "Type at least 2 letters." });
        return;
    }

    const dataReady = MEDICATIONS_DATA ? Promise.resolve(MEDICATIONS_DATA) : loadMedicationData();

    dataReady.then(allDrugs => {
        if (!allDrugs) return;

        const matches = allDrugs.filter(drug => {
            // Search in Name, Class, Indication, Route
            const text = [
                drug.name,
                drug.class,
                drug.routes,
                drug.indication
            ].join(" ").toLowerCase();
            return text.includes(query);
        });

        const statusText = matches.length
            ? `Found ${matches.length} match${matches.length === 1 ? "" : "es"}.`
            : `No matches found for "${rawQuery}".`;

        renderMedicationSearchResults(matches, { query, statusText });
    });
}

function renderMedicationSearchResults(results, options = {}) {
    const container = document.getElementById("medSearchResults");
    const statusEl = document.getElementById("medSearchStatus");

    if (statusEl && options.statusText) statusEl.textContent = options.statusText;
    if (!container) return;

    container.innerHTML = "";

    if (!results || results.length === 0) {
        container.setAttribute("hidden", "");
        return;
    }

    container.removeAttribute("hidden");

    // Limit to 20 results
    results.slice(0, 20).forEach(drug => {
        const card = document.createElement("div");
        card.className = "protocol-card info-card protocol-search-result";
        card.innerHTML = `
            <div class="result-top">
                <span class="result-pill">${drug.class || "Drug"}</span>
            </div>
            <h4>${drug.name}</h4>
            <p class="result-drugs">${drug.route || drug.routes || ""}</p>
        `;

        card.addEventListener("click", () => {
            // Determine category to open correct view
            const cat = getCategoryForDrug(drug);
            // Open that group and highlight drug
            openMedicationGroup(cat, { targetDrugName: drug.name });
        });

        container.appendChild(card);
    });
}
