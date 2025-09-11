const canvas = document.getElementById('canvas');
const colorPicker = document.getElementById('color-picker');
const addRectangle = document.getElementById('add-rectangle');
const addText = document.getElementById('add-text');
const cornerRadius = document.getElementById('corner-radius');
const deleteShape = document.getElementById('delete-shape');
const layersPanel = document.getElementById('layers-panel');
const textSizeInput = document.getElementById('text-size');
const exportButton = document.getElementById('export-drawing');
const rectColorPicker = document.getElementById('rect-color-picker');
const rectColorAlpha = document.getElementById('rect-color-alpha');
const textColorPicker = document.getElementById('text-color-picker');
const fontFamilySelect = document.getElementById('font-family');
const exportFormat = document.getElementById('export-format');
const importFile = document.getElementById('import-file');

let lastTouchTime = 0;
const doubleTapThreshold = 300;
let selectedShape = null;

// Helper function to convert RGB to Hex with alpha
function rgbToHex(rgb) {
    const rgbValues = rgb.match(/\d+/g);
    if (!rgbValues) return '#000000';
    
    const r = parseInt(rgbValues[0]).toString(16).padStart(2, '0');
    const g = parseInt(rgbValues[1]).toString(16).padStart(2, '0');
    const b = parseInt(rgbValues[2]).toString(16).padStart(2, '0');
    const a = rgbValues[3] ? Math.round(parseFloat(rgbValues[3]) * 255).toString(16).padStart(2, '0') : 'ff';
    
    return `#${r}${g}${b}${a}`;
}

// Helper function to get alpha from rgba
function getAlphaFromRgba(rgba) {
    const match = rgba.match(/[\d.]+\)$/);
    return match ? Math.round(parseFloat(match[0]) * 100) : 100;
}

// Create shape function
function createShape(type, customName) {
    const shape = document.createElement('div');
    shape.className = 'shape';
    shape.dataset.layerName = customName || `Layer ${canvas.children.length + 1}`;
    shape.dataset.locked = 'false';

    if(type === 'image') {
        shape.classList.add('image');
        shape.style.backgroundSize = 'cover';
    }
    
    shape.style.backgroundColor = rectColorPicker.value;
    shape.style.width = '100px';
    shape.style.height = '100px';
    shape.style.borderRadius = cornerRadius.value + 'px';
    shape.style.top = '50px';
    shape.style.left = '50px';

    if (type === 'text') {
        shape.textContent = 'Text';
        shape.style.display = 'flex';
        shape.style.alignItems = 'center';
        shape.style.justifyContent = 'center';
        shape.style.fontSize = textSizeInput.value + 'px';
        shape.style.color = textColorPicker.value;
        shape.style.fontFamily = fontFamilySelect.value;
    }

    canvas.appendChild(shape);
    setupShapeEvents(shape);
    updateLayers();
    return shape;
}

// Setup shape events
function setupShapeEvents(shape) {
    shape.addEventListener('click', handleSelection);
    shape.addEventListener('touchstart', handleTouchSelection);
    shape.addEventListener('dblclick', startTextEditing);
    shape.addEventListener('touchend', handleDoubleTap);

    shape.addEventListener('click', () => {
        if (selectedShape) {
            selectedShape.classList.remove('selected');
            removeResizeHandles(selectedShape);
            removeRotationHandle(selectedShape);
            removeCornerRadiusHandles(selectedShape);
        }
        selectedShape = shape;
        shape.classList.add('selected');
        updateLayers();
        
        // Update all controls to match selected shape's properties
        const bgColor = getComputedStyle(shape).backgroundColor;
        rectColorPicker.value = rgbToHex(bgColor);
        
        // Update corner radius
        const currentRadius = parseInt(getComputedStyle(shape).borderRadius) || 0;
        cornerRadius.value = currentRadius;
        
        // Update text properties if it's a text element
        if (shape.textContent) {
            textSizeInput.value = parseInt(getComputedStyle(shape).fontSize) || 16;
            textColorPicker.value = rgbToHex(getComputedStyle(shape).color);
            fontFamilySelect.value = getComputedStyle(shape).fontFamily;
        }
        
        addResizeHandles(shape);
        addRotationHandle(shape);
        addCornerRadiusHandles(shape);
    });

    dragElement(shape);
}

