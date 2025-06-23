import Car from './Car.js';
import Cow from './Cow.js';
import Level from './level.js';
import CarLangParser from './CarLang-parser.js';
import CarLangEngine from './carlang-engine.js';
import { soundController } from './soundController.js';
import { ONLY_USE_THIS_TO_VALIDATE } from './code-validator.js';
import { validateCodeForUI } from './ui-code-validator.js';

// For now, hardcode a level id and default code
const DEFAULT_CODE = `// Write your CarLang code here!`;

let saveBtn, loadBtn, playBtn, resetBtn;
// Car registry system
let carRegistry = {};
let defaultCar = null; // For backward compatibility
let level = null;
let currentLevelId = null;
let finishPos = null;
let allLevels = [];
let cows = []; // Array to store cow instances
let currentLevelData = null; // Track current level configuration

// Make cows globally accessible for CarLang engine
window.cows = cows;

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
    const originalCode = window.getCodeValue();
    if (!originalCode) return;
    try {
        // Use ONLY_USE_THIS_TO_VALIDATE for validation
        const result = ONLY_USE_THIS_TO_VALIDATE();
        if (result.parseErrors && result.parseErrors.length > 0) {
            debug('Cannot fix indentation: Code has errors:\n' + result.parseErrors.join('\n'));
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
        // Update the code using CodeMirror API
        window.setCodeValue(fixedLines.join('\n'));
        // Show success message
        const fixBtn = getFixIndentationBtn();
        if (fixBtn) {
            fixBtn.textContent = 'Fixed!';
            setTimeout(() => fixBtn.textContent = 'Fix Indentation', 1000);
        }
    } catch (error) {
        debug('Cannot fix indentation: ' + error.message);
    }
}

function loadCode() {
    const saved = localStorage.getItem('sdRacer_code_' + currentLevelId);
    if (saved !== null) {
        window.setCodeValue(saved);
    } else if (level && level.defaultCode) {
        window.setCodeValue(level.defaultCode);
    } else {
        window.setCodeValue(DEFAULT_CODE);
    }
}

function loadDefaultCode() {
    if (level && level.defaultCode) {
        window.setCodeValue(level.defaultCode);
    } else {
        window.setCodeValue(DEFAULT_CODE);
    }
}

function saveCode() {
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
    if (!finishPos) return false;
    
    // Check if any car is at the finish position
    const allCars = Object.values(carRegistry);
    const carsAtFinish = allCars.filter(car => 
        car.currentPosition.x === finishPos[0] && car.currentPosition.y === finishPos[1]
    );
    
    // Log which cars are at the finish for debugging
    if (carsAtFinish.length > 0) {
        debug(`Cars at finish: ${carsAtFinish.map(car => car.carType || 'default').join(', ')}`);
    }
    
    return carsAtFinish.length > 0;
}

function isPositionBlockedByCow(x, y) {
    return cows.some(cow => cow.blocksMovement(x, y));
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
        window.open('levelCreator.html', '_blank');
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
    // Set current level ID to custom
    currentLevelId = 'custom';
    // Create level object
    level = new Level({
        instruction: levelData.Instructions || '',
        defaultCode: levelData.defaultCode || '',
        tiles: levelData.rows,
        cars: levelData.cars || null
    });
    window.level = level;
    const gameDiv = document.getElementById('game');
    // Set finish position
    finishPos = Array.isArray(levelData.end) ? [levelData.end[1] + 1, levelData.end[0] + 1] : undefined;
    level.render(gameDiv, finishPos);
    // Initialize car registry based on level configuration
    initializeCarRegistry(levelData);
    updateModeIndicator();
    // Create and render cows if they exist in the level data
    cows = [];
    if (levelData.cows && Array.isArray(levelData.cows)) {
        levelData.cows.forEach(cowData => {
            // Swap x and y and add +1 for grass border (same as car)
            const cow = new Cow(
                cowData.defaultX + 1, 
                cowData.defaultY + 1, 
                cowData.secondaryX + 1, 
                cowData.secondaryY + 1
            );
            cow.addToGrid(gameDiv);
            cows.push(cow);
        });
    }
    window.cows = cows;
    loadDefaultCode();
    updateLineCount();
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
}

