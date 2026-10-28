
const W = 540;
const H = 960;

const COLS = 10;
const ROWS = 20;
const CELL = 27;

const BOARD_X = (W - COLS * CELL) / 2;
const BOARD_Y = 190;

let chocolate = {};
let board = [];
let currentPiece;
let nextPiece;
let gameFont;

let score = 0;
let lines = 0;
let level = 1;

let gameState = "menu";
let fallTimer = 0;
let fallInterval = 700;

let particles = [];
let clearRowsPending = [];
let clearAnimationUntil = 0;

let themeIndex = 0;
let lastTime = 0;

// Hintergrundfarben: Rot und Grün sind deine Originalfarben.
// Die anderen drei sind vorläufige Platzhalter.
const themes = [
  { name: "MARZIPAN", color: "#E5183C" },
  { name: "NUSS", color: "#6bb53d" },
  { name: "KNUSPERFLAKES", color: "#efbe08" },
  { name: "ALPENMILCH", color: "#376DAD" },
  { name: "ERDBEERE", color: "#E99AB2" }
];

// Jede Form besteht aus genau einer Schokoladensorte.
// Die Bilder werden nicht eingefärbt oder miteinander gemischt.
const shapes = [
  {
    name: "I",
    cells: [[0,0],[1,0],[2,0],[3,0]],
    image: "dark"
  },
  {
    name: "O",
    cells: [[0,0],[1,0],[0,1],[1,1]],
    image: "milk"
  },
  {
    name: "T",
    cells: [[0,0],[1,0],[2,0],[1,1]],
    image: "white"
  },
  {
    name: "S",
    cells: [[1,0],[2,0],[0,1],[1,1]],
    image: "milk"
  },
  {
    name: "Z",
    cells: [[0,0],[1,0],[1,1],[2,1]],
    image: "dark"
  },
  {
    name: "J",
    cells: [[0,0],[0,1],[1,1],[2,1]],
    image: "white"
  },
  {
    name: "L",
    cells: [[2,0],[0,1],[1,1],[2,1]],
    image: "milk"
  }
];


async function setup() {
  createCanvas(W, H);
  fitCanvasToScreen();
  setupTouchControls();

  imageMode(CORNER);
  gameFont = await loadFont("GOTHICB.TTF");
  textFont(gameFont);
  noStroke();

  try {
    chocolate.milk = await loadImage("Vollmilchstück.png");
    chocolate.dark = await loadImage("dunkle Schoki.png");
    chocolate.white = await loadImage("weiße Schoki.png");

    resetGame();

  } catch (error) {
    console.error("Fehler beim Laden der Schokobilder:", error);
  }
}

function resetGame() {
  board = [];

  for (let y = 0; y < ROWS; y++) {
    board.push(Array(COLS).fill(null));
  }

  score = 0;
  lines = 0;
  level = 1;
  fallTimer = 0;
  fallInterval = 700;

  particles = [];
  clearRowsPending = [];
  clearAnimationUntil = 0;

  nextPiece = makePiece();
  spawnPiece();

  gameState = "playing";
}

function makePiece() {
  const definition = random(shapes);

  return {
    name: definition.name,
    cells: definition.cells.map(c => [...c]),
    image: definition.image,
    x: 3,
    y: 0
  };
}

function spawnPiece() {
  currentPiece = nextPiece;
  currentPiece.x = 3;
  currentPiece.y = 0;

  nextPiece = makePiece();

  if (collides(currentPiece, 0, 0, currentPiece.cells)) {
    gameState = "over";
  }
}

function draw() {
  const dt = min(deltaTime, 50);
  lastTime += dt;

  background(themes[themeIndex].color);

  drawHeader();
  drawBoard();
  drawParticles();
  drawNextPiece();
  drawFooter();

  if (gameState === "playing") {
    if (millis() >= clearAnimationUntil) {
      if (clearRowsPending.length > 0) {
        finishRowClear();
      }

      if (clearRowsPending.length === 0) {
        fallTimer += dt;

        if (fallTimer >= fallInterval) {
          fallTimer = 0;
          stepDown();
        }
      }
    }

    if (clearRowsPending.length > 0) {
      drawClearingRows();
    }
  }

  if (gameState === "menu") {
    drawOverlay(
      "SCHOKO TETRIS",
      "Ordne deine Schokowürfel!",
      "ENTER ZUM STARTEN"
    );
  }

  if (gameState === "over") {
    drawOverlay(
      "GAME OVER",
      "Punkte: " + score,
      "ENTER ZUM NOCHMAL SPIELEN"
    );
  }
}

