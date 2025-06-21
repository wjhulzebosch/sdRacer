// NESW order: N=8, E=4, S=2, W=1
function emptyGrid(rows, cols) {
    return Array.from({length: rows}, () => Array(cols).fill('0000'));
}

let grid = emptyGrid(4, 4);
let rows = 4, cols = 4;
const gridDiv = document.getElementById('levelGrid');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
let carPos = null;
let finishPos = null;
let cows = []; // Array to store cow data: [{defaultX, defaultY, secondaryX, secondaryY, currentX, currentY}]
let placeMode = null; // 'car', 'finish', 'cow', or null
let cowPlacementStep = 'default'; // 'default' or 'secondary' for cow placement
let tempSecondaryPos = null; // Temporary secondary position during placement

const carIcon = document.getElementById('carIcon');
const finishIcon = document.getElementById('finishIcon');
const cowIcon = document.getElementById('cowIcon');

carIcon.onclick = () => {
    placeMode = placeMode === 'car' ? null : 'car';
    updatePlaceModeUI();
};
finishIcon.onclick = () => {
    placeMode = placeMode === 'finish' ? null : 'finish';
    updatePlaceModeUI();
};
cowIcon.onclick = () => {
    placeMode = placeMode === 'cow' ? null : 'cow';
    cowPlacementStep = 'default';
    updatePlaceModeUI();
};

function updatePlaceModeUI() {
    carIcon.classList.toggle('place-mode', placeMode === 'car');
    finishIcon.classList.toggle('place-mode', placeMode === 'finish');
    cowIcon.classList.toggle('place-mode', placeMode === 'cow');
}

function updateGridSize() {
    rows = parseInt(heightInput.value);
    cols = parseInt(widthInput.value);
    grid = emptyGrid(rows, cols);
    carPos = null;
    finishPos = null;
    cows = [];
    renderGrid();
}
widthInput.onchange = updateGridSize;
heightInput.onchange = updateGridSize;

function renderGrid() {
    gridDiv.innerHTML = '';
    gridDiv.style.width = (cols * 48) + 'px';
    gridDiv.style.height = (rows * 48) + 'px';
    // Draw cells
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.left = (x * 48) + 'px';
            cell.style.top = (y * 48) + 'px';
            cell.style.backgroundImage = `url('Assets/Textures/tiles/Road-${grid[y][x]}.png')`;
            cell.style.backgroundSize = 'cover';
            cell.title = grid[y][x];
            if (carPos && carPos[0] === y && carPos[1] === x) cell.classList.add('car-here');
            if (finishPos && finishPos[0] === y && finishPos[1] === x) cell.classList.add('finish-here');
            
            // Check if there's a cow at this position
            const cowAtPosition = cows.find(cow => cow.currentX === x && cow.currentY === y);
            if (cowAtPosition) {
                cell.classList.add('cow-here');
            }
            
            // Show semi-transparent cow for secondary position during placement
            if (placeMode === 'cow' && cowPlacementStep === 'secondary' && tempSecondaryPos) {
                console.log('Checking preview for position:', { x, y, tempSecondaryPos });
                if (x === tempSecondaryPos.x && y === tempSecondaryPos.y) {
                    console.log('Adding cow-secondary-preview class to position:', { x, y });
                    cell.classList.add('cow-secondary-preview');
                }
            }
            
            // Show secondary positions for all placed cows
            cows.forEach(cow => {
                if (cow.secondaryX !== null && cow.secondaryY !== null && 
                    x === cow.secondaryX && y === cow.secondaryY &&
                    (x !== cow.currentX || y !== cow.currentY)) {
                    cell.classList.add('cow-secondary-preview');
                }
            });
            
            cell.onclick = () => {
                if (placeMode === 'car') {
                    carPos = [y, x];
                    placeMode = null;
                    updatePlaceModeUI();
                    renderGrid();
                } else if (placeMode === 'finish') {
                    finishPos = [y, x];
                    placeMode = null;
                    updatePlaceModeUI();
                    renderGrid();
                } else if (placeMode === 'cow') {
                    handleCowPlacement(y, x);
                }
            };
            gridDiv.appendChild(cell);
        }
    }
    // Draw horizontal borders
    for (let y = 0; y <= rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (y === 0 || y === rows) continue;
            const btn = document.createElement('button');
            btn.className = 'border-btn h';
            btn.style.left = (x * 48) + 'px';
            btn.style.top = (y * 48 - 4) + 'px';
            // Is there a connection N/S?
            const n = parseInt(grid[y-1][x][2]); // S of above
            const s = parseInt(grid[y][x][0]);   // N of below
            if (n || s) btn.classList.add('active');
            btn.onclick = () => toggleConnection(y-1, x, y, x, 'S', 'N');
            gridDiv.appendChild(btn);
        }
    }
    // Draw vertical borders
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x <= cols; x++) {
            if (x === 0 || x === cols) continue;
            const btn = document.createElement('button');
            btn.className = 'border-btn v';
            btn.style.left = (x * 48 - 4) + 'px';
            btn.style.top = (y * 48) + 'px';
            // Is there a connection E/W?
            const w = parseInt(grid[y][x-1][1]); // E of left
            const e = parseInt(grid[y][x][3]);   // W of right
            if (w || e) btn.classList.add('active');
            btn.onclick = () => toggleConnection(y, x-1, y, x, 'E', 'W');
            gridDiv.appendChild(btn);
        }
    }
}

