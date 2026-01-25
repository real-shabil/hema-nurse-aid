/* =========================================================
   💊 CHEMOTHERAPY PROTOCOLS MODULE
   ========================================================= */

// Ensure global scope availability for onclick events
window.openLeukemiaType = openLeukemiaType;

let CHEMO_PROTOCOLS = null;

/* =========================================================
   1️⃣ DATA LOADING
   ========================================================= */
function loadChemoProtocols() {
    if (CHEMO_PROTOCOLS) return Promise.resolve(CHEMO_PROTOCOLS);

    return fetch("data/protocols/chemoProtocols.json")
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            CHEMO_PROTOCOLS = data;

            return data;
        })
        .catch(err => {
            console.error("❌ Error loading chemoProtocols.json:", err);
            return null;
        });
}

// Start loading immediately
loadChemoProtocols();


/* =========================================================
   2️⃣ OPEN SPECIFIC LEUKEMIA TYPE
   ========================================================= */
function openLeukemiaType(type, options = {}) {


    // Ensure we switch to the right section logic safely
    if (typeof navigateToSection === "function") {
        navigateToSection("type");
    } else {
        // Fallback if main.js isn't ready
        document.querySelectorAll(".container, .section").forEach(s => s.style.display = "none");
        const typeSec = document.getElementById("type");
        if (typeSec) typeSec.style.display = "block";
    }

    const titleEl = document.getElementById("typeTitle");
    const list = document.getElementById("protocolList");

    if (titleEl) titleEl.innerText = `${type} Protocols`;

    if (!list) {
        console.error("❌ Protocol list container not found.");
        return;
    }

    // Show loading state
    list.innerHTML = `
        <div class="phase-card loading-message">
            <p>⏳ Loading ${type} protocols...</p>
        </div>`;

    loadChemoProtocols().then(data => {
        if (!data) {
            list.innerHTML = `<div class="phase-card error-message">⚠️ Failed to load protocol data.</div>`;
            return;
        }

        try {
            renderLeukemiaProtocols(data, type, list, options);
        } catch (error) {
            console.error("❌ Render Error:", error);
            list.innerHTML = `<div class="phase-card error-details">
                <p>Error displaying protocols: ${error.message}</p>
            </div>`;
        }
    });
}


/* =========================================================
   3️⃣ RENDER LOGIC
   ========================================================= */
function renderLeukemiaProtocols(allData, type, list, options) {
    const selected = allData[type];
    list.innerHTML = ""; // Clear loading message

    if (!selected) {
        list.innerHTML = `<div class="phase-card"><p class="no-protocol empty-message">No protocols currently available for ${type}.</p></div>`;
        return;
    }

    // Detection Strategy:
    // If the object has keys like "Induction Therapy", "Consolidation", etc., it's a FLAT structure.
    // However, since those keys are dynamic, we check if the VALUES are phase objects (have 'protocols' or 'goal').
    // If the values are themselves containers of phases, it's a NESTED structure.

    const keys = Object.keys(selected);
    if (keys.length === 0) return;

    // Check depth of first key to guess structure
    const firstVal = selected[keys[0]];
    const isFlat = (firstVal && (Array.isArray(firstVal.protocols) || firstVal.goal));

    if (isFlat) {
        // --- EXISTING FLAT RENDER ---
        renderProtocolPhaseGroup(selected, list, type, options);
    } else {
        // --- NEW NESTED SUBTYPE RENDER ---
        keys.forEach(subtypeName => {
            const subtypeData = selected[subtypeName];
            if (!subtypeData) return;

            // Header for Subtype
            const subtypeHeader = document.createElement("h3");
            subtypeHeader.className = "subtype-heading";
            subtypeHeader.style.cssText = "color: var(--color-text-main); margin: 20px 0 10px; padding-left: 4px; border-left: 4px solid var(--color-accent);";
            subtypeHeader.textContent = subtypeName;
            list.appendChild(subtypeHeader);

            // Wrapper for this subtype's phases
            const subtypeContainer = document.createElement("div");
            subtypeContainer.className = "subtype-container";
            list.appendChild(subtypeContainer);

            // Render phases for this subtype
            // We pass a composite type ID for uniqueness in DOM IDs if needed, though mostly visual
            renderProtocolPhaseGroup(subtypeData, subtypeContainer, type, options, subtypeName);
        });
    }

    // Auto-scroll to highlight
    const highlightCard = list.querySelector(".protocol-highlight");
    if (highlightCard) {
        setTimeout(() => {
            highlightCard.scrollIntoView({ behavior: "smooth", block: "center" });
            highlightCard.classList.add("protocol-pulse");
            setTimeout(() => highlightCard.classList.remove("protocol-pulse"), 1600);
        }, 400);
    }
}

