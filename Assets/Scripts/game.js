import Level from './level.js';
import World from './World.js';
import CarLangParser from './CarLang-parser.js';
import CarLangEngine from './carlang-engine.js';
import CommandableObject from './CommandableObject.js';
import { soundController } from './soundController.js';
import { ONLY_USE_THIS_TO_VALIDATE } from './code-validator.js';
import { validateCodeForUI } from './ui-code-validator.js';
import { debug, getLevelMode, getLevelDifficulty, getLevelCategory } from './commonFunctions.js';

const DEFAULT_CODE = `// Write your CarLang code here!`;

let saveBtn, loadBtn, playBtn, resetBtn;

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

const _originalLoadLevel = loadLevel;

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
    setupWinButtons();

function hideWinMessage() {
    const winDiv = document.getElementById('win-message');
    winDiv.style.display = 'none';

function isAtFinish() {
    if (!world) {
        throw new Error('CRITICAL: isAtFinish called but world is null/undefined');
    }
    const cars = world.getEntitiesOfType('car');
    const finishes = world.getEntitiesOfType('finish');
    debug(`[isAtFinish] Cars: ${cars.map(car => `${car.carType} at (${car.x}, ${car.y})`).join(', ')}`);
    debug(`[isAtFinish] Finishes: ${finishes.map(f => `at (${f.x}, ${f.y})`).join(', ')}`);
    debug(`[isAtFinish] ALL entities in world: ${Array.from(world.entities.values()).map(({entity, x, y}) => `${entity.type} ${entity.id} at (${x}, ${y})`).join(', ')}`);
    const result = world.checkWinCondition();
    if (typeof result !== 'boolean') {
        throw new Error('CRITICAL: world.checkWinCondition() returned non-boolean: ' + typeof result + ' - ' + JSON.stringify(result));
    }
    debug(`[isAtFinish] Called, result: ${result}`);
    return result;

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

function resetGame() {
    if (isGameRunning) {
        stopGame();
    }
    if (world) {
        world.reset();
        world.render(document.getElementById('game'));
    }
    initializeCarRegistryFromWorld();
    if (world) {
        cows = world.getEntitiesOfType('cow');
        window.cows = cows;
    }
    hideWinMessage();
    hideCarStatus();
    clearLineHighlighting();
    if (playBtn) playBtn.textContent = 'Play';
    if (resetBtn) resetBtn.textContent = 'Reset';
    isGameRunning = false;

function resetLevel() {
    if (isGameRunning) {
        stopGame();
    }
    if (world) {
        world.reset();
        world.render(document.getElementById('game'));
    }
    initializeCarRegistryFromWorld();
    if (world) {
        cows = world.getEntitiesOfType('cow');
        window.cows = cows;
    }
    hideWinMessage();
    hideCarStatus();
    clearLineHighlighting();
    if (playBtn) playBtn.textContent = 'Play';
    if (resetBtn) resetBtn.textContent = 'Reset';
    isGameRunning = false;

function resetLevelState() {
    hideCarStatus();
    if (world) {
        world.reset();
        world.render(document.getElementById('game'));
        initializeCarRegistryFromWorld();
    } else {
        if (currentLevelData) {
            initializeCarRegistry(currentLevelData);
        }
    }
    clearLineHighlighting();
    if (resetBtn) {
        resetBtn.textContent = 'Reset code';
    }
    hideWinMessage();
    if (window.currentInterpreter) {
        window.currentInterpreter.reset();
    }

async function loadLevel(levelId) {
    try {
        if (!levelId) {
            throw new Error('CRITICAL: loadLevel called with null/undefined levelId');
        }
        const levelData = await fetch('https://wjhulzebosch.nl/json_ape/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ action: 'get', category: 'sd_racer', id: levelId })
        }).then(r => r.json());
        if (!levelData) {
            throw new Error('CRITICAL: Level not found for id: ' + levelId);
        }
        currentLevelData = levelData;
        currentCustomLevelData = null;
        const validation = validateLevelData(levelData);
        if (validation.errors.length > 0) {
            throw new Error('CRITICAL: Level validation errors: ' + validation.errors.join(', '));
        }
        if (validation.warnings.length > 0) {
            console.warn('Level validation warnings:', validation.warnings);
        }
        const mode = getLevelMode(levelData);
        const difficulty = getLevelDifficulty(levelData);
        const category = getLevelCategory(levelData);
        debug(`Loading level ${levelId}: ${levelData.name || 'Unnamed'}`);
        debug(`Mode: ${mode}, Difficulty: ${difficulty}/5, Category: ${category}`);
        debug(`[LOAD LEVEL] apiId: ${levelId}, name: ${levelData.name}, Instructions: ${levelData.Instructions}`);
        currentLevelId = levelId;
        function unescapeLineBreaks(str) {
            return typeof str === 'string' ? str.replace(/\\n/g, '\n') : str;
        }
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
        world.loadLevelData(levelData);
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
        world.render(gameDiv);
        initializeCarRegistryFromWorld();
        updateModeIndicator();
        cows = world.getEntitiesOfType('cow');
        if (!Array.isArray(cows)) {
            throw new Error('CRITICAL: world.getEntitiesOfType("cow") returned non-array: ' + typeof cows);
        }
        window.cows = cows;
        loadDefaultCode();
        autoIndent();
        const instructionsDiv = document.getElementById('instructions');
        if (instructionsDiv && levelData.Instructions) {
            let instructionText = `<h3>Instructions:</h3><p>${levelData.Instructions}</p>`;
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
    } catch (err) {
        console.error('CRITICAL ERROR in loadLevel:', err);
        throw err; // Re-throw to make it visible
    }

async function playCode() {
    try {
        hideWinMessage();
        if (isGameRunning) {
            debug('Game is already running', null, 'warning');
            return;
        }
        autoIndent();
        validateCodeForUI();
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
                    const carNameWithSuffix = carName + 'Car';
                    carMap[carNameWithSuffix] = new CommandableObject(car);
                });
            } else {
                if (cars.length > 0) {
                    const defaultCar = cars[0];
                    carMap.mainCar = new CommandableObject(defaultCar);
                    carMap.default = new CommandableObject(defaultCar);
                }
            }
            debug(`[playCode] Final car map keys: ${Object.keys(carMap).join(', ')}`);
            debug(`[playCode] Final car map values:`, Object.values(carMap).map(c => ({ id: c.entity.id, carType: c.entity.carType })));
        } else {
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
        const interpreter = new CarLangEngine(carMap, world || level, gameDiv);
        if (!interpreter) {
            throw new Error('CRITICAL: Failed to create CarLangEngine instance');
        }
        window.currentInterpreter = interpreter;
        interpreter.initializeExecution(ast);
        if (world) {
            const trafficLights = world.getEntitiesOfType('trafficlight');
            trafficLights.forEach(trafficLight => {
                if (trafficLight.startCycle) {
                    trafficLight.startCycle();
                }
            });
        }
        const gameLoop = () => {
            if (!isGameRunning) {
                return;
            }
            const result = interpreter.executeNext();
            if (!result || typeof result !== 'object') {
                throw new Error('CRITICAL: interpreter.executeNext() returned invalid result: ' + typeof result + ' - ' + JSON.stringify(result));
            }
            updateCarStatus();
            if (result.currentLine) {
                highlightLine(result.currentLine, result.blockStartLine, result.contextType);
            }
            switch (result.status) {
                case 'CONTINUE':
                    if (result.functionName === 'honk' && typeof soundController !== 'undefined') {
                        soundController.playCarHorn();
                    }
                    if (result.functionName && ['moveForward', 'moveBackward', 'turnLeft', 'turnRight'].includes(result.functionName)) {
                        if (world) {
                            world.render(document.getElementById('game'));
                        }
                        if (isAtFinish()) {
                            hideCarStatus(); // Hide status when game ends
                            showWinMessage();
                            clearLineHighlighting();
                            playBtn.textContent = 'Finished';
                            isGameRunning = false;
                            return; // Stop execution on win
                        }
                    }
                    requestAnimationFrame(gameLoop);
                    break;
                case 'PAUSED':                       
                    if (result.functionName && ['moveForward', 'moveBackward', 'turnLeft', 'turnRight'].includes(result.functionName)) {
                        if (world) {
                            world.render(document.getElementById('game'));
                        }
                    }
                    setTimeout(() => {
                        if (!isGameRunning) {
                            return;
                        }
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
                        requestAnimationFrame(gameLoop);
                    }, 1000); // 1 second delay for visual commands
                    break;
                case 'COMPLETE':
                    hideCarStatus(); // Hide status when execution completes
                    clearLineHighlighting();
                    playBtn.textContent = 'Finished';
                    isGameRunning = false;
                    if (window.world) {
                        window.world.render(document.getElementById('game'));
                    }
                    if (isAtFinish()) {
                        showWinMessage();
                    }
                    break;
                case 'ERROR':
                    hideCarStatus(); // Hide status on error
                    clearLineHighlighting();
                    playBtn.textContent = 'Play';
                    isGameRunning = false;
                    throw new Error(result.error);
                default:
                    throw new Error('CRITICAL: Unknown execution status: ' + result.status);
            }
        };
        gameLoop();
    } catch (e) {
        console.error('CRITICAL ERROR in playCode:', e);
        debug('Error in code: ' + e.message, null, 'error');
        debug('Error: ' + e.message, null, 'error');
        playBtn.textContent = 'Play';
        isGameRunning = false;
        throw e; // Re-throw to make it visible
    }

function stopGame() {
    if (window.currentInterpreter) {
        window.currentInterpreter.stop();
    }
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

function resetCode() {
    resetLevelState();
    loadDefaultCode();
    autoIndent();
    resetBtn.textContent = 'Reset code';

function clearLineHighlighting() {
    if (window._cmHighlightedLine != null) {
        window.codeMirrorEditor.removeLineClass(window._cmHighlightedLine, 'background', 'cm-highlighted-line');
        window._cmHighlightedLine = null;
    }

function initializeCarRegistry(levelConfig) {
    carRegistry = {};
    commandableObjectRegistry = {}; // Clear CommandableObject registry too
    defaultCar = null;
    const gameDiv = document.getElementById('game');
    const existingCars = gameDiv.querySelectorAll('.car');
    existingCars.forEach(car => car.remove());
    if (!levelConfig) {
        console.warn('No level configuration provided to initializeCarRegistry');
        return;
    }
    if (levelConfig.cars && Array.isArray(levelConfig.cars) && levelConfig.cars.length > 0) {
        debug(`Initializing ${levelConfig.cars.length} cars for level ${levelConfig.apiId}`);
        levelConfig.cars.forEach((carConfig, index) => {
            if (!carConfig.name) {
                debug(`Car ${index} missing name in level ${levelConfig.apiId}`, null, 'error');
                return;
            }
            const carName = carConfig.name;
            const carType = carConfig.type || 'default';
            const position = carConfig.position;
            const direction = carConfig.direction || 'N';
            if (!position || !Array.isArray(position) || position.length !== 2) {
                debug(`Car ${carName} has invalid position in level ${levelConfig.apiId}`, null, 'error');
                return;
            }
            const validCarTypes = ['default', 'red', 'blue', 'green', 'yellow'];
            if (!validCarTypes.includes(carType)) {
                debug(`Car ${carName} has invalid type '${carType}', using 'default'`, null, 'warn');
                carConfig.type = 'default';
            }
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
            const commandableObject = new CommandableObject(car);
            commandableObjectRegistry[carName] = commandableObject;
            const carNameWithSuffix = carName + 'Car';
            carRegistry[carNameWithSuffix] = car;
            commandableObjectRegistry[carNameWithSuffix] = commandableObject;
            if (index === 0) {
                defaultCar = car;
            }
            car.render(gameDiv);
            debug(`Created car: ${carName} (${carType}) at position [${position[0]}, ${position[1]}] facing ${carConfig.direction}`);
        });
        if (Object.keys(carRegistry).length === 0) {
            debug(`No valid cars created for level ${levelConfig.apiId}`, null, 'error');
            return;
        }
    } else {
        debug(`Initializing single car for level ${levelConfig.apiId}`);
        if (levelConfig.start && Array.isArray(levelConfig.start) && levelConfig.start.length === 2) {
            defaultCar = new Car({ 
                position: { x: levelConfig.start[1] + 1, y: levelConfig.start[0] + 1 }, 
                direction: 'N',
                carType: 'default'
            });
            carRegistry.mainCar = defaultCar;
            const commandableObject = new CommandableObject(defaultCar);
            commandableObjectRegistry.mainCar = commandableObject;
            defaultCar.render(gameDiv);
            debug(`Created single car at position [${levelConfig.start[0]}, ${levelConfig.start[1]}]`);
        } else {
            debug(`Invalid start position for level ${levelConfig.apiId}`, null, 'error');
        }
    }
    debug(`Car registry initialized with ${Object.keys(carRegistry).length} cars:`, Object.keys(carRegistry));
    debug(`CommandableObject registry initialized with ${Object.keys(commandableObjectRegistry).length} objects:`, Object.keys(commandableObjectRegistry));

function getCarRegistry() {
    return carRegistry;

function getCommandableObjectRegistry() {
    return commandableObjectRegistry;

function getDefaultCar() {
    return defaultCar;

function getCarByName(carName) {
    return carRegistry[carName];

function getCommandableObjectByName(carName) {
    return commandableObjectRegistry[carName];

function getAllCars() {
    return Object.values(carRegistry);

function getAllCommandableObjects() {
    return Object.values(commandableObjectRegistry);

function clearCarRegistry() {
    carRegistry = {};
    commandableObjectRegistry = {}; // Clear CommandableObject registry too
    defaultCar = null;
    const gameDiv = document.getElementById('game');
    const existingCars = gameDiv.querySelectorAll('.car');
    existingCars.forEach(car => car.remove());

function getParserConfig() {
    if (!world) {
        throw new Error('CRITICAL: getParserConfig called but world is null/undefined');
    }
    const mode = world.getMode();
    const carNames = world.getCarNames();
    const availableCars = carNames.map(carName => carName + 'Car');
    return {
        mode: mode,
        availableCars: availableCars
    };

function checkWinCondition() {
    if (!world) {
        throw new Error('CRITICAL: checkWinCondition called but world is null/undefined');
    }
    if (!world.winCondition) {
        throw new Error('CRITICAL: world.winCondition is null/undefined');
    }
    const won = world.checkWinCondition();
    if (typeof won !== 'boolean') {
        throw new Error('CRITICAL: world.checkWinCondition() returned non-boolean: ' + typeof won + ' - ' + JSON.stringify(won));
    }
    const details = world.winCondition.getWinDetails(world);
    if (!details || typeof details !== 'object') {
        throw new Error('CRITICAL: world.winCondition.getWinDetails() returned invalid result: ' + typeof details + ' - ' + JSON.stringify(details));
    }
    return { won, details };

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

function hideCarStatus() {
    const statusIndicator = document.getElementById('car-status-indicator');
    if (statusIndicator) {
        statusIndicator.remove();
    }

function updateCarStatus() {
    if (Object.keys(carRegistry).length > 1) {
        showCarStatus();
    } else {
        hideCarStatus();
    }

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

function afterLevelLoad() {
    addEditLevelButton();

function initializeCarRegistryFromWorld() {
    if (!world) {
        throw new Error('CRITICAL: initializeCarRegistryFromWorld called but world is null/undefined');
    }
    carRegistry = {};
    const cars = world.getEntitiesOfType('car');
    if (cars.length === 0) {
        throw new Error('CRITICAL: No cars found in world - this should never happen');
    }
    cars.forEach(car => {
        if (!car || !car.id) {
            throw new Error('CRITICAL: Car entity is missing id: ' + JSON.stringify(car));
        }
        const carName = car.carType || 'default';
        const carNameWithSuffix = carName + 'Car';
        carRegistry[carNameWithSuffix] = car;
        if (!defaultCar || carName === 'default') {
            defaultCar = car;
        }
    });
    if (cars.length === 1) {
        carRegistry.mainCar = cars[0];
        carRegistry.default = cars[0];
    }
    debug(`Initialized car registry with ${cars.length} cars: ${Object.keys(carRegistry).join(', ')}`);
