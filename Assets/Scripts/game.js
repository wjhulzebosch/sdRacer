import Level from './level.js';
import World from './World.js';
import CarLangParser from './CarLang-parser.js';
import CarLangEngine from './carlang-engine.js';
import CommandableObject from './CommandableObject.js';
import { soundController } from './soundController.js';
import { ONLY_USE_THIS_TO_VALIDATE } from './code-validator.js';
import { validateCodeForUI } from './ui-code-validator.js';
import { debug, getLevelMode, getLevelDifficulty, getLevelCategory } from './commonFunctions.js';


// For now, hardcode a level id and default code
const DEFAULT_CODE = `// Write your CarLang code here!`;

let saveBtn, loadBtn, playBtn, resetBtn;
// Car registry system
let carRegistry = {};
let commandableObjectRegistry = {}; // New registry for CommandableObjects
let defaultCar = null; // For backward compatibility
let level = null;
let world = null; // New World instance
let currentLevelId = null;
let finishPos = null;
let allLevels = [];
let cows = []; // Array to store cow instances - will be replaced by World
let currentLevelData = null; // Track current level configuration
let currentCustomLevelData = null;
let isGameRunning = false; // Track if game is currently running

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
    if (!world) {
        throw new Error('CRITICAL: isAtFinish called but world is null/undefined');
    }
    
    // Debug: Show car and finish positions
    const cars = world.getEntitiesOfType('car');
    const finishes = world.getEntitiesOfType('finish');
    
    debug(`[isAtFinish] Cars: ${cars.map(car => `${car.carType} at (${car.x}, ${car.y})`).join(', ')}`);
    debug(`[isAtFinish] Finishes: ${finishes.map(f => `at (${f.x}, ${f.y})`).join(', ')}`);
    
    // Debug: Show ALL entities to check for duplicates
    debug(`[isAtFinish] ALL entities in world: ${Array.from(world.entities.values()).map(({entity, x, y}) => `${entity.type} ${entity.id} at (${x}, ${y})`).join(', ')}`);
    
    // Use world's win condition system
    const result = world.checkWinCondition();
    if (typeof result !== 'boolean') {
        throw new Error('CRITICAL: world.checkWinCondition() returned non-boolean: ' + typeof result + ' - ' + JSON.stringify(result));
    }
    
    // Debug logging
    debug(`[isAtFinish] Called, result: ${result}`);
    
    return result;
}

function isPositionBlockedByCow(x, y) {
    if (!world) {
        throw new Error('CRITICAL: isPositionBlockedByCow called but world is null/undefined');
    }
    
    if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('CRITICAL: isPositionBlockedByCow called with invalid coordinates: x=' + typeof x + ', y=' + typeof y);
    }
    
    const entities = world.getEntitiesAt(x, y);
    if (!Array.isArray(entities)) {
        throw new Error('CRITICAL: world.getEntitiesAt() returned non-array: ' + typeof entities + ' - ' + JSON.stringify(entities));
    }
    
    return entities.some(entity => {
        if (!entity || !entity.type) {
            throw new Error('CRITICAL: Entity missing type: ' + JSON.stringify(entity));
        }
        return entity.type === 'cow';
    });
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

function resetGame() {
    if (isGameRunning) {
        stopGame();
    }
    
    // Reset world if it exists
    if (world) {
        world.reset();
        world.render(document.getElementById('game'));
    }
    
    // Reset car registry from world
    initializeCarRegistryFromWorld();
    
    // Update global cows array
    if (world) {
        cows = world.getEntitiesOfType('cow');
        window.cows = cows;
    }
    
    // Reset UI
    hideWinMessage();
    hideCarStatus();
    clearLineHighlighting();
    
    // Reset buttons
    if (playBtn) playBtn.textContent = 'Play';
    if (resetBtn) resetBtn.textContent = 'Reset';
    
    isGameRunning = false;
}

function resetLevel() {
    if (isGameRunning) {
        stopGame();
    }
    
    // Reset world if it exists
    if (world) {
        world.reset();
        world.render(document.getElementById('game'));
    }
    
    // Reset car registry from world
    initializeCarRegistryFromWorld();
    
    // Update global cows array
    if (world) {
        cows = world.getEntitiesOfType('cow');
        window.cows = cows;
    }
    
    // Reset UI
    hideWinMessage();
    hideCarStatus();
    clearLineHighlighting();
    
    // Reset buttons
    if (playBtn) playBtn.textContent = 'Play';
    if (resetBtn) resetBtn.textContent = 'Reset';
    
    isGameRunning = false;
}

