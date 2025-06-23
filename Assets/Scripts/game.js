import World from './World.js';
import NewCar from './NewCar.js';
import NewCow from './NewCow.js';
import Finish from './Finish.js';
import WinCondition from './WinCondition.js';
import CarLangParser from './CarLang-parser.js';
import NewCarLangEngine from './NewCarLangEngine.js';
import { soundController } from './soundController.js';
import { ONLY_USE_THIS_TO_VALIDATE } from './code-validator.js';
import { validateCodeForUI } from './ui-code-validator.js';

const DEFAULT_CODE = `// Write your CarLang code here!`;

let saveBtn, loadBtn, playBtn, resetBtn;
let currentLevelId = null;
let allLevels = [];
let currentLevelData = null;
let currentCustomLevelData = null;
let isGameRunning = false;
let world = null;

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
function getResetLvlBtn() {
    return document.getElementById('resetLvlBtn');
}
function getFixIndentationBtn() {
    return document.getElementById('fixIndentationBtn');
}

function fixIndentation() {
    if (!window.codeMirrorEditor) return;
    const cm = window.codeMirrorEditor;
    cm.operation(function() {
        const lastLine = cm.lastLine();
        
        // Indent each line individually
        for (let i = 0; i <= lastLine; i++) {
            cm.indentLine(i);
        }
        
        cm.setCursor({line: 0, ch: 0}); // Optionally reset cursor to start
    });
    const fixBtn = getFixIndentationBtn();
    if (fixBtn) {
        fixBtn.textContent = 'Fixed!';
        setTimeout(() => fixBtn.textContent = 'Fix Indentation', 1000);
    }
}

export function autoIndent() {
    try {
        if (window.codeMirrorEditor) {
            const cm = window.codeMirrorEditor;
            cm.operation(function() {
                const lastLine = cm.lastLine();
                for (let i = 0; i <= lastLine; i++) {
                    cm.indentLine(i);
                }
            });
        }
    } catch (e) {
        console.warn('Auto-indentation failed:', e);
    }
}

// Make autoIndent available globally
window.autoIndent = autoIndent;

function loadCode() {
    const saved = localStorage.getItem('sdRacer_code_' + currentLevelId);
    if (saved !== null) {
        window.setCodeValue(saved);
    } else if (world && world.defaultCode) {
        window.setCodeValue(world.defaultCode);
    } else {
        window.setCodeValue(DEFAULT_CODE);
    }
}

function loadDefaultCode() {
    if (world && world.defaultCode) {
        window.setCodeValue(world.defaultCode);
    } else {
        window.setCodeValue(DEFAULT_CODE);
    }
}

function saveCode() {
    autoIndent();
    localStorage.setItem('sdRacer_code_' + currentLevelId, window.getCodeValue());
    saveBtn.textContent = 'Saved!';
    setTimeout(() => saveBtn.textContent = 'Save', 1000);
    // Removed validation on save
}

function handleLoadBtn() {
    loadCode();
    loadBtn.textContent = 'Loaded!';
    setTimeout(() => loadBtn.textContent = 'Load', 1000);
}

function showWinMessage() {
    const winCheck = checkWinCondition();
    if (!winCheck.won) return;
    
    const winMessage = document.getElementById('win-message');
    const winDetails = document.getElementById('win-details');
    if (!winMessage || !winDetails) return;
    
    let detailsHTML = '';
    
    if (winCheck.details) {
        const { carsAtFinish, totalCars, mode, allCarsReached } = winCheck.details;
        
        if (mode === 'multi-car') {
            if (allCarsReached) {
                detailsHTML = `
                    <p><strong>🎉 All ${totalCars} cars reached the finish line!</strong></p>
                    <p>Cars that finished: <span style="color: #10b981;">${carsAtFinish.join(', ')}</span></p>
                `;
            } else {
                detailsHTML = `
                    <p><strong>🏁 ${carsAtFinish.length} out of ${totalCars} cars reached the finish line.</strong></p>
                    <p>Cars that finished: <span style="color: #10b981;">${carsAtFinish.join(', ')}</span></p>
                `;
            }
        } else {
            detailsHTML = `
                <p><strong>🏁 Car reached the finish line!</strong></p>
                ${carsAtFinish.length > 0 ? `<p>Car that finished: <span style="color: #10b981;">${carsAtFinish[0]}</span></p>` : ''}
            `;
        }
    } else {
        detailsHTML = '<p><strong>🎉 Congratulations! You completed the level!</strong></p>';
    }
    
    winDetails.innerHTML = detailsHTML;
    winMessage.style.display = 'flex';
    
    // Set up button event listeners
    setupWinButtons();
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
    return world ? world.checkWinCondition() : false;
}

