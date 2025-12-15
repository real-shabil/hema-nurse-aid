/* =========================================================
   🎮 NURSE WORDLE — JSON-DRIVEN VERSION
   ========================================================= */


/* =========================================================
   1️⃣ LOAD & INITIALIZE GAME
   ========================================================= */
async function loadWordle(container) {
    console.log("[Wordle] loadWordle called with container:", container);

    if (!container) {
        console.error("[Wordle] ❌ No container passed to loadWordle.");
        return;
    }

    try {
        console.log("[Wordle] Fetching data/gamesData.json...");
        const res = await fetch("data/gamesData.json");

        console.log("[Wordle] fetch() response:", res.status, res.statusText);

        // Optional: warn if not OK (404, 500, etc.)
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} while loading gamesData.json`);
        }

        const data = await res.json();
        console.log("[Wordle] Parsed JSON:", data);

        const gameData = data.wordle;
        if (!gameData) {
            throw new Error("gamesData.json[wordle] not found.");
        }

        const words = (gameData.words || []).map(w => w.toUpperCase());
        console.log("[Wordle] words list length:", words.length);

        if (!words.length) {
            throw new Error("No words available for Wordle.");
        }

        const secretWord = words[Math.floor(Math.random() * words.length)];
        console.log("[Wordle] Secret word selected (hidden):", secretWord);

        // Global object for tracking progress
        window.wordle = {
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
                <h3 class="wordle-header">
                    🧩 ${gameData.title || "Wordle"}
                    <button class="info-btn" type="button" onclick="showWordleRules()">?</button>
                </h3>
                <p class="wordle-hint">${gameData.description || ""}</p>
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
                    <button type="button" class="btn-enter" id="wordleEnterBtn">Enter</button>
                    <button type="button" class="btn-clear" id="wordleResetBtn">Reset</button>
                </div>
                <div id="wordleResult" class="calc-result info-panel" style="margin-top:16px;"></div>
            </div>
        `;



        console.log("[Wordle] UI rendered. Initializing grid & input bridge...");

        // ✅ Create grid and enable keyboard control
        generateWordleGrid("wordleGrid");
        setupWordleInputBridge();

        // 🔘 Wire Enter + Reset buttons in a safe, mobile-friendly way
        const enterBtn = container.querySelector("#wordleEnterBtn");
        const resetBtn = container.querySelector("#wordleResetBtn");

        if (enterBtn && !enterBtn.__bound) {
            enterBtn.addEventListener("click", (e) => {
                e.preventDefault();
                if (typeof submitWordle === "function") {
                    submitWordle();
                }
            });
            enterBtn.__bound = true;
        }

        if (resetBtn && !resetBtn.__bound) {
            resetBtn.addEventListener("click", (e) => {
                e.preventDefault();
                if (typeof resetWordle === "function") {
                    resetWordle();
                }
            });
            resetBtn.__bound = true;
        }


        if (!window.wordleKeyListenerAdded) {
            document.addEventListener("keydown", handleWordleKey);
            window.wordleKeyListenerAdded = true;
            console.log("[Wordle] Global keydown listener attached.");
        }

        const resultDiv = document.getElementById("wordleResult");
        if (resultDiv) resultDiv.textContent = "";

        console.log("[Wordle] Initialization complete.");
    } catch (err) {
        console.error("❌ [Wordle] Error loading gamesData.json:", err);
        container.innerHTML = `
            <div class="wordle-error">
                <p>Failed to load game data.</p>
                <p><small>${err.message}</small></p>
            </div>
        `;
    }
}


/* =========================================================
   2️⃣ WORDLE GRID GENERATOR
   ========================================================= */
function generateWordleGrid(targetDivId, rows = 6, cols = 5) {
    const gridDiv = document.getElementById(targetDivId);
    if (!gridDiv) {
        console.error("[Wordle] ❌ generateWordleGrid: target div not found:", targetDivId);
        return;
    }

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

    console.log("[Wordle] Grid generated:", rows, "rows ×", cols, "cols");
}

/* =========================================================
   ⌨️ ON-SCREEN KEYBOARD (BUILD + HANDLER)
   ========================================================= */
