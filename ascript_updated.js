// ====== Canvas + tools ======
const canvas = document.getElementById('canvas')
const charPicker = document.getElementById('char-picker')
const brushTool = document.getElementById('brush-tool')
const eraserTool = document.getElementById('eraser-tool')
const exportTxtButton = document.getElementById('export-txt')
const exportAnimationButton = document.getElementById('export-animation')

// Animation UI elements
const animPlay = document.getElementById('anim-play')
const animPause = document.getElementById('anim-pause')
const animStop = document.getElementById('anim-stop')
const animAddKeyframe = document.getElementById('anim-add-keyframe')
const animDuplicate = document.getElementById('anim-duplicate')
const animDelete = document.getElementById('anim-delete')
const animDelay = document.getElementById('anim-delay')
const animExport = document.getElementById('anim-export')
const timelineStrip = document.getElementById('timeline-strip')
const timelineScrub = document.getElementById('timeline-scrub')
const timelineMeta = document.getElementById('timeline-meta')
const animFps = document.getElementById('anim-fps')

// Grid constants
const COLS = 40
const ROWS = 20
const CELL_COUNT = COLS * ROWS

// Initialize character picker with default value
charPicker.value = (charPicker.value || '*').slice(0, 1)
let selectedChar = charPicker.value
let currentTool = 'brush'
brushTool.classList.add('active')

// Undo system variables
let history = []
let currentStep = -1
let isDrawing = false
let lastTap = 0
let pendingChanges = new Set()

// Context menu elements
const contextMenu = document.createElement('div')
contextMenu.className = 'context-menu'
contextMenu.innerHTML = '<button class="undo-btn">Undo</button>'
document.body.appendChild(contextMenu)

// ====== Animation data model ======
/**
 * frames: [{ id: string, state: string[], durationMs: number }]
 * state is length CELL_COUNT, each entry is '' or a single character
 */
let frames = []
let selectedFrameId = null
let isPlaying = false
let playTimer = null
let playIndex = 0

// ====== Grid helpers ======
function createCanvas() {
  canvas.innerHTML = ''
  for (let i = 0; i < CELL_COUNT; i++) {
    const cell = document.createElement('div')
    cell.className = 'cell'

    // Mouse events
    cell.addEventListener('mousedown', startDraw)
    cell.addEventListener('mouseenter', continueDraw)

    // Touch events
    cell.addEventListener('touchstart', handleTouchStart, { passive: false })
    cell.addEventListener('touchmove', handleTouchMove, { passive: false })

    // Context menu
    cell.addEventListener('contextmenu', showContextMenu)

    canvas.appendChild(cell)
  }
}

function getGridState() {
  return Array.from(canvas.children).map(cell => cell.textContent || '')
}

function setGridState(state) {
  const cells = canvas.children
  for (let i = 0; i < CELL_COUNT; i++) {
    cells[i].textContent = state[i] || ''
  }
}

function gridToAscii(state) {
  const rows = []
  for (let i = 0; i < state.length; i += COLS) {
    const row = state.slice(i, i + COLS).map(ch => (ch === '' ? ' ' : ch)).join('')
    rows.push(row)
  }
  return rows.join('\n')
}

function makePreview(state) {
  // Tiny preview: first 3 rows, 20 cols to keep it readable
  const previewCols = 20
  const previewRows = 3
  const lines = []
  for (let r = 0; r < previewRows; r++) {
    const start = r * COLS
    const line = state.slice(start, start + previewCols).map(ch => (ch === '' ? '·' : ch)).join('')
    lines.push(line)
  }
  return lines.join('\n')
}

// ====== Drawing logic ======
function startDraw(e) {
  if (e.button && e.button !== 0) return
  isDrawing = true
  pendingChanges.clear()
  saveState()
  draw(e.target)
}

function continueDraw(e) {
  if (isDrawing && (e.buttons === 1 || e.touches)) {
    draw(e.target)
  }
}

