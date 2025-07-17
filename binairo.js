// === Spielfeld-Logik ===
let size = 6;
let numberRules = 10;
const board = [];
let puzzle = [];
let solution = [];
let additionalRules = [];
let timer = undefined;
let intervall = undefined;
let errors = [];
let counter = 0;
let undoStack = [];
let savedStates = [];
let toggleCheck = false;
let toggleAdvancedClick = true;

function saveState() {
  const state = board.map((row) => row.map((cell) => cell.dataset.color));
  const timestamp = new Date().toLocaleTimeString();
  savedStates.push({ state, timestamp });

  // Optional: UI-Liste aktualisieren
  updateSavedStatesUI();
}

function showSolution() {
  if (!solution || solution.length === 0) return;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = board[y][x];
      const color = solution[y][x];

      cell.dataset.color = color;
      cell.classList.remove("yellow", "blue", "error");
      if (color) cell.classList.add(color);
    }
  }

  updateCounters();
  updateValidation();
}

function highlightNextHint() {
  // Alte Hinweise entfernen
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      board[y][x].classList.remove("hint");
    }
  }

  // Suche ein deterministisches Feld basierend auf der Lösung
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!board[y][x].dataset.color) {
        const expected = solution[y][x];
        if (isDeterministic(puzzle, x, y, expected)) {
          board[y][x].classList.add("hint");
          return;
        }
      }
    }
  }
  if (errors.length > 0) {
    document.getElementById("message").textContent =
      "Aktuell sind Fehler vorhanden"+ errors.join("\n");

  } else {
    // Kein Hinweis gefunden
    document.getElementById("message").textContent =
      "Kein logischer Hinweis mehr möglich!";
  }
}

function restoreState(index) {
  const saved = savedStates[index];
  if (!saved) return;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = board[y][x];
      if (cell.dataset.fixed !== "true") {
        const color = saved.state[y][x];
        cell.dataset.color = color;
        cell.classList.remove("yellow", "blue", "error");
        if (color) cell.classList.add(color);
        puzzle[parseInt(cell.dataset.y)][parseInt(cell.dataset.x)] =
          cell.dataset.color;
      }
    }
  }

  updateCounters();
  updateValidation();
}
function updateSavedStatesUI() {
  const select = document.getElementById("saved-states");
  select.innerHTML = '<option value="">🔁 Zwischenstand wählen</option>';
  savedStates.forEach((entry, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `🔹 ${entry.timestamp}`;
    select.appendChild(option);
  });
}

function updateSettings() {
  size = Number(document.getElementById("board-size").value);
  if (size % 2 != 0) {
    size++;
    document.getElementById("board-size").value = size;
  }
  numberRules = Number(document.getElementById("rule-number").value);
  toggleCheck = document.getElementById("toggle-check").checked;
  toggleAdvancedClick = document.getElementById("toggle-click").checked;

  //console.log(`${toggleCheck}, ${toggleAdvancedClick}`)
}

function generateNew() {
  savedStates = [];
  updateSavedStatesUI();
  solution = generateSolution();
  additionalRules = generateAdditionalRules(solution, numberRules);
  puzzle = generatePuzzle(solution);
  renderBoard();
  timer = new Date();
  undoStack = [];
  counter = 0;
  document.getElementById("counter").textContent = counter;
  intervall = setInterval(() => {
    const time = Math.floor((new Date() - timer)/1000);
    const min = Math.floor(time/60); 
    const sek = time-min*60;
    document.getElementById("timer").innerText = `Zeit: ${String(min).padStart(2, '0')}:${String(sek).padStart(2, '0')}`;
  }, 1000);
}
function undoLastMove() {
  if (undoStack.length === 0) return;
  counter++;
  const last = undoStack.pop();
  const { x, y, color } = last;

  const cell = board[y][x];
  cell.dataset.color = color;
  cell.classList.remove("yellow", "blue", "error");
    puzzle[parseInt(cell.dataset.y)][parseInt(cell.dataset.x)] =
          cell.dataset.color;
  if (color) cell.classList.add(color);
  
  document.getElementById("counter").textContent = counter;
  updateCounters();
  validate();
}
function compareSolution() {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = board[y][x];
      if (cell.dataset.fixed != "true") {
        //cell.classList.remove("yellow", "blue", "error");
        //console.log(cell.dataset);
        cell.classList.remove("error", "hint")
        console.log(`x:${x} y:${y} solution:${solution[x][y]} board:${cell.dataset.color}`)
        if (cell.dataset.color === solution[x][y]) {
          //cell.classList.add("hint")
        }
        else if (cell.dataset.color != "") {
          cell.classList.add("error")
        }
        
      }
    }
  }
}