// Handle selection
function handleSelection(e) {
    if (selectedShape) {
        selectedShape.classList.remove('selected');
        removeResizeHandles(selectedShape);
        removeRotationHandle(selectedShape);
        removeCornerRadiusHandles(selectedShape);
    }
    
    const shape = e.target.closest('.shape');
    if (!shape) return;
    
    selectedShape = shape;
    shape.classList.add('selected');
    
    // Update all controls to match selected shape's properties
    const bgColor = getComputedStyle(shape).backgroundColor;
    rectColorPicker.value = rgbToHex(bgColor);
    
    // Update corner radius
    const currentRadius = parseInt(getComputedStyle(shape).borderRadius) || 0;
    cornerRadius.value = currentRadius;
    
    // Update text properties if it's a text element
    if (shape.textContent) {
        textSizeInput.value = parseInt(getComputedStyle(shape).fontSize) || 16;
        textColorPicker.value = rgbToHex(getComputedStyle(shape).color);
        fontFamilySelect.value = getComputedStyle(shape).fontFamily;
    }
    
    addResizeHandles(shape);
    addRotationHandle(shape);
    addCornerRadiusHandles(shape);
    updateLayers();
}

// Handle touch selection
function handleTouchSelection(e) {
    e.preventDefault();
    handleSelection(e);
    if (selectedShape) {
        e.stopPropagation();
    }
    updateLayers();
}

