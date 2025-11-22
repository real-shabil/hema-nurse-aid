/* =========================================================
   💊 CHEMOTHERAPY PROTOCOLS MODULE
   ---------------------------------------------------------
   Author: Shabil Mohammed Kozhippattil
   Description: Displays disease-based chemotherapy regimens
                with expandable drug cards and nurse tips.
   Dependencies:
     • /data/protocols/chemoProtocols.json
     • CSS: .phase-card, .protocol-card, .protocol-details, .nursing-tips
   ========================================================= */

let CHEMO_PROTOCOLS = {};

/* =========================================================
   1️⃣ INITIAL LOAD
   ========================================================= */
fetch("data/protocols/chemoProtocols.json")
    .then(res => res.json())
    .then(data => {
        CHEMO_PROTOCOLS = data;
        console.log("✅ Chemo protocols loaded successfully.");
    })
    .catch(err => console.error("❌ Error loading chemoProtocols.json:", err));

/* =========================================================
   2️⃣ OPEN SPECIFIC LEUKEMIA TYPE (AML, ALL, etc.)
   ========================================================= */
function openLeukemiaType(type, options = {}) {
    navigateToSection("type");

    const titleEl = document.getElementById("typeTitle");
    const list = document.getElementById("protocolList");
    const targetPhase = (options.phaseName || "").toLowerCase();
    const targetProtocol = (options.protocolName || "").toLowerCase();
    let highlightCard = null;

    if (!list) return;
    list.innerHTML = "";

    if (titleEl) titleEl.innerText = `${type} Chemotherapy Protocols`;

    const selected = CHEMO_PROTOCOLS[type];
    if (!selected) {
        list.innerHTML = `<p class="no-protocol">No protocols available for ${type}.</p>`;
        return;
    }

    /* =========================================================
       3️⃣ RENDER EACH PHASE (Induction / Consolidation / etc.)
       ========================================================= */
    const collapsePhase = card => {
        if (!card.classList.contains("is-expanded")) return;
        const content = card.querySelector(".phase-content");
        const toggle = card.querySelector(".phase-toggle");
        if (!content) return;
        if (toggle) toggle.setAttribute("aria-expanded", "false");
        card.classList.remove("is-expanded");
        if (content.style.maxHeight === "none" || content.style.maxHeight === "") {
            content.style.maxHeight = content.scrollHeight + "px";
        }
        requestAnimationFrame(() => {
            content.style.maxHeight = "0px";
        });
    };

    Object.keys(selected).forEach((phase, phaseIndex) => {
        const phaseDiv = document.createElement("div");
        phaseDiv.classList.add("phase-card");

        const phaseId = `phase-${type}-${phaseIndex}`
            .replace(/\s+/g, "-")
            .replace(/[^a-zA-Z0-9-_]/g, "")
            .toLowerCase();

        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "phase-toggle";
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.setAttribute("aria-controls", phaseId);
        toggleBtn.innerHTML = `
            <h3>${phase}</h3>
            <span class="collapsible-icon" aria-hidden="true">+</span>
        `;
        phaseDiv.appendChild(toggleBtn);

        const phaseContent = document.createElement("div");
        phaseContent.className = "phase-content";
        phaseContent.id = phaseId;
        phaseContent.setAttribute("hidden", "");
        phaseContent.style.maxHeight = "0px";
        phaseDiv.appendChild(phaseContent);

        const phaseData = selected[phase];
        const goalText = phaseData.goal || null;
        const protocols = phaseData.protocols || phaseData; // backward compatible

        if (goalText) {
            const goalP = document.createElement("p");
            goalP.classList.add("phase-description");
            goalP.innerHTML = `<strong>Goal:</strong> ${goalText}`;
            phaseContent.appendChild(goalP);
        }

        protocols.forEach((protocol, index) => {
            const card = document.createElement("div");
            card.classList.add("protocol-card", "info-card");

            const name = protocol.protocolName || "Unnamed Regimen";
            card.innerHTML = `<h4>${name}</h4>`;

            const isTargetProtocol =
                targetProtocol &&
                (name.toLowerCase() === targetProtocol || name.toLowerCase().includes(targetProtocol));
            if (!highlightCard && isTargetProtocol) {
                card.classList.add("protocol-highlight");
                highlightCard = card;
            }

            // Expanded details
            const details = document.createElement("div");
            details.classList.add("protocol-details", "info-panel");

            if (protocol.drugs && protocol.drugs.length) {
                const drugsHTML = protocol.drugs
                    .map(
                        d => `
                        <div class="drug-item">
                            <span class="drug-day">${d.day}</span>
                            <span class="drug-name"><strong>${d.name}</strong></span> — 
                            <span class="drug-dose"><em>${d.dose}</em></span> 
                            <span class="drug-route"><strong><em>${d.route}</em></strong></span>
                            ${d.duration ? `<span class="drug-duration"> (${d.duration})</span>` : ""}
                        </div>`
                    )
                    .join("");
                details.innerHTML += drugsHTML;
            }

            if (protocol.nursingTips && protocol.nursingTips.length) {
                const tipsHTML = `
                    <div class="nursing-tips info-panel">
                        <strong>Nursing Tips:</strong>
                        <ul>${protocol.nursingTips.map(t => `<li>${t}</li>`).join("")}</ul>
                    </div>
                `;
                details.innerHTML += tipsHTML;
            }

            card.appendChild(details);

            // Toggle expand/collapse
            card.addEventListener("click", () => {
                const isVisible = details.style.display === "block";
                document.querySelectorAll(".protocol-details").forEach(div => (div.style.display = "none"));
                details.style.display = isVisible ? "none" : "block";
            });

            phaseContent.appendChild(card);
        });

        list.appendChild(phaseDiv);

        const phaseHasTarget =
            (targetPhase && phase.toLowerCase() === targetPhase) ||
            !!phaseContent.querySelector(".protocol-highlight");

        const togglePhase = () => {
            const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
            if (!isExpanded) {
                document.querySelectorAll(".phase-card.is-expanded").forEach(card => {
                    if (card !== phaseDiv) collapsePhase(card);
                });
                toggleBtn.setAttribute("aria-expanded", "true");
                phaseDiv.classList.add("is-expanded");
                phaseContent.removeAttribute("hidden");
                phaseContent.style.maxHeight = phaseContent.scrollHeight + "px";
            } else {
                collapsePhase(phaseDiv);
            }
        };

        toggleBtn.addEventListener("click", togglePhase);
        if (phaseHasTarget) {
            requestAnimationFrame(() => togglePhase());
        }

        phaseContent.addEventListener("transitionend", () => {
            if (phaseDiv.classList.contains("is-expanded")) {
                phaseContent.style.maxHeight = "none";
            } else {
                phaseContent.setAttribute("hidden", "");
            }
        });
    });

    if (highlightCard) {
        setTimeout(() => {
            highlightCard.scrollIntoView({ behavior: "smooth", block: "center" });
            highlightCard.classList.add("protocol-pulse");
            setTimeout(() => highlightCard.classList.remove("protocol-pulse"), 1600);
        }, 280);
    }
}

