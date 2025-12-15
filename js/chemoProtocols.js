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
            console.log("✅ Chemo protocols loaded.");
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
    console.log(`Opening protocol type: ${type}`);

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
        <div class="phase-card" style="text-align:center; padding:20px; color:#555;">
            <p>⏳ Loading ${type} protocols...</p>
        </div>`;

    loadChemoProtocols().then(data => {
        if (!data) {
            list.innerHTML = `<div class="phase-card" style="padding:20px; color:#d63384;">⚠️ Failed to load protocol data.</div>`;
            return;
        }

        try {
            renderLeukemiaProtocols(data, type, list, options);
        } catch (error) {
            console.error("❌ Render Error:", error);
            list.innerHTML = `<div class="phase-card" style="color:red; padding:20px;">
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
        list.innerHTML = `<div class="phase-card"><p class="no-protocol">No protocols currently available for ${type}.</p></div>`;
        return;
    }

    const targetPhase = (options.phaseName || "").toLowerCase();
    const targetProtocol = (options.protocolName || "").toLowerCase();
    let highlightCard = null;

    // Iterate phases
    Object.keys(selected).forEach((phase, phaseIndex) => {
        const safePhaseId = `phase-${type}-${phaseIndex}`.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();

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
        const phaseData = selected[phase];
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
            phaseContent.innerHTML += `<p style="padding:10px;">No regimens listed.</p>`;
        } else {
            protocols.forEach(protocol => {
                if (!protocol) return;

                const card = document.createElement("div");
                card.className = "protocol-card info-card";

                const name = protocol.protocolName || "Unnamed Regimen";

                // Highlight Logic
                const isTarget = targetProtocol &&
                    (name.toLowerCase() === targetProtocol || name.toLowerCase().includes(targetProtocol));

                if (!highlightCard && isTarget) {
                    card.classList.add("protocol-highlight");
                    highlightCard = card;
                }

                const detailsHtml = buildProtocolDetailsHtml(protocol);

                card.innerHTML = `
                    <h4>${name}</h4>
                    <p class="protocol-summary">
                        ${protocol.cycleDuration ? `Duration: ${protocol.cycleDuration}` : ""}
                    </p>
                    <div class="protocol-details info-panel" style="display:none; margin-top:10px;">
                        ${detailsHtml}
                    </div>
                `;

                // Click to expand details
                card.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const details = card.querySelector(".protocol-details");
                    const isVisible = details.style.display === "block";
                    // Close others in this phase
                    card.parentElement.querySelectorAll(".protocol-details").forEach(d => d.style.display = "none");
                    details.style.display = isVisible ? "none" : "block";

                    // Recalculate parent height to prevent clipping
                    const phaseContent = card.closest(".phase-content");
                    if (phaseContent && phaseContent.style.maxHeight !== "0px") {
                        phaseContent.style.maxHeight = "none";
                    }
                });

                phaseContent.appendChild(card);
            });
        }

        list.appendChild(phaseDiv);

        // Check if we should auto-expand this phase
        const phaseHasTarget = (targetPhase && phase.toLowerCase() === targetPhase) ||
            !!phaseContent.querySelector(".protocol-highlight");

        if (phaseHasTarget) {
            // Expand immediately
            setTimeout(() => togglePhaseVisibility(phaseDiv, toggleBtn, true), 100);
        }
    });

    // Auto-scroll to highlight
    if (highlightCard) {
        setTimeout(() => {
            highlightCard.scrollIntoView({ behavior: "smooth", block: "center" });
            highlightCard.classList.add("protocol-pulse");
            setTimeout(() => highlightCard.classList.remove("protocol-pulse"), 1600);
        }, 400);
    }
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
                <span class="drug-day">${d.day || ""}</span>
                <span class="drug-name"><strong>${d.name || "Unknown"}</strong></span> — 
                <span class="drug-dose"><em>${d.dose || ""}</em></span> 
                <span class="drug-route"><strong><em>${d.route || ""}</em></strong></span>
                ${d.duration ? `<span class="drug-duration"> (${d.duration})</span>` : ""}
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

    // Search Logic
    Object.entries(data).forEach(([type, phases]) => {
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

                const haystack = [type.toLowerCase(), phaseName.toLowerCase(), protocolName, ...drugNames, sources].join(" ");

                if (haystack.includes(normalizedQuery)) {
                    matches.push({ type, phase: phaseName, protocol });
                }
            });
        });
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
        container.innerHTML = `<p class="search-empty" style="color:#666; font-style:italic;">${statusMessage}</p>`;
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
            ${drugPreview ? `<p class="result-drugs" style="font-size:0.9em; color:#444;">Drugs: ${drugPreview}</p>` : ""}
            <p class="result-meta" style="color:#00796b; font-size:0.85em;">Tap to view details ›</p>
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
