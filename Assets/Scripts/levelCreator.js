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
let placeMode = null; // 'car' or 'finish' or null

const carIcon = document.getElementById('carIcon');
const finishIcon = document.getElementById('finishIcon');
carIcon.onclick = () => {
    placeMode = placeMode === 'car' ? null : 'car';
    updatePlaceModeUI();
};
finishIcon.onclick = () => {
    placeMode = placeMode === 'finish' ? null : 'finish';
    updatePlaceModeUI();
};
function updatePlaceModeUI() {
    carIcon.classList.toggle('place-mode', placeMode === 'car');
    finishIcon.classList.toggle('place-mode', placeMode === 'finish');
}

function updateGridSize() {
    rows = parseInt(heightInput.value);
    cols = parseInt(widthInput.value);
    grid = emptyGrid(rows, cols);
    carPos = null;
    finishPos = null;
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
            cell.style.backgroundImage = `url('Assets/Textures/Tiles/Road-${grid[y][x]}.png')`;
            cell.style.backgroundSize = 'cover';
            cell.title = grid[y][x];
            if (carPos && carPos[0] === y && carPos[1] === x) cell.classList.add('car-here');
            if (finishPos && finishPos[0] === y && finishPos[1] === x) cell.classList.add('finish-here');
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
        id: 'custom',
        name: document.getElementById('name').value,
        Description: document.getElementById('description').value,
        Instructions: document.getElementById('instructions').value,
        start: carPos ? carPos.slice() : null,
        end: finishPos ? finishPos.slice() : null,
        defaultCode: document.getElementById('defaultCode').value,
        rows: grid.map(row => row.slice())
    };
}
function setLevelDetails(level) {
    document.getElementById('name').value = level.name || '';
    document.getElementById('description').value = level.Description || '';
    document.getElementById('instructions').value = level.Instructions || '';
    carPos = (level.start && level.start.length === 2) ? level.start.slice() : null;
    finishPos = (level.end && level.end.length === 2) ? level.end.slice() : null;
    document.getElementById('start').value = carPos ? carPos.join(',') : '';
    document.getElementById('end').value = finishPos ? finishPos.join(',') : '';
    document.getElementById('defaultCode').value = level.defaultCode || '';
    if (level.rows) {
        rows = level.rows.length;
        cols = level.rows[0].length;
        widthInput.value = cols;
        heightInput.value = rows;
        grid = level.rows.map(row => row.slice());
        renderGrid();
    } else {
        renderGrid();
    }
}
document.getElementById('showJsonBtn').onclick = () => {
    document.getElementById('jsonArea').value = JSON.stringify(getLevelDetails(), null, 2);
};
document.getElementById('loadJsonBtn').onclick = () => {
    try {
        const level = JSON.parse(document.getElementById('jsonArea').value);
        setLevelDetails(level);
    } catch (e) {
        alert('Invalid JSON');
    }
}; 