function isPositionBlockedByCow(x, y) {
    if (world) {
        const entities = world.getEntitiesAt(x, y);
        return entities.some(entity => entity.type === 'cow');
    }
    return false;
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
        showLevelSelector();
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
    overlay.className = 'level-selector-overlay';
    
    const selector = document.createElement('div');
    selector.className = 'level-selector';
    
    const title = document.createElement('h2');
    title.textContent = 'Select a Level';
    title.className = 'level-selector-title';
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
        categoryDiv.className = 'level-category';
        
        const categoryHeader = document.createElement('div');
        categoryHeader.textContent = categoryName;
        categoryHeader.className = 'level-category-header';
        
        const levelList = document.createElement('div');
        levelList.className = 'level-list';
        
        // Add level items
        categories[categoryName].forEach(levelData => {
            const levelItem = document.createElement('div');
            levelItem.textContent = levelData.name || `Level ${levelData.apiId}`;
            levelItem.className = 'level-item';
            levelItem.onclick = () => {
                updateURLAndLoadLevel(levelData.apiId);
                overlay.remove();
            };
            levelList.appendChild(levelItem);
        });
        
        categoryDiv.appendChild(categoryHeader);
        categoryDiv.appendChild(levelList);
        selector.appendChild(categoryDiv);
    });
    
    // Add custom buttons after the levels
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'level-selector-buttons';
    
    const createLevelBtn = document.createElement('button');
    createLevelBtn.textContent = 'Create Your Own Level';
    createLevelBtn.className = 'create-level-btn';
    createLevelBtn.onclick = () => {
        window.location.href = 'levelCreator.html';
    };
    
    const loadCustomBtn = document.createElement('button');
    loadCustomBtn.textContent = 'Load Custom Level';
    loadCustomBtn.className = 'load-custom-btn';
    loadCustomBtn.onclick = () => {
        showCustomLevelLoader(overlay);
    };
    
    buttonContainer.appendChild(createLevelBtn);
    buttonContainer.appendChild(loadCustomBtn);
    selector.appendChild(buttonContainer);
    
    overlay.appendChild(selector);
    document.body.appendChild(overlay);
    
    // Close overlay when clicking outside
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    };
}

function showCustomLevelLoader(overlay) {
    // Create custom level loader overlay
    const loaderOverlay = document.createElement('div');
    loaderOverlay.className = 'custom-level-loader-overlay';
    
    const loaderContent = document.createElement('div');
    loaderContent.className = 'custom-level-loader-content';
    
    const loaderTitle = document.createElement('h3');
    loaderTitle.textContent = 'Load Custom Level';
    loaderTitle.className = 'custom-level-loader-title';
    
    const instructionText = document.createElement('p');
    instructionText.textContent = 'Paste your level JSON here:';
    instructionText.className = 'custom-level-instruction';
    
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Paste your level JSON here...';
    textarea.className = 'custom-level-textarea';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'custom-level-buttons';
    
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load Level';
    loadBtn.className = 'load-level-btn';
    loadBtn.onclick = () => {
        try {
            const levelData = JSON.parse(textarea.value);
            if (levelData.rows) {
                // Load the custom level
                loadCustomLevel(levelData);
                loaderOverlay.remove();
                overlay.remove();
            } else {
                debug('Invalid level format. Please make sure the JSON contains "rows" field.');
            }
        } catch (e) {
            debug('Invalid JSON format. Please check your level data.');
        }
    };
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'cancel-btn';
    cancelBtn.onclick = () => {
        loaderOverlay.remove();
    };
    
    buttonContainer.appendChild(loadBtn);
    buttonContainer.appendChild(cancelBtn);
    
    loaderContent.appendChild(loaderTitle);
    loaderContent.appendChild(instructionText);
    loaderContent.appendChild(textarea);
    loaderContent.appendChild(buttonContainer);
    
    loaderOverlay.appendChild(loaderContent);
    document.body.appendChild(loaderOverlay);
    
    // Focus on textarea
    textarea.focus();
    
    // Close loader when clicking outside
    loaderOverlay.onclick = (e) => {
        if (e.target === loaderOverlay) {
            loaderOverlay.remove();
        }
    };
}

