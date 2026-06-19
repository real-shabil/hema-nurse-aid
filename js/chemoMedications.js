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

    // --- NEW: Add PDF Action Trigger Button Panel (Styled to match Protocols) ---
    const actionBtnRow = createEl("div", "protocol-actions"); 
    actionBtnRow.style.display = "flex";
    actionBtnRow.style.justifyContent = "flex-end"; 
    actionBtnRow.style.margin = "-5px 0 10px 0";    
    
    const pdfBtn = document.createElement("button");
    pdfBtn.className = "pdf-protocol-btn"; 
    pdfBtn.textContent = "💾";
    pdfBtn.title = "Download PDF";
    
    // Explicit inline styles to override any default button backgrounds
    pdfBtn.style.background = "none";
    pdfBtn.style.border = "none";
    pdfBtn.style.cursor = "pointer";
    pdfBtn.style.fontSize = "1.4rem"; 
    pdfBtn.style.padding = "4px";
    
    pdfBtn.addEventListener("click", (e) => {
        e.stopPropagation(); 
        exportMedicationAsPDF(drug, pdfBtn);
    });
    
    actionBtnRow.appendChild(pdfBtn);
    container.appendChild(actionBtnRow);
    // ------------------------------------------------

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
   PDF GENERATION ENGINE — MEDICATION MODULE
   ========================================================= */
