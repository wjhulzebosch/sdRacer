import { debug } from './commonFunctions.js';
import { generateMaze } from './mazeCreator.js';

// NESW order: N=8, E=4, S=2, W=1
function emptyGrid(rows, cols) {
    return Array.from({length: rows}, () => Array(cols).fill('0000'));
}

// Global state
let grid = emptyGrid(4, 4);
let rows = 4, cols = 4;
let cars = []; // Array of car objects: {name, type, x, y, direction, id}
let finishPos = null;
let cows = []; // Array to store cow data: [{defaultX, defaultY, secondaryX, secondaryY, currentX, currentY}]
let trafficLights = []; // Array to store traffic light data: [{x, y, id}]
let placeMode = null; // 'redCar', 'blueCar', 'greenCar', 'yellowCar', 'finish', 'cow', 'trafficLight', or null
let cowPlacementStep = 'default';
let tempSecondaryPos = null;
let editingCarId = null; // For car configuration modal
let worldGenerated = false; // Track if world has been created
let checklistUpdateTimer = null; // Debounce timer for checklist updates

// DOM elements
const gridDiv = document.getElementById('levelGrid');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const carList = document.getElementById('carList');
const placementStatus = document.getElementById('placementStatus');
const gridSizeInfo = document.getElementById('gridSizeInfo');

// Checklist DOM elements
const checkWorldGenerated = document.getElementById('checkWorldGenerated');
const checkRoadsPlaced = document.getElementById('checkRoadsPlaced');
const checkCarPlaced = document.getElementById('checkCarPlaced');
const checkFinishPlaced = document.getElementById('checkFinishPlaced');
const checkLevelInfo = document.getElementById('checkLevelInfo');

// Car placement icons
const redCarIcon = document.getElementById('redCarIcon');
const blueCarIcon = document.getElementById('blueCarIcon');
const greenCarIcon = document.getElementById('greenCarIcon');
const yellowCarIcon = document.getElementById('yellowCarIcon');
const finishIcon = document.getElementById('finishIcon');
const cowIcon = document.getElementById('cowIcon');
const trafficLightIcon = document.getElementById('trafficLightIcon');

// Car management buttons
const addCarBtn = document.getElementById('addCarBtn');
const clearCarsBtn = document.getElementById('clearCarsBtn');

// Modal elements
const carModal = document.getElementById('carModal');
const carNameInput = document.getElementById('carName');
const carTypeSelect = document.getElementById('carType');
const carDirectionSelect = document.getElementById('carDirection');
const saveCarBtn = document.getElementById('saveCarBtn');
const cancelCarBtn = document.getElementById('cancelCarBtn');
const closeCarModal = document.getElementById('closeCarModal');

// Event listeners for car placement
redCarIcon.onclick = () => setPlaceMode('redCar');
blueCarIcon.onclick = () => setPlaceMode('blueCar');
greenCarIcon.onclick = () => setPlaceMode('greenCar');
yellowCarIcon.onclick = () => setPlaceMode('yellowCar');
finishIcon.onclick = () => setPlaceMode('finish');
cowIcon.onclick = () => setPlaceMode('cow');
trafficLightIcon.onclick = () => setPlaceMode('trafficLight');

// Car management
addCarBtn.onclick = () => openCarModal();
clearCarsBtn.onclick = clearAllCars;

// Modal events
saveCarBtn.onclick = saveCar;
cancelCarBtn.onclick = closeCarModalFunc;
closeCarModal.onclick = closeCarModalFunc;

// Close modal when clicking outside
carModal.onclick = (e) => {
    if (e.target === carModal) {
        closeCarModalFunc();
    }
};

function setPlaceMode(mode) {
    placeMode = placeMode === mode ? null : mode;
    updatePlaceModeUI();
    updatePlacementStatus();
}

function updatePlaceModeUI() {
    // Reset all icons
    [redCarIcon, blueCarIcon, greenCarIcon, yellowCarIcon, finishIcon, cowIcon, trafficLightIcon].forEach(icon => {
        icon.classList.remove('place-mode');
    });
    
    // Activate current mode
    if (placeMode === 'redCar') redCarIcon.classList.add('place-mode');
    else if (placeMode === 'blueCar') blueCarIcon.classList.add('place-mode');
    else if (placeMode === 'greenCar') greenCarIcon.classList.add('place-mode');
    else if (placeMode === 'yellowCar') yellowCarIcon.classList.add('place-mode');
    else if (placeMode === 'finish') finishIcon.classList.add('place-mode');
    else if (placeMode === 'cow') cowIcon.classList.add('place-mode');
    else if (placeMode === 'trafficLight') trafficLightIcon.classList.add('place-mode');
}