function loadCustomLevel(levelData) {
    debug('loadCustomLevel: loading levelData', levelData);
    
    // Helper to unescape line breaks
    function unescapeLineBreaks(str) {
        return typeof str === 'string' ? str.replace(/\\n/g, '\n') : str;
    }
    
    // Set current level ID to custom
    currentLevelId = 'custom';
    
    // NEW: Create World instance
    const height = levelData.rows.length + 2;
    const width = levelData.rows[0] ? levelData.rows[0].length + 2 : 2;
    world = new World(width, height);
    world.loadLevelData(levelData);
    
    const gameDiv = document.getElementById('game');
    // Set finish position
    const finishPos = Array.isArray(levelData.end) ? [levelData.end[1] + 1, levelData.end[0] + 1] : undefined;
    world.render(gameDiv, finishPos);
    
    updateModeIndicator();
    
    // NEW: Render entities from World
    renderWorldEntities(gameDiv);
    
    loadDefaultCode();
    // Auto-indent the loaded code
    autoIndent();
    // Display level instructions with mode information
    const instructionsDiv = document.getElementById('instructions');
    if (instructionsDiv && levelData.Instructions) {
        let instructionText = `<h3>Instructions:</h3><p>${levelData.Instructions}</p>`;
        // FIX: define mode before using it
        const mode = getLevelMode(levelData);
        if (mode === 'multi-car') {
            const carNames = levelData.cars.map(car => car.name).join(', ');
            instructionText += `<p><strong>Mode:</strong> Multi-car (${carNames})</p>`;
        } else if (mode === 'single-car-oop') {
            instructionText += `<p><strong>Mode:</strong> Single car with OOP syntax</p>`;
        } else {
            instructionText += `<p><strong>Mode:</strong> Single car</p>`;
        }
        instructionsDiv.innerHTML = instructionText;
    }
    resetGame();
    afterLevelLoad();
    currentCustomLevelData = levelData;
    currentLevelData = null;
}

function resetGame() {
    // Hide car status indicator
    hideCarStatus();
    
    // NEW: Reset World if available
    if (world) {
        world.reset();
        const gameDiv = document.getElementById('game');
        if (gameDiv) {
            renderWorldEntities(gameDiv);
        }
    }
    
    // Clear any existing highlighting
    clearLineHighlighting();
    
    // Reset button text
    if (resetBtn) {
        resetBtn.textContent = 'Reset code';
    }
    
    // Hide win message
    hideWinMessage();
    
    // Reset interpreter if it exists
    if (window.currentInterpreter) {
        window.currentInterpreter.reset();
    }
    
    // Reset play button state
    playBtn.textContent = 'Play';
    isGameRunning = false;
}

function resetLevel() {
    // Hide car status indicator
    hideCarStatus();
    
    // NEW: Reset World if available
    if (world) {
        world.reset();
        const gameDiv = document.getElementById('game');
        if (gameDiv) {
            renderWorldEntities(gameDiv);
        }
    }
    
    // Clear any existing highlighting
    clearLineHighlighting();
    
    // Reset button text
    if (resetBtn) {
        resetBtn.textContent = 'Reset code';
    }
    
    // Hide win message
    hideWinMessage();
    
    // Reset interpreter if it exists
    if (window.currentInterpreter) {
        window.currentInterpreter.reset();
    }
    
    // Auto-indent the loaded code
    autoIndent();
}

function resetLevelState() {
    // Hide car status indicator
    hideCarStatus();
    
    // NEW: Reset World if available
    if (world) {
        world.reset();
        const gameDiv = document.getElementById('game');
        if (gameDiv) {
            renderWorldEntities(gameDiv);
        }
    }
    
    // Clear any existing highlighting
    clearLineHighlighting();
    
    // Reset button text
    if (resetBtn) {
        resetBtn.textContent = 'Reset code';
    }
    
    // Hide win message
    hideWinMessage();
    
    // Reset interpreter if it exists
    if (window.currentInterpreter) {
        window.currentInterpreter.reset();
    }
}

