/* =========================================================
   🌿 CHEMOTHERAPY NURSE GUIDE — CALCULATORS MODULE
   ---------------------------------------------------------
   Version:        1.0.0
   Author:         Shabil Mohammed Kozhippattil
   Role:           RN, Hematology/Oncology — KAMC, Jeddah
   File Purpose:   Contains all medical calculation logic
                   (BMI, BSA, Heparin, Insulin).
   ---------------------------------------------------------
   Responsibilities:
     • Perform medication dose and rate calculations
     • Apply clinical guideline adjustments
     • Render formatted output to result boxes
     • Extendable for future calculators (e.g., Warfarin, Dopamine)
   ---------------------------------------------------------
   Notes:
     ⚙️ Each calculator function is self-contained.
     💡 Use clinicalGuidelines loaded in main.js for protocol-based calculations.
     🧩 All results display in the <div id="result-[calcKey]"> element.
   ========================================================= */


/* =========================================================
   1️⃣ GLOBAL ACCESS
   ========================================================= */
// Access shared data from main.js
const getGuidelines = () => (typeof clinicalGuidelines !== "undefined" ? clinicalGuidelines : {});
const getCalcData = () => (typeof calculationsData !== "undefined" ? calculationsData : {});


/* =========================================================
   2️⃣ HELPER FUNCTIONS
   ========================================================= */
function formatNumber(value, decimals = 1) {
    return isNaN(value) ? "—" : parseFloat(value).toFixed(decimals);
}

function showResult(calcKey, html) {
    const div = document.getElementById(`result-${calcKey}`);
    if (div) {
        const wrapper = document.createElement("div");
        wrapper.className = "result-box";
        wrapper.innerHTML = html; // HTML content from internal calculations - safe
        div.textContent = "";
        div.appendChild(wrapper);
    }
    else console.error(`Result container missing for ${calcKey}`);
}


/* =========================================================
   3️⃣ BMI CALCULATION & BSA CALCULATION
   ========================================================= */

function calculateBodySize(calcKey) {
    const weightInput = document.getElementById(`weight-${calcKey}`);
    const heightInput = document.getElementById(`height-${calcKey}`);
    const resultDiv = document.getElementById(`result-${calcKey}`);

    if (!weightInput || !heightInput || !resultDiv) return;

    const weight = parseFloat(weightInput.value);
    const heightCm = parseFloat(heightInput.value);

    if (!weight || !heightCm || weight <= 0 || heightCm <= 0) {
        resultDiv.textContent = "";
        const p = document.createElement("p");
        p.textContent = "Please enter valid height (cm) and weight (kg).";
        resultDiv.appendChild(p);
        return;
    }

    const heightM = heightCm / 100;

    // BMI
    const bmi = weight / (heightM * heightM);

    // BSA (Mosteller formula)
    const bsa = Math.sqrt((heightCm * weight) / 3600);

    resultDiv.textContent = "";
    const p1 = document.createElement("p");
    p1.innerHTML = `<strong>BMI:</strong> ${bmi.toFixed(1)} kg/m²`;
    const p2 = document.createElement("p");
    p2.innerHTML = `<strong>BSA :</strong> ${bsa.toFixed(2)} m²`;
    const p3 = document.createElement("p");
    p3.className = "calc-note";
    p3.textContent = "Note: Always interpret BMI & BSA in clinical context and follow unit policy.";
    resultDiv.appendChild(p1);
    resultDiv.appendChild(p2);
    resultDiv.appendChild(p3);
}


/* =========================================================
   5️⃣ HEPARIN CALCULATION
   ========================================================= */