function drawHeader() {
  fill(255);
  textAlign(CENTER, CENTER);

  textSize(18);
  textStyle(BOLD);
  text("RITTER SPORT", W / 2, 35);

  textSize(34);
  text("SCHOKO TETRIS", W / 2, 75);

  textStyle(NORMAL);
  textSize(14);
  text(themes[themeIndex].name, W / 2, 113);

  textSize(16);
  text("PUNKTE   " + score, W / 2, 145);

  textSize(12);
  text("REIHEN  " + lines + "     LEVEL  " + level, W / 2, 169);
}

function drawBoard() {
  // Dunkles, leicht transparentes Spielfeld
  fill(0, 0, 0, 65);
  rect(BOARD_X - 5, BOARD_Y - 5, COLS * CELL + 10, ROWS * CELL + 10, 7);

  // Rasterlinien
  stroke(255, 255, 255, 24);
  strokeWeight(1);

  for (let x = 0; x <= COLS; x++) {
    line(
      BOARD_X + x * CELL,
      BOARD_Y,
      BOARD_X + x * CELL,
      BOARD_Y + ROWS * CELL
    );
  }

  for (let y = 0; y <= ROWS; y++) {
    line(
      BOARD_X,
      BOARD_Y + y * CELL,
      BOARD_X + COLS * CELL,
      BOARD_Y + y * CELL
    );
  }

  noStroke();

  // Bereits gestapelte Würfel
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x]) {
        drawChocolateCube(
          BOARD_X + x * CELL,
          BOARD_Y + y * CELL,
          CELL,
          board[y][x]
        );
      }
    }
  }

  if (currentPiece && gameState === "playing") {
    // Schatten zeigt, wo der Stein landen wird.
    const ghostY = getGhostY(currentPiece);

    for (const [cx, cy] of currentPiece.cells) {
      const x = currentPiece.x + cx;
      const y = ghostY + cy;

      if (y >= 0) {
        noFill();
        stroke(255, 255, 255, 90);
        strokeWeight(1.5);
        rect(
          BOARD_X + x * CELL + 3,
          BOARD_Y + y * CELL + 3,
          CELL - 6,
          CELL - 6,
          4
        );
        noStroke();
      }
    }

    // Aktuell fallende Form
    for (const [cx, cy] of currentPiece.cells) {
      const x = currentPiece.x + cx;
      const y = currentPiece.y + cy;

      if (y >= 0) {
        drawChocolateCube(
          BOARD_X + x * CELL,
          BOARD_Y + y * CELL,
          CELL,
          currentPiece.image
        );
      }
    }
  }
}

function drawChocolateCube(x, y, size, imageKey) {
  const img = chocolate[imageKey];

  if (img && img.width > 0) {
    // Die Originaltextur bleibt erhalten.
    image(img, x + 1, y + 1, size - 2, size - 2);
  } else {
    // Fallback, falls ein Bild nicht geladen wurde.
    fill(100, 55, 35);
    rect(x + 1, y + 1, size - 2, size - 2, 4);
  }
}

function drawNextPiece() {
  if (!nextPiece) return;

  const centerX = W / 2;
  const topY = 745;
  const previewCell = 20;

  fill(255);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(13);
  text("NÄCHSTE FORM", centerX, 723);
  textStyle(NORMAL);

  const maxX = max(...nextPiece.cells.map(c => c[0])) + 1;
  const maxY = max(...nextPiece.cells.map(c => c[1])) + 1;

  const startX = centerX - maxX * previewCell / 2;
  const startY = topY;

  for (const [cx, cy] of nextPiece.cells) {
    drawChocolateCube(
      startX + cx * previewCell,
      startY + cy * previewCell,
      previewCell,
      nextPiece.image
    );
  }
}


function drawFooter() {
  fill(255, 235);
  textAlign(CENTER, CENTER);
  textSize(12);

  text("← → BEWEGEN     ↑ DREHEN     ↓ SCHNELLER", W / 2, 830);
  text("LEERTASTE: SOFORT FALLEN", W / 2, 852);

  textSize(11);
  text("HINTERGRUND ÄNDERN", W / 2, 880);

  const buttonWidth = 42;
  const buttonHeight = 28;
  const gap = 10;
  const totalWidth = 5 * buttonWidth + 4 * gap;
  const startX = (W - totalWidth) / 2;
  const buttonY = 895;

  for (let i = 0; i < 5; i++) {
    fill(themes[i].color);
    stroke(255);
    strokeWeight(themeIndex === i ? 3 : 1);

    rect(
      startX + i * (buttonWidth + gap),
      buttonY,
      buttonWidth,
      buttonHeight,
      5
    );

    noStroke();
    fill(255);
    textSize(14);
    text(
      String(i + 1),
      startX + i * (buttonWidth + gap) + buttonWidth / 2,
      buttonY + buttonHeight / 2
    );
  }
}