async function loadLevel(levelId) {
    try {
        const levelData = await fetch('https://wjhulzebosch.nl/json_ape/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ action: 'get', category: 'sd_racer', id: levelId })
        }).then(r => r.json());
        if (!levelData) {
            debug('Level not found!', null, 'error');
            return;
        }
        // Store current level data for win condition checking
        currentLevelData = levelData;
        currentCustomLevelData = null;
        // Validate level data
        const validation = validateLevelData(levelData);
        if (validation.errors.length > 0) {
            debug('Level validation errors:', validation.errors, 'error');
            return;
        }
        if (validation.warnings.length > 0) {
            console.warn('Level validation warnings:', validation.warnings);
        }
        // Log level information
        const mode = getLevelMode(levelData);
        const difficulty = getLevelDifficulty(levelData);
        const category = getLevelCategory(levelData);
        debug(`Loading level ${levelId}: ${levelData.name || 'Unnamed'}`);
        debug(`Mode: ${mode}, Difficulty: ${difficulty}/5, Category: ${category}`);
        debug(`[LOAD LEVEL] apiId: ${levelId}, name: ${levelData.name}, Instructions: ${levelData.Instructions}`);
        currentLevelId = levelId;
        
        // Helper to unescape line breaks
        function unescapeLineBreaks(str) {
            return typeof str === 'string' ? str.replace(/\\n/g, '\n') : str;
        }
        
        // NEW: Create World instance
        const height = levelData.rows.length + 2;
        const width = levelData.rows[0] ? levelData.rows[0].length + 2 : 2;
        world = new World(width, height);
        world.loadLevelData(levelData);
        
        const gameDiv = document.getElementById('game');
        // Swap x and y for finish position and add +1 for grass border
        const finishPos = Array.isArray(levelData.end) ? [levelData.end[1] + 1, levelData.end[0] + 1] : undefined;
        world.render(gameDiv, finishPos);
        
        updateModeIndicator();
        
        // NEW: Render entities from World
        renderWorldEntities(gameDiv);
        
        loadDefaultCode();
        // Auto-indent the loaded code
        autoIndent();
        // Display level instructions with mode information
        const instructionsDiv = document.getElementById('instructions');
        if (instructionsDiv && levelData.Instructions) {
            let instructionText = `<h3>Instructions:</h3><p>${levelData.Instructions}</p>`;
            
            // Add mode-specific information
            if (mode === 'multi-car') {
                const carNames = levelData.cars.map(car => car.name).join(', ');
                instructionText += `<p><strong>Mode:</strong> Multi-car (${carNames})</p>`;
            } else if (mode === 'single-car-oop') {
                instructionText += `<p><strong>Mode:</strong> Single car with OOP syntax</p>`;
            } else {
                instructionText += `<p><strong>Mode:</strong> Single car</p>`;
            }
            
            instructionsDiv.innerHTML = instructionText;
        }
        
        // Reset game state when loading new level
        resetGame();
    } catch (err) {
        debug('Failed to load level: ' + err, null, 'error');
    }
}

function renderWorldEntities(gameDiv) {
    if (!world || !gameDiv) return;
    // Clear old cow elements only (keep cars for transitions)
    gameDiv.querySelectorAll('.cow').forEach(el => el.remove());
    // Render cars (they will reuse existing divs if available)
    world.getEntitiesOfType('car').forEach(car => car.render(gameDiv));
    // Render cows
    world.getEntitiesOfType('cow').forEach(cow => cow.render(gameDiv));
}