function resetBoard() {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = board[y][x];
      if (cell.dataset.fixed != "true") {
        cell.dataset.color = "";
        cell.classList.remove("yellow", "blue", "error");
        puzzle[parseInt(cell.dataset.y)][parseInt(cell.dataset.x)] =
          cell.dataset.color;
      }
    }
  }
  updateCounters();
  validate();
}
function validate() {
  const check = document.getElementById("toggle-check");
  errors = [];
  if (check && check.checked) {
    updateValidation();
  } else {
    document.getElementById("message").textContent = "Keine Validierung!";
  }
}
function handleCellClick(div) {
  if (div.dataset.fixed === "true") return;

  const currentColor = div.dataset.color;
  const x = Number(div.dataset.x);
  const y = Number(div.dataset.y);
  const previousColor = div.dataset.color;

  undoStack.push({ x, y, color: previousColor });
  

  // Wenn Zelle leer ist, Position des Klicks auswerten
  if (toggleAdvancedClick) {
    const rect = div.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const isTopLeft = clickX < rect.width / 2 && clickY < rect.height / 2;
    const isBottomRight = clickX >= rect.width / 2 && clickY >= rect.height / 2;

    if (isTopLeft) {
      div.classList.remove("blue");
      if (currentColor == "yellow") {
        div.classList.remove("yellow");
        div.dataset.color = "";
      } else {
        div.classList.add("yellow");
        div.dataset.color = "yellow";
      }
      counter++;
  document.getElementById("counter").textContent = counter;
    } else if (isBottomRight) {
      div.classList.remove("yellow");
      if (currentColor == "blue") {
        div.classList.remove("blue");
        div.dataset.color = "";
      } else {
        div.classList.add("blue");
        div.dataset.color = "blue";
      }
      counter++;
  document.getElementById("counter").textContent = counter;
    }
    // Wenn weder oben links noch unten rechts, keine Aktion
  } else {
    // Normales Umschaltverhalten: yellow → blue → leer → yellow...
    const next =
      currentColor === "yellow"
        ? "blue"
        : currentColor === "blue"
          ? ""
          : "yellow";
    div.classList.remove("yellow", "blue");
    if (next) div.classList.add(next);
    div.dataset.color = next;
  }
  puzzle[parseInt(div.dataset.y)][parseInt(div.dataset.x)] = div.dataset.color;
  updateCounters();
  const check = document.getElementById("toggle-check");
  if (check && check.checked) {
    updateValidation();
  } else {
    // 🧠 NEU: Nur prüfen, ob alle Felder gesetzt sind
    const allFilled = board.every((row) =>
      row.every((cell) => cell.dataset.color),
    );
    if (allFilled) {
      // 🚀 Nur wenn alle Felder gesetzt sind, Validierung forcieren
      //updateValidation();
    }
  }
}