function updatePlacementStatus() {
    if (!placeMode) {
        placementStatus.textContent = 'Click an icon to start placing objects';
        return;
    }
    
    const statusMessages = {
        'redCar': 'Click on grid to place Red Car',
        'blueCar': 'Click on grid to place Blue Car',
        'greenCar': 'Click on grid to place Green Car',
        'yellowCar': 'Click on grid to place Yellow Car',
        'finish': 'Click on grid to place Finish Line',
        'cow': 'Click on grid to place Cow (first position)',
        'trafficLight': 'Click on grid to place Traffic Light'
    };
    
    placementStatus.textContent = statusMessages[placeMode] || 'Click on grid to place object';
}

function updateGridSize() {
    rows = parseInt(heightInput.value);
    cols = parseInt(widthInput.value);
    grid = emptyGrid(rows, cols);
    cars = [];
    finishPos = null;
    cows = [];
    trafficLights = [];
    updateGridInfo();
    renderGrid();
    renderCarList();
}

widthInput.onchange = updateGridSize;
heightInput.onchange = updateGridSize;

function updateGridInfo() {
    gridSizeInfo.textContent = `${cols}x${rows}`;
    updateChecklist();
}

// Function to count road pieces
function countRoadPieces() {
    let count = 0;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = grid[y][x];
            // Count each connection (N, E, S, W)
            for (let i = 0; i < 4; i++) {
                if (cell[i] === '1') {
                    count++;
                }
            }
        }
    }
    // Each road connection is counted twice (once from each side)
    // So divide by 2 to get actual road pieces
    return Math.floor(count / 2);
}

// Function to check if all level info fields are filled
function checkLevelInfoComplete() {
    const category = document.getElementById('category').value.trim();
    const name = document.getElementById('name').value.trim();
    const author = document.getElementById('author').value.trim();
    const instructions = document.getElementById('instructions').value.trim();
    
    return category && name && author && instructions;
}

// Function to update checklist UI
function updateChecklist() {
    if (!checkWorldGenerated) return; // DOM not ready yet
    
    // 1. World generated
    if (worldGenerated) {
        checkWorldGenerated.classList.add('done');
    } else {
        checkWorldGenerated.classList.remove('done');
    }
    
    // 2. Roads placed (at least 1 piece, which requires 2 clicks)
    const roadCount = countRoadPieces();
    if (roadCount >= 1) {
        checkRoadsPlaced.classList.add('done');
    } else {
        checkRoadsPlaced.classList.remove('done');
    }
    
    // 3. Car placed
    if (cars.length > 0) {
        checkCarPlaced.classList.add('done');
    } else {
        checkCarPlaced.classList.remove('done');
    }
    
    // 4. Finish placed
    if (finishPos !== null) {
        checkFinishPlaced.classList.add('done');
    } else {
        checkFinishPlaced.classList.remove('done');
    }
    
    // 5. Level info complete
    if (checkLevelInfoComplete()) {
        checkLevelInfo.classList.add('done');
    } else {
        checkLevelInfo.classList.remove('done');
    }
}

// Debounced checklist update for input fields
function scheduleChecklistUpdate() {
    if (checklistUpdateTimer) {
        clearTimeout(checklistUpdateTimer);
    }
    checklistUpdateTimer = setTimeout(updateChecklist, 300);
}

