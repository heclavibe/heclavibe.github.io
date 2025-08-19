const canvas = document.getElementById('canvas');
const charPicker = document.getElementById('char-picker');
const brushTool = document.getElementById('brush-tool');
const eraserTool = document.getElementById('eraser-tool');
const exportButton = document.getElementById('export');

// Initialize character picker with default value
charPicker.value = charPicker.value || '*';
let selectedChar = charPicker.value;
let currentTool = 'brush';
brushTool.classList.add('active');


// Undo system variables
let history = [];
let currentStep = -1;
let isDrawing = false;
let lastTap = 0;
let pendingChanges = new Set();

// Context menu elements
const contextMenu = document.createElement('div');
contextMenu.className = 'context-menu';
contextMenu.innerHTML = '<button class="undo-btn">Undo</button>';
document.body.appendChild(contextMenu);

// Initialize canvas
createCanvas();
saveState(); // Save initial state

// Create grid with improved event handling
function createCanvas() {
  canvas.innerHTML = ''; // Clear existing cells
  for (let i = 0; i < 800; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    
    // Mouse events
    cell.addEventListener('mousedown', startDraw);
    cell.addEventListener('mouseenter', continueDraw);
    
    // Touch events
    cell.addEventListener('touchstart', handleTouchStart);
    cell.addEventListener('touchmove', handleTouchMove);
    
    // Context menu
    cell.addEventListener('contextmenu', showContextMenu);
    
    canvas.appendChild(cell);
  }
}
// Touch handling
function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  if (target?.classList.contains('cell')) {
    startDraw({ target });
    draw(target);
  }
}

function handleTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  if (target?.classList.contains('cell')) draw(target);
  }
// Drawing logic
function startDraw(e) {
  if (e.button && e.button !== 0) return;
  isDrawing = true;
  pendingChanges.clear();
  saveState();
  draw(e.target);
}

function continueDraw(e) {
  if (isDrawing && (e.buttons === 1 || e.touches)) {
    draw(e.target);
  }
}

function draw(target) {
  if (!target?.classList?.contains('cell') || pendingChanges.has(target)) return;
  
  const originalValue = target.textContent;
  const newValue = currentTool === 'brush' ? selectedChar : '';
  
  if (originalValue !== newValue) {
    target.textContent = newValue;
    pendingChanges.add(target);
  }
}


// History management
function saveState() {
  const state = Array.from(canvas.children).map(cell => cell.textContent || '');
  
  // If we're in the middle of undo history, discard future states
  if (currentStep < history.length - 1) {
    history = history.slice(0, currentStep + 1);
  }
  
  history.push(state);
  currentStep = history.length - 1;
  
  // Limit history to 50 states
  if (history.length > 50) {
    history.shift();
    currentStep--;
  }
}

function endDrawing() {
  if (pendingChanges.size > 0) {
    pendingChanges.clear();
    saveState();
  }
  isDrawing = false;
}


function undo() {
  if (currentStep > 0) {
    currentStep--;
    history[currentStep].forEach((char, i) => {
      canvas.children[i].textContent = char;
    });
  }
}

// Context menu handling
function showContextMenu(e) {
  e.preventDefault();
  contextMenu.style.display = 'block';
  contextMenu.style.left = `${e.clientX}px`;
  contextMenu.style.top = `${e.clientY}px`;
  
  // Close menu when clicking elsewhere
  const closeMenu = () => {
    contextMenu.style.display = 'none';
    document.removeEventListener('click', closeMenu);
  };
  document.addEventListener('click', closeMenu);
}

// Event listeners
contextMenu.querySelector('.undo-btn').addEventListener('click', undo);

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undo();
  }
});

canvas.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTap < 500) {
    undo();
  }
  lastTap = now;
});

// Update event listeners for ending drawing
document.addEventListener('mouseup', endDrawing);
document.addEventListener('touchend', endDrawing);

// Existing tool event listeners...
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

charPicker.addEventListener('input', e => {
  selectedChar = e.target.value;
});

// Export ASCII art
exportButton.addEventListener('click', () => {
  const rows = [];
  const cells = Array.from(canvas.children);
  for (let i = 0; i < cells.length; i += 40) {
    const row = cells.slice(i, i + 40).map(cell => cell.textContent || ' ').join('');
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

