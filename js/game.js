/* =========================================================
   🎮 NURSE WORDLE — JSON-DRIVEN VERSION
   ---------------------------------------------------------
   Version:        4.0.0
   Author:         Shabil Mohammed Kozhippattil
   Role:           RN, Hematology/Oncology — KAMC, Jeddah
   Purpose:        Interactive mini-game for nurses — JSON-driven Wordle
   ---------------------------------------------------------
   Structure:
       1️⃣ Load & Initialize Game
       2️⃣ Generate Grid
       3️⃣ Show Rules Modal
   ========================================================= */


/* =========================================================
   1️⃣ LOAD & INITIALIZE GAME
   ========================================================= */
async function loadNurseWordle(container) {
    try {
        const res = await fetch("data/gamesData.json");
        const data = await res.json();
        const gameData = data.wordle;

        const words = (gameData.words || []).map(w => w.toUpperCase());
        if (!words.length) {
            throw new Error("No words available for Nurse Wordle.");
        }
        const secretWord = words[Math.floor(Math.random() * words.length)];

        // Global object for tracking progress
        window.nurseWordle = {
            secret: secretWord,
            attempts: 0,
            guesses: [],
            activeRow: 0,
            currentGuess: "",
            finished: false,
            rules: gameData.rules,
            words,
            container,
            maxAttempts: 6
        };

        // Render interface
        container.innerHTML = `
            <div class="wordle-container">
                <h3>
                    🧩 ${gameData.title}
                    <button class="info-btn" onclick="showWordleRules()">?</button>
                </h3>
                <p class="wordle-hint">${gameData.description}</p>
                <input 
                    id="wordleHiddenInput"
                    class="wordle-hidden-input"
                    type="text"
                    inputmode="text"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="characters"
                    spellcheck="false"
                />
                <div id="wordleGrid" class="wordle-grid"></div>
                <div class="calc-buttons" style="margin-top:16px;">
                    <button type="button" class="btn-enter" onclick="submitNurseWordle()">Enter</button>
                    <button type="button" class="btn-clear" onclick="resetNurseWordle()">Reset</button>
                </div>
                <div id="wordleResult" class="calc-result" style="margin-top:16px;"></div>
            </div>
        `;

        // ✅ Create grid and enable keyboard control
        generateWordleGrid("wordleGrid");
        setupWordleInputBridge();


        if (!window.wordleKeyListenerAdded) {
            document.addEventListener("keydown", handleWordleKey);
            window.wordleKeyListenerAdded = true;
        }

        const resultDiv = document.getElementById("wordleResult");
        if (resultDiv) resultDiv.textContent = "";
    } catch (err) {
        console.error("❌ Error loading gamesData.json:", err);
        container.innerHTML = "<p>Failed to load game data.</p>";
    }
}


/* =========================================================
   2️⃣ WORDLE GRID GENERATOR
   ========================================================= */



function generateWordleGrid(targetDivId, rows = 6, cols = 5) {
    const gridDiv = document.getElementById(targetDivId);
    if (!gridDiv) return;

    gridDiv.innerHTML = ""; 

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement("div");
            cell.className = "wordle-cell";
            cell.dataset.row = r;
            cell.dataset.col = c;
            gridDiv.appendChild(cell);
        }
    }
}


/* =========================================================
   🔠 WORDLE KEY HANDLER — LIVE INPUT MANAGEMENT
   ========================================================= */
function handleWordleKey(event) {
    const game = window.nurseWordle;
    if (!game || game.finished) return;

    const key = event.key.toUpperCase();

    if (key === "BACKSPACE") {
        game.currentGuess = game.currentGuess.slice(0, -1);
    } else if (/^[A-Z]$/.test(key) && game.currentGuess.length < 5) {
        game.currentGuess += key;
    } else if (key === "ENTER") {
        submitNurseWordle();
        return;
    }

    updateWordleGrid();
}

/* =========================================================
   🔁 WORDLE GRID UPDATER — REFRESH ROW VISUALS
   ========================================================= */
function updateWordleGrid() {
    const grid = document.getElementById("wordleGrid");
    if (!grid) return;

    const game = window.nurseWordle;
    if (!game) return;

    const { currentGuess, activeRow, finished } = game;
    const rowCells = grid.querySelectorAll(`.wordle-cell[data-row="${activeRow}"]`);

    grid.querySelectorAll(".wordle-cell.cursor").forEach(cell => cell.classList.remove("cursor"));

    rowCells.forEach((cell, i) => {
        cell.textContent = currentGuess[i] || "";
        cell.classList.remove("correct", "present", "absent");
        cell.classList.toggle("filled", Boolean(currentGuess[i]));
    });

    if (!finished && rowCells.length) {
        const cursorIndex = Math.min(currentGuess.length, rowCells.length - 1);
        const cursorCell = rowCells[cursorIndex];
        if (cursorCell) cursorCell.classList.add("cursor");
    }
}


/* =========================================================
   🧠 WORDLE INPUT BRIDGE — MOBILE/FOCUS SUPPORT
   ========================================================= */