async function playCode() {
    try {
        autoIndent();
        
        // Always show UI validation feedback when Play is pressed
        validateCodeForUI();
        // Use ONLY_USE_THIS_TO_VALIDATE for validation before running
        const result = ONLY_USE_THIS_TO_VALIDATE();
        if (result.parseErrors && result.parseErrors.length > 0) {
            let errorMsg = 'Parse errors:\n' + result.parseErrors.join('\n');
            debug(errorMsg, null, 'error');
            playBtn.textContent = 'Play';
            return;
        }
        playBtn.textContent = 'Stop';
        isGameRunning = true;
        hideWinMessage();

        // Use the same logic as masterValidateCode for parser mode and available cars
        let mode = 'single';
        let carNames = [];
        if (world && world.getEntitiesOfType('car').length > 1) {
            mode = 'oop';
            carNames = world.getEntitiesOfType('car').map(car => car.carType);
        }
        const code = window.getCodeValue();
        const gameDiv = document.getElementById('game');
        const parser = new CarLangParser(mode, carNames);
        const ast = parser.parse(code);
        const parseErrors = ast.errors || [];
        let validation = { valid: true, errors: [], warnings: [] };
        if (parseErrors.length > 0) {
            let errorMsg = 'Parse errors:\n' + parseErrors.join('\n');
            debug(errorMsg, null, 'error');
            playBtn.textContent = 'Play';
            return;
        }
        // Build a car map for execution using game helpers
        let carMap = {};
        if (mode === 'oop') {
            const cars = world.getEntitiesOfType('car');
            cars.forEach(car => { carMap[car.carType] = car; });
        } else {
            const cars = world.getEntitiesOfType('car');
            if (cars.length > 0) {
                carMap.mainCar = cars[0];
                carMap.default = cars[0];
            }
        }
        // Store interpreter globally for reset functionality
        const interpreter = new NewCarLangEngine(carMap, world, gameDiv);
        window.currentInterpreter = interpreter;
        interpreter.initializeExecution(ast);
        // Enhanced game loop for step-by-step execution
        const gameLoop = () => {
            // Check if game was stopped
            if (!isGameRunning) {
                return;
            }
            
            const result = interpreter.executeNext();
            
            // Update car status indicator for multi-car levels
            updateCarStatus();
            
            // Highlight the current line and block
            if (result.currentLine) {
                highlightLine(result.currentLine, result.blockStartLine, result.contextType);
            }
            
            switch (result.status) {
                case 'CONTINUE':
                    // Play honk sound if honk command was executed
                    if (result.functionName === 'honk' && typeof soundController !== 'undefined') {
                        soundController.playCarHorn();
                    }
                    
                    // Check win condition after any command that might affect car position
                    if (result.functionName && ['moveForward', 'moveBackward', 'turnLeft', 'turnRight'].includes(result.functionName)) {
                        if (world) {
                            const gameDiv = document.getElementById('game');
                            renderWorldEntities(gameDiv);
                        }
                    }
                    
                    // Continue immediately for non-visual commands
                    setTimeout(gameLoop, 100);
                    break;
                    
                case 'PAUSED':
                    // Wait for delay then continue
                    setTimeout(() => {
                        // Check if game was stopped during the delay
                        if (!isGameRunning) {
                            return;
                        }
                        
                        // Check win condition after movement commands
                        if (result.functionName && ['moveForward', 'moveBackward'].includes(result.functionName)) {
                            if (world) {
                                const gameDiv = document.getElementById('game');
                                renderWorldEntities(gameDiv);
                            }
                        }
                        
                        // Continue with next command
                        setTimeout(gameLoop, 100);
                    }, 1000); // 1 second delay for visual commands
                    break;
                    
                case 'COMPLETE':
                    // Execution finished
                    hideCarStatus(); // Hide status when execution completes
                    clearLineHighlighting();
                    playBtn.textContent = 'Finished';
                    isGameRunning = false;
                    
                    // Final win condition check
                    if (world) {
                        showWinMessage();
                    }
                    break;
                    
                case 'ERROR':
                    // Error occurred
                    hideCarStatus(); // Hide status on error
                    clearLineHighlighting();
                    playBtn.textContent = 'Play';
                    isGameRunning = false;
                    throw new Error(result.error);
            }
        };
        
        // Start the game loop
        gameLoop();
        
    } catch (e) {
        debug('Error in code: ' + e.message, null, 'error');
        debug('Error: ' + e.message, null, 'error');
        playBtn.textContent = 'Play';
        isGameRunning = false;
    }
}

function stopGame() {
    if (window.currentInterpreter) {
        window.currentInterpreter.stop();
    }
    
    hideCarStatus();
    clearLineHighlighting();
    playBtn.textContent = 'Stopped';
    isGameRunning = false;
}

