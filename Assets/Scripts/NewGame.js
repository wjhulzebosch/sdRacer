import World from './World.js';
import CarLangParser from './CarLang-parser.js';
import NewCarLangEngine from './NewCarLangEngine.js';
import { soundController } from './soundController.js';
import { ONLY_USE_THIS_TO_VALIDATE } from './code-validator.js';
import { validateCodeForUI } from './ui-code-validator.js';

class NewGame {
    constructor() {
        this.world = null;
        this.currentLevelId = null;
        this.currentLevelData = null;
        this.isGameRunning = false;
        this.currentInterpreter = null;
        this.gameDiv = null;
        
        // Legacy compatibility - maintain old global references
        this.carRegistry = {};
        this.defaultCar = null;
        this.cows = [];
        this.finishPos = null;
        this.level = null;
    }
    
    async loadLevel(levelId) {
        try {
            const levelData = await fetch('https://wjhulzebosch.nl/json_ape/api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ action: 'get', category: 'sd_racer', id: levelId })
            }).then(r => r.json());
            
            if (!levelData) {
                console.error('Level not found!');
                return false;
            }
            
            this.currentLevelData = levelData;
            this.currentLevelId = levelId;
            
            // Calculate world dimensions (add 2 for grass border)
            const height = levelData.rows.length + 2;
            const width = levelData.rows[0] ? levelData.rows[0].length + 2 : 2;
            
            // Create new world
            this.world = new World(width, height);
            this.world.loadLevelData(levelData);
            
            // Update legacy references for compatibility
            this.updateLegacyReferences();
            
            // Render the world
            this.renderWorld();
            
            return true;
        } catch (err) {
            console.error('Failed to load level:', err);
            return false;
        }
    }
    
    updateLegacyReferences() {
        // Update car registry
        this.carRegistry = {};
        const cars = this.world.getEntitiesOfType('car');
        cars.forEach((car, index) => {
            const carName = car.carType || `car_${index}`;
            this.carRegistry[carName] = car;
            if (index === 0) {
                this.defaultCar = car;
            }
        });
        
        // Update cows array
        this.cows = this.world.getEntitiesOfType('cow');
        
        // Update finish position
        const finishEntities = this.world.getEntitiesOfType('finish');
        if (finishEntities.length > 0) {
            const finish = finishEntities[0];
            this.finishPos = [finish.x, finish.y];
        }
        
        // Update global references for backward compatibility
        window.cows = this.cows;
        window.world = this.world;
    }
    
    renderWorld() {
        if (!this.gameDiv) {
            this.gameDiv = document.getElementById('game');
        }
        
        if (!this.gameDiv || !this.world) return;
        
        // Clear existing content
        this.gameDiv.innerHTML = '';
        this.gameDiv.style.position = 'relative';
        
        const tileSize = 64;
        this.gameDiv.style.width = (this.world.width * tileSize) + 'px';
        this.gameDiv.style.height = (this.world.height * tileSize) + 'px';
        
        // Render tiles
        for (let y = 0; y < this.world.height; y++) {
            for (let x = 0; x < this.world.width; x++) {
                const tile = this.world.getTile(x, y);
                if (tile) {
                    const tileDiv = document.createElement('div');
                    tileDiv.className = 'level-tile';
                    tileDiv.style.left = (x * tileSize) + 'px';
                    tileDiv.style.top = (y * tileSize) + 'px';
                    tileDiv.style.backgroundImage = `url('Assets/Textures/tiles/Road-${tile.getRoadType()}.png')`;
                    this.gameDiv.appendChild(tileDiv);
                }
            }
        }
        
        // Render finish overlay
        const finishEntities = this.world.getEntitiesOfType('finish');
        finishEntities.forEach(finish => {
            const finishDiv = document.createElement('div');
            finishDiv.className = 'finish-tile';
            finishDiv.style.left = (finish.x * tileSize) + 'px';
            finishDiv.style.top = (finish.y * tileSize) + 'px';
            this.gameDiv.appendChild(finishDiv);
        });
        
        // Render cars
        const cars = this.world.getEntitiesOfType('car');
        cars.forEach(car => {
            this.renderCar(car);
        });
        
        // Render cows
        const cows = this.world.getEntitiesOfType('cow');
        cows.forEach(cow => {
            cow.addToGrid(this.gameDiv);
        });
    }
    
    renderCar(car) {
        if (!this.gameDiv) return;
        
        const tileSize = 64;
        let carDiv = this.gameDiv.querySelector(`.car-${car.carType}`);
        if (!carDiv) {
            carDiv = document.createElement('div');
            carDiv.className = `car car-${car.carType}`;
            carDiv.style.width = tileSize + 'px';
            carDiv.style.height = tileSize + 'px';
            this.gameDiv.appendChild(carDiv);
        }
        
        carDiv.style.left = (car.x * tileSize) + 'px';
        carDiv.style.top = (car.y * tileSize) + 'px';
        
        // Set texture based on car type
        let texturePath = 'Assets/Textures/Car.png'; // default
        if (car.crashed) {
            texturePath = 'Assets/Textures/Wreck.png';
        } else {
            switch (car.carType) {
                case 'red':
                    texturePath = 'Assets/Textures/RedCar.png';
                    break;
                case 'blue':
                    texturePath = 'Assets/Textures/BlueCar.png';
                    break;
                case 'green':
                    texturePath = 'Assets/Textures/GreenCar.png';
                    break;
                case 'yellow':
                    texturePath = 'Assets/Textures/YellowCar.png';
                    break;
                default:
                    texturePath = 'Assets/Textures/Car.png';
            }
        }
        
        carDiv.style.backgroundImage = `url('${texturePath}')`;
        carDiv.style.transform = `rotate(${car.visualRotation}deg)`;
    }
    
    async playCode() {
        if (!this.world) return;
        
        // Validate code
        validateCodeForUI();
        const result = ONLY_USE_THIS_TO_VALIDATE();
        if (result.parseErrors && result.parseErrors.length > 0) {
            console.error('Parse errors:', result.parseErrors);
            return;
        }
        
        this.isGameRunning = true;
        
        // Determine mode and car names
        const cars = this.world.getEntitiesOfType('car');
        let mode = 'single';
        let carNames = [];
        
        if (cars.length > 1) {
            mode = 'oop';
            carNames = cars.map(car => car.carType || 'default');
        }
        
        const code = window.getCodeValue();
        const parser = new CarLangParser(mode, carNames);
        const ast = parser.parse(code);
        
        if (ast.errors && ast.errors.length > 0) {
            console.error('Parse errors:', ast.errors);
            this.isGameRunning = false;
            return;
        }
        
        // Build car map for execution
        let carMap = {};
        if (mode === 'oop') {
            cars.forEach(car => {
                carMap[car.carType || 'default'] = car;
            });
        } else {
            if (cars.length > 0) {
                carMap.mainCar = cars[0];
                carMap.default = cars[0];
            }
        }
        
        // Create interpreter
        this.currentInterpreter = new NewCarLangEngine(carMap, this.world, this.gameDiv);
        window.currentInterpreter = this.currentInterpreter;
        this.currentInterpreter.initializeExecution(ast);
        
        // Start game loop
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.isGameRunning || !this.currentInterpreter) {
            return;
        }
        
        const result = this.currentInterpreter.executeNext();
        
        // Update car visuals
        const cars = this.world.getEntitiesOfType('car');
        cars.forEach(car => {
            this.renderCar(car);
        });
        
        // Check win condition
        if (this.world.checkWinCondition()) {
            this.isGameRunning = false;
            console.log('Level completed!');
            return;
        }
        
        // Continue loop
        if (result.status === 'CONTINUE') {
            setTimeout(() => this.gameLoop(), 100);
        } else {
            this.isGameRunning = false;
        }
    }
    
    stopGame() {
        this.isGameRunning = false;
        if (this.currentInterpreter) {
            this.currentInterpreter.stop();
        }
    }
    
    resetGame() {
        this.stopGame();
        if (this.world && this.currentLevelData) {
            this.world.loadLevelData(this.currentLevelData);
            this.updateLegacyReferences();
            this.renderWorld();
        }
    }
    
    // Legacy compatibility methods
    getCarRegistry() {
        return this.carRegistry;
    }
    
    getDefaultCar() {
        return this.defaultCar;
    }
    
    getCarByName(carName) {
        return this.carRegistry[carName];
    }
    
    getAllCars() {
        return Object.values(this.carRegistry);
    }
    
    isAtFinish() {
        return this.world ? this.world.checkWinCondition() : false;
    }
    
    checkWinCondition() {
        if (!this.world) return { won: false };
        
        const winCondition = this.world.winCondition;
        if (winCondition) {
            return winCondition.getWinDetails(this.world);
        }
        return { won: false };
    }
}

export default NewGame; 