function draw(target) {
  if (!target?.classList?.contains('cell') || pendingChanges.has(target)) return

  const originalValue = target.textContent
  const newValue = currentTool === 'brush' ? selectedChar : ''

  if (originalValue !== newValue) {
    target.textContent = newValue
    pendingChanges.add(target)
  }
}

function endDrawing() {
  if (pendingChanges.size > 0) {
    pendingChanges.clear()
    saveState()
    syncSelectedFrameStateFromGrid()
  }
  isDrawing = false
}

// Touch handling
function handleTouchStart(e) {
  e.preventDefault()
  const touch = e.touches[0]
  const target = document.elementFromPoint(touch.clientX, touch.clientY)
  if (target?.classList.contains('cell')) {
    startDraw({ target })
    draw(target)
  }
}

function handleTouchMove(e) {
  e.preventDefault()
  const touch = e.touches[0]
  const target = document.elementFromPoint(touch.clientX, touch.clientY)
  if (target?.classList.contains('cell')) draw(target)
}

// ====== History management ======
function saveState() {
  const state = getGridState()

  // If we're in the middle of undo history, discard future states
  if (currentStep < history.length - 1) history = history.slice(0, currentStep + 1)

  history.push(state)
  currentStep = history.length - 1

  // Limit history
  if (history.length > 50) {
    history.shift()
    currentStep--
  }
}

function undo() {
  if (currentStep > 0) {
    currentStep--
    setGridState(history[currentStep])
    syncSelectedFrameStateFromGrid()
  }
}

// ====== Context menu handling ======
function showContextMenu(e) {
  e.preventDefault()
  contextMenu.style.display = 'block'
  contextMenu.style.left = `${e.clientX}px`
  contextMenu.style.top = `${e.clientY}px`

  const closeMenu = () => {
    contextMenu.style.display = 'none'
    document.removeEventListener('click', closeMenu)
  }
  document.addEventListener('click', closeMenu)
}

contextMenu.querySelector('.undo-btn').addEventListener('click', undo)

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    undo()
  }
})

document.addEventListener('mouseup', endDrawing)
document.addEventListener('touchend', endDrawing)

// Double-tap undo on touch
canvas.addEventListener('touchend', () => {
  const now = Date.now()
  if (now - lastTap < 500) undo()
  lastTap = now
})

// Tools
brushTool.addEventListener('click', () => {
  currentTool = 'brush'
  brushTool.classList.add('active')
  eraserTool.classList.remove('active')
})

eraserTool.addEventListener('click', () => {
  currentTool = 'eraser'
  eraserTool.classList.add('active')
  brushTool.classList.remove('active')
})

charPicker.addEventListener('input', e => {
  selectedChar = (e.target.value || '').slice(0, 1)
  e.target.value = selectedChar
})

