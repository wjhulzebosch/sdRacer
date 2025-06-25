// ES6 export and global debug
const log_log = false;
const log_warn = true;
const log_error = true;

export function debug(message, data = null, level = 'log') {
    let file = '', func = '', line = '', col = '';
    try {
        const stack = new Error().stack.split('\n');
        // Find the first stack line that is not this debug function
        let callerLine = stack.find(l => l.includes('at') && !l.includes('debug')) || stack[2];
        // Chrome/Edge: at functionName (fileURL:line:col)
        // Firefox: functionName@fileURL:line:col
        let match = callerLine.match(/at (.*?) \((.*?):(\d+):(\d+)\)/) ||
                    callerLine.match(/at (.*?):(\d+):(\d+)/) ||
                    callerLine.match(/(.*?)@(.*?):(\d+):(\d+)/);
        if (match) {
            if (match.length === 5) {
                func = match[1];
                file = match[2].split('/').pop();
                line = match[3];
                col = match[4];
            } else if (match.length === 4) {
                func = '';
                file = match[1].split('/').pop();
                line = match[2];
                col = match[3];
            }
        } else {
            file = 'unknown';
        }
    } catch (e) {
        file = 'unknown';
    }
    const prefix = `[${file}${func ? ' | ' + func : ''}${line ? ':' + line : ''}${col ? ':' + col : ''}]`;
    switch (level) {
        case 'log':
            if(log_log)
                console.log(prefix, message, data);
            break;
        case 'warn':
            if(log_warn)
                console.warn(prefix, message, data);
            break;
        case 'error':
            if(log_error)
                console.error(prefix, message, data);
            break;
        default:
            console.log('DEBUG: Unknown debug level:', level);
            console.log(prefix, message, data);
            break;
    }
}
// Make debug globally available
if (typeof window !== 'undefined') {
    window.debug = debug;
}


function loadCustomLevel(levelData) {
    function unescapeLineBreaks(str) {
        return typeof str === 'string' ? str.replace(/\\n/g, '\n') : str;
    }
    
    // Set current level ID to custom
    currentLevelId = 'custom';
    
    // Create new World instance
    const levelWidth = (levelData.rows && levelData.rows[0]) ? levelData.rows[0].length + 2 : 10; // +2 for grass border
    const levelHeight = (levelData.rows && levelData.rows.length) ? levelData.rows.length + 2 : 10; // +2 for grass border
    world = new World(levelWidth, levelHeight);
    window.world = world; // Make world globally accessible
    
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
    
    // Render world
    world.render(gameDiv);
    
    // Initialize car registry from world
    initializeCarRegistryFromWorld();
    
    updateModeIndicator();
    
    // Update global cows array from world
    cows = world.getEntitiesOfType('cow');
    window.cows = cows;
    
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

function navigateToLevel() {
    window.location.href = 'game.html?levelId=custom';    
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

function getLevelMode(levelData) {
    if (levelData.cars && Array.isArray(levelData.cars) && levelData.cars.length > 1) {
        return 'multi-car';
    } else if (levelData.cars && Array.isArray(levelData.cars) && levelData.cars.length === 1) {
        return 'single-car-oop'; // Single car but using OOP syntax
    } else {
        return 'single-car'; // Traditional single car mode
    }
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

export { loadCustomLevel, navigateToLevel, getLevelDifficulty, getLevelMode, getLevelCategory };