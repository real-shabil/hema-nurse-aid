/* =========================================================
   💊 CHEMOTHERAPY PROTOCOLS MODULE
   ========================================================= */

window.openLeukemiaType = openLeukemiaType;

let CHEMO_PROTOCOLS = null;
let CURRENT_DISEASE_TYPE = null;

/* =========================================================
   SAFE MESSAGE
   ========================================================= */
function createMessageElement(className, message) {
    const wrapper = document.createElement("div");
    wrapper.className = `phase-card ${className}`;
    const p = document.createElement("p");
    p.textContent = message;
    wrapper.appendChild(p);
    return wrapper;
}

function safeHtmlStr(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// UPGRADED: Safely restores specific presentational formatting from JSON
function safeHtmlTextWithBreaks(str) {
    if (str === null || str === undefined) return '';
    
    // 1. First escape everything to neutralize any XSS script elements completely
    let escaped = safeHtmlStr(str);
    
    // 2. Selectively turn ONLY harmless presentation tags back into real HTML
    return escaped
        .replace(/&lt;br\s*\/?&gt;/gi, '<br>')   // Restores <br> or <br/>
        .replace(/&lt;b&gt;/gi, '<b>')           // Restores <b>
        .replace(/&lt;\/b&gt;/gi, '</b>')         // Restores </b>
        .replace(/&lt;strong&gt;/gi, '<strong>') // Restores <strong>
        .replace(/&lt;\/strong&gt;/gi, '</strong>') 
        .replace(/&lt;i&gt;/gi, '<i>')           // Restores <i>
        .replace(/&lt;\/i&gt;/gi, '</i>')         // Restores </i>
        .replace(/&lt;em&gt;/gi, '<em>')         // Restores <em>
        .replace(/&lt;\/em&gt;/gi, '</em>')
        .replace(/\n/g, '<br>');                 // Converts raw JSON newlines to breaks too
}

/* =========================================================
   LOAD DATA
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

loadChemoProtocols();

/* =========================================================
   OPEN LEUKEMIA TYPE
   ========================================================= */
function openLeukemiaType(type, options = {}) {
    if (typeof navigateToSection === "function") {
        navigateToSection("type");
    } else {
        document.querySelectorAll(".container, .section").forEach(s => {
            s.style.display = "none";
        });

        const typeSec = document.getElementById("type");
        if (typeSec) typeSec.style.display = "block";
    }

    const titleEl = document.getElementById("typeTitle");
    const list = document.getElementById("protocolList");

    CURRENT_DISEASE_TYPE = type;

    if (typeof switchDiseaseTab === "function") {
        switchDiseaseTab("protocols");
    }

    if (titleEl) titleEl.innerText = `${type} Protocols`;

    if (!list) {
        console.error("❌ Protocol list container not found.");
        return;
    }

    list.textContent = "";
    list.appendChild(createMessageElement("loading-message", `⏳ Loading ${type} protocols...`));

    loadChemoProtocols().then(data => {
        if (!data) {
            list.textContent = "";
            list.appendChild(createMessageElement("error-message", "⚠️ Failed to load protocol data."));
            return;
        }

        try {
            renderLeukemiaProtocols(data, type, list, options);
        } catch (error) {
            console.error("❌ Render Error:", error);
            list.textContent = "";
            list.appendChild(
                createMessageElement("error-details", `Error displaying protocols: ${error.message}`)
            );
        }
    });
}

/* =========================================================
   RENDER LOGIC
   ========================================================= */
function renderLeukemiaProtocols(allData, type, list, options) {
    const selected = allData[type];
    list.textContent = "";

    if (!selected) {
        list.appendChild(createMessageElement("", `No protocols currently available for ${type}.`));
        return;
    }

    const keys = Object.keys(selected);
    if (keys.length === 0) return;

    const firstVal = selected[keys[0]];
    const isFlat = firstVal && (Array.isArray(firstVal.protocols) || firstVal.goal);

    if (isFlat) {
        renderProtocolPhaseGroup(selected, list, type, options);
    } else {
        keys.forEach(subtypeName => {
            const subtypeData = selected[subtypeName];
            if (!subtypeData) return;

            const subtypeHeader = document.createElement("h3");
            subtypeHeader.className = "subtype-heading";
            subtypeHeader.style.cssText =
                "color: var(--color-text-main); margin: 20px 0 10px; padding-left: 4px; border-left: 4px solid var(--color-accent);";
            subtypeHeader.textContent = subtypeName;
            list.appendChild(subtypeHeader);

            const subtypeContainer = document.createElement("div");
            subtypeContainer.className = "subtype-container";
            list.appendChild(subtypeContainer);

            renderProtocolPhaseGroup(subtypeData, subtypeContainer, type, options, subtypeName);
        });
    }

    const highlightCard = list.querySelector(".protocol-highlight");
    if (highlightCard) {
        setTimeout(() => {
            highlightCard.scrollIntoView({ behavior: "smooth", block: "center" });
            highlightCard.classList.add("protocol-pulse");

            setTimeout(() => {
                highlightCard.classList.remove("protocol-pulse");
            }, 1600);
        }, 400);
    }
}

/* =========================================================
   RENDER PHASE GROUP
   ========================================================= */
function renderProtocolPhaseGroup(phasesData, container, type, options, subtypeName = "") {
    const targetPhase = (options.phaseName || "").toLowerCase();
    const targetProtocol = (options.protocolName || "").toLowerCase();

    Object.keys(phasesData).forEach((phase, phaseIndex) => {
        const rawId = subtypeName
            ? `${type}-${subtypeName}-${phase}-${phaseIndex}`
            : `${type}-${phase}-${phaseIndex}`;

        const safePhaseId = `phase-${rawId}`
            .replace(/[^a-zA-Z0-9-_]/g, "")
            .toLowerCase();

        const phaseDiv = document.createElement("div");
        phaseDiv.className = "phase-card";

        const toggleBtn = document.createElement("button");
        toggleBtn.className = "phase-toggle";
        toggleBtn.innerHTML = `
            <h3>${safeHtmlStr(phase)}</h3>
            <span class="collapsible-icon">+</span>
        `;
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.onclick = () => togglePhaseVisibility(phaseDiv, toggleBtn);
        phaseDiv.appendChild(toggleBtn);

        const phaseContent = document.createElement("div");
        phaseContent.className = "phase-content";
        phaseContent.id = safePhaseId;
        phaseContent.setAttribute("hidden", "");
        phaseContent.style.maxHeight = "0px";
        phaseDiv.appendChild(phaseContent);

        const phaseData = phasesData[phase];
        let protocols = [];

        if (Array.isArray(phaseData)) {
            protocols = phaseData;
        } else if (phaseData && Array.isArray(phaseData.protocols)) {
            protocols = phaseData.protocols;
        }

        if (phaseData && phaseData.goal) {
            const goalP = document.createElement("p");
            goalP.className = "phase-description";

            const strong = document.createElement("strong");
            strong.textContent = "Goal: ";

            goalP.appendChild(strong);
            goalP.appendChild(document.createTextNode(phaseData.goal));
            phaseContent.appendChild(goalP);
        }

        if (protocols.length === 0) {
            const emptyP = document.createElement("p");
            emptyP.className = "empty-message";
            emptyP.textContent = "No regimens listed.";
            phaseContent.appendChild(emptyP);
        } else {
            protocols.forEach(protocol => {
                if (!protocol) return;

                const card = document.createElement("div");
                card.className = "protocol-card info-card";

                const name = protocol.protocolName || "Unnamed Regimen";

                const isTarget =
                    targetProtocol &&
                    (name.toLowerCase() === targetProtocol ||
                        name.toLowerCase().includes(targetProtocol));

                if (isTarget) {
                    card.classList.add("protocol-highlight");
                }

                const safeName = safeHtmlStr(name);
                const safeDuration = protocol.cycleDuration
                    ? safeHtmlStr(protocol.cycleDuration)
                    : "";

                const detailsHtml = buildProtocolDetailsHtml(protocol);

                card.innerHTML = `
                    <div class="protocol-header-top" style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h4 style="margin:0; padding-right:8px;">${safeName}</h4>
                        <button class="pdf-protocol-btn" title="Download PDF" style="background:none; border:none; cursor:pointer; font-size:1.2rem; padding:4px; margin-top:-4px;">💾</button>
                    </div>

                    <p class="protocol-summary" style="margin-top:4px;">
                        ${safeDuration ? `Duration: ${safeDuration}` : ""}
                    </p>

                    <div class="protocol-details info-panel" style="display:none; margin-top:10px;">
                        ${detailsHtml}
                    </div>
                `;

                const pdfBtn = card.querySelector(".pdf-protocol-btn");

                if (pdfBtn) {
                    pdfBtn.addEventListener("click", e => {
                        e.stopPropagation();

                        const headerSubtitle = subtypeName
                            ? `${type} (${subtypeName})`
                            : type;

                        exportProtocolAsPDF(protocol, headerSubtitle, phase, e.currentTarget);
                    });
                }

                card.addEventListener("click", e => {
                    e.stopPropagation();

                    const details = card.querySelector(".protocol-details");
                    const isVisible = details.style.display === "block";

                    card.parentElement
                        .querySelectorAll(".protocol-details")
                        .forEach(d => {
                            d.style.display = "none";
                        });

                    details.style.display = isVisible ? "none" : "block";

                    const pContent = card.closest(".phase-content");
                    if (pContent && pContent.style.maxHeight !== "0px") {
                        pContent.style.maxHeight = "none";
                    }
                });

                phaseContent.appendChild(card);
            });
        }

        container.appendChild(phaseDiv);

        const phaseHasTarget =
            (targetPhase && phase.toLowerCase() === targetPhase) ||
            !!phaseContent.querySelector(".protocol-highlight");

        if (phaseHasTarget) {
            setTimeout(() => {
                togglePhaseVisibility(phaseDiv, toggleBtn, true);
            }, 100);
        }
    });
}

/* =========================================================
   DETAILS HTML
   ========================================================= */
function buildProtocolDetailsHtml(protocol) {
    let html = "";

    if (protocol.drugs && protocol.drugs.length) {
        const phasesOrder = ["Pre-Chemo", "Chemo", "Post-Chemo"];
        const grouped = {
            "Pre-Chemo": [],
            Chemo: [],
            "Post-Chemo": [],
            Other: []
        };

        protocol.drugs.forEach(d => {
            const p = (d.phase || "Other").trim();
            if (grouped[p]) grouped[p].push(d);
            else grouped.Other.push(d);
        });

        const drugRow = d => `
            <div class="drug-item">
                <div>
                    <span class="drug-day">${safeHtmlStr(d.day || "")}</span>
                    <span class="drug-name"><strong>${safeHtmlStr(d.name || "Unknown")}</strong></span> —
                    <span class="drug-dose"><em>${safeHtmlStr(d.dose || "")}</em></span>
                    <span class="drug-route"><strong><em>${safeHtmlStr(d.route || "")}</em></strong></span>
                    ${d.duration ? `<span class="drug-duration"> (${safeHtmlStr(d.duration)})</span>` : ""}
                </div>

                ${d.note ? `<div class="drug-note">➤ ${safeHtmlTextWithBreaks(d.note)}</div>` : ""}
            </div>
        `;

        phasesOrder.forEach(p => {
            if (grouped[p].length) {
                html += `
                    <h5 class="phase-heading">${safeHtmlStr(p)}</h5>
                    ${grouped[p].map(drugRow).join("")}
                `;
            }
        });

        if (grouped.Other.length) {
            if (html) html += `<h5 class="phase-heading">Other / Unspecified</h5>`;
            html += grouped.Other.map(drugRow).join("");
        }
    }

    if (protocol.NursesInfo && protocol.NursesInfo.length) {
        html += `
            <div class="nursing-tips info-panel">
                <strong>Nurse's Info:</strong>
                <ul>
                    ${protocol.NursesInfo.map(t => `<li>${safeHtmlTextWithBreaks(t)}</li>`).join("")}
                </ul>
            </div>
        `;
    }

    if (protocol.source) {
        html += `
            <div class="protocol-source info-panel">
                <strong>Source:</strong> ${safeHtmlStr(protocol.source)}
            </div>
        `;
    }

    return html;
}

/* =========================================================
   TOGGLE PHASE
   ========================================================= */
function togglePhaseVisibility(card, btn, forceOpen = false) {
    const content = card.querySelector(".phase-content");
    const isExpanded = btn.getAttribute("aria-expanded") === "true";

    if (isExpanded && !forceOpen) {
        btn.setAttribute("aria-expanded", "false");
        card.classList.remove("is-expanded");
        content.style.maxHeight = "0px";
        content.setAttribute("hidden", "");
    } else {
        document.querySelectorAll(".phase-card.is-expanded").forEach(other => {
            if (other !== card) {
                const otherBtn = other.querySelector(".phase-toggle");
                const otherContent = other.querySelector(".phase-content");

                if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
                other.classList.remove("is-expanded");

                if (otherContent) {
                    otherContent.style.maxHeight = "0px";
                    otherContent.setAttribute("hidden", "");
                }
            }
        });

        btn.setAttribute("aria-expanded", "true");
        card.classList.add("is-expanded");
        content.removeAttribute("hidden");
        content.style.maxHeight = content.scrollHeight + "px";
    }
}

/* =========================================================
   SEARCH
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

    if (searchBtn) {
        searchBtn.addEventListener("click", triggerSearch);
    }

    input.addEventListener("keydown", ev => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            triggerSearch();
        }
    });

    input.addEventListener("input", () => {
        if (input.value.trim().length === 0) {
            renderProtocolSearchResults([], {
                statusText: "Type at least 2 letters to search."
            });
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            input.value = "";
            input.focus();

            renderProtocolSearchResults([], {
                statusText: "Cleared."
            });
        });
    }

    renderProtocolSearchResults([], {
        statusText: "Type to search protocols..."
    });
}

function performProtocolSearch(rawQuery) {
    const query = (rawQuery || "").trim();

    if (query.length < 2) {
        renderProtocolSearchResults([], {
            statusText: "Type at least 2 letters to search."
        });
        return;
    }

    loadChemoProtocols().then(data => {
        if (!data) {
            renderProtocolSearchResults([], {
                query,
                statusText: "Data unavailable."
            });
            return;
        }

        const matches = collectProtocolMatches(query, data);

        const statusText = matches.length
            ? `Found ${matches.length} match${matches.length === 1 ? "" : "es"} for "${query}".`
            : `No protocols found for "${query}".`;

        renderProtocolSearchResults(matches, {
            query,
            statusText
        });
    });
}

function collectProtocolMatches(query, data) {
    const normalizedQuery = query.toLowerCase();
    const matches = [];

    const searchPhases = (type, phases, subtypeName = "") => {
        if (!phases || typeof phases !== "object") return;

        Object.entries(phases).forEach(([phaseName, phaseData]) => {
            let protocols = [];

            if (Array.isArray(phaseData)) {
                protocols = phaseData;
            } else if (phaseData && Array.isArray(phaseData.protocols)) {
                protocols = phaseData.protocols;
            }

            protocols.forEach(protocol => {
                if (!protocol) return;

                const protocolName = (protocol.protocolName || "").toLowerCase();
                const drugNames = (protocol.drugs || []).map(d =>
                    (d.name || "").toLowerCase()
                );
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
                    matches.push({
                        type,
                        subtype: subtypeName,
                        phase: phaseName,
                        protocol
                    });
                }
            });
        });
    };

    Object.entries(data).forEach(([type, content]) => {
        if (!content) return;

        const keys = Object.keys(content);
        if (keys.length === 0) return;

        const firstVal = content[keys[0]];
        const isFlat = firstVal && (Array.isArray(firstVal.protocols) || firstVal.goal);

        if (isFlat) {
            searchPhases(type, content);
        } else {
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
    if (!container) return;

    container.textContent = "";

    if (!query && !results.length) {
        container.setAttribute("hidden", "");
        return;
    }

    container.removeAttribute("hidden");

    if (!results.length) {
        const emptyP = document.createElement("p");
        emptyP.className = "search-empty";
        emptyP.textContent = statusMessage;
        container.appendChild(emptyP);
        return;
    }

    results.slice(0, 20).forEach(match => {
        const card = document.createElement("div");
        card.className = "protocol-card info-card protocol-search-result";

        const drugPreview = (match.protocol.drugs || [])
            .map(d => d.name)
            .filter(Boolean)
            .slice(0, 3)
            .join(", ");

        card.innerHTML = `
            <div class="result-top">
                <span class="result-pill">${safeHtmlStr(match.type)}</span>
                ${match.subtype ? `<span class="result-pill">${safeHtmlStr(match.subtype)}</span>` : ""}
                <span class="result-pill">${safeHtmlStr(match.phase)}</span>
            </div>

            <h4>${safeHtmlStr(match.protocol.protocolName || "Unnamed Regimen")}</h4>

            ${drugPreview ? `<p class="result-drugs">Drugs: ${safeHtmlStr(drugPreview)}</p>` : ""}

            <p class="result-meta">Tap to view details ›</p>
        `;

        card.addEventListener("click", () => {
            openLeukemiaType(match.type, {
                phaseName: match.phase,
                protocolName: match.protocol.protocolName
            });
        });

        container.appendChild(card);
    });
}

/* =========================================================
   TAB SWITCHING LOGIC
   ========================================================= */
/* =========================================================
   TAB SWITCHING LOGIC
   ========================================================= */
function switchDiseaseTab(tabName) {
    const protocolContent = document.getElementById("protocolList");
    const definitionContent = document.getElementById("definitionContent");
    const btnProtocols = document.getElementById("tab-protocols");
    const btnDefinitions = document.getElementById("tab-definitions");

    // Safety check: stop if elements are missing
    if (!protocolContent || !definitionContent || !btnProtocols || !btnDefinitions) return;

    if (tabName === "protocols") {
        protocolContent.style.display = "block";
        definitionContent.style.display = "none";

        btnProtocols.classList.add("active");
        btnProtocols.style.backgroundColor = "var(--color-primary-teal)"; 
        btnProtocols.style.color = "white";

        btnDefinitions.classList.remove("active");
        btnDefinitions.style.backgroundColor = "transparent";
        btnDefinitions.style.color = "var(--color-text-main)";
    } 
    else if (tabName === "definitions") {
        protocolContent.style.display = "none";
        definitionContent.style.display = "block";

        btnDefinitions.classList.add("active");
        btnDefinitions.style.backgroundColor = "var(--color-primary-teal)"; 
        btnDefinitions.style.color = "white";

        btnProtocols.classList.remove("active");
        btnProtocols.style.backgroundColor = "transparent";
        btnProtocols.style.color = "var(--color-text-main)";

        if (CURRENT_DISEASE_TYPE) {
            renderDiseaseDefinition(CURRENT_DISEASE_TYPE);
        }
    }
}

/* =========================================================
   FETCH AND RENDER DISEASE DEFINITIONS (SAFE DOM METHOD)
   ========================================================= */
function renderDiseaseDefinition(type) {
    const defContent = document.getElementById("definitionContent");
    defContent.textContent = "";

    const loadingMessage = document.createElement("p");
    loadingMessage.style.padding = "20px";
    loadingMessage.style.textAlign = "center";
    loadingMessage.style.color = "var(--color-text-muted)";
    loadingMessage.textContent = "⏳ Loading Disease Profile...";
    defContent.appendChild(loadingMessage);

    fetch("data/definitions/diseaseDefinitions.json")
        .then(response => response.json())
        .then(data => {
            defContent.textContent = "";
            let keysToFetch = (type === "ALL" && data["T-ALL"]) ? [type, "T-ALL"] : [type];
            let foundData = false;

            keysToFetch.forEach(key => {
                const diseaseData = data[key];
                if (!diseaseData) return;
                foundData = true;

                const card = document.createElement("div");
                card.className = "info-card";
                card.style.marginTop = "10px";
                card.style.marginBottom = "20px";
                card.style.textAlign = "left";
                card.style.border = "1px solid var(--color-border-card)";

                // Title Section with PDF Button
                const titleContainer = document.createElement("div");
                titleContainer.style.display = "flex";
                titleContainer.style.justifyContent = "space-between";
                titleContainer.style.alignItems = "flex-start";

                const title = document.createElement("h3");
                title.style.color = "var(--color-primary-teal)";
                title.textContent = diseaseData.fullName;
                titleContainer.appendChild(title);

                const pdfBtn = document.createElement("button");
                pdfBtn.textContent = "💾";
                pdfBtn.title = "Download PDF";
                pdfBtn.style.cssText = "background:none; border:none; cursor:pointer; font-size:1.2rem; padding:4px;";
                pdfBtn.onclick = () => exportDefinitionAsPDF(diseaseData);
                titleContainer.appendChild(pdfBtn);
                card.appendChild(titleContainer);

                // Definition
                const defP = document.createElement("p");
                defP.style.color = "var(--color-text-main)";
                defP.textContent = "Definition: " + diseaseData.definition;
                card.appendChild(defP);

                // Criteria
                const critHeader = document.createElement("p");
                critHeader.style.fontWeight = "bold";
                critHeader.textContent = "Diagnostic Criteria:";
                card.appendChild(critHeader);

                const critList = document.createElement("ul");
                diseaseData.diagnosticCriteria.forEach(item => {
                    const li = document.createElement("li");
                    li.textContent = item;
                    critList.appendChild(li);
                });
                card.appendChild(critList);

                // Sources
                const sourceDiv = document.createElement("div");
                sourceDiv.className = "info-panel";
                sourceDiv.textContent = "Sources: " + diseaseData.sources;
                card.appendChild(sourceDiv);

                defContent.appendChild(card);
            });
        });
}
            
/* =========================================================
   PDF EXPORT - FIXED BLANK PDF ISSUE
   ========================================================= */
function exportDefinitionAsPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    // CONFIGURATION
    const margin = 15;
    const pageWidth = 210;
    const availableWidth = pageWidth - (margin * 2); // 180mm
    const lineHeight = 6;

    // 1. SYMBOL & TEXT CLEANER
    // This forces strict character handling so "≥" doesn't become "e"
    const clean = (str) => {
        if (!str) return "";
        return String(str)
            .replace(/≥/g, ">=")
            .replace(/≤/g, "<=")
            .replace(/\u2265/g, ">=") // Handle unicode variations
            .replace(/\u2264/g, "<=");
    };

    // 2. HEADER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0, 77, 64);
    doc.text(clean(data.fullName), margin, 20);

    // 3. DEFINITION SECTION
    let y = 35;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Definition:", margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50);
    
    // Split and render definition
    const defLines = doc.splitTextToSize(clean(data.definition), availableWidth);
    doc.text(defLines, margin, y);
    y += (defLines.length * lineHeight) + 10;

    // 4. DIAGNOSTIC CRITERIA SECTION
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Diagnostic Criteria:", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50);

    data.diagnosticCriteria.forEach(crit => {
        const itemText = "• " + clean(crit);
        
        // Identify indentation for sub-items (CRAB/SLiM items)
        const isSubItem = /^(C:|R:|A:|B:|SLiM:)/.test(crit);
        const currentMargin = isSubItem ? margin + 8 : margin;
        const currentWidth = isSubItem ? availableWidth - 8 : availableWidth;

        const lines = doc.splitTextToSize(itemText, currentWidth);
        
        // PAGE BREAK LOGIC
        if (y + (lines.length * lineHeight) > 280) {
            doc.addPage();
            y = 20;
        }

        doc.text(lines, currentMargin, y);
        y += (lines.length * lineHeight);
    });

    // 5. FOOTER / SOURCES
    y += 10;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120);
    const sourceLines = doc.splitTextToSize("Sources: " + clean(data.sources), availableWidth);
    doc.text(sourceLines, margin, y);

    // Save
    doc.save(`${data.fullName.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

function exportProtocolAsPDF(protocol, type, phase, triggeringButton) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("jsPDF library not loaded.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("l", "mm", "a4"); // Landscape configuration

    let originalHtml = "💾";

    if (triggeringButton) {
        originalHtml = triggeringButton.innerHTML;
        triggeringButton.textContent = "⏳ Rendering...";
        triggeringButton.disabled = true;
    }

    const protocolName = protocol.protocolName || "Unnamed Protocol";
    const drugs = Array.isArray(protocol.drugs) ? protocol.drugs : [];

    /* =========================================================
       INTERNAL CLEANING PARSER
       Converts HTML line elements into native vector format directives
       ========================================================= */
    function cleanTextForPDF(str) {
        if (str === null || str === undefined) return "";
        return String(str)
            .replace(/<br\s*\/?>/gi, "\n")   // Map HTML breaks to native canvas newlines
            .replace(/<\/?b>/gi, "")         // Strip bold styling anchors
            .replace(/<\/?strong>/gi, "")    // Strip strong styling anchors
            .replace(/&amp;/g, "&")          // Decode standard escaped entities
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
    }

    // --- HEADER SECTION ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 77, 64); // Clinical Dark Teal
    doc.text(cleanTextForPDF(protocolName), 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);

    let meta = `Disease: ${type || "-"}  |  Phase: ${phase || "-"}`;
    if (protocol.cycleDuration) {
        meta += `  |  Duration: ${protocol.cycleDuration}`;
    }
    doc.text(cleanTextForPDF(meta), 14, 25);

    // Subtle Brand Divider Line
    doc.setDrawColor(0, 77, 64);
    doc.setLineWidth(0.5);
    doc.line(14, 28, 283, 28); 

    // --- TABLE DATA PREPARATION ---
    // Loop through row data points and sanitize string fragments to avoid tag leakages
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
            fontSize: 9,
            cellPadding: 3.5,
            valign: "middle",
            overflow: "linebreak" // Gracefully wraps translated \n configurations
        },
        headStyles: {
            fillColor: [240, 247, 244],
            textColor: [0, 77, 64],
            fontStyle: "bold"
        },
        columnStyles: {
            0: { cellWidth: 28 },  // Phase
            1: { cellWidth: 25 },  // Day
            2: { cellWidth: 45 },  // Drug Name
            3: { cellWidth: 35 },  // Dose
            4: { cellWidth: 24 },  // Route
            5: { cellWidth: 112 }  // Instructions / Duration Info
        },
        margin: { left: 14, right: 14 },
        theme: "striped"
    });

    let y = doc.lastAutoTable.finalY + 12;

    // --- NURSING CONSIDERATIONS ---
    if (protocol.NursesInfo && protocol.NursesInfo.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 77, 64);
        doc.text("Nursing Considerations", 14, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);

        protocol.NursesInfo.forEach(info => {
            // Clean text arrays natively before tracking element text dimensions
            const cleanInfo = cleanTextForPDF(info);
            const lines = doc.splitTextToSize(`• ${cleanInfo}`, 269); 
            const blockHeight = lines.length * 5 + 2;

            // Defensive Height Wrap Check (Landscape Height Limit is 210mm)
            if (y + blockHeight > 185) {
                doc.addPage();
                y = 20; 
            }

            doc.text(lines, 14, y);
            y += blockHeight;
        });
    }

    // --- SOURCE DOCUMENTATION ---
    if (protocol.source) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);

        const cleanSource = cleanTextForPDF(protocol.source);
        const sourceLines = doc.splitTextToSize(`Source: ${cleanSource}`, 269);
        const sourceHeight = sourceLines.length * 4;

        if (y + sourceHeight > 185) {
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
        
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(14, 196, 283, 196);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        
        doc.text(
            `Generated by HEMA NURSE AID  |  Page ${i} of ${pageCount}`,
            148.5,
            202,
            { align: "center" }
        );
    }

    // --- FILE DOWNLOAD ASSIGNMENT ---
    const cleanFilename = `${protocolName
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")}.pdf`;

    doc.save(cleanFilename);

    if (triggeringButton) {
        triggeringButton.innerHTML = originalHtml;
        triggeringButton.disabled = false;
    }
}

function cleanupPdfExportElement(element, triggeringButton, originalHtml) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }

    if (triggeringButton) {
        triggeringButton.innerHTML = originalHtml;
        triggeringButton.disabled = false;
    }
}