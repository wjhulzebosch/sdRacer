// For now, hardcode a level id and default code
const LEVEL_ID = 'level1';
const DEFAULT_CODE = `// Write your CarLang code here!`;

let codeArea, saveBtn, loadBtn, playBtn, resetBtn;
let car = null;
let level = null;
let currentLevelId = '1';
let finishPos = null;
let allLevels = [];
let carlangInterpreter = null;
let isRunning = false;
let cows = []; // Array to store cow instances

// Make cows globally accessible for CarLang engine
window.cows = cows;

// Line highlighting variables
let currentHighlightedLine = null;
let currentHighlightedBlock = null;

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
function getResetLvlBtn() {
    return document.getElementById('resetLvlBtn');
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
    updateLineNumbers();
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
    return car && finishPos && car.currentPosition.x === finishPos[0] && car.currentPosition.y === finishPos[1];
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
            levelItem.textContent = levelData.name || `Level ${levelData.id}`;
            levelItem.className = 'level-item';
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
            if (levelData.id && levelData.rows) {
                // Load the custom level
                loadCustomLevel(levelData);
                loaderOverlay.remove();
                overlay.remove();
            } else {
                alert('Invalid level format. Please make sure the JSON contains "id" and "rows" fields.');
            }
        } catch (e) {
            alert('Invalid JSON format. Please check your level data.');
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
    // Set current level ID to custom
    currentLevelId = 'custom';
    
    // Create level object
    level = new Level({
        instruction: levelData.Instructions || '',
        defaultCode: levelData.defaultCode || '',
        tiles: levelData.rows
    });
    
    const gameDiv = document.getElementById('game');
    
    // Set finish position
    finishPos = Array.isArray(levelData.end) ? [levelData.end[1] + 1, levelData.end[0] + 1] : undefined;
    level.render(gameDiv, finishPos);
    
    // Create and render the car separately, swapping x and y and adding +1 for grass border
    if (levelData.start && Array.isArray(levelData.start)) {
        car = new Car({ position: { x: levelData.start[1] + 1, y: levelData.start[0] + 1 }, direction: 'N' });
        car.render(gameDiv);
    }
    
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
    
    // Load default code
    loadDefaultCode();
    
    // Display level instructions
    const instructionsDiv = document.getElementById('instructions');
    if (instructionsDiv && levelData.Instructions) {
        instructionsDiv.innerHTML = `<h3>Instructions:</h3><p>${levelData.Instructions}</p>`;
    }
    
    // Reset game state
    resetGame();
    
    // Update URL to show custom level
    const url = new URL(window.location);
    url.searchParams.set('levelId', 'custom');
    window.history.pushState({}, '', url);
    
    // Update line numbers
    updateLineNumbers();
}

