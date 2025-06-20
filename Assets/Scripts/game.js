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

// Indentation settings
const INDENT_SIZE = 4; // Number of spaces per indentation level
const INDENT_CHAR = ' '.repeat(INDENT_SIZE);

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
function getFixIndentationBtn() {
    return document.getElementById('fixIndentationBtn');
}

// Auto-indentation functions
function getIndentationLevel(line) {
    let level = 0;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === ' ') {
            level++;
        } else {
            break;
        }
    }
    return Math.floor(level / INDENT_SIZE);
}

function getIndentationString(level) {
    return INDENT_CHAR.repeat(level);
}

function handleAutoIndentation(event) {
    const textarea = event.target;
    const key = event.key;
    
    if (key === 'Enter') {
        event.preventDefault();
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        
        // Get the current line
        const beforeCursor = value.substring(0, start);
        const lines = beforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];
        
        // Calculate current indentation level
        let currentIndentLevel = getIndentationLevel(currentLine);
        
        // Check if current line ends with {
        const trimmedLine = currentLine.trim();
        if (trimmedLine.endsWith('{')) {
            currentIndentLevel++;
        }
        
        // Create the new line with proper indentation
        const newLine = '\n' + getIndentationString(currentIndentLevel);
        
        // Insert the new line
        const newValue = value.substring(0, start) + newLine + value.substring(end);
        textarea.value = newValue;
        
        // Set cursor position after the indentation
        const newCursorPos = start + newLine.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        
        return false;
    }
    
    return true;
}

function handleBraceIndentation(event) {
    const textarea = event.target;
    const key = event.key;
    
    if (key === '}') {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        
        // Get the current line
        const beforeCursor = value.substring(0, start);
        const lines = beforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];
        
        // Calculate current indentation level
        let currentIndentLevel = getIndentationLevel(currentLine);
        
        // If we're at the beginning of the line (after indentation), decrease indentation
        const trimmedBeforeCursor = currentLine.trim();
        if (trimmedBeforeCursor === '') {
            // We're at the beginning of the line, decrease indentation
            currentIndentLevel = Math.max(0, currentIndentLevel - 1);
            
            // Replace the current line's indentation
            const newIndentation = getIndentationString(currentIndentLevel);
            const lineStart = start - (currentLine.length - currentLine.trimStart().length);
            const newValue = value.substring(0, lineStart) + newIndentation + '}' + value.substring(end);
            textarea.value = newValue;
            
            // Set cursor position after the }
            const newCursorPos = lineStart + newIndentation.length + 1;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            
            // Prevent the default behavior to avoid duplicate }
            event.preventDefault();
            return false;
        }
    }
    
    return true;
}

function setupAutoIndentation() {
    const textarea = getCodeArea();
    if (textarea) {
        textarea.addEventListener('keydown', (event) => {
            if (!handleAutoIndentation(event)) {
                return;
            }
            if (!handleBraceIndentation(event)) {
                return;
            }
        });
    }
}

function fixIndentation() {
    const textarea = getCodeArea();
    if (!textarea) return;
    
    const originalCode = textarea.value;
    
    try {
        // Test the code first using the CarLang parser
        const parser = new CarLangParser();
        const result = parser.parse(originalCode);
        
        if (result.errors && result.errors.length > 0) {
            alert('Cannot fix indentation: Code has errors:\n' + result.errors.join('\n'));
            return;
        }
        
        // If no errors, proceed to fix indentation
        const lines = originalCode.split('\n');
        const fixedLines = [];
        let currentIndentLevel = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Skip empty lines but preserve them
            if (trimmedLine === '') {
                fixedLines.push('');
                continue;
            }
            
            // Check if this line should decrease indentation (closing brace)
            if (trimmedLine.startsWith('}')) {
                currentIndentLevel = Math.max(0, currentIndentLevel - 1);
            }
            
            // Add the line with proper indentation
            const indentation = getIndentationString(currentIndentLevel);
            fixedLines.push(indentation + trimmedLine);
            
            // Check if this line should increase indentation (opening brace)
            if (trimmedLine.endsWith('{')) {
                currentIndentLevel++;
            }
        }
        
        // Update the textarea with fixed indentation
        textarea.value = fixedLines.join('\n');
        
        // Show success message
        const fixBtn = getFixIndentationBtn();
        if (fixBtn) {
            fixBtn.textContent = 'Fixed!';
            setTimeout(() => fixBtn.textContent = 'Fix Indentation', 1000);
        }
        
    } catch (error) {
        alert('Cannot fix indentation: ' + error.message);
    }
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

