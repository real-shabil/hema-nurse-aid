/* =========================================================
   CHEMOTHERAPY NURSE GUIDE — MEDICATION MODULE
   ---------------------------------------------------------
   Author: Shabil Mohammed Kozhippattil
   Purpose:
     • Load medication groups (chemotherapy, targeted, supportive)
     • Render them using collapsible UI
     • Display structured drug information
   ========================================================= */

let MEDICATIONS = null;


/* =========================================================
   LOAD MEDICATION DATA
   ========================================================= */
function loadMedicationData() {
    return fetch("data/medicationsData.json")
        .then(res => res.json())
        .then(data => {
            MEDICATIONS = data;
            console.log("Medications loaded.");
            return data;
        })
        .catch(err => console.error("Error loading medicationsData.json:", err));
}

function openMedicationGroup(groupKey) {
    const dataReady = MEDICATIONS ? Promise.resolve(MEDICATIONS) : loadMedicationData();

    dataReady.then(data => {
        if (!data) return;

        const group = data[groupKey];
        if (!group) {
            console.error(`No medication group found for key: ${groupKey}`);
            return;
        }

        // Show the detail section (like AML uses #type)
        if (typeof navigateToSection === "function") {
            navigateToSection("medType");
        }

        // Set the title at the top
        const titleEl = document.getElementById("medTypeTitle");
        if (titleEl) {
            const titles = {
                chemotherapy: "Chemotherapy Drugs",
                targetedTherapy: "Targeted / Monoclonal Therapy",
                supportiveTherapy: "Supportive / Adjuvant Medications"
            };
            titleEl.textContent = titles[groupKey] || group.title || "Medications";
        }

        // Render this ONE group into the list
        const list = document.getElementById("medicationsList");
        if (!list) return;
        list.innerHTML = "";

        // This gives you a phase-card + inner drug cards (same style as AML phases)
        renderMedicationGroup(group, groupKey, 0, list);
    });
}


/* =========================================================
   OPEN MEDICATIONS SECTION
   ========================================================= */
function openMedicationsSection() {

    const dataReady = MEDICATIONS ? Promise.resolve(MEDICATIONS) : loadMedicationData();

    dataReady.then(data => {
        if (!data) return;

        const list = document.getElementById("medicationsList");
        if (!list) return;

        list.innerHTML = "";

        Object.keys(data).forEach((groupKey, index) => {
            const group = data[groupKey];
            renderMedicationGroup(group, groupKey, index, list);
        });

        const container = document.getElementById("medications");
        if (container && container.scrollIntoView) {
            container.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
    navigateToSection("medications");
}

/* =========================================================
   RENDER GROUP CARD
   ========================================================= */
function renderMedicationGroup(group, groupKey, index, mountPoint) {
    const card = document.createElement("div");
    card.classList.add("phase-card");

    const id = `med-group-${index}`;

    const btn = document.createElement("button");
    btn.className = "phase-toggle";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", id);
    btn.innerHTML = `
        <h3>${group.title}</h3>
        <span class="collapsible-icon">+</span>
    `;

    const content = document.createElement("div");
    content.className = "phase-content";
    const desc = document.createElement("p");
    desc.classList.add("phase-description");
    desc.innerHTML = `<strong>Description:</strong> ${group.description}`;
    content.appendChild(desc);

    content.id = id;
    content.hidden = true;
    content.style.maxHeight = "0px";

    card.appendChild(btn);
    card.appendChild(content);
    mountPoint.appendChild(card);

    btn.addEventListener("click", () =>
        toggleMedicationGroup(card, content, btn)
    );

    group.drugs.forEach((drug, index) => {
        renderMedicationDrug(drug, index, content);
    });
}

/* =========================================================
   COLLAPSE LOGIC
   ========================================================= */
function toggleMedicationGroup(card, content, btn) {
    const isOpen = btn.getAttribute("aria-expanded") === "true";

    if (!isOpen) {
        document.querySelectorAll(".phase-card.is-expanded").forEach(openCard => {
            if (openCard !== card) collapseMedicationGroup(openCard);
        });

        btn.setAttribute("aria-expanded", "true");
        card.classList.add("is-expanded");
        content.hidden = false;
        content.style.maxHeight = content.scrollHeight + "px";
    } else {
        collapseMedicationGroup(card);
    }
}

function collapseMedicationGroup(card) {
    const btn = card.querySelector(".phase-toggle");
    const content = card.querySelector(".phase-content");
    if (!btn || !content) return;

    btn.setAttribute("aria-expanded", "false");
    card.classList.remove("is-expanded");

    if (content.style.maxHeight === "" || content.style.maxHeight === "none") {
        content.style.maxHeight = content.scrollHeight + "px";
    }

    requestAnimationFrame(() => {
        content.style.maxHeight = "0px";
    });

    content.addEventListener(
        "transitionend",
        () => {
            if (!card.classList.contains("is-expanded")) {
                content.hidden = true;
            }
        },
        { once: true }
    );
}

/* =========================================================
   RENDER DRUG CARD
   ========================================================= */
function renderMedicationDrug(drug, index, mountPoint) {
    const card = document.createElement("div");
    card.classList.add("protocol-card", "info-card");

    const header = document.createElement("h4");
    header.textContent = drug.name;

    const details = document.createElement("div");
    details.classList.add("protocol-details", "info-panel");
    details.style.display = "none";

    details.innerHTML = generateDrugDetailHTML(drug);

    card.appendChild(header);
    card.appendChild(details);
    mountPoint.appendChild(card);

    card.addEventListener("click", () => {
        const open = details.style.display === "block";
        document.querySelectorAll(".protocol-details").forEach(div => (div.style.display = "none"));
        details.style.display = open ? "none" : "block";
    });
}

/* =========================================================
   BUILD DRUG DETAIL HTML
   ========================================================= */
function generateDrugDetailHTML(drug) {
    const makeList = arr =>
        arr && arr.length ? `<ul>${arr.map(i => `<li>${i}</li>`).join("")}</ul>` : "";

    return `
        <div class="med-field"><strong>Route:</strong> ${drug.route || "—"}</div>
        <div class="med-field"><strong>Classification:</strong> ${drug.classification || "—"}</div>
        <div class="med-field"><strong>Extravasation Risk:</strong> ${drug.extravasationRisk || "—"}</div>

        ${drug.mechanism ? `<div class="med-section"><strong>Mechanism of Action:</strong>${makeList(drug.mechanism)}</div>` : ""}

        ${drug.indications ? `<div class="med-section"><strong>Indications:</strong>${makeList(drug.indications)}</div>` : ""}

        ${drug.sideEffects ? `<div class="med-section"><strong>Side Effects:</strong>${makeList(drug.sideEffects)}</div>` : ""}

        ${drug.monitoring ? `<div class="med-section"><strong>Monitoring:</strong>${makeList(drug.monitoring)}</div>` : ""}

        ${drug.warnings ? `<div class="med-section"><strong>Warnings:</strong>${makeList(drug.warnings)}</div>` : ""}

        ${drug.nursingTips ? `<div class="med-section"><strong>Nursing Tips:</strong>${makeList(drug.nursingTips)}</div>` : ""}
    `;
}

/* =========================================================
   RESIZE HANDLER
   ========================================================= */
window.addEventListener("resize", () => {
    document.querySelectorAll(".phase-card.is-expanded .phase-content").forEach(panel => {
        if (panel.style.maxHeight !== "0px") {
            panel.style.maxHeight = panel.scrollHeight + "px";
        }
    });
});