function resetCode() {
    resetLevelState();
    
    // Reset code to level default
    loadDefaultCode();
    // Auto-indent the loaded code
    autoIndent();
    resetBtn.textContent = 'Reset code';
}

function startGame() {
    saveBtn = getSaveBtn();
    loadBtn = getLoadBtn();
    playBtn = getPlayBtn();
    resetBtn = getResetBtn();

    saveBtn.onclick = saveCode;
    loadBtn.onclick = handleLoadBtn;
    playBtn.onclick = () => {
        if (playBtn.textContent === 'Stop') {
            // Stop the running game
            stopGame();
        } else if (playBtn.textContent === 'Stopped' || playBtn.textContent === 'Finished') {
            // Reset game and return to Play state
            resetGame();
            playBtn.textContent = 'Play';
        } else {
            // Start the game
            playCode();
        }
    };
    
    resetBtn.onclick = resetCode;
    // Set up reset level button
    const resetLvlBtn = getResetLvlBtn();
    if (resetLvlBtn) resetLvlBtn.onclick = resetLevel;
    // Set up fix indentation button
    const fixIndentationBtn = getFixIndentationBtn();
    if (fixIndentationBtn) fixIndentationBtn.onclick = fixIndentation;
    // Initialize line count
    updateLineCount();
    // Set up info overlay buttons
    const infoBtn = document.getElementById('infoBtn');
    const closeInfoBtn = document.getElementById('closeInfoBtn');
    if (infoBtn) infoBtn.onclick = showInfoOverlay;
    if (closeInfoBtn) closeInfoBtn.onclick = hideInfoOverlay;
    // Set up home button
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) homeBtn.onclick = goHome;
    setupWinButtons();
    // Prevent loading selector or level if in custom mode
    if (window.location.search.includes('loadTemp=1')) {
        return;
    }
    const levelId = getLevelIdFromURL();
    if (levelId) {
        loadLevel(levelId);
    } else {
        // Load levels from API first, then show selector
        (async () => {
            try {
                const { ids } = await fetch('https://wjhulzebosch.nl/json_ape/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ action: 'list', category: 'sd_racer' })
                }).then(r => r.json());
                allLevels = await Promise.all(
                    ids.map(async id => {
                        const level = await fetch('https://wjhulzebosch.nl/json_ape/api.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({ action: 'get', category: 'sd_racer', id })
                        }).then(r => r.json());
                        level.apiId = id;
                        return level;
                    })
                );
                allLevels.forEach(level => debug(`[LEVEL LIST] apiId: ${level.apiId}, name: ${level.name}, Instructions: ${level.Instructions}`));
                showLevelSelector();
            } catch (err) {
                debug('Failed to load levels: ' + err, null, 'error');
            }
        })();
    }
}

function goHome() {
    // Navigate to root URL to show level selector
    window.location.href = '/sdRacer/';
}

// CodeMirror-based line highlighting
function highlightLine(lineNumber, blockStartLine = null, contextType = null) {
    // Remove previous highlight if needed
    if (window._cmHighlightedLine != null) {
        window.codeMirrorEditor.removeLineClass(window._cmHighlightedLine, 'background', 'cm-highlighted-line');
    }
    // Highlight the new line (CodeMirror is 0-based)
    window.codeMirrorEditor.addLineClass(lineNumber - 1, 'background', 'cm-highlighted-line');
    window._cmHighlightedLine = lineNumber - 1;
}

function clearLineHighlighting() {
    if (window._cmHighlightedLine != null) {
        window.codeMirrorEditor.removeLineClass(window._cmHighlightedLine, 'background', 'cm-highlighted-line');
        window._cmHighlightedLine = null;
    }
}

