const canvas = document.getElementById('canvas');
const colorPicker = document.getElementById('color-picker');
const addRectangle = document.getElementById('add-rectangle');
const addText = document.getElementById('add-text');
const cornerRadius = document.getElementById('corner-radius');
const deleteShape = document.getElementById('delete-shape');
const layersPanel = document.getElementById('layers-panel');
const textContentInput = document.getElementById('text-content');
const textSizeInput = document.getElementById('text-size');

const exportButton = document.getElementById('export-drawing');
const importInput = document.getElementById('import-drawing');

const rectColorPicker = document.getElementById('rect-color-picker');
let lastTouchTime = 0;
const doubleTapThreshold = 300;


let selectedShape = null;


function createShape(type) {
    const shape = document.createElement('div');
    shape.className = 'shape';
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
        shape.style.fontSize = '16px';
        shape.style.color = colorPicker.value;
    }

    canvas.appendChild(shape);
    updateLayers();
// Add these event listeners
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
        if (shape.textContent) {
            textContentInput.value = shape.textContent;
            textSizeInput.value = parseInt(getComputedStyle(shape).fontSize, 10);
        }
        addResizeHandles(shape);
        addRotationHandle(shape);
        addCornerRadiusHandles(shape);
    });

    shape.addEventListener('dblclick', () => {
        if (shape.textContent) {
            shape.contentEditable = true;
            shape.focus();

            shape.addEventListener('blur', () => {
                shape.contentEditable = false;
                textContentInput.value = shape.textContent;
            });
        }
    });

    dragElement(shape);
}

function addTextToRectangle() {
    if (selectedShape && selectedShape.classList.contains('shape')) {
        selectedShape.textContent = 'Text';
        selectedShape.style.display = 'flex';
        selectedShape.style.alignItems = 'center';
        selectedShape.style.justifyContent = 'center';
        selectedShape.style.fontSize = '16px';
        selectedShape.style.color = colorPicker.value;
    } else {
        createShape('text');
    }
}

function updateTextStyle() {
    if (selectedShape && selectedShape.classList.contains('shape')) {
        selectedShape.style.fontSize = `${textSizeInput.value}px`;
        selectedShape.style.color = colorPicker.value;
    }
}