function handleCowPlacement(y, x) {
    console.log('handleCowPlacement called:', { y, x, cowPlacementStep, placeMode });
    
    if (cowPlacementStep === 'default') {
        console.log('Placing default position');
        // Place default position
        const newCow = {
            defaultX: x,
            defaultY: y,
            secondaryX: null,
            secondaryY: null,
            currentX: x,
            currentY: y
        };
        cows.push(newCow);
        cowPlacementStep = 'secondary';
        tempSecondaryPos = null; // Reset temporary position
        console.log('Cow added, step changed to secondary, cows:', cows);
        renderGrid();
        // Don't reset placement mode yet - wait for secondary position
    } else if (cowPlacementStep === 'secondary') {
        console.log('Placing secondary position');
        // Place secondary position
        const lastCow = cows[cows.length - 1];
        const defaultX = lastCow.defaultX;
        const defaultY = lastCow.defaultY;
        
        // Check if secondary position is orthogonally adjacent to default
        const isOrthogonal = (Math.abs(x - defaultX) === 1 && y === defaultY) || 
                           (Math.abs(y - defaultY) === 1 && x === defaultX);
        
        console.log('Orthogonal check:', { x, y, defaultX, defaultY, isOrthogonal });
        
        if (!isOrthogonal) {
            alert('Secondary position must be orthogonally adjacent to the default position (up, down, left, or right).');
            return;
        }
        
        // Set temporary position for preview
        tempSecondaryPos = { x: x, y: y };
        console.log('Set tempSecondaryPos:', tempSecondaryPos);
        renderGrid();
        
        // Update the last cow with secondary position
        lastCow.secondaryX = x;
        lastCow.secondaryY = y;
        
        // Reset placement mode immediately but keep the cow visible
        placeMode = null;
        cowPlacementStep = 'default';
        tempSecondaryPos = null;
        console.log('Placement complete, resetting mode');
        updatePlaceModeUI();
        renderGrid();
    }
}

function toggleConnection(y1, x1, y2, x2, dir1, dir2) {
    // NESW: 0=N, 1=E, 2=S, 3=W
    const dirIdx = {N:0, E:1, S:2, W:3};
    let arr1 = grid[y1][x1].split('');
    let arr2 = grid[y2][x2].split('');
    if (arr1[dirIdx[dir1]] === '1') {
        arr1[dirIdx[dir1]] = '0';
        arr2[dirIdx[dir2]] = '0';
    } else {
        arr1[dirIdx[dir1]] = '1';
        arr2[dirIdx[dir2]] = '1';
    }
    grid[y1][x1] = arr1.join('');
    grid[y2][x2] = arr2.join('');
    renderGrid();
}
renderGrid();