function resetGame() {
    // Reset interpreter if it exists
    if (window.currentInterpreter) {
        window.currentInterpreter.reset();
    }
    
    // Reset car position if we have a current level (but not for custom levels)
    if (car && currentLevelId && currentLevelId !== 'custom' && allLevels.length > 0) {
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
    
    // Reset cows to their default positions
    cows.forEach(cow => {
        cow.reset();
    });
    
    // Update global cows array
    window.cows = cows;
    
    // Reset execution state
    isRunning = false;
    playBtn.disabled = false;
    playBtn.textContent = 'Play';
}

function resetLevel() {
    // Reset interpreter if it exists
    if (window.currentInterpreter) {
        window.currentInterpreter.reset();
    }
    
    // Reset car position if we have a current level (but not for custom levels)
    if (car && currentLevelId && currentLevelId !== 'custom' && allLevels.length > 0) {
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
    
    // Reset cows to their default positions
    cows.forEach(cow => {
        cow.reset();
    });
    
    // Update global cows array
    window.cows = cows;
    
    // Reset execution state
    isRunning = false;
    playBtn.disabled = false;
    playBtn.textContent = 'Play';
    
    // Clear line highlighting
    clearLineHighlighting();
    
    // Show feedback
    const resetLvlBtn = getResetLvlBtn();
    if (resetLvlBtn) {
        resetLvlBtn.textContent = 'Reset!';
        setTimeout(() => resetLvlBtn.textContent = 'Reset level', 1000);
    }
}

function resetLevelState() {
    // Reset interpreter if it exists
    if (window.currentInterpreter) {
        window.currentInterpreter.reset();
    }
    
    // Reset car position if we have a current level (but not for custom levels)
    if (car && currentLevelId && currentLevelId !== 'custom' && allLevels.length > 0) {
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
    
    // Reset cows to their default positions
    cows.forEach(cow => {
        cow.reset();
    });
    
    // Update global cows array
    window.cows = cows;
    
    // Reset execution state
    isRunning = false;
    playBtn.disabled = false;
    playBtn.textContent = 'Play';
    
    // Clear line highlighting
    clearLineHighlighting();
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
            
            // Display level instructions
            const instructionsDiv = document.getElementById('instructions');
            if (instructionsDiv && levelData.Instructions) {
                instructionsDiv.innerHTML = `<h3>Instructions:</h3><p>${levelData.Instructions}</p>`;
            }
            
            // Reset game state when loading new level
            resetGame();
        })
        .catch(err => console.error('Failed to load level: ' + err));
}

async function playCode() {
    try {
        // Check if button is in "Finished" state - if so, reset level and play again
        if (playBtn.textContent === 'Finished') {
            resetLevelState();
            // Small delay to ensure reset is complete
            setTimeout(() => {
                playCode();
            }, 100);
            return;
        }
        
        playBtn.disabled = true;
        playBtn.textContent = 'Playing';
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
                    clearLineHighlighting();
                    playBtn.textContent = 'Finished';
                    playBtn.disabled = false;
                    break;
                    
                case 'ERROR':
                    // Error occurred
                    clearLineHighlighting();
                    playBtn.textContent = 'Play';
                    playBtn.disabled = false;
                    throw new Error(result.error);
            }
        };
        
        // Start the game loop
        gameLoop();
        
    } catch (e) {
        console.error('Error in code: ' + e.message);
        alert('Error: ' + e.message);
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
    codeArea = getCodeArea();
    saveBtn = getSaveBtn();
    loadBtn = getLoadBtn();
    playBtn = getPlayBtn();
    resetBtn = getResetBtn();

    saveBtn.onclick = saveCode;
    loadBtn.onclick = handleLoadBtn;
    playBtn.onclick = playCode;
    resetBtn.onclick = resetCode;
    
    // Set up reset level button
    const resetLvlBtn = getResetLvlBtn();
    if (resetLvlBtn) resetLvlBtn.onclick = resetLevel;
    
    // Set up fix indentation button
    const fixIndentationBtn = getFixIndentationBtn();
    if (fixIndentationBtn) fixIndentationBtn.onclick = fixIndentation;
    
    // Set up auto-indentation for the code editor
    setupAutoIndentation();
    
    // Set up line number updates
    codeArea.addEventListener('input', updateLineNumbers);
    codeArea.addEventListener('scroll', () => {
        const lineNumbersDiv = document.getElementById('line-numbers');
        lineNumbersDiv.scrollTop = codeArea.scrollTop;
    });
    
    // Initialize line numbers
    updateLineNumbers();
    
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

// Line highlighting functions
function updateLineNumbers() {
    const lineNumbersDiv = document.getElementById('line-numbers');
    const codeText = codeArea.value;
    const lines = codeText.split('\n');
    
    let lineNumbersHTML = '';
    for (let i = 1; i <= lines.length; i++) {
        lineNumbersHTML += `<div class="line-number">${i}</div>`;
    }
    
    lineNumbersDiv.innerHTML = lineNumbersHTML;
}

function highlightLine(lineNumber, blockStartLine = null, contextType = null) {
    // Clear previous highlighting
    clearLineHighlighting();
    
    if (lineNumber && lineNumber > 0) {
        const lineNumbersDiv = document.getElementById('line-numbers');
        const lineNumberElements = lineNumbersDiv.querySelectorAll('.line-number');
        
        if (lineNumber <= lineNumberElements.length) {
            // Highlight current line
            lineNumberElements[lineNumber - 1].classList.add('current-line');
            currentHighlightedLine = lineNumber;
            
            // Highlight block if we're in a control structure
            if (blockStartLine && contextType && ['if-then', 'if-elseif', 'if-else', 'while', 'for'].includes(contextType)) {
                highlightBlock(blockStartLine, lineNumberElements);
                currentHighlightedBlock = blockStartLine;
            }
        }
    }
}

function highlightBlock(blockStartLine, lineNumberElements) {
    if (blockStartLine && blockStartLine > 0 && blockStartLine <= lineNumberElements.length) {
        // Highlight the block start line with a different color
        lineNumberElements[blockStartLine - 1].classList.add('block-start');
    }
}

function clearLineHighlighting() {
    const lineNumbersDiv = document.getElementById('line-numbers');
    const lineNumberElements = lineNumbersDiv.querySelectorAll('.line-number');
    
    // Clear current line highlighting
    if (currentHighlightedLine && lineNumberElements[currentHighlightedLine - 1]) {
        lineNumberElements[currentHighlightedLine - 1].classList.remove('current-line');
    }
    
    // Clear block highlighting
    if (currentHighlightedBlock && lineNumberElements[currentHighlightedBlock - 1]) {
        lineNumberElements[currentHighlightedBlock - 1].classList.remove('block-start');
    }
    
    currentHighlightedLine = null;
    currentHighlightedBlock = null;
}

window.addEventListener('DOMContentLoaded', startGame);