// Helper: Render a group of phases (used by both flat and nested views)
function renderProtocolPhaseGroup(phasesData, container, type, options, subtypeName = "") {
    const targetPhase = (options.phaseName || "").toLowerCase();
    const targetProtocol = (options.protocolName || "").toLowerCase();

    Object.keys(phasesData).forEach((phase, phaseIndex) => {
        // Create unique ID mixed with subtype if present
        const rawId = subtypeName ? `${type}-${subtypeName}-${phase}-${phaseIndex}` : `${type}-${phase}-${phaseIndex}`;
        const safePhaseId = `phase-${rawId}`.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();

        // 1. Wrapper
        const phaseDiv = document.createElement("div");
        phaseDiv.className = "phase-card";

        // 2. Button
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "phase-toggle";
        toggleBtn.innerHTML = `<h3>${phase}</h3><span class="collapsible-icon">+</span>`;
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.onclick = () => togglePhaseVisibility(phaseDiv, toggleBtn);
        phaseDiv.appendChild(toggleBtn);

        // 3. Content
        const phaseContent = document.createElement("div");
        phaseContent.className = "phase-content";
        phaseContent.id = safePhaseId;
        phaseContent.setAttribute("hidden", "");
        phaseContent.style.maxHeight = "0px";
        phaseDiv.appendChild(phaseContent);

        // 4. Data
        const phaseData = phasesData[phase];
        let protocols = [];

        // Robust extraction
        if (Array.isArray(phaseData)) protocols = phaseData;
        else if (phaseData && Array.isArray(phaseData.protocols)) protocols = phaseData.protocols;

        // Goal
        if (phaseData.goal) {
            phaseContent.innerHTML += `<p class="phase-description"><strong>Goal:</strong> ${phaseData.goal}</p>`;
        }

        // 5. Protocols
        if (protocols.length === 0) {
            phaseContent.innerHTML += `<p class="empty-message">No regimens listed.</p>`;
        } else {
            protocols.forEach(protocol => {
                if (!protocol) return;

                const card = document.createElement("div");
                card.className = "protocol-card info-card";

                const name = protocol.protocolName || "Unnamed Regimen";

                // Highlight Logic
                const isTarget = targetProtocol &&
                    (name.toLowerCase() === targetProtocol || name.toLowerCase().includes(targetProtocol));

                if (isTarget) {
                    card.classList.add("protocol-highlight");
                }

                const detailsHtml = buildProtocolDetailsHtml(protocol);

                card.innerHTML = `
                    <div class="protocol-header-top" style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h4 style="margin:0; padding-right:8px;">${name}</h4>
                        <button class="pdf-protocol-btn" title="Download/Print PDF" style="background:none; border:none; cursor:pointer; font-size:1.2rem; padding:4px; margin-top:-4px;">
                            🖨️
                        </button>
                    </div>
                    <p class="protocol-summary" style="margin-top:4px;">
                        ${protocol.cycleDuration ? `Duration: ${protocol.cycleDuration}` : ""}
                    </p>
                    <div class="protocol-details info-panel" style="display:none; margin-top:10px;">
                        ${detailsHtml}
                    </div>
                `;

                // PDF/Print Button Listener
                const pdfBtn = card.querySelector(".pdf-protocol-btn");
                if (pdfBtn) {
                    pdfBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        // Pass subtype into print if needed, or just combine
                        const headerSubtitle = subtypeName ? `${type} (${subtypeName})` : type;
                        printProtocolAsPDF(protocol, headerSubtitle, phase);
                    });
                }

                // Click to expand details
                card.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const details = card.querySelector(".protocol-details");
                    const isVisible = details.style.display === "block";
                    // Close others in this phase
                    card.parentElement.querySelectorAll(".protocol-details").forEach(d => d.style.display = "none");
                    details.style.display = isVisible ? "none" : "block";

                    // Recalculate parent height to prevent clipping
                    const pContent = card.closest(".phase-content");
                    if (pContent && pContent.style.maxHeight !== "0px") {
                        pContent.style.maxHeight = "none";
                    }
                });

                phaseContent.appendChild(card);
            });
        }

        container.appendChild(phaseDiv);

        // Check if we should auto-expand this phase
        const phaseHasTarget = (targetPhase && phase.toLowerCase() === targetPhase) ||
            !!phaseContent.querySelector(".protocol-highlight");

        if (phaseHasTarget) {
            // Expand immediately
            setTimeout(() => togglePhaseVisibility(phaseDiv, toggleBtn, true), 100);
        }
    });
}