function renderGrid() {
    gridDiv.innerHTML = '';
    gridDiv.className = 'level-creator-grid';
    gridDiv.style.width = (cols * 48) + 'px';
    gridDiv.style.height = (rows * 48) + 'px';
    
    // Draw cells
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = document.createElement('div');
            cell.className = 'level-creator-cell';
            cell.style.left = (x * 48) + 'px';
            cell.style.top = (y * 48) + 'px';
            cell.style.backgroundImage = `url('/sdRacer/Assets/Textures/tiles/Road-${grid[y][x]}.png')`;
            cell.title = grid[y][x];
            
            // Check for cars at this position
            const carAtPosition = cars.find(car => car.x === x && car.y === y);
            if (carAtPosition) {
                cell.classList.add('car-here');
                cell.style.setProperty('--car-image', `url('/sdRacer/Assets/Textures/${getCarTexture(carAtPosition.type)}.png')`);
            }
            
            // Check for finish
            if (finishPos && finishPos[0] === y && finishPos[1] === x) {
                cell.classList.add('finish-here');
            }
            
            // Check for cows
            const cowAtPosition = cows.find(cow => cow.currentX === x && cow.currentY === y);
            if (cowAtPosition) {
                cell.classList.add('cow-here');
            }
            
            // Check for traffic lights
            const trafficLightAtPosition = trafficLights.find(tl => tl.x === x && tl.y === y);
            if (trafficLightAtPosition) {
                cell.classList.add('traffic-light-here');
            }
            
            // Show secondary cow positions
            if (placeMode === 'cow' && cowPlacementStep === 'secondary' && tempSecondaryPos) {
                if (x === tempSecondaryPos.x && y === tempSecondaryPos.y) {
                    cell.classList.add('cow-secondary-preview');
                }
            }
            
            cows.forEach(cow => {
                if (cow.secondaryX !== null && cow.secondaryY !== null && 
                    x === cow.secondaryX && y === cow.secondaryY &&
                    (x !== cow.currentX || y !== cow.currentY)) {
                    cell.classList.add('cow-secondary-preview');
                }
            });
            
            cell.onclick = () => handleCellClick(y, x);
            gridDiv.appendChild(cell);
        }
    }
    
    // Draw borders
    drawBorders();
}

function getCarTexture(carType) {
    const textures = {
        'red': 'RedCar',
        'blue': 'BlueCar',
        'green': 'GreenCar',
        'yellow': 'YellowCar',
        'default': 'Car'
    };
    return textures[carType] || 'Car';
}

function handleCellClick(y, x) {
    if (placeMode === 'finish') {
        finishPos = [y, x];
        placeMode = null;
        updatePlaceModeUI();
        updatePlacementStatus();
        updateGridInfo();
        updateChecklist();
        renderGrid();
    } else if (placeMode === 'cow') {
        handleCowPlacement(y, x);
    } else if (placeMode === 'trafficLight') {
        handleTrafficLightPlacement(y, x);
    } else if (placeMode && placeMode.endsWith('Car')) {
        handleCarPlacement(y, x);
    }
}

function handleCarPlacement(y, x) {
    // Check if position is already occupied
    if (cars.find(car => car.x === x && car.y === y)) {
        debug('A car is already placed at this position!', null, 'error');
        return;
    }
    
    if (finishPos && finishPos[0] === y && finishPos[1] === x) {
        debug('Cannot place car on finish line!', null, 'error');
        return;
    }
    
    // Create new car
    const carType = placeMode.replace('Car', '');
    const carId = Date.now() + Math.random();
    const newCar = {
        id: carId,
        name: `${carType}Car`,
        type: carType,
        x: x,
        y: y,
        direction: 'N'
    };
    
    cars.push(newCar);
    placeMode = null;
    updatePlaceModeUI();
    updatePlacementStatus();
    updateGridInfo();
    renderGrid();
    renderCarList();
    updateChecklist();
}

function handleCowPlacement(y, x) {
    if (cowPlacementStep === 'default') {
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
        tempSecondaryPos = null;
        updatePlacementStatus();
        placementStatus.textContent = 'Click to place cow secondary position (must be adjacent)';
        renderGrid();
    } else if (cowPlacementStep === 'secondary') {
        const lastCow = cows[cows.length - 1];
        const defaultX = lastCow.defaultX;
        const defaultY = lastCow.defaultY;
        
        const isOrthogonal = (Math.abs(x - defaultX) === 1 && y === defaultY) || 
                           (Math.abs(y - defaultY) === 1 && x === defaultX);
        
        if (!isOrthogonal) {
            debug('Secondary position must be orthogonally adjacent to the default position (up, down, left, or right).', null, 'error');
            return;
        }
        
        tempSecondaryPos = { x: x, y: y };
        renderGrid();
        
        lastCow.secondaryX = x;
        lastCow.secondaryY = y;
        
        placeMode = null;
        cowPlacementStep = 'default';
        tempSecondaryPos = null;
        updatePlaceModeUI();
        updatePlacementStatus();
        renderGrid();
    }
}