function resetGame() {
    // Hide car status indicator
    hideCarStatus();
    
    // Reinitialize car registry to reset cars to initial positions
    if (currentLevelData) {
        initializeCarRegistry(currentLevelData);
    }
    
    // Reset cows to their initial positions
    cows.forEach(cow => {
        cow.reset();
    });
    
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

function resetLevel() {
    // Hide car status indicator
    hideCarStatus();
    
    // Reinitialize car registry to reset cars to initial positions
    if (currentLevelData) {
        initializeCarRegistry(currentLevelData);
    }
    
    // Reset cows to their initial positions
    cows.forEach(cow => {
        cow.reset();
    });
    
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
    
    // Load default code for the current level
    loadDefaultCode();
}

function resetLevelState() {
    // Hide car status indicator
    hideCarStatus();
    
    // Reinitialize car registry to reset cars to initial positions
    if (currentLevelData) {
        initializeCarRegistry(currentLevelData);
    }
    
    // Reset cows to their initial positions
    cows.forEach(cow => {
        cow.reset();
    });
    
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
        level = new Level({
            instruction: levelData.Instructions || '',
            defaultCode: levelData.defaultCode || '',
            tiles: levelData.rows,
            cars: levelData.cars || null
        });
        window.level = level;
        const gameDiv = document.getElementById('game');
        // Swap x and y for finish position and add +1 for grass border
        finishPos = Array.isArray(levelData.end) ? [levelData.end[1] + 1, levelData.end[0] + 1] : undefined;
        level.render(gameDiv, finishPos);
        
        // Initialize car registry based on level configuration
        initializeCarRegistry(levelData);
        
        // Update UI elements
        updateModeIndicator();
        // --- Remove old cow DOM elements before recreating cows ---
        cows.forEach(cow => {
            if (cow.element && cow.element.parentNode) {
                cow.element.parentNode.removeChild(cow.element);
            }
        });
        // Create and render cows if they exist in the level data
        cows = [];
        if (levelData.cows && Array.isArray(levelData.cows)) {
            levelData.cows.forEach(cowData => {
                // Swap x and y and add +1 for grass border (same as car)
                const cow = new Cow(
                    cowData.defaultX + 1, 
                    cowData.defaultY + 1, 
                    cowData.secondaryX + 1, 
                    cowData.secondaryY + 1
                );
                cow.addToGrid(gameDiv);
                cows.push(cow);
            });
        }
        // Update global cows array
        window.cows = cows;
        loadDefaultCode();
        // Update line count after loading default code
        updateLineCount();
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

async function playCode() {
    try {
        // Always show UI validation feedback when Play is pressed
        validateCodeForUI();
        // Use ONLY_USE_THIS_TO_VALIDATE for validation before running
        const result = ONLY_USE_THIS_TO_VALIDATE();
        if (result.parseErrors && result.parseErrors.length > 0) {
            let errorMsg = 'Parse errors:\n' + result.parseErrors.join('\n');
            debug(errorMsg, null, 'error');
            playBtn.textContent = 'Play';
            playBtn.disabled = false;
            return;
        }
        playBtn.disabled = true;
        playBtn.textContent = 'Playing';
        hideWinMessage();

        // Use the same logic as masterValidateCode for parser mode and available cars
        let mode = 'single';
        let carNames = [];
        if (level && typeof level.isSingleMode === 'function' && !level.isSingleMode()) {
            mode = 'oop';
            if (Array.isArray(level.cars)) {
                carNames = level.cars.map(car => car.name);
            }
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
            playBtn.disabled = false;
            return;
        }
        // Build a car map for execution using game helpers
        let carMap = {};
        if (mode === 'oop' && Array.isArray(level.cars)) {
            const registry = getCarRegistry();
            for (const car of level.cars) {
                if (registry && registry[car.name]) {
                    carMap[car.name] = registry[car.name];
                }
            }
        } else if (mode === 'single') {
            const defaultCar = getDefaultCar();
            if (defaultCar) {
                carMap.mainCar = defaultCar;
                carMap.default = defaultCar;
            }
        }
        // Store interpreter globally for reset functionality
        const interpreter = new CarLangEngine(carMap, level, gameDiv);
        window.currentInterpreter = interpreter;
        interpreter.initializeExecution(ast);
        // Enhanced game loop for step-by-step execution
        const gameLoop = () => {
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
                        if (isAtFinish()) {
                            hideCarStatus(); // Hide status when game ends
                            showWinMessage();
                            clearLineHighlighting();
                            playBtn.textContent = 'Finished';
                            playBtn.disabled = false;
                            return; // Stop execution on win
                        }
                    }
                    
                    // Continue immediately for non-visual commands
                    requestAnimationFrame(gameLoop);
                    break;
                    
                case 'PAUSED':
                    // Wait for delay then continue
                    setTimeout(() => {
                        // Check win condition after movement commands
                        if (result.functionName && ['moveForward', 'moveBackward'].includes(result.functionName)) {
                            if (isAtFinish()) {
                                hideCarStatus(); // Hide status when game ends
                                showWinMessage();
                                clearLineHighlighting();
                                playBtn.textContent = 'Finished';
                                playBtn.disabled = false;
                                return; // Stop execution on win
                            }
                        }
                        
                        // Continue with next command
                        requestAnimationFrame(gameLoop);
                    }, 1000); // 1 second delay for visual commands
                    break;
                    
                case 'COMPLETE':
                    // Execution finished
                    hideCarStatus(); // Hide status when execution completes
                    clearLineHighlighting();
                    playBtn.textContent = 'Finished';
                    playBtn.disabled = false;
                    
                    // Final win condition check
                    if (isAtFinish()) {
                        showWinMessage();
                    }
                    break;
                    
                case 'ERROR':
                    // Error occurred
                    hideCarStatus(); // Hide status on error
                    clearLineHighlighting();
                    playBtn.textContent = 'Play';
                    playBtn.disabled = false;
                    throw new Error(result.error);
            }
        };
        
        // Start the game loop
        gameLoop();
        
    } catch (e) {
        debug('Error in code: ' + e.message, null, 'error');
        debug('Error: ' + e.message, null, 'error');
        playBtn.textContent = 'Play';
        playBtn.disabled = false;
    }
}

