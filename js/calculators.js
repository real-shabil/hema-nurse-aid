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
    if (div) div.innerHTML = `<div class="result-box">${html}</div>`;
    else console.error(`Result container missing for ${calcKey}`);
}


/* =========================================================
   3️⃣ BMI CALCULATION
   ========================================================= */
function calculateBMI(calcKey) {
    const weight = parseFloat(document.getElementById(`weight-${calcKey}`)?.value);
    const height = parseFloat(document.getElementById(`height-${calcKey}`)?.value);
    const resultDiv = document.getElementById(`result-${calcKey}`);

    if (!weight || !height) {
        resultDiv.innerHTML = "Enter weight and height.";
        return;
    }

    const heightM = height / 100;
    const bmi = (weight / (heightM ** 2)).toFixed(1);
    const category =
        bmi < 18.5
        ? "Underweight"
        : bmi < 25
        ? "Normal"
        : bmi < 30
        ? "Overweight"
        : "Obese";

    showResult(
        calcKey,
        `BMI: <strong>${bmi}</strong> (${category})`
    );
}


/* =========================================================
   4️⃣ BSA CALCULATION
   ========================================================= */
function calculateBSA(calcKey) {
    const weight = parseFloat(document.getElementById(`weight-${calcKey}`)?.value);
    const height = parseFloat(document.getElementById(`height-${calcKey}`)?.value);
    const resultDiv = document.getElementById(`result-${calcKey}`);

    if (!weight || !height) {
        resultDiv.innerHTML = "Enter weight and height.";
        return;
    }

    const bsa = Math.sqrt((height * weight) / 3600).toFixed(2);
    showResult(calcKey, `Body Surface Area (BSA): <strong>${bsa} m²</strong>`);
}


/* =========================================================
   5️⃣ HEPARIN CALCULATION
   ========================================================= */
function calculateHeparin(calcKey) {
    const data = getGuidelines().heparinProtocol;
    if (!data) return alert("Heparin protocol not loaded.");

    const weight = parseFloat(document.getElementById(`weight-${calcKey}`)?.value);
    const aptt = parseFloat(document.getElementById(`aptt-${calcKey}`)?.value);
    const currentRate = parseFloat(document.getElementById(`currentRate-${calcKey}`)?.value);
    const rateUnit = document.getElementById(`rateUnit-${calcKey}`)?.value || "ml/hr";
    const bolusChoice = document.querySelector(`input[name="bolusOption-${calcKey}"]:checked`)?.value;

    const nurseAllowsBolus = bolusChoice === "with";

    if (!weight || !aptt || !currentRate) {
        showResult(calcKey, "Please enter all required values.");
        return;
    }

    // Determine adjustment range
    let action = "";
    let factor = 0;
    let bolusRequired = false;

    const range = data.ranges.find(r => aptt <= r.maxAPTT);
    if (range) {
        action = range.action;
        bolusRequired = range.bolus;
        factor = range.factorKey ? data.factors[range.factorKey] : 0;
    } else if (aptt > data.notifyPhysicianAbove) {
        action = data.aboveMax.action;
    }

    // Base rate change
    const newRate = currentRate + factor;
    const finalRate = Math.max(newRate, 0);

    // Bolus logic
    let bolusText = "—";
    if (bolusRequired && nurseAllowsBolus && aptt < data.bolusAllowedBelow) {
        const bolusUnits = Math.min(weight * 80, 5000); // 80 IU/kg, max 5000 IU
        bolusText = `${bolusUnits.toFixed(0)} IU IV bolus`;
    } else {
        bolusText = "No bolus required";
    }

    // Result display
    showResult(
        calcKey,
        `
        <strong>aPTT:</strong> ${aptt} sec<br>
        <strong>Action:</strong> ${action}<br>
        <strong>Bolus:</strong> ${bolusText}<br>
        <div class="infusion-final">
        Adjusted infusion rate → <span>${finalRate.toFixed(1)} ${rateUnit}</span>
        </div>
        `
    );
}


/* =========================================================
   6️⃣ INSULIN CALCULATION
   ========================================================= */
function calculateInsulin(calcKey) {
    const insulinProtocol = getGuidelines().insulinProtocol;
    if (!insulinProtocol || !insulinProtocol.ranges) {
        alert("Insulin protocol not found.");
        return;
    }

    const glucose = parseFloat(document.getElementById(`glucose-${calcKey}`)?.value);
    const scale = document.getElementById(`scale-${calcKey}`)?.value || "low";

    if (!glucose) {
        showResult(calcKey, "Please enter current glucose level.");
        return;
    }

    // Adjust ranges by scale
    const adjustment = scale === "moderate" ? 1 : scale === "high" ? 2 : 0;
    let matched = insulinProtocol.ranges.find(r => glucose >= r.min && glucose <= r.max);

    if (!matched) {
        showResult(calcKey, "Glucose value out of range.");
        return;
    }

    const adjustedDose = Math.max(matched.dose + adjustment, 0);
    const notifyText = matched.action.includes("notify") ? "⚠️ Notify physician" : "";

    showResult(
        calcKey,
        `
        <strong>Blood Glucose:</strong> ${glucose} mg/dL<br>
        <strong>Scale:</strong> ${scale.toUpperCase()} dose<br>
        <strong>Recommended Action:</strong> ${matched.action.replace(/\d+ units/, `${adjustedDose} units`)}<br>
        ${notifyText ? `<em>${notifyText}</em><br>` : ""}
        <div class="infusion-final">
        Final Dose → <span>${adjustedDose} units SC</span>
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