function handleTrafficLightPlacement(y, x) {
    // Check if position is already occupied by another traffic light
    if (trafficLights.find(tl => tl.x === x && tl.y === y)) {
        debug('A traffic light is already placed at this position!', null, 'error');
        return;
    }
    
    // Check if position is occupied by a car
    if (cars.find(car => car.x === x && car.y === y)) {
        debug('Cannot place traffic light on a car!', null, 'error');
        return;
    }
    
    // Check if position is occupied by finish line
    if (finishPos && finishPos[0] === y && finishPos[1] === x) {
        debug('Cannot place traffic light on finish line!', null, 'error');
        return;
    }
    
    // Check if position is occupied by a cow
    if (cows.find(cow => cow.currentX === x && cow.currentY === y)) {
        debug('Cannot place traffic light on a cow!', null, 'error');
        return;
    }
    
    // Create new traffic light
    const trafficLightId = Date.now() + Math.random();
    const newTrafficLight = {
        id: trafficLightId,
        x: x,
        y: y
    };
    
    trafficLights.push(newTrafficLight);
    placeMode = null;
    updatePlaceModeUI();
    updatePlacementStatus();
    updateGridInfo();
    renderGrid();
}

function drawBorders() {
    // Horizontal borders
    for (let y = 0; y <= rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (y === 0 || y === rows) continue;
            const btn = document.createElement('button');
            btn.className = 'level-creator-border-btn h';
            btn.style.left = (x * 48) + 'px';
            btn.style.top = (y * 48 - 4) + 'px';
            const n = parseInt(grid[y-1][x][2]);
            const s = parseInt(grid[y][x][0]);
            if (n || s) btn.classList.add('active');
            btn.onclick = () => toggleConnection(y-1, x, y, x, 'S', 'N');
            gridDiv.appendChild(btn);
        }
    }
    
    // Vertical borders
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x <= cols; x++) {
            if (x === 0 || x === cols) continue;
            const btn = document.createElement('button');
            btn.className = 'level-creator-border-btn v';
            btn.style.left = (x * 48 - 4) + 'px';
            btn.style.top = (y * 48) + 'px';
            const w = parseInt(grid[y][x-1][1]);
            const e = parseInt(grid[y][x][3]);
            if (w || e) btn.classList.add('active');
            btn.onclick = () => toggleConnection(y, x-1, y, x, 'E', 'W');
            gridDiv.appendChild(btn);
        }
    }
}

function toggleConnection(y1, x1, y2, x2, dir1, dir2) {
    const bitMap = { 'N': 0, 'E': 1, 'S': 2, 'W': 3 };
    
    // Convert current values to binary strings and then to arrays for easier manipulation
    const current1 = grid[y1][x1].split('').map(Number);
    const current2 = grid[y2][x2].split('').map(Number);
    
    const bit1 = bitMap[dir1];
    const bit2 = bitMap[dir2];
    
    // Toggle the bits
    if (current1[bit1]) {
        // Remove connection
        current1[bit1] = 0;
        current2[bit2] = 0;
    } else {
        // Add connection
        current1[bit1] = 1;
        current2[bit2] = 1;
    }
    
    // Convert back to strings
    grid[y1][x1] = current1.join('');
    grid[y2][x2] = current2.join('');
    
    renderGrid();
    updateChecklist();
}

// Car Management Functions
function renderCarList() {
    carList.innerHTML = '';
    
    if (cars.length === 0) {
        carList.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 20px;">No cars placed yet</div>';
        return;
    }
    
    cars.forEach(car => {
        const carItem = document.createElement('div');
        carItem.className = 'car-item';
        
        carItem.innerHTML = `
            <div class="car-info">
                <div class="car-preview" style="background-image: url('/sdRacer/Assets/Textures/${getCarTexture(car.type)}.png')"></div>
                <div class="car-details">
                    <div class="car-name">${car.name}</div>
                    <div class="car-type">${car.type} car at (${car.x}, ${car.y}) facing ${car.direction}</div>
                </div>
            </div>
            <div class="car-actions">
                <button onclick="editCar(${car.id})" class="btn-secondary">✏️</button>
                <button onclick="removeCar(${car.id})" class="btn-warning">🗑️</button>
            </div>
        `;
        
        carList.appendChild(carItem);
    });
}

