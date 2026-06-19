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
    actionBtnRow.style.justifyContent = "flex-end"; // Pushes the button to the far right
    actionBtnRow.style.margin = "-5px 0 10px 0";    // Tucks it nicely at the top of the panel
    
    const pdfBtn = document.createElement("button");
    pdfBtn.className = "pdf-protocol-btn"; // Reusing the protocol class for consistency
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
function exportMedicationsAsPDF(protocol, type, phase, triggeringButton) {
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
            triggeringButton.textContent = "⏳ Rendering...";
            triggeringButton.disabled = true;
        }

        const protocolName = protocol?.protocolName || "Unnamed Protocol";
        const drugs = Array.isArray(protocol?.drugs) ? protocol.drugs : [];

        /* =========================================================
           INTERNAL CLEANING PARSER
           ========================================================= */
        function cleanTextForPDF(str) {
            if (str === null || str === undefined) return "";
            return String(str)
                .replace(/[\u00A0\u200B]/g, " ") // Clear out invisible web spaces
                .replace(/<br\s*\/?>/gi, "\n")   
                .replace(/<\/?b>/gi, "")         
                .replace(/<\/?strong>/gi, "")    
                .replace(/&amp;/g, "&")          
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
        }

        // --- HEADER SECTION ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16); 
        doc.setTextColor(0, 77, 64); 
        doc.text(cleanTextForPDF(protocolName), 14, 18);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(100, 100, 100);

        let meta = `Disease: ${type || "-"}  |  Phase: ${phase || "-"}`;
        if (protocol?.cycleDuration) {
            meta += `  |  Duration: ${protocol.cycleDuration}`;
        }
        doc.text(cleanTextForPDF(meta), 14, 25);

        // Brand Divider Line (Ends at 196mm for Portrait)
        doc.setDrawColor(0, 77, 64);
        doc.setLineWidth(0.5);
        doc.line(14, 28, 196, 28); 

        // --- TABLE DATA PREPARATION ---
        const tableRows = drugs.length
            ? drugs.map(d => [
                cleanTextForPDF(d.phase || "-"),
                cleanTextForPDF(d.day || "-"),
                cleanTextForPDF(d.name || "Unknown"),
                cleanTextForPDF(d.dose || "-"),
                cleanTextForPDF(d.route || "-"),
                cleanTextForPDF(`${d.note || ""}${d.duration ? `\n(${d.duration})` : ""}`)
            ])
            : [["-", "-", "No specific medications listed", "-", "-", "-"]];

        // --- AUTOTABLE GENERATION ---
        doc.autoTable({
            startY: 34,
            head: [["Phase", "Day", "Drug", "Dose", "Route", "Instructions"]],
            body: tableRows,
            styles: {
                fontSize: 8.5,
                cellPadding: { top: 1.5, bottom: 1.5, left: 2.5, right: 2.5 },
                valign: "middle",
                overflow: "linebreak"
            },
            headStyles: {
                fillColor: [240, 247, 244],
                textColor: [0, 77, 64],
                fontStyle: "bold"
            },
            // Portrait Budget: Sums up to exactly 182mm total printable width
            columnStyles: {
                0: { cellWidth: 22 },  
                1: { cellWidth: 15 },  
                2: { cellWidth: 35 },  
                3: { cellWidth: 25 },  
                4: { cellWidth: 18 },  
                5: { cellWidth: 67 }   
            },
            margin: { left: 14, right: 14 },
            theme: "striped"
        });

        let y = doc.lastAutoTable.finalY + 12;

        // --- NURSING CONSIDERATIONS (FIXED & IMMUNE TO TEXT CRASHES) ---
        if (protocol?.NursesInfo) {
            // Safely convert plain text strings to an array format instantly
            const notesArray = Array.isArray(protocol.NursesInfo) 
                ? protocol.NursesInfo 
                : [protocol.NursesInfo];

            // Only run rendering architecture if the array is populated with valid content
            if (notesArray.length > 0 && String(notesArray[0]).trim() !== "") {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(0, 77, 64);
                doc.text("Nursing Considerations", 14, y);
                y += 6;

                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(50, 50, 50);

                notesArray.forEach(info => {
                    if (!info) return;
                    const cleanInfo = cleanTextForPDF(info);
                    const lines = doc.splitTextToSize(`• ${cleanInfo}`, 182); 
                    const blockHeight = (lines.length * 4.5) + 2;

                    // Portrait Height Safety Check (Page limit is 297mm)
                    if (y + blockHeight > 265) {
                        doc.addPage();
                        y = 20; 
                    }

                    doc.text(lines, 14, y);
                    y += blockHeight;
                });
            }
        }

        // --- SOURCE DOCUMENTATION ---
        if (protocol?.source) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);

            const cleanSource = cleanTextForPDF(protocol.source);
            const sourceLines = doc.splitTextToSize(`Source: ${cleanSource}`, 182);
            const sourceHeight = sourceLines.length * 4;

            if (y + sourceHeight > 265) {
                doc.addPage();
                y = 20;
            } else {
                y += 4;
            }

            doc.text(sourceLines, 14, y);
        }

        // --- TWO-PASS DYNAMIC PAGE NUMBER FOOTERS ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Footer rule at 282mm depth line
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.2);
            doc.line(14, 282, 196, 282);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            
            // Center text on the midpoint of the Portrait width (210 / 2 = 105mm)
            doc.text(
                `Generated by HEMA NURSE AID  |  Page ${i} of ${pageCount}`,
                105,
                287,
                { align: "center" }
            );
        }

        const cleanFilename = `${protocolName
            .replace(/[^a-zA-Z0-9]/g, "_")
            .replace(/_+/g, "_")}.pdf`;

        doc.save(cleanFilename);

        if (triggeringButton) {
            triggeringButton.innerHTML = originalHtml;
            triggeringButton.disabled = false;
        }

    } catch (pdfError) {
        console.error("PDF engine halted:", pdfError);
        alert("Failed to build PDF. Technical Details: " + pdfError.message);
        
        // Reset button so UI doesn't freeze up
        if (triggeringButton) {
            triggeringButton.innerHTML = "💾 Generation Error";
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