// Helper: Build HTML string for details
function buildProtocolDetailsHtml(protocol) {
    let html = "";

    // Drugs
    if (protocol.drugs && protocol.drugs.length) {
        const phasesOrder = ["Pre-Chemo", "Chemo", "Post-Chemo"];
        const grouped = { "Pre-Chemo": [], "Chemo": [], "Post-Chemo": [], "Other": [] };

        protocol.drugs.forEach(d => {
            const p = (d.phase || "Other").trim();
            if (grouped[p]) grouped[p].push(d);
            else grouped["Other"].push(d);
        });

        const drugRow = d => `
            <div class="drug-item">
                <div>
                    <span class="drug-day">${d.day || ""}</span>
                    <span class="drug-name"><strong>${d.name || "Unknown"}</strong></span> —
                    <span class="drug-dose"><em>${d.dose || ""}</em></span>
                    <span class="drug-route"><strong><em>${d.route || ""}</em></strong></span>
                    ${d.duration ? `<span class="drug-duration"> (${d.duration})</span>` : ""}
                </div>
                ${d.note ? `<div class="drug-note">➤ ${d.note}</div>` : ""}
            </div>`;

        phasesOrder.forEach(p => {
            if (grouped[p].length) {
                html += `<h5 class="phase-heading">${p}</h5>` + grouped[p].map(drugRow).join("");
            }
        });
        if (grouped["Other"].length) {
            if (html) html += `<h5 class="phase-heading">Other / Unspecified</h5>`;
            html += grouped["Other"].map(drugRow).join("");
        }
    }

    // Nurses Info
    if (protocol.NursesInfo && protocol.NursesInfo.length) {
        html += `<div class="nursing-tips info-panel">
            <strong>Nurse's Info:</strong>
            <ul>${protocol.NursesInfo.map(t => `<li>${t}</li>`).join("")}</ul>
        </div>`;
    }

    if (protocol.source) {
        html += `<div class="protocol-source info-panel"><strong>Source:</strong> ${protocol.source}</div>`;
    }

    return html;
}

// Logic to toggle Phase Card
function togglePhaseVisibility(card, btn, forceOpen = false) {
    const content = card.querySelector(".phase-content");
    const isExpanded = btn.getAttribute("aria-expanded") === "true";

    if (isExpanded && !forceOpen) {
        // Collapse
        btn.setAttribute("aria-expanded", "false");
        card.classList.remove("is-expanded");
        content.style.maxHeight = "0px";
        content.setAttribute("hidden", "");
    } else {
        // Expand
        document.querySelectorAll(".phase-card.is-expanded").forEach(other => {
            if (other !== card) {
                const otherBtn = other.querySelector(".phase-toggle");
                otherBtn.setAttribute("aria-expanded", "false");
                other.classList.remove("is-expanded");
                other.querySelector(".phase-content").style.maxHeight = "0px";
                other.querySelector(".phase-content").setAttribute("hidden", "");
            }
        });

        btn.setAttribute("aria-expanded", "true");
        card.classList.add("is-expanded");
        content.removeAttribute("hidden");
        content.style.maxHeight = content.scrollHeight + "px";
    }
}