// Level details
function getLevelDetails() {
    return {
        id: document.getElementById('id').value,
        category: document.getElementById('category').value,
        name: document.getElementById('name').value,
        author: document.getElementById('author').value,
        WinCondition: document.getElementById('winCondition').value,
        Instructions: document.getElementById('instructions').value,
        start: carPos ? carPos.slice() : null,
        end: finishPos ? finishPos.slice() : null,
        defaultCode: document.getElementById('defaultCode').value,
        rows: grid.map(row => row.slice()),
        cows: cows.map(cow => ({
            defaultX: cow.defaultX,
            defaultY: cow.defaultY,
            secondaryX: cow.secondaryX,
            secondaryY: cow.secondaryY,
            currentX: cow.currentX,
            currentY: cow.currentY
        }))
    };
}
function setLevelDetails(level) {
    document.getElementById('id').value = level.id || '';
    document.getElementById('category').value = level.category || '';
    document.getElementById('name').value = level.name || '';
    document.getElementById('author').value = level.author || '';
    document.getElementById('winCondition').value = level.WinCondition || 'IsAtFinish()';
    document.getElementById('instructions').value = level.Instructions || '';
    carPos = (level.start && level.start.length === 2) ? level.start.slice() : null;
    finishPos = (level.end && level.end.length === 2) ? level.end.slice() : null;
    document.getElementById('defaultCode').value = level.defaultCode || '';
    if (level.rows) {
        rows = level.rows.length;
        cols = level.rows[0].length;
        widthInput.value = cols;
        heightInput.value = rows;
        // Ensure all tile codes are strings
        grid = level.rows.map(row => row.map(cell => String(cell)));
        // Load cows if they exist
        cows = level.cows ? level.cows.map(cow => ({
            defaultX: cow.defaultX,
            defaultY: cow.defaultY,
            secondaryX: cow.secondaryX,
            secondaryY: cow.secondaryY,
            currentX: cow.currentX,
            currentY: cow.currentY
        })) : [];
        renderGrid();
    } else {
        renderGrid();
    }
}
document.getElementById('showJsonBtn').onclick = () => {
    // Validate that car and finish positions are set
    if (!carPos) {
        alert('Error: Please place the car first by clicking the car icon and then clicking on the grid.');
        return;
    }
    if (!finishPos) {
        alert('Error: Please place the finish line first by clicking the finish icon and then clicking on the grid.');
        return;
    }
    
    const levelData = getLevelDetails();
    
    // Custom JSON formatter that keeps arrays on single lines
    function formatJSON(obj, indent = 0) {
        const spaces = '    '.repeat(indent);
        const nextSpaces = '    '.repeat(indent + 1);
        
        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            if (obj.every(item => typeof item === 'string' || typeof item === 'number')) {
                // Format strings with quotes, numbers without
                const formattedItems = obj.map(item => {
                    if (typeof item === 'string') {
                        return JSON.stringify(item);
                    }
                    return String(item);
                });
                return '[' + formattedItems.join(', ') + ']';
            }
            return '[\n' + obj.map(item => nextSpaces + formatJSON(item, indent + 1)).join(',\n') + '\n' + spaces + ']';
        }
        
        if (typeof obj === 'object' && obj !== null) {
            const entries = Object.entries(obj);
            if (entries.length === 0) return '{}';
            
            return '{\n' + entries.map(([key, value]) => 
                nextSpaces + '"' + key + '": ' + formatJSON(value, indent + 1)
            ).join(',\n') + '\n' + spaces + '}';
        }
        
        if (typeof obj === 'string') return JSON.stringify(obj);
        return String(obj);
    }
    
    document.getElementById('jsonArea').value = formatJSON(levelData);
};
document.getElementById('loadJsonBtn').onclick = () => {
    try {
        const level = JSON.parse(document.getElementById('jsonArea').value);
        setLevelDetails(level);
    } catch (e) {
        alert('Invalid JSON');
    }
}; 