function renderBoardRules() {
  const overlay =
    document.getElementById("rule-overlays") || document.createElement("div");
  overlay.id = "rule-overlays";
  overlay.innerHTML = "";
  document.getElementById("board-wrapper").appendChild(overlay);

  additionalRules.forEach((rule) => {
    const size = 24;
    const cellSize = 60;
    const [ax, ay] = rule.a;
    const [bx, by] = rule.b;
    const cellA = board[ay][ax];
    const cellB = board[by][bx];
    const rectA = cellA.getBoundingClientRect();
    const rectB = cellB.getBoundingClientRect();
    const parentRect = document.getElementById("board").getBoundingClientRect();

    const left = Math.min(rectA.left, rectB.left) - parentRect.left;
    const top = Math.min(rectA.top, rectB.top) - parentRect.top + 2;
    const width = Math.abs(rectA.left - rectB.left) + cellSize;
    const height = Math.abs(rectA.top - rectB.top) + cellSize;

    const box = document.createElement("div");
    box.className = `rule-box rule-${rule.type}`;
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    //box.style.width = `${width}px`;
    //box.style.height = `${height}px`;
    box.style.top = `${top + height / 2 - size / 2 - 1}px`;
    box.style.left = `${left + width / 2 - size / 2 + 1}px`;
    box.style.width = `${size}px`;
    box.style.height = `${size}px`;
    overlay.appendChild(box);
  });
}

function handleCellHover(div, event) {
  const rect = div.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  const width = rect.width;
  const height = rect.height;

  div.classList.remove("hover-yellow", "hover-blue");
  const inTopLeft = offsetX < width / 2 && offsetY < height / 2;
  const inBottomRight = offsetX > width / 2 && offsetY > height / 2;

if (inTopLeft) {
    //div.style.cursor = "cursor"; // für Gelb
    div.classList.add("hover-yellow");
  } else if (inBottomRight) {
    //div.style.cursor = "cursor"; // für Blau
    div.classList.add("hover-blue");
  } else {
    //div.style.cursor = "not-allowed"; // für „klick nicht eindeutig“
  }
}
function handleCellLeave(div, event) {
  div.classList.remove("hover-yellow", "hover-blue");
  div.style.cursor = "";
}