/* =========================================================
   4️⃣ SEARCH FUNCTIONALITY
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    initProtocolSearch();
});

function initProtocolSearch() {
    const input = document.getElementById("protocolSearchInput");
    const searchBtn = document.getElementById("protocolSearchBtn");
    const clearBtn = document.getElementById("protocolSearchClear");

    if (!input) return;

    const triggerSearch = () => performProtocolSearch(input.value);

    // Bind Events
    if (searchBtn) searchBtn.addEventListener("click", triggerSearch);

    input.addEventListener("keydown", ev => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            triggerSearch();
        }
    });

    input.addEventListener("input", () => {
        if (input.value.trim().length === 0) {
            renderProtocolSearchResults([], { statusText: "Type at least 2 letters to search." });
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            input.value = "";
            input.focus();
            renderProtocolSearchResults([], { statusText: "Cleared." });
        });
    }

    // Initial state
    renderProtocolSearchResults([], { statusText: "Type to search protocols..." });
}

function performProtocolSearch(rawQuery) {
    const query = (rawQuery || "").trim();

    if (query.length < 2) {
        renderProtocolSearchResults([], { statusText: "Type at least 2 letters to search." });
        return;
    }

    loadChemoProtocols().then(data => {
        if (!data) {
            renderProtocolSearchResults([], { query, statusText: "Data unavailable." });
            return;
        }

        const matches = collectProtocolMatches(query, data);
        const statusText = matches.length
            ? `Found ${matches.length} match${matches.length === 1 ? "" : "es"} for "${query}".`
            : `No protocols found for "${query}".`;

        renderProtocolSearchResults(matches, { query, statusText });
    });
}

function collectProtocolMatches(query, data) {
    const normalizedQuery = query.toLowerCase();
    const matches = [];

    // Helper to search within a set of phases
    const searchPhases = (type, phases, subtypeName = "") => {
        if (!phases || typeof phases !== "object") return;

        Object.entries(phases).forEach(([phaseName, phaseData]) => {
            let protocols = [];
            if (Array.isArray(phaseData)) protocols = phaseData;
            else if (phaseData && Array.isArray(phaseData.protocols)) protocols = phaseData.protocols;

            protocols.forEach(protocol => {
                if (!protocol) return;
                const protocolName = (protocol.protocolName || "").toLowerCase();
                const drugNames = (protocol.drugs || []).map(d => (d.name || "").toLowerCase());
                const sources = (protocol.source || "").toLowerCase();

                const haystack = [
                    type.toLowerCase(),
                    subtypeName.toLowerCase(),
                    phaseName.toLowerCase(),
                    protocolName,
                    ...drugNames,
                    sources
                ].join(" ");

                if (haystack.includes(normalizedQuery)) {
                    matches.push({ type, phase: phaseName, protocol });
                }
            });
        });
    };

    // Search Logic
    Object.entries(data).forEach(([type, content]) => {
        if (!content) return;

        // Detect Flat vs Nested
        const keys = Object.keys(content);
        if (keys.length === 0) return;
        const firstVal = content[keys[0]];
        const isFlat = (firstVal && (Array.isArray(firstVal.protocols) || firstVal.goal));

        if (isFlat) {
            searchPhases(type, content);
        } else {
            // It's nested by subtype
            Object.entries(content).forEach(([subtypeName, phases]) => {
                searchPhases(type, phases, subtypeName);
            });
        }
    });

    return matches;
}

function renderProtocolSearchResults(results, options = {}) {
    const container = document.getElementById("protocolSearchResults");
    const statusEl = document.getElementById("protocolSearchStatus");
    const query = (options.query || "").trim();
    const statusMessage = options.statusText || "";

    if (statusEl) statusEl.textContent = statusMessage;
    if (!container) return; // Should not happen

    container.innerHTML = "";

    // If query is empty -> hide container
    if (!query && !results.length) {
        container.setAttribute("hidden", "");
        return;
    }

    container.removeAttribute("hidden");

    if (!results.length) {
        container.innerHTML = `<p class="search-empty">${statusMessage}</p>`;
        return;
    }

    // Render cards
    results.slice(0, 20).forEach(match => {
        const card = document.createElement("div");
        card.className = "protocol-card info-card protocol-search-result";

        const drugPreview = (match.protocol.drugs || [])
            .map(d => d.name)
            .slice(0, 3)
            .join(", ");

        card.innerHTML = `
            <div class="result-top">
                <span class="result-pill">${match.type}</span>
                <span class="result-pill">${match.phase}</span>
            </div>
            <h4>${match.protocol.protocolName || "Unnamed Regimen"}</h4>
            ${drugPreview ? `<p class="result-drugs">Drugs: ${drugPreview}</p>` : ""}
        <p class="result-meta">Tap to view details ›</p>
        `;

        card.addEventListener("click", () => {
            openLeukemiaType(match.type, {
                phaseName: match.phase,
                protocolName: match.protocol.protocolName
            });

            // Clear search after selection for cleaner UX
            // container.setAttribute("hidden", "");
        });

        container.appendChild(card);
    });
}

/* =========================================================
   5️⃣ PRINT / EXPORT PDF FUNCTIONALITY
   ========================================================= */