function editCar(carId) {
    const car = cars.find(c => c.id === carId);
    if (!car) return;
    
    editingCarId = carId;
    carNameInput.value = car.name;
    carTypeSelect.value = car.type;
    carDirectionSelect.value = car.direction;
    
    carModal.style.display = 'block';
}

function removeCar(carId) {
    if (confirm('Are you sure you want to remove this car?')) {
        cars = cars.filter(car => car.id !== carId);
        updateGridInfo();
        renderGrid();
        renderCarList();
        updateChecklist();
    }
}

function clearAllCars() {
    if (cars.length === 0) return;
    
    if (confirm(`Are you sure you want to remove all ${cars.length} cars?`)) {
        cars = [];
        updateGridInfo();
        renderGrid();
        renderCarList();
        updateChecklist();
    }
}

function openCarModal() {
    editingCarId = null;
    carNameInput.value = '';
    carTypeSelect.value = 'red';
    carDirectionSelect.value = 'N';
    carModal.style.display = 'block';
}

function saveCar() {
    const name = carNameInput.value.trim();
    const type = carTypeSelect.value;
    const direction = carDirectionSelect.value;
    
    if (!name) {
        debug('Please enter a car name', null, 'error');
        return;
    }
    
    if (cars.find(car => car.name === name && car.id !== editingCarId)) {
        debug('A car with this name already exists', null, 'error');
        return;
    }
    
    if (editingCarId) {
        // Update existing car
        const car = cars.find(c => c.id === editingCarId);
        if (car) {
            car.name = name;
            car.type = type;
            car.direction = direction;
        }
    } else {
        // Create new car (will be placed on next grid click)
        const carId = Date.now() + Math.random();
        const newCar = {
            id: carId,
            name: name,
            type: type,
            x: -1, // Will be set when placed
            y: -1,
            direction: direction
        };
        cars.push(newCar);
        
        // Set placement mode for this car
        setPlaceMode(`${type}Car`);
    }
    
    closeCarModalFunc();
    renderCarList();
}

function closeCarModalFunc() {
    carModal.style.display = 'none';
    editingCarId = null;
}

// Level Data Functions
function getLevelDetails() {
    // Helper to escape line breaks
    function escapeLineBreaks(str) {
        return typeof str === 'string' ? str.replace(/\r?\n/g, '\\n') : str;
    }
    const level = {
        category: escapeLineBreaks(document.getElementById('category').value),
        name: escapeLineBreaks(document.getElementById('name').value),
        author: escapeLineBreaks(document.getElementById('author').value),
        WinCondition: escapeLineBreaks(document.getElementById('winCondition').value),
        Instructions: escapeLineBreaks(document.getElementById('instructions').value),
        defaultCode: escapeLineBreaks(document.getElementById('defaultCode').value),
        rows: grid,
        cars: cars.map(car => ({
            name: escapeLineBreaks(car.name),
            type: escapeLineBreaks(car.type),
            position: [car.y, car.x],
            direction: escapeLineBreaks(car.direction)
        })),
        end: finishPos ? [finishPos[0], finishPos[1]] : null,
        cows: cows.map(cow => ({
            defaultX: cow.defaultX,
            defaultY: cow.defaultY,
            secondaryX: cow.secondaryX,
            secondaryY: cow.secondaryY
        })),
        trafficLights: trafficLights.map(tl => ({
            position: [tl.y, tl.x]
        }))
    };
    
    return level;
}