function resetCode() {
    resetLevelState();
    
    // Reset code to level default
    loadDefaultCode();
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
        if (playBtn.textContent === 'Finished') {
            resetGame();
            playBtn.textContent = 'Play';
            playBtn.disabled = false;
        } else {
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

// Car registry management functions
function initializeCarRegistry(levelConfig) {
    // Clear existing registry
    carRegistry = {};
    defaultCar = null;
    
    // Remove existing car elements from DOM
    const gameDiv = document.getElementById('game');
    const existingCars = gameDiv.querySelectorAll('.car');
    existingCars.forEach(car => car.remove());
    
    if (!levelConfig) {
        console.warn('No level configuration provided to initializeCarRegistry');
        return;
    }
    
    // Check if this is a multi-car level
    if (levelConfig.cars && Array.isArray(levelConfig.cars) && levelConfig.cars.length > 0) {
        // Multi-car level
        debug(`Initializing ${levelConfig.cars.length} cars for level ${levelConfig.apiId}`);
        
        levelConfig.cars.forEach((carConfig, index) => {
            // Validate car configuration
            if (!carConfig.name) {
                debug(`Car ${index} missing name in level ${levelConfig.apiId}`, null, 'error');
                return;
            }
            
            const carName = carConfig.name;
            const carType = carConfig.type || 'default';
            const position = carConfig.position;
            const direction = carConfig.direction || 'N';
            
            // Validate position
            if (!position || !Array.isArray(position) || position.length !== 2) {
                debug(`Car ${carName} has invalid position in level ${levelConfig.apiId}`, null, 'error');
                return;
            }
            
            // Validate car type
            const validCarTypes = ['default', 'red', 'blue', 'green', 'yellow'];
            if (!validCarTypes.includes(carType)) {
                debug(`Car ${carName} has invalid type '${carType}', using 'default'`, null, 'warn');
                carConfig.type = 'default';
            }
            
            // Validate direction
            const validDirections = ['N', 'E', 'S', 'W'];
            if (!validDirections.includes(direction)) {
                debug(`Car ${carName} has invalid direction '${direction}', using 'N'`, null, 'warn');
                carConfig.direction = 'N';
            }
            
            const car = new Car({
                position: { x: position[1] + 1, y: position[0] + 1 },
                direction: carConfig.direction,
                carType: carConfig.type
            });
            
            carRegistry[carName] = car;
            
            // Set first car as default for backward compatibility
            if (index === 0) {
                defaultCar = car;
            }
            
            car.render(gameDiv);
            debug(`Created car: ${carName} (${carType}) at position [${position[0]}, ${position[1]}] facing ${carConfig.direction}`);
        });
        
        // Validate that we have at least one car
        if (Object.keys(carRegistry).length === 0) {
            debug(`No valid cars created for level ${levelConfig.apiId}`, null, 'error');
            return;
        }
        
    } else {
        // Single car level (backward compatibility)
        debug(`Initializing single car for level ${levelConfig.apiId}`);
        
        if (levelConfig.start && Array.isArray(levelConfig.start) && levelConfig.start.length === 2) {
            defaultCar = new Car({ 
                position: { x: levelConfig.start[1] + 1, y: levelConfig.start[0] + 1 }, 
                direction: 'N',
                carType: 'default'
            });
            carRegistry.mainCar = defaultCar;
            defaultCar.render(gameDiv);
            debug(`Created single car at position [${levelConfig.start[0]}, ${levelConfig.start[1]}]`);
        } else {
            debug(`Invalid start position for level ${levelConfig.apiId}`, null, 'error');
        }
    }
    
    // Log final car registry state
    debug(`Car registry initialized with ${Object.keys(carRegistry).length} cars:`, Object.keys(carRegistry));
}

function getCarRegistry() {
    return carRegistry;
}

function getDefaultCar() {
    return defaultCar;
}

function getCarByName(carName) {
    return carRegistry[carName];
}

function getAllCars() {
    return Object.values(carRegistry);
}

function clearCarRegistry() {
    carRegistry = {};
    defaultCar = null;
    
    // Remove car elements from DOM
    const gameDiv = document.getElementById('game');
    const existingCars = gameDiv.querySelectorAll('.car');
    existingCars.forEach(car => car.remove());
}

// Helper function to get parser configuration based on current level
function getParserConfig() {
    const carCount = Object.keys(carRegistry).length;
    const availableCars = Object.keys(carRegistry);
    
    if (carCount <= 1) {
        return {
            mode: 'single',
            availableCars: []
        };
    } else {
        return {
            mode: 'oop',
            availableCars: availableCars
        };
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
    if (!finishPos) return { won: false, details: null };
    
    const allCars = Object.values(carRegistry);
    const carsAtFinish = allCars.filter(car => 
        car.currentPosition.x === finishPos[0] && car.currentPosition.y === finishPos[1]
    );
    
    if (carsAtFinish.length === 0) {
        return { won: false, details: null };
    }
    
    // Determine win type based on level configuration
    const levelMode = getLevelMode(currentLevelData);
    let winDetails = {
        carsAtFinish: carsAtFinish.map(car => car.carType || 'default'),
        totalCars: allCars.length,
        mode: levelMode
    };
    
    if (levelMode === 'multi-car') {
        // In multi-car mode, check if all cars need to reach finish
        const allCarsReached = carsAtFinish.length === allCars.length;
        winDetails.allCarsReached = allCarsReached;
        winDetails.won = allCarsReached; // You can modify this logic based on level requirements
    } else {
        // In single-car mode, any car reaching finish is a win
        winDetails.won = true;
    }
    
    return { won: winDetails.won, details: winDetails };
}

/**
 * Show car status indicator during execution
 */
function showCarStatus() {
    const allCars = Object.values(carRegistry);
    if (allCars.length <= 1) return; // Only show for multi-car levels
    
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
    
    allCars.forEach(car => {
        const carName = Object.keys(carRegistry).find(key => carRegistry[key] === car) || 'unknown';
        const carType = car.carType || 'default';
        const isAtFinish = finishPos && car.currentPosition.x === finishPos[0] && car.currentPosition.y === finishPos[1];
        
        const statusClass = isAtFinish ? 'validation-success' : 'validation-info';
        const statusText = isAtFinish ? '✓ Finished' : '🔄 Active';
        
        statusHTML += `
            <div class="${statusClass}" style="margin: 4px 0; padding: 4px 8px; border-radius: 4px;">
                <span style="font-weight: bold;">${carName}</span> (${carType}): ${statusText}
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
    if (Object.keys(carRegistry).length > 1) {
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
    
    const carCountNum = Object.keys(carRegistry).length;
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
            debug('Edit Level: level', level);
            // Export current level as JSON
            const levelJson = JSON.stringify(currentLevelData || level);
            // Store in localStorage for transfer
            localStorage.setItem('sdRacer_tempLevel', levelJson);
            // Open levelCreator with a flag to load from temp
            window.open('levelCreator.html?loadTemp=1', '_blank');
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
                return;
            } catch (e) {
                debug('Failed to load temp level: ' + e, null, 'error');
            }
        }
    }
    startGame();
});