function printProtocolAsPDF(protocol, type, phase) {
    const drugs = protocol.drugs || [];

    // Sort drugs by phase if needed, though usually they come sorted or we can just list them.
    // Let's preserve the order but maybe group visually in the table? 
    // Actually, a flat table with a "Phase" column is very clean for CSV/PDF exports.

    let rowsHtml = "";
    if (drugs.length === 0) {
        rowsHtml = "<tr><td colspan='6' style='text-align:center;'>No specific medications listed.</td></tr>";
    } else {
        rowsHtml = drugs.map(d => `
            <tr>
                <td><strong>${d.phase || "-"}</strong></td>
                <td style="white-space:nowrap;">${d.day || ""}</td>
                <td><strong>${d.name || "Unknown"}</strong></td>
                <td>${d.dose || ""}</td>
                <td>${d.route || ""}</td>
                <td>${d.note || ""} ${d.duration ? `<br><em>(${d.duration})</em>` : ""}</td>
            </tr>
        `).join("");
    }

    const nursesInfoHtml = (protocol.NursesInfo && protocol.NursesInfo.length)
        ? `<div class="info-section">
             <h3>Nursing Considerations:</h3>
             <ul>${protocol.NursesInfo.map(info => `<li>${info}</li>`).join("")}</ul>
           </div>`
        : "";

    const sourceHtml = protocol.source
        ? `<div class="meta-source"><strong>Source:</strong> ${protocol.source}</div>`
        : "";

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print/download the PDF.");
        return;
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Protocol: ${protocol.protocolName}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
                h1 { color: #004d40; border-bottom: 2px solid #004d40; padding-bottom: 10px; margin-bottom: 5px; }
                .subtitle { color: #666; font-size: 1.1rem; margin-bottom: 30px; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 0.95rem; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
                th { background-color: #f0f7f4; color: #004d40; font-weight: bold; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                
                .info-section { background: #f1f9ff; border: 1px solid #cce5ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; page-break-inside: avoid; }
                .info-section h3 { margin-top: 0; color: #004b8d; font-size: 1.1rem; }
                .info-section ul { margin-bottom: 0; padding-left: 20px; }
                .info-section li { margin-bottom: 5px; }

                .meta-source { font-size: 0.85rem; color: #777; font-style: italic; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; }
                
                .footer { margin-top: 50px; text-align: center; font-size: 0.8rem; color: #aaa; }
                
                @media print {
                    .no-print { display: none; }
                    body { padding: 0; }
                    .info-section { border: 1px solid #ddd; }
                }
            </style>
        </head>
        <body>
            <h1>${protocol.protocolName}</h1>
            <div class="subtitle">
                <strong>Disease:</strong> ${type} &nbsp;|&nbsp; 
                <strong>Phase:</strong> ${phase} &nbsp;|&nbsp; 
                ${protocol.cycleDuration ? `<strong>Duration:</strong> ${protocol.cycleDuration}` : ""}
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="12%">Phase</th>
                        <th width="8%">Day</th>
                        <th width="20%">Drug</th>
                        <th width="15%">Dose</th>
                        <th width="10%">Route</th>
                        <th width="35%">Instructions / Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            ${nursesInfoHtml}

            ${sourceHtml}

            <div class="footer">
                Generated by HEMA NURSE AID on ${new Date().toLocaleDateString()}
            </div>
            
            <script>
                setTimeout(() => {
                    window.print();
                    // Optional: window.close(); // Don't close automatically so they can check it.
                }, 500);
            <\/script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}