function setLevelDetails(level) {
    document.getElementById('category').value = level.category || '';
    document.getElementById('name').value = level.name || '';
    document.getElementById('author').value = level.author || '';
    document.getElementById('winCondition').value = level.WinCondition || level.winCondition || 'IsAtFinish()';
    document.getElementById('instructions').value = level.Instructions || level.instructions || '';
    document.getElementById('defaultCode').value = level.defaultCode || '';
    
    // Handle grid data - Levels.json uses 'rows' instead of 'grid'
    if (level.rows) {
        grid = level.rows;
        rows = grid.length;
        cols = grid[0].length;
        widthInput.value = cols;
        heightInput.value = rows;
    } else if (level.grid) {
        grid = level.grid;
        rows = grid.length;
        cols = grid[0].length;
        widthInput.value = cols;
        heightInput.value = rows;
    }
    
    // Handle cars data - Levels.json uses different structure
    if (level.cars) {
        cars = level.cars.map((car, index) => {
            const carData = {
                id: Date.now() + index + Math.random(),
                name: car.name,
                type: car.type,
                direction: car.direction
            };
            debug('setLevelDetails: loading car', car);
            if (car.position && Array.isArray(car.position)) {
                carData.y = car.position[0];
                carData.x = car.position[1];
                debug('setLevelDetails: car.position', car.position, '-> y:', carData.y, 'x:', carData.x);
            } else if (car.x !== undefined && car.y !== undefined) {
                carData.x = car.x;
                carData.y = car.y;
                debug('setLevelDetails: car.x/y', car.x, car.y);
            }
            debug('setLevelDetails: resulting carData', carData);
            return carData;
        });
    }
    // Add this block to handle legacy single car mode
    else if (level.start && Array.isArray(level.start)) {
        cars = [{
            id: Date.now() + Math.random(),
            name: 'defaultCar',
            type: 'default',
            direction: 'N',
            y: level.start[0],
            x: level.start[1]
        }];
    }
    
    // Handle finish position - Levels.json uses 'end' instead of 'finish'
    if (level.end && Array.isArray(level.end)) {
        finishPos = [level.end[0], level.end[1]];
    } else if (level.finish) {
        finishPos = [level.finish.y, level.finish.x];
    }
    
    // Handle cows data
    if (level.cows) {
        cows = level.cows.map(cow => ({
            ...cow,
            currentX: cow.defaultX,
            currentY: cow.defaultY
        }));
    }
    
    // Handle traffic lights data
    if (level.trafficLights) {
        trafficLights = level.trafficLights.map((tl, index) => ({
            id: Date.now() + index + Math.random(),
            x: tl.position[1],
            y: tl.position[0]
        }));
    } else {
        trafficLights = [];
    }
    
    worldGenerated = true;
    updateGridInfo();
    renderGrid();
    renderCarList();
    updateChecklist();
}

// JSON Export/Import
function formatJSON(obj, indent = 0) {
    const spaces = ' '.repeat(indent);
    if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            const items = obj.map(item => formatJSON(item, indent + 2)).join(',\n' + spaces);
            return '[\n' + spaces + items + '\n' + spaces.slice(0, -2) + ']';
        } else {
            const keys = Object.keys(obj);
            if (keys.length === 0) return '{}';
            const items = keys.map(key => {
                const value = formatJSON(obj[key], indent + 2);
                return `"${key}": ${value}`;
            }).join(',\n' + spaces);
            return '{\n' + spaces + items + '\n' + spaces.slice(0, -2) + '}';
        }
    } else if (typeof obj === 'string') {
        return `"${obj.replace(/"/g, '\\"')}"`;
    } else {
        return String(obj);
    }
}

// Event handlers for existing buttons
document.getElementById('showJsonBtn').onclick = () => {
    const level = getLevelDetails();
    document.getElementById('jsonArea').value = formatJSON(level, 0);
};

document.getElementById('loadJsonBtn').onclick = () => {
    try {
        const jsonText = document.getElementById('jsonArea').value;
        const level = JSON.parse(jsonText);
        setLevelDetails(level);
    } catch (error) {
        debug('Invalid JSON: ' + error.message, null, 'error');
    }
};

document.getElementById('generateMazeBtn').onclick = () => {
    generateMazeForLevel();
};