// Update the addResizeHandles function
function addResizeHandles(shape) {
    const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

    handles.forEach((position) => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${position}`;
        shape.appendChild(handle);

        // Common handler function
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

        // Add both mouse and touch listeners
        handle.addEventListener('mousedown', startResize);
        handle.addEventListener('touchstart', startResize, { passive: false });
    });
}
function addCornerRadiusHandles(shape) {
    const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const handleSize = 14; // Size of the handle in pixels

    corners.forEach((corner) => {
        const handle = document.createElement('div');
        handle.className = `corner-radius-handle ${corner}`;
        
        // Position handles inside the rectangle
        handle.style.position = 'absolute';
        handle.style.width = `${handleSize}px`;
        handle.style.height = `${handleSize}px`;
        handle.style.backgroundColor = '#fff';
        handle.style.border = '1px solid #000';
        handle.style.cursor = 'pointer';

        // Position based on corner
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

// Update the addRotationHandle function
function addRotationHandle(shape) {
    const handle = document.createElement('div');
    handle.className = 'rotation-handle';
    shape.appendChild(handle);

    const startRotate = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const shapeCenterX = shape.offsetLeft + shape.offsetWidth / 2;
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

    // Add both mouse and touch listeners
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

// Update the dragElement function
function dragElement(element) {
    let posX = 0, posY = 0, startX = 0, startY = 0;

    const startDrag = (e) => {
        e.preventDefault();
        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        startX = clientX;
        startY = clientY;

        const moveHandler = (moveEvent) => {
            const moveX = isTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const moveY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            
            posX = moveX - startX;
            posY = moveY - startY;
            startX = moveX;
            startY = moveY;

            element.style.top = (element.offsetTop + posY) + 'px';
            element.style.left = (element.offsetLeft + posX) + 'px';
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

// Update updateLayers function
function updateLayers() {
    layersPanel.innerHTML = '<h3>Layers</h3>';
    const shapes = Array.from(canvas.children);
    
    shapes.forEach((shape, index) => {
        const layer = document.createElement('div');
        layer.className = 'layer-item';
        layer.innerHTML = `
            <input type="text" class="layer-name" value="Layer ${index + 1}">
            <div class="layer-controls">
                <button class="layer-up">↑</button>
                <button class="layer-down">↓</button>
                ${createDeleteButton(shape).outerHTML}
            </div>
        `;

        const nameInput = layer.querySelector('.layer-name');
        const upButton = layer.querySelector('.layer-up');
        const downButton = layer.querySelector('.layer-down');

        // Rename layer
        nameInput.addEventListener('change', () => {
            layer.querySelector('.layer-name').value = nameInput.value;
        });

        // Move layer up
        upButton.addEventListener('click', () => {
            if (index > 0) {
                canvas.insertBefore(shape, canvas.children[index - 1]);
                updateLayers();
            }
        });

        // Move layer down
        downButton.addEventListener('click', () => {
            if (index < shapes.length - 1) {
                canvas.insertBefore(shape, canvas.children[index + 1].nextSibling);
                updateLayers();
            }
        });

        layersPanel.appendChild(layer);
    });
}

function createDeleteButton(shape) {
    const button = document.createElement('button');
    button.textContent = 'Delete';
    button.addEventListener('click', () => {
        shape.remove();
        updateLayers();
    });
    return button;
}

// Event listeners
addRectangle.addEventListener('click', () => createShape('rectangle'));
addText.addEventListener('click', addTextToRectangle);

deleteShape.addEventListener('click', () => {
    if (selectedShape) {
        selectedShape.remove();
        selectedShape = null;
        updateLayers();
    }
});

colorPicker.addEventListener('input', updateTextStyle);

cornerRadius.addEventListener('input', () => {
    if (selectedShape) {
        selectedShape.style.borderRadius = cornerRadius.value + 'px';
    }
});

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

function importDrawing(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(e.target.result, 'text/html');
        canvas.innerHTML = doc.querySelector('#canvas').innerHTML;
        updateLayers();
        canvas.querySelectorAll('.shape').forEach(shape => {
            // Reattach click listener for selection and handles
            shape.addEventListener('click', function() {
                if (selectedShape) {
                    selectedShape.classList.remove('selected');
                    removeResizeHandles(selectedShape);
                    removeRotationHandle(selectedShape);
                    removeCornerRadiusHandles(selectedShape);
                }
                selectedShape = shape;
                shape.classList.add('selected');
                if (shape.textContent) {
                    textContentInput.value = shape.textContent;
                    textSizeInput.value = parseInt(getComputedStyle(shape).fontSize, 10);
                }
                addResizeHandles(shape);
                addRotationHandle(shape);
                addCornerRadiusHandles(shape);
            });

            // Reattach double-click listener for text editing
            shape.addEventListener('dblclick', function() {
                if (shape.textContent) {
                    shape.contentEditable = true;
                    shape.focus();

                    const onBlur = () => {
                        shape.contentEditable = false;
                        textContentInput.value = shape.textContent;
                        shape.removeEventListener('blur', onBlur);
                    };

                    shape.addEventListener('blur', onBlur);
                }
            });

            // Re-enable dragging functionality
            dragElement(shape);
        });
    };
    reader.readAsText(file);
}

function updateRectColor() {
    if (selectedShape && selectedShape.classList.contains('shape')) {
        selectedShape.style.backgroundColor = rectColorPicker.value;
    }
}

// Add these new handler functions
function handleTouchSelection(e) {
    e.preventDefault();
    handleSelection(e);
    // Prevent immediate deselection on mobile
    if (selectedShape) {
        e.stopPropagation();
    }
}

function handleSelection(e) {
    if (selectedShape) {
        selectedShape.classList.remove('selected');
        removeResizeHandles(selectedShape);
        removeRotationHandle(selectedShape);
        removeCornerRadiusHandles(selectedShape);
    }
    
    const shape = e.target.closest('.shape');
    selectedShape = shape;
    shape.classList.add('selected');
    
    if (shape.textContent) {
        textContentInput.value = shape.textContent;
        textSizeInput.value = parseInt(getComputedStyle(shape).fontSize, 10);
    }
    
    addResizeHandles(shape);
    addRotationHandle(shape);
    addCornerRadiusHandles(shape);
}

function handleDoubleTap(e) {
    const currentTime = new Date().getTime();
    const timeSinceLastTap = currentTime - lastTouchTime;
    
    if (timeSinceLastTap < doubleTapThreshold && timeSinceLastTap > 0) {
        startTextEditing(e);
        lastTouchTime = 0;
    } else {
        lastTouchTime = currentTime;
    }
}

function startTextEditing(e) {
    const shape = e.target.closest('.shape');
    if (!shape || !shape.textContent) return;

    e.preventDefault();
    shape.contentEditable = true;
    
    // Mobile keyboard activation
    setTimeout(() => {
        shape.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(shape);
        sel.removeAllRanges();
        sel.addRange(range);
    }, 100);

    // Handle text input changes
    const finishEditing = () => {
        shape.contentEditable = false;
        textContentInput.value = shape.textContent;
        shape.removeEventListener('blur', finishEditing);
        shape.removeEventListener('touchend', finishEditingOutside);
    };

    const finishEditingOutside = (e) => {
        if (!shape.contains(e.target)) {
            finishEditing();
        }
    };

    shape.addEventListener('blur', finishEditing);
    document.addEventListener('touchstart', finishEditingOutside);
    document.addEventListener('click', finishEditingOutside);
}

exportButton.addEventListener('click', exportDrawing);
importInput.addEventListener('change', importDrawing);
rectColorPicker.addEventListener('input', updateRectColor);
// Add this to bscript.js
textSizeInput.addEventListener('input', updateTextStyle);