// ====== TXT export (grid only) ======
exportTxtButton.addEventListener('click', () => {
  const asciiArt = gridToAscii(getGridState())
  const blob = new Blob([asciiArt], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'ascii-art.txt'
  link.click()
  URL.revokeObjectURL(url)
})

// ====== Animation: timeline UI ======
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

function saveGridToSelectedFrame() {
  const idx = getSelectedFrameIndex()
  if (idx < 0) return
  frames[idx].state = getGridState().slice()
}

function syncSelectedFrameStateFromGrid() {
  saveGridToSelectedFrame()
  renderTimeline()
}

function setSelectedFrame(id) {
  selectedFrameId = id
  renderTimeline()
  syncDelayInput()
}

function getSelectedFrameIndex() {
  if (!selectedFrameId) return -1
  return frames.findIndex(f => f.id === selectedFrameId)
}

function syncDelayInput() {
  const idx = getSelectedFrameIndex()
  const has = idx >= 0
  animDuplicate.disabled = !has
  animDelete.disabled = !has

  if (!has) {
    animDelay.value = 200
    return
  }
  animDelay.value = frames[idx].durationMs
}

function updateTimelineMeta() {
  if (frames.length === 0) {
    timelineMeta.textContent = 'No frames yet'
    return
  }
  const idx = getSelectedFrameIndex()
  const label = idx >= 0 ? `Frame ${idx + 1} of ${frames.length}` : `${frames.length} frames`
  const totalMs = frames.reduce((sum, f) => sum + (Number(f.durationMs) || 0), 0)
  timelineMeta.textContent = `${label} • Total ${Math.round(totalMs)}ms`
}

function renderTimeline() {
  timelineStrip.innerHTML = ''

  frames.forEach((frame, index) => {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'timeline-frame'
    el.setAttribute('role', 'listitem')
    el.dataset.frameId = frame.id
    el.draggable = true

    if (frame.id === selectedFrameId) el.classList.add('selected')

    const preview = document.createElement('pre')
    preview.className = 'frame-preview'
    preview.textContent = makePreview(frame.state)

    const meta = document.createElement('div')
    meta.className = 'frame-meta'
    meta.innerHTML = `<span class="frame-number">${index + 1}</span><span class="frame-duration">${frame.durationMs}ms</span>`

    el.appendChild(preview)
    el.appendChild(meta)

    el.addEventListener('click', () => {
      saveGridToSelectedFrame()
      setSelectedFrame(frame.id)
      setGridState(frame.state)
      timelineScrub.value = String(index)
    })

    // Drag to reorder
    el.addEventListener('dragstart', ev => {
      ev.dataTransfer.setData('text/plain', frame.id)
      ev.dataTransfer.effectAllowed = 'move'
      el.classList.add('dragging')
    })
    el.addEventListener('dragend', () => el.classList.remove('dragging'))

    el.addEventListener('dragover', ev => {
      ev.preventDefault()
      ev.dataTransfer.dropEffect = 'move'
      el.classList.add('dragover')
    })
    el.addEventListener('dragleave', () => el.classList.remove('dragover'))

    el.addEventListener('drop', ev => {
      ev.preventDefault()
      el.classList.remove('dragover')
      const draggedId = ev.dataTransfer.getData('text/plain')
      if (!draggedId || draggedId === frame.id) return

      const from = frames.findIndex(f => f.id === draggedId)
      const to = frames.findIndex(f => f.id === frame.id)
      if (from < 0 || to < 0) return

      const [moved] = frames.splice(from, 1)
      frames.splice(to, 0, moved)
      renderTimeline()
      updateScrubBounds()
      updateTimelineMeta()
    })

    timelineStrip.appendChild(el)
  })

  updateScrubBounds()
  updateTimelineMeta()
}

function updateScrubBounds() {
  timelineScrub.max = String(Math.max(0, frames.length - 1))
  if (frames.length === 0) {
    timelineScrub.value = '0'
    return
  }
  const idx = getSelectedFrameIndex()
  const clamped = idx >= 0 ? idx : 0
  timelineScrub.value = String(Math.min(Math.max(clamped, 0), frames.length - 1))
}

// Add keyframe records current grid
animAddKeyframe.addEventListener('click', () => {
  const state = getGridState()
  const durationMs = Math.max(10, Number(animDelay.value) || 200)
  const id = uid()

  const insertAt = (() => {
    const idx = getSelectedFrameIndex()
    return idx >= 0 ? idx + 1 : frames.length
  })()

  frames.splice(insertAt, 0, { id, state, durationMs })
  setSelectedFrame(id)
  timelineScrub.value = String(insertAt)
})

animDuplicate.addEventListener('click', () => {
  const idx = getSelectedFrameIndex()
  if (idx < 0) return
  const src = frames[idx]
  const id = uid()
  const clone = { id, state: src.state.slice(), durationMs: src.durationMs }
  frames.splice(idx + 1, 0, clone)
  setSelectedFrame(id)
  timelineScrub.value = String(idx + 1)
})

animDelete.addEventListener('click', () => {
  const idx = getSelectedFrameIndex()
  if (idx < 0) return
  const wasPlaying = isPlaying
  stopPlayback()

  frames.splice(idx, 1)

  if (frames.length === 0) {
    selectedFrameId = null
  } else {
    const next = Math.min(idx, frames.length - 1)
    selectedFrameId = frames[next].id
    setGridState(frames[next].state)
    timelineScrub.value = String(next)
  }

  renderTimeline()
  if (wasPlaying) startPlayback()
})

animDelay.addEventListener('change', () => {
  const idx = getSelectedFrameIndex()
  if (idx < 0) return
  const v = Math.max(10, Number(animDelay.value) || 200)
  frames[idx].durationMs = v
  renderTimeline()
})

timelineScrub.addEventListener('input', () => {
  const idx = Number(timelineScrub.value) || 0
  if (!frames[idx]) return
  saveGridToSelectedFrame()
  setSelectedFrame(frames[idx].id)
  setGridState(frames[idx].state)
})

// ====== Playback ======
function applyFrameByIndex(idx) {
  if (!frames[idx]) return
  playIndex = idx
  setSelectedFrame(frames[idx].id)
  setGridState(frames[idx].state)
  timelineScrub.value = String(idx)
}

function startPlayback() {
  if (frames.length === 0) return
  if (isPlaying) return
  saveGridToSelectedFrame()

  isPlaying = true
  animPlay.disabled = true
  animPause.disabled = false
  animStop.disabled = false

  // If nothing selected, start from frame 0
  const startIdx = getSelectedFrameIndex()
  playIndex = startIdx >= 0 ? startIdx : 0
  applyFrameByIndex(playIndex)

  scheduleNextTick()
}

function scheduleNextTick() {
  if (!isPlaying) return

  const fps = Math.max(1, Math.min(60, Number(animFps.value) || 5))
  const fallbackMs = Math.round(1000 / fps)

  const current = frames[playIndex]
  const delay = Math.max(10, Number(current?.durationMs) || fallbackMs)

  playTimer = window.setTimeout(() => {
    if (!isPlaying) return
    playIndex = (playIndex + 1) % frames.length
    applyFrameByIndex(playIndex)
    scheduleNextTick()
  }, delay)
}

function pausePlayback() {
  if (!isPlaying) return
  isPlaying = false
  if (playTimer) window.clearTimeout(playTimer)
  playTimer = null

  animPlay.disabled = false
  animPause.disabled = true
  animStop.disabled = false
}

function stopPlayback() {
  if (playTimer) window.clearTimeout(playTimer)
  playTimer = null
  isPlaying = false

  animPlay.disabled = false
  animPause.disabled = true
  animStop.disabled = true
}

animPlay.addEventListener('click', startPlayback)
animPause.addEventListener('click', pausePlayback)
animStop.addEventListener('click', stopPlayback)

// ====== Export (animation) ======
function downloadTextFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function buildAnimationExportFiles() {
  const css = `/* Exported from HecLAvibe ASCII Draw */\n` +
`body{font-family:Arial,sans-serif;background:#111;color:#000;display:flex;justify-content:center;padding:24px}\n` +
`.wrap{max-width:900px;width:100%}\n` +
`.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}\n` +
`.controls button,input{padding:8px 10px;border-radius:10px;border:1px solid #333;background:#1c1c1c;color:#000}\n` +
`.controls button:hover{filter:brightness(1.1)}\n` +
`#grid{display:grid;grid-template-columns:repeat(${COLS},12px);grid-template-rows:repeat(${ROWS},20px);gap:1px;padding:20px;background:#e0e0e0;border-radius:12px;box-shadow:inset 4px 4px 8px #b8b8b8,inset -4px -4px 8px #ffffff;width:fit-content;margin:0 auto}\n` +
`.cell{width:12px;height:20px;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:18px;user-select:none}\n` +
`.meta{opacity:.8;font-size:12px}\n`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASCII Animation Export</title>
  <link rel="stylesheet" href="animation.css">
</head>
<body>
  <div class="wrap">
    <div class="controls">
      <button id="play">Play</button>
      <button id="pause" disabled>Pause</button>
      <button id="stop" disabled>Stop</button>
      <label>FPS <input id="fps" type="number" min="1" max="60" value="5"></label>
      <span class="meta" id="meta"></span>
    </div>

    <div id="grid" aria-label="ASCII animation grid"></div>
  </div>

  <script src="animation.js"></script>
</body>
</html>`

  const framesJson = JSON.stringify(frames.map(f => ({ durationMs: f.durationMs, state: f.state })))

  const js = `/* Exported from HecLAvibe ASCII Draw */
const COLS=${COLS}
const ROWS=${ROWS}
const CELL_COUNT=COLS*ROWS

const frames=${framesJson}

const grid=document.getElementById('grid')
const playBtn=document.getElementById('play')
const pauseBtn=document.getElementById('pause')
const stopBtn=document.getElementById('stop')
const fpsInput=document.getElementById('fps')
const meta=document.getElementById('meta')

let timer=null
let playing=false
let idx=0

function initGrid(){
  for(let i=0;i<CELL_COUNT;i++){
    const c=document.createElement('div')
    c.className='cell'
    grid.appendChild(c)
  }
}

function setState(state){
  const cells=grid.children
  for(let i=0;i<CELL_COUNT;i++){
    cells[i].textContent=state[i]||''
  }
}

function updateMeta(){
  if(!frames.length){meta.textContent='No frames';return}
  const total=frames.reduce((s,f)=>s+(Number(f.durationMs)||0),0)
  meta.textContent='Frame '+(idx+1)+'/'+frames.length+' • Total '+Math.round(total)+'ms'
}

function schedule(){
  if(!playing || !frames.length) return
  const fps=Math.max(1,Math.min(60,Number(fpsInput.value)||5))
  const fallback=Math.round(1000/fps)
  const delay=Math.max(10,Number(frames[idx].durationMs)||fallback)
  timer=setTimeout(()=>{
    if(!playing) return
    idx=(idx+1)%frames.length
    setState(frames[idx].state)
    updateMeta()
    schedule()
  },delay)
}

function play(){
  if(!frames.length) return
  if(playing) return
  playing=true
  playBtn.disabled=true
  pauseBtn.disabled=false
  stopBtn.disabled=false
  setState(frames[idx].state)
  updateMeta()
  schedule()
}

function pause(){
  if(!playing) return
  playing=false
  if(timer) clearTimeout(timer)
  timer=null
  playBtn.disabled=false
  pauseBtn.disabled=true
  stopBtn.disabled=false
}

function stop(){
  if(timer) clearTimeout(timer)
  timer=null
  playing=false
  idx=0
  playBtn.disabled=false
  pauseBtn.disabled=true
  stopBtn.disabled=true
  if(frames.length){
    setState(frames[0].state)
    updateMeta()
  }
}

playBtn.addEventListener('click',play)
pauseBtn.addEventListener('click',pause)
stopBtn.addEventListener('click',stop)

initGrid()
if(frames.length){
  setState(frames[0].state)
  updateMeta()
}
`

  return { html, css, js }
}

animExport.addEventListener('click', () => {
  if (frames.length === 0) return

  const files = buildAnimationExportFiles()
  downloadTextFile('animation.html', files.html, 'text/html')
  downloadTextFile('animation.css', files.css, 'text/css')
  downloadTextFile('animation.js', files.js, 'text/javascript')
})

// Convenience: header export animation button triggers same export
exportAnimationButton.addEventListener('click', () => {
  animExport.click()
})

// ====== Init ======
createCanvas()
saveState()
renderTimeline()