function buildWordleKeyboard() {
    const kb = document.getElementById("wordleKeyboard");
    if (!kb) {
        console.error("[Wordle] ❌ wordleKeyboard div not found.");
        return;
    }

    kb.innerHTML = "";

    const rows = [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"]
    ];

    rows.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "wordle-key-row";

        row.forEach(key => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "wordle-key";
            btn.dataset.key = key;

            if (key === "ENTER") {
                btn.classList.add("wordle-key--enter");
                btn.textContent = "Enter";
            } else if (key === "BACKSPACE") {
                btn.classList.add("wordle-key--backspace");
                btn.textContent = "⌫";
            } else {
                btn.textContent = key;
            }

            btn.addEventListener("click", () => handleVirtualKey(key));
            rowDiv.appendChild(btn);
        });

        kb.appendChild(rowDiv);
    });

    // Hidden by default; will be shown on first tap/click.
    kb.classList.remove("visible");
}


/* =========================================================
   🔠 WORDLE KEY HANDLER — LIVE INPUT MANAGEMENT
   ========================================================= */
function handleWordleKey(event) {
    const game = window.wordle;
    if (!game || game.finished) return;

    const key = event.key.toUpperCase();

    if (key === "BACKSPACE") {
        game.currentGuess = game.currentGuess.slice(0, -1);
    } else if (/^[A-Z]$/.test(key) && game.currentGuess.length < 5) {
        game.currentGuess += key;
    } else if (key === "ENTER") {
        submitWordle();
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

    const game = window.wordle;
    if (!game) return;

    const { currentGuess, activeRow, finished } = game;
    const rowCells = grid.querySelectorAll(`.wordle-cell[data-row="${activeRow}"]`);

    // Remove previous cursor
    grid.querySelectorAll(".wordle-cell.cursor").forEach(cell =>
        cell.classList.remove("cursor")
    );

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

    if (!input || !grid) {
        console.error("[Wordle] ❌ setupWordleInputBridge: missing input or grid");
        return;
    }

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
        grid.addEventListener("click", focusInput);  // already present

        container.__wordleFocusBound = true;
    }


    input.value = "";
    focusInput();
}


/* =========================================================
   ✅ WORDLE SUBMIT & RESET HANDLERS
   ========================================================= */
function submitWordle() {
    const game = window.wordle;
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
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="result-box infusion-final">
                    ⚠️ ${guessUpper} not in the list.
                </div>
            `;
        }
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

    // First pass: correct positions
    for (let i = 0; i < 5; i++) {
        if (guessUpper[i] === secret[i]) {
            statuses[i] = "correct";
            letterCounts[guessUpper[i]] -= 1;
        }
    }

    // Second pass: present but wrong position
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
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="result-box infusion-final">
                    🎉 Great job! You guessed ${secret}.
                </div>
            `;
        }
        return;
    }

    if (game.attempts >= game.maxAttempts) {
        game.finished = true;
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="result-box infusion-final">
                    😩 Out of attempts — the word was ${secret}.
                </div>
            `;
        }
        return;
    }

    game.activeRow += 1;
    game.currentGuess = "";

    if (resultDiv) resultDiv.textContent = "";
    updateWordleGrid();
    setupWordleInputBridge();
}

function updateKeyboardColors(guess, statuses) {
    const kb = document.getElementById("wordleKeyboard");
    if (!kb) return;

    const priority = { absent: 0, present: 1, correct: 2 };

    for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        const status = statuses[i];

        const keyBtn = kb.querySelector(`.wordle-key[data-key="${letter}"]`);
        if (!keyBtn) continue;

        const current = keyBtn.dataset.state;
        if (current && priority[current] >= priority[status]) {
            // Don't downgrade a better state (e.g. correct → present)
            continue;
        }

        keyBtn.dataset.state = status;
        keyBtn.classList.remove("correct", "present", "absent");
        if (status === "correct" || status === "present" || status === "absent") {
            keyBtn.classList.add(status);
        }
    }
}


function resetWordle() {
    const game = window.wordle;
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

function showWordleKeyboard() {
    const kb = document.getElementById("wordleKeyboard");
    if (!kb) return;
    kb.classList.add("visible");
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
            <button class="close-btn" type="button"
                onclick="document.getElementById('wordleRulesModal').remove()">
                ×
            </button>
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
                <p>⬛ <strong>Grey</strong>: Letter not in the word</p>
                <p>You have <strong>6 tries</strong> to guess the 5-letter word.<br>
                Press <b>Enter</b> to submit, <b>Backspace</b> to delete.</p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}



/* =========================================================
   EXPORT LOADER GLOBALLY
   ========================================================= */
window.loadWordle = loadWordle;
window.resetWordle = resetWordle;
window.submitWordle = submitWordle;
