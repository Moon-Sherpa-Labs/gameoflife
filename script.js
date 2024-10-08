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
let populationData = [];
let populationChart;

// History of previous boards to detect oscillations
let boardHistory = [];
const maxHistoryLength = 10; // Adjust as needed

// Touch support variables
let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints;

// Patterns data
const patterns = {
  glider: {
    name: 'Glider',
    data: [
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
  lwss: {
    name: 'Lightweight Spaceship',
    data: [
      [0, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [0, 0, 0, 0, 1],
      [1, 0, 0, 1, 0],
    ],
  },
  blinker: {
    name: 'Blinker',
    data: [
      [1],
      [1],
      [1],
    ],
  },
  block: {
    name: 'Block',
    data: [
      [1, 1],
      [1, 1],
    ],
  },
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
  generatePatternSelector();
  setupChart();
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
  populationData = [];
  document.getElementById('generationDisplay').innerText = `Generation: ${generation}`;
  if (populationChart) {
    populationChart.data.labels = [];
    populationChart.data.datasets[0].data = [];
    populationChart.update();
  }
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

  // Update generation and population data
  generation++;
  document.getElementById('generationDisplay').innerText = `Generation: ${generation}`;

  const livingCells = countLivingCells();
  populationData.push({ generation: generation, livingCells: livingCells });

  updateChart();
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

// Count the total number of living cells
function countLivingCells() {
  let count = 0;
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      if (board[y][x]) count++;
    }
  }
  return count;
}

// Generate pattern selector UI
function generatePatternSelector() {
  const patternSelector = document.getElementById('patternSelector');
  patternSelector.innerHTML = ''; // Clear existing patterns
  for (const key in patterns) {
    const pattern = patterns[key];
    const card = document.createElement('div');
    card.classList.add('pattern-card');
    card.dataset.patternKey = key;

    // Generate pattern preview canvas
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 80;
    previewCanvas.height = 80;
    const previewCtx = previewCanvas.getContext('2d');
    const patternData = pattern.data;
    const maxDimension = Math.max(patternData.length, patternData[0].length);
    const cellSize = 70 / maxDimension;
    const offsetX = (80 - patternData[0].length * cellSize) / 2;
    const offsetY = (80 - patternData.length * cellSize) / 2;
    for (let y = 0; y < patternData.length; y++) {
      for (let x = 0; x < patternData[y].length; x++) {
        if (patternData[y][x]) {
          previewCtx.fillStyle = '#00FF00';
          previewCtx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
        }
      }
    }
    previewCtx.strokeStyle = '#333';
    previewCtx.strokeRect(0, 0, 80, 80);

    card.appendChild(previewCanvas);

    const name = document.createElement('div');
    name.classList.add('pattern-name');
    name.innerText = pattern.name;
    card.appendChild(name);

    card.addEventListener('click', () => {
      selectedPattern = key;
      updatePatternSelectionUI();
    });

    patternSelector.appendChild(card);
  }
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
  populationData = [];
  document.getElementById('generationDisplay').innerText = `Generation: ${generation}`;
  if (populationChart) {
    populationChart.data.labels = [];
    populationChart.data.datasets[0].data = [];
    populationChart.update();
  }
  drawBoard();
}

// Setup the population chart
function setupChart() {
  const ctx = document.getElementById('populationChart').getContext('2d');
  populationChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [], // Generations
      datasets: [
        {
          label: 'Living Cells',
          data: [],
          borderColor: '#00FF00',
          backgroundColor: 'rgba(0, 255, 0, 0.1)',
          fill: true,
        },
      ],
    },
    options: {
      animation: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Generation',
            color: '#f0f0f0',
          },
          ticks: {
            color: '#f0f0f0',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Number of Living Cells',
            color: '#f0f0f0',
          },
          ticks: {
            color: '#f0f0f0',
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: '#f0f0f0',
          },
        },
      },
    },
  });
}

// Update the population chart
function updateChart() {
  populationChart.data.labels.push(generation);
  populationChart.data.datasets[0].data.push(populationData[populationData.length - 1].livingCells);
  populationChart.update();
}
