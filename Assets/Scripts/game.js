// For now, hardcode a level id and default code
const LEVEL_ID = 'level1';
const DEFAULT_CODE = `// Write your CarLang code here!
int steps = 3;
for (int i = 0; i < steps; i = i + 1) {
    moveForward();
    rotate(90);
}`;

let codeArea, saveBtn, loadBtn, playBtn, resetBtn;
let car = null;
let level = null;
let currentLevelId = '1';
let finishPos = null;
let allLevels = [];
let carlangInterpreter = null;
let isRunning = false;

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
    const saved = localStorage.getItem('sdRacer_code_' + currentLevelId);
    if (saved !== null) {
        codeArea.value = saved;
    } else if (level && level.defaultCode) {
        codeArea.value = level.defaultCode;
    } else {
        codeArea.value = DEFAULT_CODE;
    }
}

function saveCode() {
    localStorage.setItem('sdRacer_code_' + currentLevelId, codeArea.value);
    saveBtn.textContent = 'Saved!';
    setTimeout(() => saveBtn.textContent = 'Save', 1000);
    
    // Trigger live parser update
    if (window.liveParser) {
        window.liveParser.checkCode();
    }
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
            const nextLevelId = allLevels[idx + 1].id;
            updateURLAndLoadLevel(nextLevelId);
        }
    };
}

function getLevelIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('levelId');
}

function updateURLAndLoadLevel(levelId) {
    const url = new URL(window.location);
    url.searchParams.set('levelId', levelId);
    window.history.pushState({}, '', url);
    loadLevel(levelId);
}

function showLevelSelector() {
    const overlay = document.createElement('div');
    overlay.id = 'levelSelectorOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    const selector = document.createElement('div');
    selector.style.cssText = `
        background: #23272b;
        border-radius: 12px;
        padding: 24px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'Select a Level';
    title.style.cssText = `
        color: #f0f0f0;
        margin: 0 0 20px 0;
        text-align: center;
    `;
    selector.appendChild(title);
    
    // Group levels by category
    const categories = {};
    allLevels.forEach(level => {
        const category = level.category || 'Uncategorized';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(level);
    });
    
    // Create category elements
    Object.keys(categories).forEach(categoryName => {
        const categoryDiv = document.createElement('div');
        categoryDiv.style.marginBottom = '16px';
        
        const categoryHeader = document.createElement('div');
        categoryHeader.textContent = categoryName;
        categoryHeader.style.cssText = `
            color: #f0f0f0;
            font-weight: bold;
            font-size: 1.1rem;
            margin-bottom: 8px;
            padding: 8px 12px;
            background: #2a2e32;
            border-radius: 6px;
        `;
        
        const levelList = document.createElement('div');
        levelList.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 8px;
            margin-left: 16px;
        `;
        
        // Add level items
        categories[categoryName].forEach(levelData => {
            const levelItem = document.createElement('div');
            levelItem.textContent = levelData.name || `Level ${levelData.id}`;
            levelItem.style.cssText = `
                background: #1a1e22;
                color: #ccc;
                padding: 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
                text-align: center;
            `;
            levelItem.onmouseenter = () => {
                levelItem.style.background = '#2a2e32';
            };
            levelItem.onmouseleave = () => {
                levelItem.style.background = '#1a1e22';
            };
            levelItem.onclick = () => {
                updateURLAndLoadLevel(levelData.id);
                overlay.remove();
            };
            levelList.appendChild(levelItem);
        });
        
        categoryDiv.appendChild(categoryHeader);
        categoryDiv.appendChild(levelList);
        selector.appendChild(categoryDiv);
    });
    
    overlay.appendChild(selector);
    document.body.appendChild(overlay);
    
    // Close overlay when clicking outside
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
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
            currentLevelId = levelId;
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
            loadCode();
        })
        .catch(err => console.error('Failed to load level: ' + err));
}

async function playCode() {
    try {
        playBtn.disabled = true;
        hideWinMessage();
        
        // First, run checkCode to show AST and validation
        if (window.liveParser) {
            window.liveParser.checkCode();
        }
        
        const gameDiv = document.getElementById('game');
        
        // Use new CarLang parser and interpreter
        const parser = new CarLangParser();
        const ast = parser.parse(codeArea.value);
        
        if (ast.errors && ast.errors.length > 0) {
            throw new Error(`Parse errors: ${ast.errors.join(', ')}`);
        }
        
        // Validate before execution
        const interpreter = new CarLangInterpreter(car, level, gameDiv);
        const validation = interpreter.validate(ast);
        
        if (!validation.valid) {
            throw new Error(`Validation errors: ${validation.errors.join(', ')}`);
        }
        
        // Execute if validation passes
        await interpreter.execute(ast);
        
        if (isAtFinish()) {
            showWinMessage();
        }
        playBtn.textContent = 'Played!';
        setTimeout(() => playBtn.textContent = 'Play', 1000);
    } catch (e) {
        console.error('Error in code: ' + e.message);
        alert('Error: ' + e.message);
    } finally {
        playBtn.disabled = false;
    }
}

function resetCode() {
    if (car && currentLevelId) {
        const gameDiv = document.getElementById('game');
        // Remove the car element from DOM
        const carElement = gameDiv.querySelector('.car');
        if (carElement) {
            carElement.remove();
        }
        // Find the current level data
        const levelData = allLevels.find(lvl => lvl.id === currentLevelId);
        if (levelData && levelData.start && Array.isArray(levelData.start)) {
            car = new Car({ position: { x: levelData.start[1] + 1, y: levelData.start[0] + 1 }, direction: 'N' });
            car.render(gameDiv);
        }
    }
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

    saveBtn.onclick = saveCode;
    loadBtn.onclick = handleLoadBtn;
    playBtn.onclick = playCode;
    resetBtn.onclick = resetCode;
    setupWinButtons();
    
    const levelId = getLevelIdFromURL();
    if (levelId) {
        loadLevel(levelId);
    } else {
        // Load levels first, then show selector
        fetch('Assets/Maps/Levels.json')
            .then(response => response.json())
            .then(data => {
                allLevels = data.levels;
                showLevelSelector();
            })
            .catch(err => console.error('Failed to load levels: ' + err));
    }
}

window.addEventListener('DOMContentLoaded', startGame);