function loadDefaultCode() {
    if (level && level.defaultCode) {
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

function showInfoOverlay() {
    const infoOverlay = document.getElementById('info-overlay');
    infoOverlay.style.display = 'flex';
}

function hideInfoOverlay() {
    const infoOverlay = document.getElementById('info-overlay');
    infoOverlay.style.display = 'none';
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
        resetGame();
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

function resetGame() {
    // Reset interpreter if it exists
    if (window.currentInterpreter) {
        window.currentInterpreter.reset();
    }
    
    // Reset car position if we have a current level
    if (car && currentLevelId && allLevels.length > 0) {
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
    
    // Reset execution state
    isRunning = false;
    playBtn.disabled = false;
    playBtn.textContent = 'Play';
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
            loadDefaultCode();
            
            // Reset game state when loading new level
            resetGame();
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
        const interpreter = new CarLangEngine(car, level, gameDiv);
        const validation = interpreter.validate(ast);
        
        if (!validation.valid) {
            throw new Error(`Validation errors: ${validation.errors.join(', ')}`);
        }
        
        // Store interpreter globally for reset functionality
        window.currentInterpreter = interpreter;
        
        // Initialize execution with the AST
        interpreter.initializeExecution(ast);
        
        // Game loop for step-by-step execution
        const gameLoop = () => {
            const result = interpreter.executeNext();
            
            switch (result.status) {
                case 'CONTINUE':
                    // Continue immediately
                    requestAnimationFrame(gameLoop);
                    break;
                    
                case 'PAUSED':
                    // Wait for delay then continue
                    setTimeout(() => {
                        // Check win condition after movement commands
                        if (result.functionName && ['moveForward', 'moveBackward'].includes(result.functionName)) {
                            if (isAtFinish()) {
                                showWinMessage();
                                return; // Stop execution on win
                            }
                        }
                        requestAnimationFrame(gameLoop);
                    }, 1000); // 1 second delay for visual commands
                    break;
                    
                case 'COMPLETE':
                    // Execution finished
                    playBtn.textContent = 'Played!';
                    setTimeout(() => playBtn.textContent = 'Play', 1000);
                    break;
                    
                case 'ERROR':
                    // Error occurred
                    throw new Error(result.error);
            }
        };
        
        // Start the game loop
        gameLoop();
        
    } catch (e) {
        console.error('Error in code: ' + e.message);
        alert('Error: ' + e.message);
        playBtn.disabled = false;
    }
}

function resetCode() {
    resetGame();
    
    // Reset code to level default
    loadDefaultCode();
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
    
    // Set up fix indentation button
    const fixIndentationBtn = getFixIndentationBtn();
    if (fixIndentationBtn) fixIndentationBtn.onclick = fixIndentation;
    
    // Set up auto-indentation for the code editor
    setupAutoIndentation();
    
    // Set up info overlay buttons
    const infoBtn = document.getElementById('infoBtn');
    const closeInfoBtn = document.getElementById('closeInfoBtn');
    if (infoBtn) infoBtn.onclick = showInfoOverlay;
    if (closeInfoBtn) closeInfoBtn.onclick = hideInfoOverlay;
    
    // Set up home button
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) homeBtn.onclick = goHome;
    
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

function goHome() {
    // Navigate to root URL to show level selector
    window.location.href = '/sdRacer/';
}

window.addEventListener('DOMContentLoaded', startGame);