// Level data validation and management functions
function validateLevelData(levelData) {
    const errors = [];
    const warnings = [];
    
    // if (!levelData.id) {
    //     errors.push('Level missing required field: id');
    // }
    if (!levelData.name) {
        warnings.push('Level missing recommended field: name');
    }
    
    if (!levelData.rows || !Array.isArray(levelData.rows)) {
        errors.push('Level missing required field: rows (must be an array)');
    }
    
    // Validate car configuration
    if (levelData.cars) {
        if (!Array.isArray(levelData.cars)) {
            errors.push('Level cars field must be an array');
        } else {
            levelData.cars.forEach((car, index) => {
                if (!car.name) {
                    errors.push(`Car ${index} missing required field: name`);
                }
                
                if (!car.position || !Array.isArray(car.position) || car.position.length !== 2) {
                    errors.push(`Car ${car.name || index} missing or invalid position`);
                }
                
                if (car.type && !['default', 'red', 'blue', 'green', 'yellow'].includes(car.type)) {
                    warnings.push(`Car ${car.name || index} has unsupported type: ${car.type}`);
                }
                
                if (car.direction && !['N', 'E', 'S', 'W'].includes(car.direction)) {
                    warnings.push(`Car ${car.name || index} has invalid direction: ${car.direction}`);
                }
            });
        }
    } else if (!levelData.start) {
        // Single car level needs start position
        errors.push('Single car level missing required field: start position');
    }
    
    // Validate finish position
    if (!levelData.end || !Array.isArray(levelData.end) || levelData.end.length !== 2) {
        errors.push('Level missing or invalid end position');
    }
    
    return { errors, warnings };
}

function getLevelMode(levelData) {
    if (levelData.cars && Array.isArray(levelData.cars) && levelData.cars.length > 1) {
        return 'multi-car';
    } else if (levelData.cars && Array.isArray(levelData.cars) && levelData.cars.length === 1) {
        return 'single-car-oop'; // Single car but using OOP syntax
    } else {
        return 'single-car'; // Traditional single car mode
    }
}

function getLevelDifficulty(levelData) {
    const mode = getLevelMode(levelData);
    const carCount = levelData.cars ? levelData.cars.length : 1;
    const hasCows = levelData.cows && levelData.cows.length > 0;
    const hasLoops = levelData.defaultCode && (
        levelData.defaultCode.includes('for(') || 
        levelData.defaultCode.includes('while(')
    );
    const hasConditions = levelData.defaultCode && (
        levelData.defaultCode.includes('if(') || 
        levelData.defaultCode.includes('else')
    );
    
    let difficulty = 1;
    
    if (mode === 'multi-car') difficulty += 2;
    if (carCount > 2) difficulty += 1;
    if (hasCows) difficulty += 1;
    if (hasLoops) difficulty += 1;
    if (hasConditions) difficulty += 1;
    
    return Math.min(difficulty, 5); // Scale 1-5
}

function getLevelCategory(levelData) {
    if (levelData.category) {
        return levelData.category;
    }
    
    // Auto-categorize based on content
    const mode = getLevelMode(levelData);
    if (mode === 'multi-car') {
        return 'OOP Introduction';
    }
    
    if (levelData.defaultCode && levelData.defaultCode.includes('for(')) {
        return 'Loops';
    }
    
    if (levelData.defaultCode && levelData.defaultCode.includes('while(')) {
        return 'Loops';
    }
    
    if (levelData.cows && levelData.cows.length > 0) {
        return 'Simple commands';
    }
    
    return 'Simple commands';
}

/**
 * Enhanced win condition checking with detailed feedback
 */
function checkWinCondition() {
    return world && world.winCondition ? world.winCondition.getWinDetails(world) : { won: false, details: null };
}

/**
 * Show car status indicator during execution
 */
function showCarStatus() {
    const cars = world ? world.getEntitiesOfType('car') : [];
    if (cars.length <= 1) return; // Only show for multi-car levels
    
    let statusIndicator = document.getElementById('car-status-indicator');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'car-status-indicator';
        statusIndicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(26, 30, 34, 0.95);
            border: 2px solid #374151;
            border-radius: 8px;
            padding: 12px;
            font-size: 0.9rem;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(statusIndicator);
    }
    
    let statusHTML = '<div style="color: #10b981; font-weight: bold; margin-bottom: 8px;">Car Status:</div>';
    
    cars.forEach(car => {
        const carType = car.carType || 'default';
        const isAtFinish = world && world.checkWinCondition();
        
        const statusClass = isAtFinish ? 'validation-success' : 'validation-info';
        const statusText = isAtFinish ? '✓ Finished' : '🔄 Active';
        
        statusHTML += `
            <div class="${statusClass}" style="margin: 4px 0; padding: 4px 8px; border-radius: 4px;">
                <span style="font-weight: bold;">${carType}</span> (${carType}): ${statusText}
            </div>
        `;
    });
    
    statusIndicator.innerHTML = statusHTML;
}

