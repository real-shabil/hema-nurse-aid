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
function openLeukemiaType(type) {
    navigateToSection("type");

    const titleEl = document.getElementById("typeTitle");
    const list = document.getElementById("protocolList");

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

        phaseContent.addEventListener("transitionend", () => {
            if (phaseDiv.classList.contains("is-expanded")) {
                phaseContent.style.maxHeight = "none";
            } else {
                phaseContent.setAttribute("hidden", "");
            }
        });
    });
}

window.addEventListener("resize", () => {
    document.querySelectorAll(".phase-card.is-expanded .phase-content").forEach(panel => {
        if (panel.style.maxHeight !== "0px") {
            panel.style.maxHeight = panel.scrollHeight + "px";
        }
    });
});