function calculateHeparin(calcKey) {
    const data = getGuidelines().heparinProtocol;
    if (!data) return alert("Heparin protocol not loaded.");

    // === Input Extraction ===
    const weight = parseFloat(document.getElementById(`weight-${calcKey}`)?.value);
    const aptt = parseFloat(document.getElementById(`aptt-${calcKey}`)?.value);
    const currentRate = parseFloat(document.getElementById(`currentRate-${calcKey}`)?.value);
    const rateUnit = document.getElementById(`rateUnit-${calcKey}`)?.value || "mL/hr";
    const syringeVal = document.getElementById(`syringe-${calcKey}`)?.value;
    const bolusChoice = document.querySelector(`input[name="bolusOption-${calcKey}"]:checked`)?.value;
    const useInitial = document.getElementById(`useInitial-${calcKey}`)?.checked;

    const nurseAllowsBolus = bolusChoice === "with";
    const IUperML = syringeVal === "25000" ? 500 : 200; // 25k/50mL → 500 IU/mL; 10k/50mL → 200 IU/mL

    /* =========================================================
        🩺 INITIAL HEPARIN INFUSION MODE
        ========================================================= */
    if (useInitial) {
        if (!weight) {
        showResult(calcKey, "Please enter patient weight to start infusion.");
        return;
        }

        const orderedRateInput = document.getElementById(`orderedRate-${calcKey}`);
        const orderedRate = orderedRateInput ? parseFloat(orderedRateInput.value) : NaN;
        const hasCustomRate = !isNaN(orderedRate) && orderedRate > 0;
        const infusionPerKgHr =
        hasCustomRate
            ? orderedRate
            : (data.defaults?.infusion_units_per_kg_per_hour || 18);

        const infusionUhr = weight * infusionPerKgHr;
        const infusionMLhr = infusionUhr / IUperML;

        let bolusText = "No bolus (as per physician order)";
        if (nurseAllowsBolus) {
        const bolusUnits = Math.min(weight * data.defaults.bolus_units_per_kg, 5000);
        const bolusML = bolusUnits / IUperML;
        bolusText = `${bolusUnits.toFixed(0)} IU → ${bolusML.toFixed(2)} mL IV bolus`;
        }

        showResult(
        calcKey,
        `
        <strong>Mode:</strong> Initial Heparin Infusion Start<br>
        <strong>Weight:</strong> ${weight} kg<br>
        <strong>Syringe:</strong> ${syringeVal} IU / 50 mL (${IUperML} IU/mL)<br>
        <strong>Infusion Rate:</strong> ${infusionPerKgHr} IU/kg/hr (${hasCustomRate ? "as per physician order" : "protocol default"})<br>
        <strong>Bolus:</strong> ${bolusText}<br>
        <div class="infusion-final">
            Start infusion at → <span>${infusionUhr.toFixed(0)} IU/hr = ${infusionMLhr.toFixed(2)} mL/hr</span>
        </div>
        `
        );
        return;
    }

    /* =========================================================
        🔄 CONTINUOUS HEPARIN INFUSION MODE
        ========================================================= */
    if (isNaN(weight) || weight <= 0 || isNaN(aptt) || isNaN(currentRate) || currentRate <= 0) {
        showResult(calcKey, "Please enter valid weight (>0), aPTT, and current rate (>0).");
        return;
    }

    let action = "—",
        factor = 0,
        bolusRequired = false;

    if (!isNaN(data.notifyPhysicianAbove) && aptt > data.notifyPhysicianAbove) {
        action = data.aboveMax.action;
    } else {
        const range = data.ranges.find(r => aptt <= r.maxAPTT);
        if (range) {
            action = range.action;
            bolusRequired = range.bolus;
            factor = range.factorKey ? data.factors[range.factorKey] : 0;
        }
    }

    const newRate = currentRate + factor;
    const finalRate = Math.max(newRate, 0);

    // --- Therapeutic zone feedback ---
    const [lowTherapeutic, highTherapeutic] = data.therapeuticRange || [data.defaults?.therapeutic_aptt_low, data.defaults?.therapeutic_aptt_high];
    let therapeuticNote = "";
    if (!isNaN(lowTherapeutic) && !isNaN(highTherapeutic)) {
        if (aptt >= lowTherapeutic && aptt <= highTherapeutic) {
            therapeuticNote = "🩵 aPTT within therapeutic range. Maintain current rate.";
        } else if (aptt < lowTherapeutic) {
            therapeuticNote = "⬇️ aPTT below target — infusion may need increase.";
        } else if (aptt > highTherapeutic) {
            therapeuticNote = "⬆️ aPTT above target — consider rate reduction.";
        }
    }

    // --- Bolus decision ---
    let bolusText = "No bolus required";
    if (bolusRequired && nurseAllowsBolus && aptt <= data.bolusAllowedBelow) {
        const bolusUnits = Math.min(weight * data.defaults.bolus_units_per_kg, 5000);
        const bolusML = bolusUnits / IUperML;
        bolusText = `${bolusUnits.toFixed(0)} IU (${bolusML.toFixed(2)} mL) IV bolus`;
    }

    // --- Final result output ---
    showResult(
        calcKey,
        `
        <strong>aPTT:</strong> ${aptt} sec<br>
        <strong>Action:</strong> ${action}<br>
        <strong>Bolus:</strong> ${bolusText}<br>
        <div class="infusion-final">
        ${therapeuticNote}<br>
        Adjust infusion rate → <span>${currentRate.toFixed(1)} → ${finalRate.toFixed(1)} ${rateUnit}</span>
        </div>
        `
    );
}


/* =========================================================
   💉 INSULIN CALCULATION
   ========================================================= */
function calculateInsulin(calcKey) {
    const insulinProtocol = clinicalGuidelines?.insulinProtocol;
    if (!insulinProtocol) {
        alert("Insulin protocol not found.");
        return;
    }

    const glucose = parseFloat(document.getElementById(`glucose-${calcKey}`)?.value);
    const scale = document.getElementById(`scale-${calcKey}`)?.value || "lowDose";

    if (!glucose) {
        showResult(calcKey, "Please enter current glucose level.");
        return;
    }

    const selectedScale = insulinProtocol[scale];
    if (!selectedScale || !selectedScale.ranges) {
        showResult(calcKey, "Scale not found in insulin protocol.");
        return;
    }

    const matched = selectedScale.ranges.find(r => glucose >= r.min && glucose <= r.max);
    if (!matched) {
        showResult(calcKey, "Glucose value out of range.");
        return;
    }

    const notifyText = matched.action.includes("notify") ? "⚠️ Notify physician" : "";

    showResult(
        calcKey,
        `
        <strong>${selectedScale.title}</strong><br>
        <strong>Blood Glucose:</strong> ${glucose} ${insulinProtocol.glucoseUnit}<br>
        ${notifyText ? `<em>${notifyText}</em><br>` : ""}
        <div class="infusion-final">
            Administer <span>${matched.dose} ${insulinProtocol.units} SC</span> for ${glucose} ${insulinProtocol.glucoseUnit}.
        </div>
        `
    );
}
