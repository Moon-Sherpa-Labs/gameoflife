// Game variables
let canvas;
let ctx;
let boardSize;
let cellSize;
let board = [];
let running = false;
let speed;
let animationFrameId;
let lastTimestamp = 0;
let selectedPattern = null;
let generation = 0;

// History of previous boards to detect oscillations
let boardHistory = [];
const maxHistoryLength = 10; // Adjust as needed

// Touch support variables
let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints;

// Patterns data
const patterns = {
  glider: {
    name: 'Glider',
    coordinates: [
      [1, 0], [2, 1], [0, 2], [1, 2], [2, 2]
    ],
    grid: [
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 1]
    ]
  },
  blinker: {
    name: 'Blinker',
    coordinates: [
      [0, 0], [1, 0], [2, 0]
    ],
    grid: [
      [1, 1, 1]
    ]
  },
  block: {
    name: 'Block',
    coordinates: [
      [0, 0], [1, 0],
      [0, 1], [1, 1]
    ],
    grid: [
      [1, 1],
      [1, 1]
    ]
  },
  lwss: {
    name: 'Lightweight Spaceship',
    coordinates: [
      [1, 0], [2, 0], [3, 0], [4, 0],
      [0, 1],
      [0, 3], [4, 1],
      [4, 2], [3, 3]
    ],
    grid: [
      [0, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [0, 0, 0, 0, 1],
      [0, 0, 0, 1, 0]
    ]
  }
  // Add other patterns similarly
};

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', () => {
  initializeGame();
});

function initializeGame() {
  // Get references to DOM elements
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  boardSize = parseInt(document.getElementById('boardSize').value) || 50;
  speed = parseInt(document.getElementById('speedRange').value) || 30;

  // Set initial cell size
  cellSize = canvas.width / boardSize;

  // Update speed display
  document.getElementById('speedDisplay').innerText = `Speed: ${speed}`;

  // Set up event listeners
  setupEventListeners();

  // Initialize game components
  resizeCanvas();
  initBoard();
  setupPatternSelector();
}

function setupEventListeners() {
  // Canvas click handler
  canvas.addEventListener('click', handleCanvasClick);

  if (isTouchDevice) {
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      handleCanvasClick(e);
    });
  }

  // Control buttons
  document.getElementById('setBoardSizeBtn').addEventListener('click', () => {
    boardSize = parseInt(document.getElementById('boardSize').value) || 50;
    cellSize = canvas.width / boardSize;
    initBoard();
  });

  document.getElementById('startBtn').addEventListener('click', startSimulation);
  document.getElementById('pauseBtn').addEventListener('click', pauseSimulation);
  document.getElementById('clearBtn').addEventListener('click', initBoard);
  document.getElementById('randomFillBtn').addEventListener('click', randomFillBoard);

  // Speed range input
  document.getElementById('speedRange').addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    document.getElementById('speedDisplay').innerText = `Speed: ${speed}`;
  });

  // Window resize
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth - 40, 600);
  canvas.height = canvas.width;
  cellSize = canvas.width / boardSize;
  drawBoard();
}

// Initialize the board
function initBoard() {
  board = [];
  for (let y = 0; y < boardSize; y++) {
    board[y] = [];
    for (let x = 0; x < boardSize; x++) {
      board[y][x] = 0;
    }
  }
  boardHistory = []; // Reset the history
  generation = 0;
  document.getElementById('generationDisplay').innerText = `Generation: ${generation}`;
  drawBoard();
}

// Draw the board
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      if (board[y][x] === 1) {
        ctx.fillStyle = '#00FF00'; // Alive cells
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
  drawGrid();
}

// Draw grid lines
function drawGrid() {
  ctx.strokeStyle = '#333';
  ctx.beginPath();
  for (let x = 0; x <= boardSize; x++) {
    ctx.moveTo(x * cellSize, 0);
    ctx.lineTo(x * cellSize, canvas.height);
  }
  for (let y = 0; y <= boardSize; y++) {
    ctx.moveTo(0, y * cellSize);
    ctx.lineTo(canvas.width, y * cellSize);
  }
  ctx.stroke();
}

// Handle cell toggling and pattern placement
function handleCanvasClick(e) {
  let rect = canvas.getBoundingClientRect();
  let clientX = e.clientX || e.touches[0].clientX;
  let clientY = e.clientY || e.touches[0].clientY;
  let x = Math.floor((clientX - rect.left) / cellSize);
  let y = Math.floor((clientY - rect.top) / cellSize);

  if (selectedPattern) {
    placePattern(selectedPattern, x, y);
    selectedPattern = null; // Reset selected pattern
    updatePatternSelectionUI();
  } else {
    board[y][x] = board[y][x] ? 0 : 1;
  }
  drawBoard();
}

