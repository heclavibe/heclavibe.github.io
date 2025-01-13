const canvas = document.getElementById('canvas');
const charPicker = document.getElementById('char-picker');
const brushTool = document.getElementById('brush-tool');
const eraserTool = document.getElementById('eraser-tool');
const exportButton = document.getElementById('export');

let currentTool = 'brush';
let selectedChar = charPicker.value;
let isDrawing = false; // Tracks whether the user is actively drawing


// Create grid
function createCanvas() {
  for (let i = 0; i < 300; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.addEventListener('mousedown', draw);
    cell.addEventListener('mousemove', (e) => e.buttons === 1 && draw(e));
    cell.addEventListener('touchstart', handleTouchStart, { passive: false });
    cell.addEventListener('touchmove', handleTouchMove, { passive: false });
    cell.addEventListener('touchend', handleTouchEnd);
    canvas.appendChild(cell);
  }
}

// Touch event handlers
function handleTouchStart(event) {
  event.preventDefault(); // Prevent default touch actions
  isDrawing = true;
  const target = document.elementFromPoint(
    event.touches[0].clientX,
    event.touches[0].clientY
  );
  if (target && target.classList.contains('cell')) {
    draw(target);
  }
}

function handleTouchMove(event) {
  event.preventDefault(); // Prevent default touch actions
  const target = document.elementFromPoint(
    event.touches[0].clientX,
    event.touches[0].clientY
  );
  if (target && target.classList.contains('cell')) {
    draw(target);
  }
}

function handleTouchEnd() {
  isDrawing = false;
}

// Drawing function
function draw(event) {
  if (currentTool === 'brush') {
    event.target.textContent = selectedChar;
  } else if (currentTool === 'eraser') {
    event.target.textContent = '';
  }
}

// Tool selection
brushTool.addEventListener('click', () => {
  currentTool = 'brush';
  brushTool.classList.add('active');
  eraserTool.classList.remove('active');
});

eraserTool.addEventListener('click', () => {
  currentTool = 'eraser';
  eraserTool.classList.add('active');
  brushTool.classList.remove('active');
});

// Character picker
charPicker.addEventListener('input', (e) => {
  selectedChar = e.target.value;
});

// Export ASCII art
exportButton.addEventListener('click', () => {
  const rows = [];
  const cells = Array.from(canvas.children);
  for (let i = 0; i < cells.length; i += 15) {
    const row = cells.slice(i, i + 15).map(cell => cell.textContent || ' ').join('');
    rows.push(row);
  }
  const asciiArt = rows.join('\n');
  const blob = new Blob([asciiArt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ascii-art.txt';
  link.click();
  URL.revokeObjectURL(url);
});

// Initialize canvas
createCanvas();