function drawOverlay(title, subtitle, instruction) {
  fill(0, 0, 0, 175);
  rect(0, 0, W, H);

  fill(255);
  textAlign(CENTER, CENTER);

  textStyle(BOLD);
  textSize(36);
  text(title, W / 2, H / 2 - 65);

  textStyle(NORMAL);
  textSize(17);
  text(subtitle, W / 2, H / 2 - 18);

  textSize(13);
  text(instruction, W / 2, H / 2 + 35);

  textSize(12);
 // text("Hintergrund mit 1–5 wählen", W / 2, H / 2 + 68);
}

function collides(piece, dx, dy, cells) {
  for (const [cx, cy] of cells) {
    const x = piece.x + cx + dx;
    const y = piece.y + cy + dy;

    if (x < 0 || x >= COLS || y >= ROWS) return true;

    if (y >= 0 && board[y][x] !== null) return true;
  }

  return false;
}

function stepDown() {
  if (!currentPiece || clearRowsPending.length > 0) return;

  if (!collides(currentPiece, 0, 1, currentPiece.cells)) {
    currentPiece.y++;
  } else {
    lockPiece();
  }
}

function lockPiece() {
  for (const [cx, cy] of currentPiece.cells) {
    const x = currentPiece.x + cx;
    const y = currentPiece.y + cy;

    if (y < 0) {
      gameState = "over";
      return;
    }

    board[y][x] = currentPiece.image;
  }

  checkFullRows();

  if (clearRowsPending.length === 0) {
    spawnPiece();
  }
}

function checkFullRows() {
  clearRowsPending = [];

  for (let y = 0; y < ROWS; y++) {
    if (board[y].every(cell => cell !== null)) {
      clearRowsPending.push(y);
    }
  }

  if (clearRowsPending.length === 0) return;

  // Für jeden Würfel der vollen Reihen Schokobrösel erzeugen.
  for (const row of clearRowsPending) {
    for (let x = 0; x < COLS; x++) {
      const px = BOARD_X + x * CELL + CELL / 2;
      const py = BOARD_Y + row * CELL + CELL / 2;

      createCrumbs(px, py, board[row][x]);
    }
  }

  const count = clearRowsPending.length;

  score += [0, 100, 300, 500, 800][count] * level;
  lines += count;
  level = floor(lines / 10) + 1;
  fallInterval = max(100, 700 - (level - 1) * 55);

  // Kurze Verzögerung für den Zerbröckel-Effekt.
  clearAnimationUntil = millis() + 420;
}

function drawClearingRows() {
  const remaining = max(0, clearAnimationUntil - millis());
  const alpha = map(remaining, 420, 0, 255, 0);

  noStroke();
  fill(255, alpha * 0.5);

  for (const row of clearRowsPending) {
    rect(
      BOARD_X,
      BOARD_Y + row * CELL,
      COLS * CELL,
      CELL
    );
  }
}

function finishRowClear() {
  const cleared = new Set(clearRowsPending);

  board = board.filter((row, index) => !cleared.has(index));

  while (board.length < ROWS) {
    board.unshift(Array(COLS).fill(null));
  }

  clearRowsPending = [];
  clearAnimationUntil = 0;

  spawnPiece();
}

function createCrumbs(x, y, imageKey) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: x + random(-8, 8),
      y: y + random(-8, 8),
      vx: random(-3.5, 3.5),
      vy: random(-4, 1),
      size: random(2, 6),
      life: 255,
      image: imageKey,
      rotation: random(TWO_PI),
      spin: random(-0.15, 0.15)
    });
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.vx *= 0.99;
    p.rotation += p.spin;
    p.life -= 5;

    push();
    translate(p.x, p.y);
    rotate(p.rotation);
    tint(255, max(0, p.life));

    const img = chocolate[p.image];

    if (img && img.width > 0) {
      imageMode(CENTER);
      image(img, 0, 0, p.size, p.size);
      imageMode(CORNER);
    } else {
      noStroke();
      fill(90, 45, 25, p.life);
      rectMode(CENTER);
      rect(0, 0, p.size, p.size);
      rectMode(CORNER);
    }

    noTint();
    pop();

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function getGhostY(piece) {
  let y = piece.y;

  while (!collides(piece, 0, y - piece.y + 1, piece.cells)) {
    y++;
  }

  return y;
}

function rotatePiece() {
  if (!currentPiece || clearRowsPending.length > 0) return;

  const rotated = currentPiece.cells.map(([x, y]) => [y, -x]);

  const minX = min(...rotated.map(c => c[0]));
  const minY = min(...rotated.map(c => c[1]));

  const normalized = rotated.map(([x, y]) => [x - minX, y - minY]);

  if (!collides(currentPiece, 0, 0, normalized)) {
    currentPiece.cells = normalized;
  }
}


let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