// Start the simulation
function startSimulation() {
  if (!running) {
    running = true;
    lastTimestamp = 0;
    boardHistory = []; // Reset history when starting
    requestAnimationFrame(gameLoop);
  }
}

// Pause the simulation
function pauseSimulation() {
  running = false;
  cancelAnimationFrame(animationFrameId);
}

// Game loop using requestAnimationFrame
function gameLoop(timestamp) {
  if (!lastTimestamp || timestamp - lastTimestamp >= 1000 / speed) {
    updateBoard();
    drawBoard();
    lastTimestamp = timestamp;
  }
  if (running) {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

// Update the board state
function updateBoard() {
  let newBoard = [];
  for (let y = 0; y < boardSize; y++) {
    newBoard[y] = [];
    for (let x = 0; x < boardSize; x++) {
      let aliveNeighbors = countAliveNeighbors(x, y);
      if (board[y][x] === 1) {
        newBoard[y][x] = aliveNeighbors === 2 || aliveNeighbors === 3 ? 1 : 0;
      } else {
        newBoard[y][x] = aliveNeighbors === 3 ? 1 : 0;
      }
    }
  }

  // Add the new board to history
  boardHistory.push(JSON.stringify(newBoard));
  if (boardHistory.length > maxHistoryLength) {
    boardHistory.shift(); // Remove the oldest state
  }

  // Check for oscillations
  for (let i = 0; i < boardHistory.length - 1; i++) {
    if (boardHistory[i] === boardHistory[boardHistory.length - 1]) {
      pauseSimulation();
      alert('The board has reached an oscillating state.');
      break;
    }
  }

  board = newBoard;

  // Update generation
  generation++;
  document.getElementById('generationDisplay').innerText = `Generation: ${generation}`;
}

// Count alive neighbors with wrapping edges
function countAliveNeighbors(x, y) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      let nx = (x + j + boardSize) % boardSize;
      let ny = (y + i + boardSize) % boardSize;
      count += board[ny][nx];
    }
  }
  return count;
}

// Set up the pattern selector
function setupPatternSelector() {
  const patternCards = document.querySelectorAll('.pattern-card');
  patternCards.forEach((card) => {
    const patternKey = card.dataset.patternKey;
    const pattern = patterns[patternKey];
    const gridDiv = card.querySelector('.pattern-grid');

    // Clear any existing cells
    gridDiv.innerHTML = '';

    const patternData = pattern.data;
    const patternHeight = patternData.length;
    const patternWidth = patternData[0].length;

    // Set grid template columns based on pattern width
    gridDiv.style.gridTemplateColumns = `repeat(${patternWidth}, 1fr)`;

    // Create cells
    for (let y = 0; y < patternHeight; y++) {
      for (let x = 0; x < patternWidth; x++) {
        const cellDiv = document.createElement('div');
        cellDiv.classList.add('pattern-cell');
        if (patternData[y][x]) {
          cellDiv.classList.add('alive');
        }
        gridDiv.appendChild(cellDiv);
      }
    }

    // Add click event to select the pattern
    card.addEventListener('click', () => {
      selectedPattern = patternKey;
      updatePatternSelectionUI();
    });
  });
}

// Update pattern selection UI
function updatePatternSelectionUI() {
  const cards = document.querySelectorAll('.pattern-card');
  cards.forEach((card) => {
    if (card.dataset.patternKey === selectedPattern) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
}

// Place predefined patterns at specified coordinates
function placePattern(key, x, y) {
  const pattern = patterns[key];
  if (!pattern) return;

  const patternData = pattern.data;
  const patternHeight = patternData.length;
  const patternWidth = patternData[0].length;

  for (let i = 0; i < patternHeight; i++) {
    for (let j = 0; j < patternWidth; j++) {
      let px = (x + j) % boardSize;
      let py = (y + i) % boardSize;
      board[py][px] = patternData[i][j];
    }
  }
}

// Randomly fill the board
function randomFillBoard() {
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      board[y][x] = Math.random() > 0.5 ? 1 : 0;
    }
  }
  boardHistory = [];
  generation = 0;
  document.getElementById('generationDisplay').innerText = `Generation: ${generation}`;
  drawBoard();
}

// Function to place a pattern on the board
function placePattern(patternKey, startX, startY) {
  const pattern = patterns[patternKey];
  if (!pattern) return;

  pattern.forEach(([dx, dy]) => {
    const x = (startX + dx + boardSize) % boardSize;
    const y = (startY + dy + boardSize) % boardSize;
    board[y][x] = 1;
  });
  drawBoard();
}

// Event Listener for Pattern Cards
document.querySelectorAll('.pattern-card').forEach(card => {
  card.addEventListener('click', (e) => {
    const patternKey = card.getAttribute('data-pattern-key');

    // Get the center position of the board
    const startX = Math.floor(boardSize / 2);
    const startY = Math.floor(boardSize / 2);

    placePattern(patternKey, startX, startY);
  });
});