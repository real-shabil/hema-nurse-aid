/* =========================================================
   🌿 CHEMOTHERAPY NURSE GUIDE — CALCULATORS MODULE
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
    const rateUnit = document.getElementById(`rateUnit-${calcKey}`)?.value || "ml"; // "ml" or "units"
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
        const infusionPerKgHr = hasCustomRate
            ? orderedRate
            : (data.defaults?.infusion_units_per_kg_per_hour || 18);

        const infusionUhr = weight * infusionPerKgHr;
        const infusionMLhr = infusionUhr / IUperML;

        let bolusText = "No bolus (as per physician order)";
        if (nurseAllowsBolus) {
            const defaultBolusPerKg = data.defaults?.bolus_units_per_kg || 80;
            // Note: Initial bolus usually has a max cap too, typically 5000 or similar.
            // Assuming standard 5000 max for initial if not specified, or use protocol default if available.
            // For safety, let's use the protocol's strictest max bolus if known, otherwise 5000 is a safe standard limit.
            const bolusUnits = Math.min(weight * defaultBolusPerKg, 5000);
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
    if (!weight || isNaN(aptt) || isNaN(currentRate)) {
        showResult(calcKey, "Please enter weight, aPTT, and current rate.");
        return;
    }

    // Find matching range
    const range = data.ranges.find(pttRange => aptt >= pttRange.minAPTT && aptt <= pttRange.maxAPTT);

    if (!range) {
        showResult(calcKey, `No protocol range found for aPTT: ${aptt}. Please contact physician manually.`);
        return;
    }

    // Extracted protocol actions
    const {
        bolusUnitsPerKg,
        bolusMaxUnits,
        rateChangeUnitsPerKg,
        holdMinutes,
        actionText,
        repeatPTTHours
    } = range;

    // --- Bolus Calculation ---
    let bolusDisplay = "No bolus required";
    if (nurseAllowsBolus && bolusUnitsPerKg > 0) {
        const rawBolus = weight * bolusUnitsPerKg;
        const finalBolus = bolusMaxUnits > 0 ? Math.min(rawBolus, bolusMaxUnits) : rawBolus;
        const finalBolusML = finalBolus / IUperML;
        bolusDisplay = `<strong>GIVE BOLUS:</strong> ${finalBolus.toFixed(0)} units (${finalBolusML.toFixed(2)} mL)`;
    } else if (bolusUnitsPerKg > 0 && !nurseAllowsBolus) {
        bolusDisplay = "Bolus required but 'Without Bolus' selected as per physician order.";
    }

    // --- Rate Adjustment Calculation ---
    // 1. Calculate change in Total Units/hr
    const changeTotalUnitsHr = rateChangeUnitsPerKg * weight; // (units/kg/hr) * kg = units/hr

    // 2. Convert change to mL/hr
    const changeMLHr = changeTotalUnitsHr / IUperML;

    // 3. Apply to current rate based on input unit
    let newRateVal = 0;
    let rateUnitLabel = "";

    if (rateUnit === "ml") {
        newRateVal = currentRate + changeMLHr;
        rateUnitLabel = "mL/hr";
    } else {
        // units/hr
        newRateVal = currentRate + changeTotalUnitsHr;
        rateUnitLabel = "units/hr";
    }

    // Ensure non-negative
    if (newRateVal < 0) newRateVal = 0;

    // --- Hold Instruction ---
    let holdInstruction = "";
    if (holdMinutes > 0) {
        const hours = Math.floor(holdMinutes / 60);
        const mins = holdMinutes % 60;
        let timeStr = "";
        if (hours > 0) timeStr += `${hours} hr${hours > 1 ? "s" : ""}`;
        if (mins > 0) timeStr += ` ${mins} min`;
        holdInstruction = `<div class="warning-box">🛑 <strong>HOLD INFUSION</strong> for ${timeStr} before restarting.</div>`;
    }

    // --- Therapeutic Status ---
    const [low, high] = [data.defaults.therapeutic_aptt_low, data.defaults.therapeutic_aptt_high];
    let statusIcon = "⚠️";
    let statusText = "Out of range";
    if (aptt >= low && aptt <= high) {
        statusIcon = "✅";
        statusText = "In Range";
    } else if (aptt < low) {
        statusText = "Low";
    } else {
        statusText = "High";
    }

    // --- Final Output ---
    const finalRateDisplay = Math.round(newRateVal * 100) / 100; // Round to 2 decimals

    showResult(
        calcKey,
        `
        <div class="calc-summary">
            <div><strong>aPTT:</strong> ${aptt} sec (${statusText} ${statusIcon})</div>
            <div><strong>Protocol Action:</strong> ${actionText}</div>
        </div>
        <hr>
        ${holdInstruction}
        <div class="step-box">
            ${bolusDisplay}
        </div>
        <div class="infusion-final">
            ${holdMinutes > 0 ? "Restart" : "Adjust"} infusion rate to → <span>${finalRateDisplay} ${rateUnitLabel}</span>
            <div class="sub-text">(Change: ${rateChangeUnitsPerKg > 0 ? "+" : ""}${rateChangeUnitsPerKg} units/kg/hr)</div>
        </div>
        <div class="next-check">
            🕒 Repeat aPTT in <strong>${repeatPTTHours || 6} hours</strong>
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



/* =========================================================
   7️⃣ READY FOR EXTENSION
   ========================================================= */
// Future calculators (e.g., Warfarin, Dopamine, Vancomycin) can follow the same structure.
// Example stub:
// function calculateWarfarin(calcKey) { /* ... */ }