// Update layers panel
function updateLayers() {
    layersPanel.innerHTML = `
        <div class="layers-header">
            <h3>Layers</h3>
            <button class="minimize-layers">−</button>
            <button class="hide-layers">👁</button>
        </div>
        <div class="layers-content">
            ${Array.from(canvas.children).map((shape, index) => `
                <div class="layer-item ${shape === selectedShape ? 'selected-layer' : ''}" draggable="true" data-index="${index}">
                    <div class="layer-visibility">
                        <input type="checkbox" class="layer-visible" ${shape.style.display !== 'none' ? 'checked' : ''}>
                    </div>
                    <div class="layer-lock">
                        <input type="checkbox" class="layer-locked" ${shape.dataset.locked === 'true' ? 'checked' : ''}>
                    </div>
                    <input type="text" class="layer-name" value="${shape.dataset.layerName}">
                    <div class="layer-controls">
                        <button class="layer-up">↑</button>
                        <button class="layer-down">↓</button>
                        <button class="layer-delete">×</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Add event listeners for layer controls
    layersPanel.querySelectorAll('.layer-item').forEach((layer, index) => {
        const shape = canvas.children[index];
        
        // Layer name
        const nameInput = layer.querySelector('.layer-name');
        nameInput.addEventListener('change', function() {
            shape.dataset.layerName = this.value;
        });

        // Layer visibility
        const visibleCheckbox = layer.querySelector('.layer-visible');
        visibleCheckbox.addEventListener('change', function() {
            shape.style.display = this.checked ? '' : 'none';
        });

        // Layer lock
        const lockCheckbox = layer.querySelector('.layer-locked');
        lockCheckbox.addEventListener('change', function() {
            shape.dataset.locked = this.checked;
            if (this.checked) {
                shape.style.pointerEvents = 'none';
            } else {
                shape.style.pointerEvents = '';
            }
        });

        // Layer reordering
        const upButton = layer.querySelector('.layer-up');
        const downButton = layer.querySelector('.layer-down');
        
        upButton.addEventListener('click', () => {
            if (index > 0) {
                canvas.insertBefore(shape, canvas.children[index - 1]);
                updateLayers();
            }
        });

        downButton.addEventListener('click', () => {
            if (index < canvas.children.length - 1) {
                canvas.insertBefore(shape, canvas.children[index + 1].nextSibling);
                updateLayers();
            }
        });

        // Layer deletion
        const deleteButton = layer.querySelector('.layer-delete');
        deleteButton.addEventListener('click', () => {
            shape.remove();
            updateLayers();
        });

        // Drag and drop
        layer.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
        });

        layer.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        layer.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            
            if (fromIndex !== toIndex) {
                const shape = canvas.children[fromIndex];
                const targetShape = canvas.children[toIndex];
                canvas.insertBefore(shape, targetShape);
                updateLayers();
            }
        });
    });

    // Minimize layers panel
    const minimizeButton = layersPanel.querySelector('.minimize-layers');
    minimizeButton.addEventListener('click', () => {
        const content = layersPanel.querySelector('.layers-content');
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
        minimizeButton.textContent = content.style.display === 'none' ? '+' : '−';
    });

    // Hide layers panel
    const hideButton = layersPanel.querySelector('.hide-layers');
    hideButton.addEventListener('click', () => {
        layersPanel.style.display = layersPanel.style.display === 'none' ? 'block' : 'none';
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Text color picker
    textColorPicker.addEventListener('input', function() {
        if (selectedShape && selectedShape.textContent) {
            selectedShape.style.color = this.value;
        }
    });

    // Rectangle color picker
    rectColorPicker.addEventListener('input', function() {
        if (selectedShape) {
            selectedShape.style.backgroundColor = this.value;
        }
    });

    // Corner radius
    cornerRadius.addEventListener('input', function() {
        if (selectedShape) {
            selectedShape.style.borderRadius = `${this.value}px`;
        }
    });

    // Text size
    textSizeInput.addEventListener('input', function() {
        if (selectedShape && selectedShape.textContent) {
            selectedShape.style.fontSize = `${this.value}px`;
        }
    });

    // Font family
    fontFamilySelect.addEventListener('change', function() {
        if (selectedShape && selectedShape.textContent) {
            selectedShape.style.fontFamily = this.value;
        }
    });

    // Export button
    exportButton.addEventListener('click', async () => {
        if (exportFormat.value === 'jpg' || exportFormat.value === 'png') {
            try {
                const canvasElement = document.getElementById('canvas');
                const canvasImg = await html2canvas(canvasElement);
                const link = document.createElement('a');
                link.download = `drawing.${exportFormat.value}`;
                link.href = canvasImg.toDataURL(`image/${exportFormat.value}`);
                link.click();
            } catch (error) {
                console.error('Export failed:', error);
                alert('Failed to export image. Please try again.');
            }
        } else {
            exportDrawing();
        }
    });

    // Rename import button
    importFile.setAttribute('title', 'Place');
});

// Add back the essential functions
function addTextToRectangle() {
    if (selectedShape && selectedShape.classList.contains('shape')) {
        selectedShape.textContent = 'Text';
        selectedShape.style.display = 'flex';
        selectedShape.style.alignItems = 'center';
        selectedShape.style.justifyContent = 'center';
        selectedShape.style.fontSize = textSizeInput.value + 'px';
        selectedShape.style.color = textColorPicker.value;
        selectedShape.style.fontFamily = fontFamilySelect.value;
    } else {
        createShape('text');
    }
}