// Create Level button - creates a new empty grid with defined size
document.getElementById('createLevelBtn').onclick = () => {
    const newWidth = parseInt(widthInput.value) || 4;
    const newHeight = parseInt(heightInput.value) || 4;
    
    if (newWidth < 1 || newHeight < 1) {
        alert('Width and height must be at least 1');
        return;
    }
    
    if (newWidth > 20 || newHeight > 20) {
        alert('Maximum grid size is 20x20');
        return;
    }
    
    // Update grid dimensions
    cols = newWidth;
    rows = newHeight;
    
    // Create empty grid
    grid = emptyGrid(rows, cols);
    
    // Clear all placed items
    cars = [];
    finishPos = null;
    cows = [];
    trafficLights = [];
    placeMode = null;
    
    // Set world generated flag
    worldGenerated = true;
    
    // Update UI
    updateGridInfo();
    renderGrid();
    renderCarList();
    updatePlaceModeUI();
    updatePlacementStatus();
    updateChecklist();
    
    debug(`Created new ${cols}x${rows} level`);
};

// Load Level button - triggers the selector change
document.getElementById('loadLevelBtn').onclick = () => {
    const selector = document.getElementById('levelSelector');
    if (selector.value) {
        // Trigger the change event
        selector.dispatchEvent(new Event('change'));
    } else {
        alert('Please select a level from the dropdown first.');
    }
};

// Load levels from file
async function loadLevelsFromFile() {
    try {
        // Get all level IDs from the API
        const { ids } = await fetch('https://wjhulzebosch.nl/json_ape/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ action: 'list', category: 'simple_sd_racer' })
        }).then(r => r.json());
        // Fetch each level by ID
        const levels = await Promise.all(
            ids.map(async id => {
                return await fetch('https://wjhulzebosch.nl/json_ape/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ action: 'get', category: 'simple_sd_racer', id })
                }).then(r => r.json());
            })
        );
        const selector = document.getElementById('levelSelector');
        selector.innerHTML = '<option value="">Select a level...</option>';
        levels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.apiId;
            option.textContent = `${level.apiId}: ${level.name}`;
            selector.appendChild(option);
        });
        selector.onchange = () => {
            const selectedId = selector.value;
            if (selectedId) {
                const selectedLevel = levels.find(l => l.apiId == selectedId);
                if (selectedLevel) {
                    setLevelDetails(selectedLevel);
                }
            }
        };
    } catch (error) {
        debug('Failed to load levels:', error, 'error');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateGridInfo();
    renderGrid();
    renderCarList();
    loadLevelsFromFile();
    addPlayLevelButton();
    
    // Add checklist update listeners for level info fields
    ['category', 'name', 'author', 'instructions'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', scheduleChecklistUpdate);
        }
    });
    
    // Add Enter key support for Create Level
    widthInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('createLevelBtn').click();
        }
    });
    
    heightInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('createLevelBtn').click();
        }
    });
});

// On load, if ?loadTemp=1, load the temp level
if (window.location.search.includes('loadTemp=1')) {
    const tempLevel = localStorage.getItem('sdRacer_tempLevel');
    if (tempLevel) {
        try {
            setLevelDetails(JSON.parse(tempLevel));
        } catch (e) {
            debug('Failed to load temp level: ' + e, null, 'error');
        }
    }
}

function addPlayLevelButton() {
    let btn = document.getElementById('playLevelBtn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'playLevelBtn';
        btn.textContent = 'Play Level';
        btn.className = 'play-level-btn';
        btn.style.position = 'absolute';
        btn.style.top = '10px';
        btn.style.right = '10px';
        document.body.appendChild(btn);
    }
    // Always set the click handler (in case button already exists in HTML)
    btn.onclick = () => {
        // Export current level as JSON
        const level = getLevelDetails();
        const levelJson = JSON.stringify(level);
        // Store in localStorage for transfer
        localStorage.setItem('sdRacer_tempLevel', levelJson);
        // Open game with a flag to load from temp
        window.location.href = 'game.html?loadTemp=1';
    };
}

// Maze generation function
function generateMazeForLevel() {
    debug('generateMazeForLevel: Starting maze generation');
    
    debug('generateMazeForLevel: Generating maze for', cols, 'x', rows, 'grid');
    
    try {
        const mazeResult = generateMaze(cols, rows);
        grid = mazeResult.maze;
        
        debug('generateMazeForLevel: Maze generated successfully', mazeResult);
        
        // Update the grid display
        renderGrid();
        
    } catch (error) {
        debug('generateMazeForLevel: Error generating maze', error, 'error');
        alert('Error generating maze: ' + error.message);
    }
}

export { formatJSON, getLevelDetails, setLevelDetails, loadLevelsFromFile }; 