/**
 * Hide car status indicator
 */
function hideCarStatus() {
    const statusIndicator = document.getElementById('car-status-indicator');
    if (statusIndicator) {
        statusIndicator.remove();
    }
}

/**
 * Update car status during execution
 */
function updateCarStatus() {
    const cars = world ? world.getEntitiesOfType('car') : [];
    if (cars.length > 1) {
        showCarStatus();
    } else {
        hideCarStatus();
    }
}

/**
 * Update mode indicator based on current level configuration
 */
function updateModeIndicator() {
    const modeIndicator = document.getElementById('mode-indicator');
    const modeText = document.getElementById('mode-text');
    const carCount = document.getElementById('car-count');
    
    if (!modeIndicator || !modeText || !carCount) return;
    
    const cars = world ? world.getEntitiesOfType('car') : [];
    const carCountNum = cars.length;
    const parserConfig = getParserConfig();
    
    if (parserConfig.mode === 'oop') {
        modeText.textContent = 'Multi-Car Mode';
        carCount.textContent = `${carCountNum} cars`;
        modeIndicator.style.display = 'flex';
    } else {
        modeText.textContent = 'Single Car Mode';
        carCount.textContent = '';
        modeIndicator.style.display = 'flex';
    }
}

/**
 * Update line count display
 */
function updateLineCount() {
    const lineCountElement = document.getElementById('line-count');
    if (!lineCountElement) return;
    
    const code = window.getCodeValue();
    const lines = code.split('\n').filter(line => line.trim() !== '');
    const lineCount = lines.length;
    
    lineCountElement.textContent = `${lineCount} line${lineCount !== 1 ? 's' : ''}`;
}

/**
 * Update validation status display
 */
function updateValidationStatus(status, type = 'info') {
    const statusElement = document.getElementById('validation-status');
    if (!statusElement) return;
    
    statusElement.textContent = status;
    statusElement.className = `validation-status validation-${type}`;
}

function addEditLevelButton() {
    let btn = document.getElementById('editLevelBtn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'editLevelBtn';
        btn.textContent = 'Edit Level';
        btn.className = 'edit-level-btn';
        btn.style.position = 'absolute';
        btn.style.top = '10px';
        btn.style.right = '10px';
        btn.onclick = () => {
            debug('Edit Level: currentLevelData', currentLevelData);
            debug('Edit Level: world', world);
            // Export current level as JSON
            const levelJson = JSON.stringify(currentCustomLevelData || currentLevelData || world);
            // Store in localStorage for transfer
            localStorage.setItem('sdRacer_tempLevel', levelJson);
            // Open levelCreator with a flag to load from temp
            window.location.href = 'levelCreator.html?loadTemp=1';
        };
        document.body.appendChild(btn);
    }
}

// Call this after loading a level
function afterLevelLoad() {
    addEditLevelButton();
}

// Patch loadLevel to call afterLevelLoad at the end
const _originalLoadLevel = loadLevel;
loadLevel = async function(...args) {
    await _originalLoadLevel.apply(this, args);
    afterLevelLoad();
};

window.addEventListener('DOMContentLoaded', () => {
    // If ?loadTemp=1, load the temp level from localStorage
    if (window.location.search.includes('loadTemp=1')) {
        const tempLevel = localStorage.getItem('sdRacer_tempLevel');
        if (tempLevel) {
            try {
                loadCustomLevel(JSON.parse(tempLevel));
                startGame();
                return;
            } catch (e) {
                debug('Failed to load temp level: ' + e, null, 'error');
            }
        }
    }
    startGame();
});

function getParserConfig() {
    if (!world) {
        return { mode: 'single', carNames: [] };
    }
    
    const cars = world.getEntitiesOfType('car');
    if (cars.length > 1) {
        return { 
            mode: 'oop', 
            carNames: cars.map(car => car.carType) 
        };
    } else {
        return { mode: 'single', carNames: [] };
    }
}