function setupTouchControls() {
  const canvas = document.querySelector("canvas");
  if (!canvas || canvas.dataset.touchReady) return;

  canvas.dataset.touchReady = "true";
  canvas.style.touchAction = "none";

  canvas.addEventListener("pointerdown", function(event) {
    if (event.pointerType !== "touch") return;

    event.preventDefault();

    const rect = canvas.getBoundingClientRect();

    touchStartX = (event.clientX - rect.left) * W / rect.width;
    touchStartY = (event.clientY - rect.top) * H / rect.height;
    touchStartTime = performance.now();
  });

  canvas.addEventListener("pointerup", function(event) {
    if (event.pointerType !== "touch") return;

    event.preventDefault();

    const rect = canvas.getBoundingClientRect();

    const endX = (event.clientX - rect.left) * W / rect.width;
    const endY = (event.clientY - rect.top) * H / rect.height;

    // Farbbuttons antippen
    const buttonWidth = 42;
    const buttonHeight = 28;
    const gap = 10;
    const totalWidth = 5 * buttonWidth + 4 * gap;
    const startX = (W - totalWidth) / 2;
    const buttonY = 895;

    if (
  endY >= buttonY &&
  endY <= buttonY + buttonHeight &&
  endX >= startX &&
  endX <= startX + totalWidth
) {
      const relativeX = endX - startX;
      const buttonIndex = Math.floor(relativeX / (buttonWidth + gap));

      if (
        buttonIndex >= 0 &&
        buttonIndex < 5 &&
        relativeX % (buttonWidth + gap) <= buttonWidth
      ) {
        themeIndex = buttonIndex;
      }

      return;
    }

  if (gameState === "gameover") {
  startGame();
  return;
}

if (gameState === "over" || gameState === "menu") {
  startGame();
  return;
}

if (gameState !== "playing" || clearRowsPending.length > 0) return;

    const dx = endX - touchStartX;
    const dy = endY - touchStartY;
    const duration = performance.now() - touchStartTime;

    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      rotatePiece();
    } else if (Math.abs(dx) > Math.abs(dy)) {
      const direction = dx < 0 ? -1 : 1;
      const steps = Math.max(1, Math.round(Math.abs(dx) / 35));

      for (let i = 0; i < steps; i++) {
        if (collides(currentPiece, direction, 0, currentPiece.cells)) break;
        currentPiece.x += direction;
      }
    } else if (dy > 0) {
      if (duration > 500 && dy > 100) {
        while (!collides(currentPiece, 0, 1, currentPiece.cells)) {
          currentPiece.y++;
        }
        lockPiece();
      } else {
        const steps = Math.max(1, Math.round(dy / 35));

        for (let i = 0; i < steps; i++) {
          stepDown();
          if (gameState !== "playing") break;
        }
      }
    } else {
      rotatePiece();
    }
  });
}



function keyPressed(event) {
  // Neustart oder Spiel starten
  if (gameState === "menu" || gameState === "over") {
    if (event.key === "Enter" || event.code === "Space") {
      resetGame();
      return false;
    }
  }

  // Neustart mit R
  if (event.key.toLowerCase() === "r") {
    resetGame();
    return false;
  }

  // Hintergrundfarbe mit 1 bis 5 ändern
  if (event.key >= "1" && event.key <= "5") {
    themeIndex = Number(event.key) - 1;
    return false;
  }

  // Steuerung nur während des Spiels
  if (gameState !== "playing" || clearRowsPending.length > 0) {
    return false;
  }

  // Nach links
  if (event.code === "ArrowLeft") {
    if (!collides(currentPiece, -1, 0, currentPiece.cells)) {
      currentPiece.x--;
    }
  }

  // Nach rechts
  if (event.code === "ArrowRight") {
    if (!collides(currentPiece, 1, 0, currentPiece.cells)) {
      currentPiece.x++;
    }
  }

  // Schneller nach unten
  if (event.code === "ArrowDown") {
    stepDown();
  }

  // Drehen
  if (event.code === "ArrowUp") {
    rotatePiece();
  }

  // Sofort nach unten fallen lassen
  if (event.code === "Space") {
    while (!collides(currentPiece, 0, 1, currentPiece.cells)) {
      currentPiece.y++;
    }
    lockPiece();
  }

  return false;
  
}


function windowResized() {
  fitCanvasToScreen();
}


function fitCanvasToScreen() {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;

  const scale = Math.min(
    window.innerWidth / W,
    window.innerHeight / H
  );

  canvas.style.position = "fixed";
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
  canvas.style.left = "50%";
  canvas.style.top = "50%";
  canvas.style.margin = "0";
  canvas.style.transform = "translate(-50%, -50%)";
  canvas.style.display = "block";
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";

  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.width = "100%";
  document.body.style.height = "100%";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#111";
}