function exportMedicationAsPDF(drug, triggeringButton) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("jsPDF library not loaded.");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        // Initialize in Portrait orientation ("p")
        const doc = new jsPDF("p", "mm", "a4");

        let originalHtml = "💾";

        if (triggeringButton) {
            originalHtml = triggeringButton.innerHTML;
            triggeringButton.textContent = "⏳";
            triggeringButton.disabled = true;
        }

        const drugName = drug?.name || "Unnamed Medication";
        const wf = drug?.nursing_workflow || {};

        /* =========================================================
           INTERNAL CLEANING PARSER
           ========================================================= */
        function cleanTextForPDF(str) {
            if (str === null || str === undefined) return "";
            return String(str)
                .replace(/[\u00A0\u200B]/g, " ") 
                .replace(/<br\s*\/?>/gi, "\n")   
                .replace(/<\/?b>/gi, "")         
                .replace(/<\/?strong>/gi, "")    
                .replace(/&amp;/g, "&")          
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
        }

        function formatValueForTable(val) {
            if (!val || (Array.isArray(val) && val.length === 0)) return "-";
            if (Array.isArray(val)) {
                return val.map(item => `• ${cleanTextForPDF(item)}`).join("\n");
            }
            return cleanTextForPDF(val);
        }

        // --- HEADER SECTION ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0, 77, 64); 
        doc.text(cleanTextForPDF(drugName), 14, 18);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(100, 100, 100);

        const risk = wf.during_infusion?.extravasation_management?.risk || "Not specified";
        const drugClass = drug?.class || "Not specified";
        doc.text(`Drug Classification: ${cleanTextForPDF(drugClass)}  |  Extravasation Risk: ${cleanTextForPDF(risk)}`, 14, 25);

        // Brand Divider Line (Ends at 196mm for Portrait)
        doc.setDrawColor(0, 77, 64);
        doc.setLineWidth(0.5);
        doc.line(14, 28, 196, 28); 

        // --- GRID MATRIX DATA ASSEMBLY ---
        const matrixRows = [];

        if (wf.pre_infusion_safety?.fatal_alerts) {
            matrixRows.push(["CRITICAL SAFETY ALERTS", formatValueForTable(wf.pre_infusion_safety.fatal_alerts)]);
        }
        matrixRows.push(["Mandatory Pre-Infusion Checks", formatValueForTable(wf.pre_infusion_safety?.mandatory_checks)]);
        matrixRows.push(["Premedications & Timings", formatValueForTable(wf.pre_infusion_safety?.premeds)]);

        const em = wf.during_infusion?.extravasation_management;
        const emText = em ? `Risk Profile: ${em.risk || "Not specified"}\nImmediate Action: ${em.action || "Not specified"}\nAntidote Protocol: ${em.antidote || "Not specified"}` : "-";
        matrixRows.push(["Extravasation Management", cleanTextForPDF(emText)]);
        matrixRows.push(["Monitoring Frequency", formatValueForTable(wf.during_infusion?.monitoring_frequency)]);
        matrixRows.push(["Infusion Stop Criteria", formatValueForTable(wf.during_infusion?.stop_criteria)]);

        matrixRows.push(["Post-Infusion Assessment", formatValueForTable(wf.post_infusion_care?.nursing_assessment)]);
        matrixRows.push(["Patient & Family Education", formatValueForTable(wf.post_infusion_care?.patient_education)]);
        matrixRows.push(["Triage: Report to Physician", formatValueForTable(drug?.side_effect_triage?.report_to_physician)]);
        matrixRows.push(["Triage: Bedside Interventions", formatValueForTable(drug?.side_effect_triage?.manage_at_bedside)]);

        // --- AUTOTABLE ENGINE INITIALIZATION ---
        doc.autoTable({
            startY: 34,
            head: [["Clinical Parameter", "Bedside Guidelines & Nursing Interventions"]],
            body: matrixRows,
            styles: {
                fontSize: 8.5,
                cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 },
                valign: "top",
                overflow: "linebreak"
            },
            headStyles: {
                fillColor: [0, 77, 64], 
                textColor: [255, 255, 255],
                fontStyle: "bold"
            },
            // Portrait Matrix Budget: Sums up to exactly 182mm total printable width
            columnStyles: {
                0: { cellWidth: 42, fontStyle: "bold", textColor: [0, 77, 64], fillColor: [245, 247, 246] }, 
                1: { cellWidth: 140 } 
            },
            margin: { left: 14, right: 14 },
            theme: "grid",
            gridLineColor: [220, 230, 225],
            didParseCell: function(data) {
                if (data.row.cells[0].text[0] === "CRITICAL SAFETY ALERTS") {
                    if (data.column.index === 1) {
                        data.cell.styles.fillColor = [255, 240, 240];
                        data.cell.styles.textColor = [180, 0, 0];
                        data.cell.styles.fontStyle = "bold";
                    }
                }
            }
        });

        let y = doc.lastAutoTable.finalY + 12;

        // --- EVIDENCE SUMMARY FOOTNOTE ---
        const evidence = drug?.metadata?.evidence_source || "";
        const updated = drug?.metadata?.last_updated || "";
        if (evidence || updated) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);

            let footerMeta = "";
            if (evidence) footerMeta += `Source Reference: ${evidence}`;
            if (updated) footerMeta += `${evidence ? "  |  " : ""}System Sync Date: ${updated}`;

            const sourceLines = doc.splitTextToSize(cleanTextForPDF(footerMeta), 182);
            const blockHeight = sourceLines.length * 4;

            if (y + blockHeight > 265) {
                doc.addPage();
                y = 20;
            }

            doc.text(sourceLines, 14, y);
        }

        // --- TWO-PASS DYNAMIC PAGE NUMBER FOOTERS ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.2);
            doc.line(14, 282, 196, 282);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            
            doc.text(
                `HEMA NURSE AID — Clinical Drug Reference Card  |  Page ${i} of ${pageCount}`,
                105,
                287,
                { align: "center" }
            );
        }

        const cleanFilename = `Ref_${drugName
            .replace(/[^a-zA-Z0-9]/g, "_")
            .replace(/_+/g, "_")}.pdf`;

        doc.save(cleanFilename);

        if (triggeringButton) {
            triggeringButton.innerHTML = originalHtml;
            triggeringButton.disabled = false;
        }

    } catch (error) {
        console.error("Medication PDF Compilation Failed:", error);
        alert(`Failed to generate PDF.\nError Context: ${error.message}`);
        
        if (triggeringButton) {
            triggeringButton.textContent = "💾";
            triggeringButton.disabled = false;
        }
    }
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