function resetLevelState() {
    // Hide car status indicator
    hideCarStatus();
    
    // Reset world if it exists
    if (world) {
        world.reset();
        world.render(document.getElementById('game'));
        initializeCarRegistryFromWorld();
    } else {
        // Fallback to old system
        if (currentLevelData) {
            initializeCarRegistry(currentLevelData);
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
        if (!levelId) {
            throw new Error('CRITICAL: loadLevel called with null/undefined levelId');
        }
        
        const levelData = await fetch('https://wjhulzebosch.nl/json_ape/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ action: 'get', category: 'simple_sd_racer', id: levelId })
        }).then(r => r.json());
        
        if (!levelData) {
            throw new Error('CRITICAL: Level not found for id: ' + levelId);
        }
        
        // Store current level data for win condition checking
        currentLevelData = levelData;
        currentCustomLevelData = null;
        
        // Validate level data
        const validation = validateLevelData(levelData);
        if (validation.errors.length > 0) {
            throw new Error('CRITICAL: Level validation errors: ' + validation.errors.join(', '));
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
        
        // Create new World instance
        const levelWidth = (levelData.rows && levelData.rows[0]) ? levelData.rows[0].length + 2 : 10; // +2 for grass border
        const levelHeight = (levelData.rows && levelData.rows.length) ? levelData.rows.length + 2 : 10; // +2 for grass border
        
        if (levelWidth <= 0 || levelHeight <= 0) {
            throw new Error('CRITICAL: Invalid level dimensions: ' + levelWidth + 'x' + levelHeight);
        }
        
        world = new World(levelWidth, levelHeight);
        window.world = world; // Make world globally accessible
        
        if (!world) {
            throw new Error('CRITICAL: Failed to create World instance');
        }
        
        // Load level data into world
        world.loadLevelData(levelData);
        
        // Keep old level for backward compatibility
        level = new Level({
            instruction: levelData.Instructions || '',
            defaultCode: unescapeLineBreaks(levelData.defaultCode || ''),
            tiles: levelData.rows,
            cars: levelData.cars || null
        });
        window.level = level;
        
        const gameDiv = document.getElementById('game');
        if (!gameDiv) {
            throw new Error('CRITICAL: Game div not found in DOM');
        }
        
        // Render world
        world.render(gameDiv);
        
        // Initialize car registry from world
        initializeCarRegistryFromWorld();
        
        // Update UI elements
        updateModeIndicator();
        
        // Update global cows array from world
        cows = world.getEntitiesOfType('cow');
        if (!Array.isArray(cows)) {
            throw new Error('CRITICAL: world.getEntitiesOfType("cow") returned non-array: ' + typeof cows);
        }
        window.cows = cows;
        
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
        console.error('CRITICAL ERROR in loadLevel:', err);
        throw err; // Re-throw to make it visible
    }
}

async function playCode() {
    try {
        // Hide any existing win message at the start
        hideWinMessage();
        
        if (isGameRunning) {
            debug('Game is already running', null, 'warning');
            return;
        }

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

        // Use world system for mode detection and car mapping
        let mode = 'single';
        let carNames = [];
        
        if (world) {
            mode = world.getMode();
            carNames = world.getCarNames();
            
            if (typeof mode !== 'string') {
                throw new Error('CRITICAL: world.getMode() returned non-string: ' + typeof mode + ' - ' + JSON.stringify(mode));
            }
            
            if (!Array.isArray(carNames)) {
                throw new Error('CRITICAL: world.getCarNames() returned non-array: ' + typeof carNames + ' - ' + JSON.stringify(carNames));
            }
        } else {
            // Fallback to old system
            if (level && typeof level.isSingleMode === 'function' && !level.isSingleMode()) {
                mode = 'oop';
                if (Array.isArray(level.cars)) {
                    carNames = level.cars.map(car => car.name);
                }
            }
        }
        
        const code = window.getCodeValue();
        if (typeof code !== 'string') {
            throw new Error('CRITICAL: window.getCodeValue() returned non-string: ' + typeof code);
        }
        
        const gameDiv = document.getElementById('game');
        if (!gameDiv) {
            throw new Error('CRITICAL: Game div not found in DOM during playCode');
        }
        
        // Use long names with "Car" suffix for cleaner syntax
        const availableCars = carNames.map(carName => carName + 'Car');
        
        const parser = new CarLangParser(world, availableCars);
        if (!parser) {
            throw new Error('CRITICAL: Failed to create CarLangParser instance');
        }
        
        const ast = parser.parse(code);
        if (!ast) {
            throw new Error('CRITICAL: parser.parse() returned null/undefined');
        }
        
        const parseErrors = ast.errors || [];
        let validation = { valid: true, errors: [], warnings: [] };
        if (parseErrors.length > 0) {
            let errorMsg = 'Parse errors:\n' + parseErrors.join('\n');
            debug(errorMsg, null, 'error');
            playBtn.textContent = 'Play';
            return;
        }
        
        // Build a car map for execution using world entities
        let carMap = {};
        if (world) {
            const cars = world.getEntitiesOfType('car');
            if (!Array.isArray(cars)) {
                throw new Error('CRITICAL: world.getEntitiesOfType("car") returned non-array: ' + typeof cars);
            }
            
            debug(`[playCode] Building car map from world. Found ${cars.length} cars:`, cars.map(c => ({ id: c.id, carType: c.carType })));
            
            if (mode === 'oop') {
                cars.forEach(car => {
                    if (!car || !car.carType) {
                        throw new Error('CRITICAL: Car missing carType: ' + JSON.stringify(car));
                    }
                    const carName = car.carType || 'default';
                    // Use long name with "Car" suffix for execution
                    const carNameWithSuffix = carName + 'Car';
                    carMap[carNameWithSuffix] = new CommandableObject(car);
                });
            } else {
                // Single car mode
                if (cars.length > 0) {
                    const defaultCar = cars[0];
                    carMap.mainCar = new CommandableObject(defaultCar);
                    carMap.default = new CommandableObject(defaultCar);
                }
            }
            
            debug(`[playCode] Final car map keys: ${Object.keys(carMap).join(', ')}`);
            debug(`[playCode] Final car map values:`, Object.values(carMap).map(c => ({ id: c.entity.id, carType: c.entity.carType })));
        } else {
            // Fallback to old system
            if (mode === 'oop' && Array.isArray(level.cars)) {
                const registry = getCarRegistry();
                for (const car of level.cars) {
                    if (registry && registry[car.name]) {
                        carMap[car.name] = new CommandableObject(registry[car.name]);
                    }
                }
            } else if (mode === 'single') {
                const defaultCar = getDefaultCar();
                if (defaultCar) {
                    carMap.mainCar = new CommandableObject(defaultCar);
                    carMap.default = new CommandableObject(defaultCar);
                }
            }
        }
        
        // Store interpreter globally for reset functionality
        const interpreter = new CarLangEngine(carMap, world || level, gameDiv);
        if (!interpreter) {
            throw new Error('CRITICAL: Failed to create CarLangEngine instance');
        }
        
        window.currentInterpreter = interpreter;
        interpreter.initializeExecution(ast);
        
        // Start traffic light cycles when game starts
        if (world) {
            const trafficLights = world.getEntitiesOfType('trafficlight');
            trafficLights.forEach(trafficLight => {
                if (trafficLight.startCycle) {
                    trafficLight.startCycle();
                }
            });
        }
        
        // Enhanced game loop for step-by-step execution
        const gameLoop = () => {
            // Check if game was stopped
            if (!isGameRunning) {
                return;
            }
            
            const result = interpreter.executeNext();
            if (!result || typeof result !== 'object') {
                throw new Error('CRITICAL: interpreter.executeNext() returned invalid result: ' + typeof result + ' - ' + JSON.stringify(result));
            }
            
            // Update car status indicator for multi-car levels
            // updateCarStatus();
            
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
                    
                    // Re-render world after movement commands to update visual display
                    if (result.functionName && ['moveForward', 'moveBackward', 'turnLeft', 'turnRight'].includes(result.functionName)) {
                        if (world) {
                            world.render(document.getElementById('game'));
                        }
                        
                        // Check win condition after any command that might affect car position
                        if (isAtFinish()) {
                            hideCarStatus(); // Hide status when game ends
                            showWinMessage();
                            clearLineHighlighting();
                            playBtn.textContent = 'Finished';
                            isGameRunning = false;
                            return; // Stop execution on win
                        }
                    }
                    
                    // Continue immediately for non-visual commands
                    requestAnimationFrame(gameLoop);
                    break;
                    
                case 'PAUSED':                       
                    // Re-render world after movement commands to update visual display
                    if (result.functionName && ['moveForward', 'moveBackward', 'turnLeft', 'turnRight'].includes(result.functionName)) {
                        if (world) {
                            world.render(document.getElementById('game'));
                        }
                    }
                    // Wait for delay then continue
                    setTimeout(() => {
                        // Check if game was stopped during the delay
                        if (!isGameRunning) {
                            return;
                        }
                        
                        // Check win condition after movement commands
                        if (result.functionName && ['moveForward', 'moveBackward'].includes(result.functionName)) {
                            if (isAtFinish()) {
                                hideCarStatus(); // Hide status when game ends
                                showWinMessage();
                                clearLineHighlighting();
                                playBtn.textContent = 'Finished';
                                isGameRunning = false;
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
                    isGameRunning = false;
                    
                    // Final render to show crashed cars
                    if (window.world) {
                        window.world.render(document.getElementById('game'));
                    }
                    
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
                    isGameRunning = false;
                    throw new Error(result.error);
                    
                default:
                    throw new Error('CRITICAL: Unknown execution status: ' + result.status);
            }
        };
        
        // Start the game loop
        gameLoop();
        
    } catch (e) {
        console.error('CRITICAL ERROR in playCode:', e);
        debug('Error in code: ' + e.message, null, 'error');
        debug('Error: ' + e.message, null, 'error');
        playBtn.textContent = 'Play';
        isGameRunning = false;
        throw e; // Re-throw to make it visible
    }
}

function stopGame() {
    if (window.currentInterpreter) {
        window.currentInterpreter.stop();
    }
    
    // Stop traffic light intervals when game stops
    if (world) {
        const trafficLights = world.getEntitiesOfType('trafficlight');
        trafficLights.forEach(trafficLight => {
            if (trafficLight.stopCycle) {
                trafficLight.stopCycle();
            }
        });
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
                    body: new URLSearchParams({ action: 'list', category: 'simple_sd_racer' })
                }).then(r => r.json());
                allLevels = await Promise.all(
                    ids.map(async id => {
                        const level = await fetch('https://wjhulzebosch.nl/json_ape/api.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({ action: 'get', category: 'simple_sd_racer', id })
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
    commandableObjectRegistry = {}; // Clear CommandableObject registry too
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
            
            // Create CommandableObject for this car
            const commandableObject = new CommandableObject(car);
            commandableObjectRegistry[carName] = commandableObject;
            
            // Also register with "Car" suffix for better syntax (e.g., blueCar, redCar)
            const carNameWithSuffix = carName + 'Car';
            carRegistry[carNameWithSuffix] = car;
            commandableObjectRegistry[carNameWithSuffix] = commandableObject;
            
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
            
            // Create CommandableObject for single car
            const commandableObject = new CommandableObject(defaultCar);
            commandableObjectRegistry.mainCar = commandableObject;
            
            defaultCar.render(gameDiv);
            debug(`Created single car at position [${levelConfig.start[0]}, ${levelConfig.start[1]}]`);
        } else {
            debug(`Invalid start position for level ${levelConfig.apiId}`, null, 'error');
        }
    }
    
    // Log final car registry state
    debug(`Car registry initialized with ${Object.keys(carRegistry).length} cars:`, Object.keys(carRegistry));
    debug(`CommandableObject registry initialized with ${Object.keys(commandableObjectRegistry).length} objects:`, Object.keys(commandableObjectRegistry));
}

function getCarRegistry() {
    return carRegistry;
}

function getCommandableObjectRegistry() {
    return commandableObjectRegistry;
}

function getDefaultCar() {
    return defaultCar;
}

function getCarByName(carName) {
    return carRegistry[carName];
}

function getCommandableObjectByName(carName) {
    return commandableObjectRegistry[carName];
}

function getAllCars() {
    return Object.values(carRegistry);
}

function getAllCommandableObjects() {
    return Object.values(commandableObjectRegistry);
}

function clearCarRegistry() {
    carRegistry = {};
    commandableObjectRegistry = {}; // Clear CommandableObject registry too
    defaultCar = null;
    
    // Remove car elements from DOM
    const gameDiv = document.getElementById('game');
    const existingCars = gameDiv.querySelectorAll('.car');
    existingCars.forEach(car => car.remove());
}

// Helper function to get parser configuration based on current level
function getParserConfig() {
    if (!world) {
        throw new Error('CRITICAL: getParserConfig called but world is null/undefined');
    }
    
    const mode = world.getMode();
    const carNames = world.getCarNames();
    
    // Only use long names with "Car" suffix
    const availableCars = carNames.map(carName => carName + 'Car');
    
    return {
        mode: mode,
        availableCars: availableCars
    };
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

/**
 * Enhanced win condition checking with detailed feedback
 */
function checkWinCondition() {
    if (!world) {
        throw new Error('CRITICAL: checkWinCondition called but world is null/undefined');
    }
    
    if (!world.winCondition) {
        throw new Error('CRITICAL: world.winCondition is null/undefined');
    }
    
    // Use world's win condition system
    const won = world.checkWinCondition();
    if (typeof won !== 'boolean') {
        throw new Error('CRITICAL: world.checkWinCondition() returned non-boolean: ' + typeof won + ' - ' + JSON.stringify(won));
    }
    
    const details = world.winCondition.getWinDetails(world);
    if (!details || typeof details !== 'object') {
        throw new Error('CRITICAL: world.winCondition.getWinDetails() returned invalid result: ' + typeof details + ' - ' + JSON.stringify(details));
    }
    
    return { won, details };
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
        
        // Check if car is at finish using world system
        let isAtFinish = false;
        if (world) {
            const finishEntities = world.getEntitiesOfType('finish');
            isAtFinish = finishEntities.some(finish => 
                finish.x === car.x && finish.y === car.y
            );
        }
        
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
    
    let carCountNum = 0;
    let mode = 'single';
    
    if (world) {
        const cars = world.getEntitiesOfType('car');
        carCountNum = cars.length;
        mode = world.getMode();
    } else {
        carCountNum = Object.keys(carRegistry).length;
        const parserConfig = getParserConfig();
        mode = parserConfig.mode;
    }
    
    if (mode === 'oop') {
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
            const levelJson = JSON.stringify(currentCustomLevelData || currentLevelData || level);
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

// Initialize car registry from world entities
function initializeCarRegistryFromWorld() {
    if (!world) {
        throw new Error('CRITICAL: initializeCarRegistryFromWorld called but world is null/undefined');
    }
    
    // Clear existing registry
    carRegistry = {};
    
    // Get all cars from world
    const cars = world.getEntitiesOfType('car');
    
    if (cars.length === 0) {
        throw new Error('CRITICAL: No cars found in world - this should never happen');
    }
    
    // Register each car
    cars.forEach(car => {
        if (!car || !car.id) {
            throw new Error('CRITICAL: Car entity is missing id: ' + JSON.stringify(car));
        }
        
        const carName = car.carType || 'default';
        
        // Only register with "Car" suffix for cleaner syntax (e.g., blueCar, redCar)
        const carNameWithSuffix = carName + 'Car';
        carRegistry[carNameWithSuffix] = car;
        
        // For backward compatibility, set default car
        if (!defaultCar || carName === 'default') {
            defaultCar = car;
        }
    });
    
    // Also register with 'mainCar' key for single car mode
    if (cars.length === 1) {
        carRegistry.mainCar = cars[0];
        carRegistry.default = cars[0];
    }
    
    debug(`Initialized car registry with ${cars.length} cars: ${Object.keys(carRegistry).join(', ')}`);
}

// Global error handler to catch any unhandled errors
window.addEventListener('error', function(event) {
    console.error('CRITICAL UNHANDLED ERROR:', event.error);
    console.error('Error details:', {
        message: event.error.message,
        stack: event.error.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
    
    // Show error in UI
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #dc2626;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 80%;
        max-height: 80%;
        overflow: auto;
        font-family: monospace;
        white-space: pre-wrap;
    `;
    errorDiv.innerHTML = `
        <h3>CRITICAL ERROR DETECTED</h3>
        <p><strong>Message:</strong> ${event.error.message}</p>
        <p><strong>File:</strong> ${event.filename}:${event.lineno}:${event.colno}</p>
        <p><strong>Stack:</strong></p>
        <pre>${event.error.stack}</pre>
        <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px;">Close</button>
    `;
    document.body.appendChild(errorDiv);
    
    // Prevent default error handling
    event.preventDefault();
});

// Also catch unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('CRITICAL UNHANDLED PROMISE REJECTION:', event.reason);
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #dc2626;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 80%;
        max-height: 80%;
        overflow: auto;
        font-family: monospace;
        white-space: pre-wrap;
    `;
    errorDiv.innerHTML = `
        <h3>CRITICAL UNHANDLED PROMISE REJECTION</h3>
        <p><strong>Reason:</strong> ${event.reason}</p>
        <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px;">Close</button>
    `;
    document.body.appendChild(errorDiv);
    
    // Prevent default error handling
    event.preventDefault();
});