function addResizeHandles(shape) {
    const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

    handles.forEach((position) => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${position}`;
        shape.appendChild(handle);

        const startResize = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isTouch = e.type === 'touchstart';
            const clientX = isTouch ? e.touches[0].clientX : e.clientX;
            const clientY = isTouch ? e.touches[0].clientY : e.clientY;

            const initialWidth = parseInt(getComputedStyle(shape).width, 10);
            const initialHeight = parseInt(getComputedStyle(shape).height, 10);
            const initialX = clientX;
            const initialY = clientY;
            const initialTop = parseInt(getComputedStyle(shape).top, 10);
            const initialLeft = parseInt(getComputedStyle(shape).left, 10);

            const moveHandler = (moveEvent) => {
                const moveX = isTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
                const moveY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
                
                const deltaX = moveX - initialX;
                const deltaY = moveY - initialY;

                if (position.includes('right')) {
                    shape.style.width = `${initialWidth + deltaX}px`;
                }
                if (position.includes('left')) {
                    shape.style.width = `${initialWidth - deltaX}px`;
                    shape.style.left = `${initialLeft + deltaX}px`;
                }
                if (position.includes('bottom')) {
                    shape.style.height = `${initialHeight + deltaY}px`;
                }
                if (position.includes('top')) {
                    shape.style.height = `${initialHeight - deltaY}px`;
                    shape.style.top = `${initialTop + deltaY}px`;
                }
            };

            const endHandler = () => {
                if (isTouch) {
                    document.removeEventListener('touchmove', moveHandler);
                    document.removeEventListener('touchend', endHandler);
                } else {
                    document.removeEventListener('mousemove', moveHandler);
                    document.removeEventListener('mouseup', endHandler);
                }
            };

            if (isTouch) {
                document.addEventListener('touchmove', moveHandler, { passive: false });
                document.addEventListener('touchend', endHandler);
            } else {
                document.addEventListener('mousemove', moveHandler);
                document.addEventListener('mouseup', endHandler);
            }
        };

        handle.addEventListener('mousedown', startResize);
        handle.addEventListener('touchstart', startResize, { passive: false });
    });
}

function addCornerRadiusHandles(shape) {
    const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const handleSize = 14;

    corners.forEach((corner) => {
        const handle = document.createElement('div');
        handle.className = `corner-radius-handle ${corner}`;
        handle.style.position = 'absolute';
        handle.style.width = `${handleSize}px`;
        handle.style.height = `${handleSize}px`;
        handle.style.backgroundColor = '#fff';
        handle.style.border = '1px solid #000';
        handle.style.borderRadius = '50%';
        handle.style.cursor = 'pointer';

        switch(corner) {
            case 'top-left':
                handle.style.left = '0';
                handle.style.top = '0';
                handle.style.transform = 'translate(-50%, -50%)';
                break;
            case 'top-right':
                handle.style.right = '0';
                handle.style.top = '0';
                handle.style.transform = 'translate(50%, -50%)';
                break;
            case 'bottom-left':
                handle.style.left = '0';
                handle.style.bottom = '0';
                handle.style.transform = 'translate(-50%, 50%)';
                break;
            case 'bottom-right':
                handle.style.right = '0';
                handle.style.bottom = '0';
                handle.style.transform = 'translate(50%, 50%)';
                break;
        }

        shape.appendChild(handle);

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();

            const initialRadius = parseInt(getComputedStyle(shape).borderRadius.split(' ')[0], 10) || 0;
            const initialX = e.clientX;

            document.onmousemove = (event) => {
                const deltaX = event.clientX - initialX;
                let newRadius = Math.max(0, initialRadius + deltaX);

                switch (corner) {
                    case 'top-left':
                        shape.style.borderTopLeftRadius = `${newRadius}px`;
                        break;
                    case 'top-right':
                        shape.style.borderTopRightRadius = `${newRadius}px`;
                        break;
                    case 'bottom-left':
                        shape.style.borderBottomLeftRadius = `${newRadius}px`;
                        break;
                    case 'bottom-right':
                        shape.style.borderBottomRightRadius = `${newRadius}px`;
                        break;
                }
            };

            document.onmouseup = () => {
                document.onmousemove = null;
                document.onmouseup = null;
            };
        });
    });
}

function removeCornerRadiusHandles(shape) {
    const handles = shape.querySelectorAll('.corner-radius-handle');
    handles.forEach((handle) => handle.remove());
}

function addRotationHandle(shape) {
    const handle = document.createElement('div');
    handle.className = 'rotation-handle';
    shape.appendChild(handle);

    const startRotate = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        let lastX = clientX;
        let currentRotation = getRotationAngle(shape);

        const moveHandler = (moveEvent) => {
            const moveX = isTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const deltaX = moveX - lastX;
            lastX = moveX;
            const screenWidth = window.innerWidth;
            const angleChange = (deltaX / (screenWidth / 2)) * 360;
            currentRotation = (currentRotation + angleChange) % 360;
            shape.style.transform = `rotate(${currentRotation}deg)`;
        };

        const endHandler = () => {
            if (isTouch) {
                document.removeEventListener('touchmove', moveHandler);
                document.removeEventListener('touchend', endHandler);
            } else {
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', endHandler);
            }
        };

        if (isTouch) {
            document.addEventListener('touchmove', moveHandler, { passive: false });
            document.addEventListener('touchend', endHandler);
        } else {
            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', endHandler);
        }
    };

    handle.addEventListener('mousedown', startRotate);
    handle.addEventListener('touchstart', startRotate, { passive: false });
}

function removeResizeHandles(shape) {
    const handles = shape.querySelectorAll('.resize-handle');
    handles.forEach((handle) => handle.remove());
}

function removeRotationHandle(shape) {
    const handle = shape.querySelector('.rotation-handle');
    if (handle) handle.remove();
}
function dragElement(element) {
    let isDragging = false;
    let startX = 0, startY = 0;

    const startDrag = (e) => {
        // Do not start dragging from handles
        if (
            e.target.classList.contains('resize-handle') ||
            e.target.classList.contains('rotation-handle') ||
            e.target.classList.contains('corner-radius-handle')
        ) return;

        e.preventDefault();
        isDragging = true;

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        startX = clientX - element.offsetLeft;
        startY = clientY - element.offsetTop;

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', doDrag, { passive: false });
        document.addEventListener('touchend', stopDrag);
    };

    const doDrag = (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const newX = clientX - startX;
        const newY = clientY - startY;

        // Clamp to canvas
        const maxX = canvas.clientWidth - element.offsetWidth;
        const maxY = canvas.clientHeight - element.offsetHeight;

        element.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
        element.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
    };

    const stopDrag = () => {
        isDragging = false;
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', doDrag);
        document.removeEventListener('touchend', stopDrag);
    };

    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDrag, { passive: false });
}




function getRotationAngle(element) {
    const transform = getComputedStyle(element).transform;
    if (transform === 'none') return 0;
    const values = transform.split('(')[1].split(')')[0].split(',');
    const a = parseFloat(values[0]);
    const b = parseFloat(values[1]);
    return Math.round(Math.atan2(b, a) * (180 / Math.PI));
}

// Add back the event listeners
addRectangle.addEventListener('click', () => createShape('rectangle'));
addText.addEventListener('click', addTextToRectangle);

deleteShape.addEventListener('click', () => {
    if (selectedShape) {
        selectedShape.remove();
        selectedShape = null;
        updateLayers();
    }
});

// Add back the image import handler
importFile.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        if(file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if(selectedShape) {
                    selectedShape.style.backgroundImage = `url(${event.target.result})`;
                } else {
                    const imgShape = createShape('image', `Image ${Date.now()}`);
                    imgShape.style.backgroundImage = `url(${event.target.result})`;
                    imgShape.style.width = `${canvas.offsetWidth/2}px`;
                    imgShape.style.height = `${canvas.offsetHeight/2}px`;
                }
            };
            reader.readAsDataURL(file);
        }
    });
});

// Export drawing function
function exportDrawing() {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Drawing</title>
    <link rel="stylesheet" href="styles.css">
    <style>${document.styleSheets[0].ownerNode.innerHTML}</style>
</head>
<body>
    <div class="canvas-container" id="canvas">${canvas.innerHTML}</div>
    <script>${exportScript()}</script>
</body>
</html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'drawing.hecdoc';
    link.click();
}

// Export script function
function exportScript() {
    return `
        document.querySelectorAll('.shape').forEach(shape => {
            shape.onmousedown = (e) => {
                let posX = 0, posY = 0, mouseX = e.clientX, mouseY = e.clientY;
                document.onmousemove = (e) => {
                    e.preventDefault();
                    posX = mouseX - e.clientX;
                    posY = mouseY - e.clientY;
                    mouseX = e.clientX;
                    mouseY = e.clientY;
                    shape.style.top = (shape.offsetTop - posY) + 'px';
                    shape.style.left = (shape.offsetLeft - posX) + 'px';
                };
                document.onmouseup = () => {
                    document.onmousemove = null;
                    document.onmouseup = null;
                };
            };
        });
    `;
}