function setupWordleInputBridge() {
    const input = document.getElementById("wordleHiddenInput");
    const grid = document.getElementById("wordleGrid");
    const container = document.querySelector(".wordle-container");

    if (!input || !grid) return;

    const focusInput = () => {
        input.focus();
        if (typeof input.setSelectionRange === "function") {
            const len = input.value.length;
            input.setSelectionRange(len, len);
        }
    };

    if (!input.__wordleBound) {
        input.addEventListener("keydown", event => {
            handleWordleKey(event);
            event.preventDefault();
            event.stopPropagation();
        });
        input.__wordleBound = true;
    }

    if (grid && !grid.__wordleFocusBound) {
        grid.addEventListener("click", focusInput);
        grid.__wordleFocusBound = true;
    }

    if (container && !container.__wordleFocusBound) {
        container.addEventListener("click", () => {
            if (!window.nurseWordle?.finished) focusInput();
        });
        container.__wordleFocusBound = true;
    }

    input.value = "";
    focusInput();
}


/* =========================================================
   ✅ WORDLE SUBMIT & RESET HANDLERS
   ========================================================= */
function submitNurseWordle() {
    const game = window.nurseWordle;
    if (!game || game.finished) return;

    const resultDiv = document.getElementById("wordleResult");
    const guess = game.currentGuess;

    if (guess.length !== 5) {
        if (resultDiv) resultDiv.textContent = "Please enter a 5-letter word.";
        setupWordleInputBridge();
        return;
    }

    const guessUpper = guess.toUpperCase();
    if (game.words && !game.words.includes(guessUpper)) {
        if (resultDiv) resultDiv.innerHTML = `
            <div class="result-box infusion-final">
                ⚠️ ${guessUpper} not in the list.
            </div>
        `;

        setupWordleInputBridge();
        return;
    }

    const secret = game.secret.toUpperCase();
    const grid = document.getElementById("wordleGrid");
    const cells = grid.querySelectorAll(`.wordle-cell[data-row="${game.activeRow}"]`);

    const letterCounts = {};
    for (const char of secret) {
        letterCounts[char] = (letterCounts[char] || 0) + 1;
    }

    const statuses = Array(5).fill("absent");

    for (let i = 0; i < 5; i++) {
        if (guessUpper[i] === secret[i]) {
            statuses[i] = "correct";
            letterCounts[guessUpper[i]] -= 1;
        }
    }

    for (let i = 0; i < 5; i++) {
        if (statuses[i] === "correct") continue;
        const letter = guessUpper[i];
        if (letterCounts[letter] > 0) {
            statuses[i] = "present";
            letterCounts[letter] -= 1;
        }
    }

    cells.forEach((cell, i) => {
        cell.textContent = guessUpper[i];
        cell.classList.remove("filled");
        cell.classList.add(statuses[i]);
    });

    game.guesses.push({ guess: guessUpper, statuses });
    game.attempts += 1;

    if (guessUpper === secret) {
        game.finished = true;
        resultDiv.innerHTML = `
            <div class="result-box infusion-final">
                🎉 Great job! You guessed ${secret}.
            </div>
        `;

        return;
    }

    if (game.attempts >= game.maxAttempts) {
        game.finished = true;
        resultDiv.innerHTML = `
            <div class="result-box infusion-final">
                😩 Out of attempts — the word was ${secret}.
            </div>
        `;

        return;
    }

    game.activeRow += 1;
    game.currentGuess = "";

    if (resultDiv) resultDiv.textContent = "";
    updateWordleGrid();
    setupWordleInputBridge();
}

function resetNurseWordle() {
    const game = window.nurseWordle;
    if (!game) return;

    const newSecret = game.words[Math.floor(Math.random() * game.words.length)];
    Object.assign(game, {
        secret: newSecret,
        attempts: 0,
        guesses: [],
        activeRow: 0,
        currentGuess: "",
        finished: false
    });

    generateWordleGrid("wordleGrid");
    const resultDiv = document.getElementById("wordleResult");
    if (resultDiv) resultDiv.textContent = "";
    updateWordleGrid();
}



/* =========================================================
   3️⃣ RULES MODAL
   ========================================================= */
function showWordleRules() {
    const old = document.getElementById("wordleRulesModal");
    if (old) old.remove();

    const modal = document.createElement("div");
    modal.id = "wordleRulesModal";
    modal.className = "wordle-modal";

    modal.innerHTML = `
        <div class="wordle-modal-content">
            <button class="close-btn" onclick="document.getElementById('wordleRulesModal').remove()">×</button>
            <h3>🧩 How to Play Wordle</h3>

            <div class="wordle-example-grid">
                <div class="cell correct">C</div>
                <div class="cell present">A</div>
                <div class="cell absent">R</div>
                <div class="cell correct">E</div>
            </div>

            <div class="wordle-rules-text">
                <p>🟩 <strong>Green</strong>: Correct letter in the right place</p>
                <p>🟨 <strong>Yellow</strong>: Letter is in the word but wrong place</p>
                <p>⬛ <strong>Black</strong>: Letter not in the word</p>
                <p>You have <strong>6 tries</strong> to guess the 5-letter word.<br>
                Press <b>Enter</b> to submit, <b>Backspace</b> to delete.</p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}
