// For now, hardcode a level id and default code
const LEVEL_ID = 'level1';
const DEFAULT_CODE = `// Write your code here!\nfunction drive() {\n    // Example: moveForward();\n}`;

let codeArea, saveBtn, loadBtn, playBtn, resetBtn;
let car = null;
let level = null;
let currentLevelId = '1';
let finishPos = null;
let allLevels = [];

function getCodeArea() {
    return document.getElementById('code');
}
function getSaveBtn() {
    return document.getElementById('saveBtn');
}
function getLoadBtn() {
    return document.getElementById('loadBtn');
}
function getPlayBtn() {
    return document.getElementById('playBtn');
}
function getResetBtn() {
    return document.getElementById('resetBtn');
}

function loadCode() {
    const saved = localStorage.getItem('sdRacer_code_' + LEVEL_ID);
    codeArea.value = saved !== null ? saved : DEFAULT_CODE;
}

function saveCode() {
    localStorage.setItem('sdRacer_code_' + LEVEL_ID, codeArea.value);
    saveBtn.textContent = 'Saved!';
    setTimeout(() => saveBtn.textContent = 'Save', 1000);
}

function handleLoadBtn() {
    loadCode();
    loadBtn.textContent = 'Loaded!';
    setTimeout(() => loadBtn.textContent = 'Load', 1000);
}

function showWinMessage() {
    const winDiv = document.getElementById('win-message');
    winDiv.style.display = 'flex';
}

function hideWinMessage() {
    const winDiv = document.getElementById('win-message');
    winDiv.style.display = 'none';
}

function isAtFinish() {
    if (!car || !finishPos) return false;
    return car.currentPosition.x === finishPos[0] && car.currentPosition.y === finishPos[1];
}

function setupWinButtons() {
    const retryBtn = document.getElementById('retryBtn');
    const nextLevelBtn = document.getElementById('nextLevelBtn');
    retryBtn.onclick = () => {
        hideWinMessage();
        loadLevel(currentLevelId);
    };
    nextLevelBtn.onclick = () => {
        hideWinMessage();
        const idx = allLevels.findIndex(lvl => lvl.id === currentLevelId);
        if (idx !== -1 && idx + 1 < allLevels.length) {
            currentLevelId = allLevels[idx + 1].id;
            loadLevel(currentLevelId);
        }
    };
}

function loadLevel(levelId) {
    fetch('Assets/Maps/Levels.json')
        .then(response => response.json())
        .then(data => {
            allLevels = data.levels;
            const levelData = data.levels.find(lvl => lvl.id === levelId);
            if (!levelData) {
                console.error('Level not found!');
                return;
            }
            level = new Level({
                instruction: levelData.Instructions || '',
                defaultCode: levelData.defaultCode || '',
                tiles: levelData.rows
            });
            const gameDiv = document.getElementById('game');
            // Swap x and y for finish position and add +1 for grass border
            finishPos = Array.isArray(levelData.end) ? [levelData.end[1] + 1, levelData.end[0] + 1] : undefined;
            level.render(gameDiv, finishPos);
            // Create and render the car separately, swapping x and y and adding +1 for grass border
            if (levelData.start && Array.isArray(levelData.start)) {
                car = new Car({ position: { x: levelData.start[1] + 1, y: levelData.start[0] + 1 }, direction: 'N' });
                car.render(gameDiv);
            }
        })
        .catch(err => console.error('Failed to load level: ' + err));
}

async function playCode() {
    try {
        playBtn.disabled = true;
        hideWinMessage();
        const gameDiv = document.getElementById('game');
        const interpreter = new Interpreter(car, level, gameDiv);
        await interpreter.run(codeArea.value);
        if (isAtFinish()) {
            showWinMessage();
        }
        playBtn.textContent = 'Played!';
        setTimeout(() => playBtn.textContent = 'Play', 1000);
    } catch (e) {
        console.error('Error in code: ' + e.message);
    } finally {
        playBtn.disabled = false;
    }
}

function resetCode() {
    codeArea.value = DEFAULT_CODE;
    resetBtn.textContent = 'Reset!';
    setTimeout(() => resetBtn.textContent = 'Reset', 1000);
}

function startGame() {
    codeArea = getCodeArea();
    saveBtn = getSaveBtn();
    loadBtn = getLoadBtn();
    playBtn = getPlayBtn();
    resetBtn = getResetBtn();

    loadCode();
    saveBtn.onclick = saveCode;
    loadBtn.onclick = handleLoadBtn;
    playBtn.onclick = playCode;
    resetBtn.onclick = resetCode;
    setupWinButtons();
    loadLevel(currentLevelId);
}

window.addEventListener('DOMContentLoaded', startGame);