window.addEventListener("resize", () => {
    document.querySelectorAll(".phase-card.is-expanded .phase-content").forEach(panel => {
        if (panel.style.maxHeight !== "0px") {
            panel.style.maxHeight = panel.scrollHeight + "px";
        }
    });
});

/* =========================================================
   4️⃣ PROTOCOL SEARCH
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

    if (searchBtn) searchBtn.addEventListener("click", triggerSearch);

    input.addEventListener("keydown", ev => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            triggerSearch();
        }
    });

    input.addEventListener("input", () => {
        if (input.value.trim().length < 2) {
            renderProtocolSearchResults([], { statusText: "Type at least 2 letters to search." });
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            input.value = "";
            input.focus();
            renderProtocolSearchResults([], { statusText: "Cleared. Type a protocol or drug name." });
        });
    }

    renderProtocolSearchResults([], { statusText: "Type at least 2 letters to search." });
}

function performProtocolSearch(rawQuery) {
    const query = (rawQuery || "").trim();

    if (query.length < 2) {
        return renderProtocolSearchResults([], { statusText: "Type at least 2 letters to search." });
    }

    if (!Object.keys(CHEMO_PROTOCOLS).length) {
        return renderProtocolSearchResults([], { query, statusText: "Protocols are still loading. Try again in a moment." });
    }

    const matches = collectProtocolMatches(query);
    const statusText = matches.length
        ? `Found ${matches.length} match${matches.length === 1 ? "" : "es"} for "${query}".`
        : `No protocols found for "${query}".`;

    renderProtocolSearchResults(matches, { query, statusText });
}

function collectProtocolMatches(query) {
    const normalizedQuery = query.toLowerCase();
    const matches = [];

    Object.entries(CHEMO_PROTOCOLS).forEach(([type, phases]) => {
        if (!phases || typeof phases !== "object") return;

        Object.entries(phases).forEach(([phaseName, phaseData]) => {
            const protocols = Array.isArray(phaseData)
                ? phaseData
                : Array.isArray(phaseData?.protocols)
                    ? phaseData.protocols
                    : [];

            protocols.forEach(protocol => {
                const protocolName = (protocol.protocolName || "").toLowerCase();
                const drugNames = (protocol.drugs || []).map(d => (d.name || "").toLowerCase());
                const haystack = [type.toLowerCase(), phaseName.toLowerCase(), protocolName, ...drugNames].join(" ");

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
    if (!container) return;

    container.innerHTML = "";

    if (!query && !results.length) {
        container.setAttribute("hidden", "");
        return;
    }

    container.removeAttribute("hidden");

    if (!results.length) {
        const message = statusMessage || (query ? `No protocols found for "${query}".` : "");
        if (message) {
            container.innerHTML = `<p class="no-protocol search-empty">${message}</p>`;
        }
        return;
    }

    results.slice(0, 20).forEach(match => {
        const card = document.createElement("div");
        card.className = "protocol-card info-card protocol-search-result";

        const drugPreview = (match.protocol.drugs || [])
            .map(d => d.name)
            .filter(Boolean)
            .slice(0, 2)
            .join(" • ");

        card.innerHTML = `
            <div class="result-top">
                <span class="result-pill">${match.type}</span>
                <span class="result-pill">${match.phase}</span>
            </div>
            <h4>${match.protocol.protocolName || "Unnamed Regimen"}</h4>
            ${drugPreview ? `<p class="result-drugs">${drugPreview}</p>` : ""}
            <p class="result-meta">Open full details</p>
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