function renderBoard() {
  const boardEl = document.getElementById("board");
  const messageEl = document.getElementById("message");
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${size + 1}, 60px)`;
  boardEl.style.gridTemplateRows = `repeat(${size}, 60px)`;
  board.length = 0;
  messageEl.innerText = "";
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const div = document.createElement("div");
      div.className = "cell";
      div.dataset.x = x;
      div.dataset.y = y;
      const color = puzzle[y][x];
      //div.dataset.fixed = !!color;
      if (!!color) {
        div.dataset.fixed = !!color;
        div.className += " fixed";
      }
      else {
        div.onmousemove = (e) => handleCellHover(div, e);
      div.onmouseleave = (e) => handleCellLeave(div, e);
      
      }
      div.dataset.color = color || "";
      if (color) div.classList.add(color);
      div.onclick = (e) => handleCellClick(div, e);
      row.push(div);
      boardEl.appendChild(div);
    }
    const div = document.createElement("div");
    div.className = "row-counter";
    div.dataset.y = y;
    div.id = `row-count-${y}`;
    div.textContent = "? / ?";
    boardEl.appendChild(div);
    board.push(row);
  }
  for (let x = 0; x < size; x++) {
    const div = document.createElement("div");
    div.className = "col-counter";
    div.dataset.x = x;
    div.id = `col-count-${x}`;
    div.textContent = "? / ?";
    boardEl.appendChild(div);
  }
  renderBoardRules();

  updateCounters();
  //updateValidation();
  validate();
}

function updateCounters() {
  for (let y = 0; y < size; y++) {
    let b = 0,
      yel = 0;
    for (let x = 0; x < size; x++) {
      const c = board[y][x].dataset.color;
      if (c === "blue") b++;
      if (c === "yellow") yel++;
    }
    document.getElementById(`row-count-${y}`).textContent = `${b} / ${yel}`;
  }
  for (let x = 0; x < size; x++) {
    let b = 0,
      yel = 0;
    for (let y = 0; y < size; y++) {
      const c = board[y][x].dataset.color;
      if (c === "blue") b++;
      if (c === "yellow") yel++;
    }
    document.getElementById(`col-count-${x}`).textContent = `${b} / ${yel}`;
  }
}

function isBoardValid(puzzle, x = null, y = null, testColor = null) {
  const colors = ["yellow", "blue"];
  let original = null;
  if (x !== null && y !== null && testColor !== null) {
    original = puzzle[y][x];
    puzzle[y][x] = testColor;
  }

  try {
    // Farbbalance
    // Zählarrays initialisieren
    const rowCounts = Array(size)
      .fill(0)
      .map(() => ({ yellow: 0, blue: 0 }));
    const colCounts = Array(size)
      .fill(0)
      .map(() => ({ yellow: 0, blue: 0 }));

    // Board durchlaufen und zählen
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = puzzle[y][x];
        if (color === "yellow" || color === "blue") {
          rowCounts[y][color]++;
          colCounts[x][color]++;
        }
      }
    }

    // Validierung: keine Farbe darf mehr als size / 2 mal vorkommen
    for (let i = 0; i < size; i++) {
      if (
        rowCounts[i].yellow > size / 2 ||
        rowCounts[i].blue > size / 2 ||
        colCounts[i].yellow > size / 2 ||
        colCounts[i].blue > size / 2
      ) {
        const text = "Farben kommen zu oft in einer Spalte/Reihe vor!";
        if (
          errors.filter((x) => {
            return x == text;
          }).length == 0
        ) {
          errors.push(text);
        }
        return false;
      }
    }

    // 3 gleiche in Folge
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - 2; j++) {
        // Zeile prüfen
        const a = puzzle[i][j];
        const b = puzzle[i][j + 1];
        const c = puzzle[i][j + 2];
        if (a && a === b && b === c) {
          const text = "Es gibt eine Zeile mit 3 gleichen Farben";
          if (
            errors.filter((x) => {
              return x == text;
            }).length == 0
          ) {
            errors.push(text);
          }
          return false;
        }
        // Spalte prüfen
        const d = puzzle[j][i];
        const e = puzzle[j + 1][i];
        const f = puzzle[j + 2][i];
        if (d && d === e && e === f) {
          const text = "Es gibt eine Spalte mit 3 gleichen Farben";
          if (
            errors.filter((x) => {
              return x == text;
            }).length == 0
          ) {
            errors.push(text);
          }
          return false;
        }
      }
    }

    // Zusatzregeln prüfen
    for (let rule of additionalRules) {
      const [ax, ay] = rule.a;
      const [bx, by] = rule.b;
      const ca = x === ax && y === ay ? testColor : puzzle[ay][ax];
      const cb = x === bx && y === by ? testColor : puzzle[by][bx];

      if (ca && cb) {
        if (rule.type === "eq" && ca !== cb) {
          const text = "Es gibt eine Zusatzregel gleich die nicht erfüllt ist";
          if (
            errors.filter((x) => {
              return x == text;
            }).length == 0
          ) {
            errors.push(text);
          }
          return false;
        }
        if (rule.type === "neq" && ca === cb) {
          const text =
            "Es gibt eine Zusatzregel ungleich die nicht erfüllt ist";
          if (
            errors.filter((x) => {
              return x == text;
            }).length == 0
          ) {
            errors.push(text);
          }
          return false;
        }
      }
    }

    // Nochmal prüfen - eindeutigkeit war eigentlich keine Regel
    // Eindeutige vollständige Zeilen prüfen
    const fullRows = puzzle.filter((r) => r.every((c) => colors.includes(c)));
    const seenRows = new Set(fullRows.map((r) => r.join(",")));
    if (seenRows.size !== fullRows.length) {
      const text = "Es gibt doppelte Zeilen";
      if (
        errors.filter((x) => {
          return x == text;
        }).length == 0
      ) {
        errors.push(text);
      }

      return false;
    }
    // Eindeutige vollständige Spalten prüfen
    const fullCols = [];
    for (let i = 0; i < size; i++) {
      const col = puzzle.map((r) => r[i]);
      if (col.every((c) => colors.includes(c))) fullCols.push(col);
    }
    const seenCols = new Set(fullCols.map((c) => c.join(",")));
    if (seenCols.size !== fullCols.length) {
      const text = "Es gibt doppelte Spalten";
      if (
        errors.filter((x) => {
          return x == text;
        }).length == 0
      ) {
        errors.push(text);
      }
      return false;
    }
    return true;
  } finally {
    if (x !== null && y !== null && testColor !== null) {
      puzzle[y][x] = original;
    }
  }
}

function getImpliedColors(puzzle, x, y, initialColor) {
  const implied = new Map(); // key: "x,y", value: color
  const queue = [[x, y]];
  implied.set(`${x},${y}`, initialColor);

  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    const currentKey = `${cx},${cy}`;
    const currentColor = implied.get(currentKey);

    for (let rule of additionalRules) {
      const [ax, ay] = rule.a;
      const [bx, by] = rule.b;

      let pairs = [];

      if (`${ax},${ay}` === currentKey) {
        pairs.push([bx, by]);
      }
      if (`${bx},${by}` === currentKey) {
        pairs.push([ax, ay]);
      }

      for (let [nx, ny] of pairs) {
        const nKey = `${nx},${ny}`;
        if (implied.has(nKey)) continue;

        if (rule.type === "eq") {
          implied.set(nKey, currentColor);
          queue.push([nx, ny]);
        } else if (rule.type === "neq") {
          const otherColor = currentColor === "yellow" ? "blue" : "yellow";
          implied.set(nKey, otherColor);
          queue.push([nx, ny]);
        }
      }
    }
  }

  return implied;
}


function isDeterministic(puzzle, x, y, expected) {
  const original = puzzle[y][x];
  const guessColors = ["yellow", "blue"];
  let validOptions = 0;

  for (let color of guessColors) {
    // Simulation mit propagierten Farben
    const implied = getImpliedColors(puzzle, x, y, color);
    const tempBoard = puzzle.map((row) => row.slice());

    // Farben anwenden
    for (let [key, value] of implied.entries()) {
      const [ix, iy] = key.split(",").map(Number);
      tempBoard[iy][ix] = value;
    }

    // Gültigkeit prüfen für das ganze Board
    if (isBoardValid(tempBoard)) {
      validOptions++;
    }

    if (validOptions > 1) {
      puzzle[y][x] = original;
      return false;
    }
  }

  puzzle[y][x] = original;
  return true;
}


function updateValidation() {
  let allValid = true;
  let allFilled = true;
  let gameFinished = true;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = board[y][x];
      const color = cell.dataset.color;
      if (!color) {
        cell.classList.remove("error");
        allFilled = false;
        //allValid = false;
        gameFinished = false;
        continue;
      }
      const temp = puzzle[y][x];
      puzzle[y][x] = color;
      const valid = isBoardValid(puzzle, x, y, color);
      puzzle[y][x] = temp;
      cell.classList.toggle("error", !valid);
      if (!valid) {
        allValid = false;
        gameFinished = false;
      }
    }
  }
  const messageEl = document.getElementById("message");

  if (allValid) {
    messageEl.innerText = "Das Board enthält keine Fehler";
    errors = [];
    messageEl.classList.remove("error");
  } else {
    if (messageEl) {
      messageEl.innerText = "Das Board enthält Fehler:\n" + errors.join("\n");
      messageEl.classList.add("error");
    }
  }
  if (gameFinished && allValid) {
    if (messageEl) {
      messageEl.innerText =
        "🎉 Glückwunsch! Du hast das Rätsel korrekt gelöst!";
      messageEl.classList.add("solved");
      messageEl.classList.remove("error");
      clearInterval(intervall);
      debugger;
      const cells = document.getElementsByClassName("cell");
      for (let c of cells) {
        c.onmousemove = null;
        c.onmouseleave = null;
      }
    }
    // Interaktionen sperren
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        board[y][x].onclick = null;
      }
    }
  }
}

function copyLink() {
  const url = new URL(location.href);
  url.searchParams.set("size", size);
  navigator.clipboard.writeText(url.toString());
  alert("🔗 Link in Zwischenablage kopiert");
}

function generateSolution() {
  const board = Array.from({ length: size }, () => Array(size).fill(null));

  function backtrack(x = 0, y = 0) {
    if (y === size) return true;

    const nextX = (x + 1) % size;
    const nextY = nextX === 0 ? y + 1 : y;

    const colors = ["yellow", "blue"];
    shuffle(colors);
    for (let color of colors) {
      board[y][x] = color;
      if (isBoardValid(board, x, y, color)) {
        if (backtrack(nextX, nextY)) return true;
      }
      board[y][x] = null;
    }
    return false;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  if (!backtrack()) {
    console.error("Konnte keine gültige Lösung finden.");
    return generateSolution(); // Neustart bei Misserfolg
  }

  return board;
}

function generateAdditionalRules(fullSolution, numRules = 10) {
  const rules = [];
  const directions = [
    [1, 0], // rechts
    [0, 1], // unten
  ];
  const used = new Set();

  while (rules.length < numRules) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);

    const dir = directions[Math.floor(Math.random() * directions.length)];
    const nx = x + dir[0];
    const ny = y + dir[1];

    if (nx >= size || ny >= size) continue;

    const key = `${x},${y}-${nx},${ny}`;
    const revKey = `${nx},${ny}-${x},${y}`;
    if (used.has(key) || used.has(revKey)) continue;

    const color1 = fullSolution[y][x];
    const color2 = fullSolution[ny][nx];
    const type = color1 === color2 ? "eq" : "neq";
    rules.push({ a: [x, y], b: [nx, ny], type });
    used.add(key);
  }

  return rules;
}

function generatePuzzle(solution) {
  const puzzle = solution.map((row) => row.slice());
  const positions = [];
  const complexity = 5;
  const removeCount = size*2;

  // Liste aller Positionen zum Entfernen sammeln
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      positions.push([x, y]);
    }
  }

  for(let i = 0; i < complexity; i++) {

  // Zufällig mischen
  shuffleArray(positions);
  sublist = positions.splice(0, removeCount);
  for (let [x, y] of sublist) {
    const original = puzzle[y][x];
    puzzle[y][x] = null;

    // Versuche herauszufinden, ob es immer noch genau eine Lösung gibt
    if (!isUniqueSolution(puzzle, solution)) {
      // Falls nicht eindeutig, Feld wiederherstellen
      puzzle[y][x] = original;
      positions.push([x,y]);
    }
  }
  //console.log(`length: ${positions.length}`)
  }
  return puzzle;
}
function isUniqueSolution(puzzle, knownSolution) {
  let foundSolutions = 0;
  const working = puzzle.map((row) => row.slice());

  function backtrack(x = 0, y = 0) {
    if (y === size) {
      // Eine vollständige Lösung gefunden
      foundSolutions++;
      // Wenn wir mehr als 1 Lösung finden, abbrechen
      return foundSolutions < 2;
    }

    const nextX = (x + 1) % size;
    const nextY = nextX === 0 ? y + 1 : y;

    if (working[y][x]) {
      return backtrack(nextX, nextY);
    }

    for (let color of ["yellow", "blue"]) {
      working[y][x] = color;
      if (isBoardValid(working, x, y, color)) {
        if (!backtrack(nextX, nextY)) {
          working[y][x] = null;
          return false;
        }
      }
      working[y][x] = null;
    }

    return true;
  }

  return backtrack();
}

function generatePuzzleOld(solution) {
  const complexity = 5;
  let removed = 0;
  const puzzle = solution.map((row) => row.slice());
  const positions = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      positions.push([x, y]);
    }
  }
  
for (let i = 0; i < complexity; i++) {
  shuffleArray(positions);
  removed = 0;
  for (let [x, y] of positions) {
    
    const color = puzzle[x][y];
    puzzle[x][y] = null;
    if (!isDeterministic(puzzle, x, y, color)) {
      puzzle[x][y] = color;
    }
    else if (puzzle[x][y] == null) {
      removed++;
      console.log({x:x, y:y})
    }
  }
  console.log(`${i} - ${removed}`)
  
}
  return puzzle;
}
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
// Spiel starten
generateNew();
