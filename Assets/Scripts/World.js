import Tile from './Tile.js';
import Car from './Car.js';
import Cow from './Cow.js';
import Finish from './Finish.js';
import WinCondition from './WinCondition.js';
import GPS from './GPS.js';
import TrafficLight from './TrafficLight.js';

class World {
    constructor(width, height) {
        if (typeof width !== 'number' || width <= 0) {
            throw new Error('CRITICAL: World constructor: width must be positive number, got: ' + typeof width + ' - ' + width);
        }
        if (typeof height !== 'number' || height <= 0) {
            throw new Error('CRITICAL: World constructor: height must be positive number, got: ' + typeof height + ' - ' + height);
        }
        
        this.width = width;
        this.height = height;
        this.grid = this.createGrid(width, height);
        this.entities = new Map(); // All entities (cars, cows, finish)
        this.winCondition = null;
        this.entityIdCounter = 0;
        this.mode = null; // Store the game mode
        
        // Initialize GPS system
        this.gps = new GPS(this);
    }
    
    createGrid(width, height) {
        return Array(height).fill(null).map(() => 
            Array(width).fill(null).map(() => new Tile())
        );
    }
    
    getTile(x, y) {
        if (this.isValidPosition(x, y)) {
            return this.grid[y][x];
        }
        return null;
    }
    
    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
    
    generateEntityId() {
        return `entity_${++this.entityIdCounter}`;
    }
    
    addEntity(entity, x, y) {
        const tile = this.getTile(x, y);
        if (tile) {
            tile.addEntity(entity);
            this.entities.set(entity.id, { entity, x, y });
            return true;
        }
        return false;
    }
    
    moveEntity(entity, fromX, fromY, toX, toY) {
        const fromTile = this.getTile(fromX, fromY);
        const toTile = this.getTile(toX, toY);
        
        if (fromTile && toTile) {
            fromTile.removeEntity(entity);
            toTile.addEntity(entity);
            this.entities.set(entity.id, { entity, x: toX, y: toY });
            return true;
        }
        return false;
    }
    
    // Move entity to new position (simplified version)
    moveEntityTo(entity, toX, toY) {
        const entityInfo = this.entities.get(entity.id);
        if (entityInfo) {
            const fromX = entityInfo.x;
            const fromY = entityInfo.y;
            return this.moveEntity(entity, fromX, fromY, toX, toY);
        }
        return false;
    }
    
    // Check if entity can move to position
    canEntityMoveTo(entity, toX, toY) {
        if (!this.isValidPosition(toX, toY)) {
            return false;
        }
        
        const tile = this.getTile(toX, toY);
        if (!tile || !tile.isRoad()) {
            return false;
        }
        
        // Check if position is blocked by other entities
        const entitiesAtPosition = this.getEntitiesAt(toX, toY);
        return entitiesAtPosition.length === 0;
    }
    
    removeEntity(entity) {
        const entityInfo = this.entities.get(entity.id);
        if (entityInfo) {
            const tile = this.getTile(entityInfo.x, entityInfo.y);
            if (tile) {
                tile.removeEntity(entity);
            }
            this.entities.delete(entity.id);
            return true;
        }
        return false;
    }
    
    getEntitiesAt(x, y) {
        const tile = this.getTile(x, y);
        return tile ? tile.getEntities() : [];
    }
    
    getEntitiesOfType(type) {
        if (typeof type !== 'string') {
            throw new Error('CRITICAL: getEntitiesOfType called with non-string type: ' + typeof type);
        }
        
        const result = Array.from(this.entities.values())
            .filter(({ entity }) => entity.type === type)
            .map(({ entity }) => entity);
            
        if (!Array.isArray(result)) {
            throw new Error('CRITICAL: getEntitiesOfType returned non-array: ' + typeof result);
        }
        
        return result;
    }
    
    getEntityById(id) {
        if (typeof id !== 'string') {
            throw new Error('CRITICAL: getEntityById called with non-string id: ' + typeof id);
        }
        
        const entityInfo = this.entities.get(id);
        return entityInfo ? entityInfo.entity : null;
    }
    
    checkWinCondition() {
        if (!this.winCondition) {
            throw new Error('CRITICAL: checkWinCondition called but winCondition is null/undefined');
        }
        
        const result = this.winCondition.check(this);
        if (typeof result !== 'boolean') {
            throw new Error('CRITICAL: winCondition.check() returned non-boolean: ' + typeof result);
        }
        
        return result;
    }
    
    setWinCondition(winCondition) {
        if (!winCondition) {
            throw new Error('CRITICAL: setWinCondition called with null/undefined winCondition');
        }
        
        this.winCondition = winCondition;
    }
    
    // Load level data into the world
    loadLevelData(levelData) {
        if (!levelData || typeof levelData !== 'object') {
            throw new Error('CRITICAL: loadLevelData called with invalid levelData: ' + typeof levelData);
        }
        
        // Clear existing entities
        this.entities.clear();
        
        // Store level metadata
        this.defaultCode = levelData.defaultCode || '';
        this.levelName = levelData.name || '';
        this.instructions = levelData.Instructions || '';
        
        // Set up grid with road tiles
        if (levelData.rows && Array.isArray(levelData.rows)) {
            for (let y = 0; y < levelData.rows.length; y++) {
                for (let x = 0; x < levelData.rows[y].length; x++) {
                    const tile = this.getTile(x + 1, y + 1); // +1 for grass border
                    if (tile) {
                        tile.setRoadType(levelData.rows[y][x]);
                    }
                }
            }
        }
        
        // Add finish entity
        if (levelData.end && Array.isArray(levelData.end)) {
            if (levelData.end.length !== 2) {
                throw new Error('CRITICAL: Invalid end position array length: ' + levelData.end.length);
            }
            const finishId = this.generateEntityId();
            const finish = new Finish(finishId, levelData.end[1] + 1, levelData.end[0] + 1);
            if (!finish) {
                throw new Error('CRITICAL: Failed to create Finish entity');
            }
            this.addEntity(finish, finish.x, finish.y);
        }
        
        // Add cars
        if (levelData.cars && Array.isArray(levelData.cars)) {
            levelData.cars.forEach((carConfig, index) => {
                if (!carConfig || typeof carConfig !== 'object') {
                    throw new Error('CRITICAL: Invalid car config at index ' + index + ': ' + typeof carConfig);
                }
                if (!carConfig.position || !Array.isArray(carConfig.position) || carConfig.position.length !== 2) {
                    throw new Error('CRITICAL: Car config missing valid position at index ' + index);
                }
                
                const carId = this.generateEntityId();
                const carX = carConfig.position[1] + 1;
                const carY = carConfig.position[0] + 1;
                const car = new Car(
                    carId,
                    carX,
                    carY,
                    carConfig.direction || 'N',
                    carConfig.type || 'default'
                );
                if (!car) {
                    throw new Error('CRITICAL: Failed to create Car entity for index ' + index);
                }
                this.addEntity(car, carX, carY);
            });
        } else if (levelData.start && Array.isArray(levelData.start)) {
            // Single car level
            if (levelData.start.length !== 2) {
                throw new Error('CRITICAL: Invalid start position array length: ' + levelData.start.length);
            }
            const carId = this.generateEntityId();
            const carX = levelData.start[1] + 1;
            const carY = levelData.start[0] + 1;
            const car = new Car(
                carId,
                carX,
                carY,
                'N',
                'default'
            );
            if (!car) {
                throw new Error('CRITICAL: Failed to create single Car entity');
            }
            this.addEntity(car, carX, carY);
        }
        
        // Add cows
        if (levelData.cows && Array.isArray(levelData.cows)) {
            levelData.cows.forEach((cowConfig, index) => {
                if (!cowConfig || typeof cowConfig !== 'object') {
                    throw new Error('CRITICAL: Invalid cow config at index ' + index + ': ' + typeof cowConfig);
                }
                if (typeof cowConfig.defaultX !== 'number' || typeof cowConfig.defaultY !== 'number' ||
                    typeof cowConfig.secondaryX !== 'number' || typeof cowConfig.secondaryY !== 'number') {
                    throw new Error('CRITICAL: Cow config missing valid coordinates at index ' + index);
                }
                
                const cowId = this.generateEntityId();
                const cowX = cowConfig.defaultX + 1;
                const cowY = cowConfig.defaultY + 1;
                const cow = new Cow(
                    cowId,
                    cowX,
                    cowY,
                    cowConfig.secondaryX + 1,
                    cowConfig.secondaryY + 1
                );
                if (!cow) {
                    throw new Error('CRITICAL: Failed to create Cow entity for index ' + index);
                }
                this.addEntity(cow, cowX, cowY);
            });
        }
        
        // Add traffic lights
        if (levelData.trafficLights && Array.isArray(levelData.trafficLights)) {
            levelData.trafficLights.forEach((trafficLightConfig, index) => {
                if (!trafficLightConfig || typeof trafficLightConfig !== 'object') {
                    throw new Error('CRITICAL: Invalid traffic light config at index ' + index + ': ' + typeof trafficLightConfig);
                }
                if (!trafficLightConfig.position || !Array.isArray(trafficLightConfig.position) || trafficLightConfig.position.length !== 2) {
                    throw new Error('CRITICAL: Traffic light config missing valid position at index ' + index);
                }
                
                const trafficLightId = this.generateEntityId();
                const trafficLightX = trafficLightConfig.position[1] + 1;
                const trafficLightY = trafficLightConfig.position[0] + 1;
                const trafficLight = new TrafficLight(
                    trafficLightId,
                    trafficLightX,
                    trafficLightY
                );
                if (!trafficLight) {
                    throw new Error('CRITICAL: Failed to create TrafficLight entity for index ' + index);
                }
                this.addEntity(trafficLight, trafficLightX, trafficLightY);
            });
        }
        
        // Set win condition
        const carCount = this.getEntitiesOfType('car').length;
        if (carCount > 1) {
            this.setWinCondition(new WinCondition('multi-car', { requiredCars: carCount }));
            this.mode = 'oop';
        } else {
            this.setWinCondition(new WinCondition('single-car'));
            this.mode = 'single';
        }
        
        if (!this.winCondition) {
            throw new Error('CRITICAL: Failed to set win condition');
        }
        
        if (!this.mode) {
            throw new Error('CRITICAL: Failed to set game mode');
        }
        
        // Reinitialize GPS system after level data is loaded
        debug('[World] Reinitializing GPS system after level load...');
        this.gps = new GPS(this);
        
        // Set game div min-width based on world dimensions
        const gameDiv = document.getElementById('game');
        if (gameDiv) {
            const tileSize = 64;
            const minWidth = this.width * tileSize;
            gameDiv.style.minWidth = minWidth + 'px';
        }
    }
    
    // Reset world to initial state
    reset() {
        debug(`[World.reset] Starting reset. Entities before reset: ${Array.from(this.entities.values()).map(({entity, x, y}) => `${entity.type} ${entity.id} at (${x}, ${y})`).join(', ')}`);
        
        // Reset all entities to their initial positions
        this.entities.forEach(({ entity }) => {
            if (entity.reset) {
                debug(`[World.reset] Resetting entity ${entity.type} ${entity.id}`);
                entity.reset();
            } else {
                debug(`[World.reset] Entity ${entity.type} ${entity.id} has no reset method`);
            }
        });
        
        debug(`[World.reset] Reset complete. Entities after reset: ${Array.from(this.entities.values()).map(({entity, x, y}) => `${entity.type} ${entity.id} at (${x}, ${y})`).join(', ')}`);
    }
    
    // Render world to game div
    render(gameDiv, instant = false) {
        if (!gameDiv) return;
        
        const tileSize = 64;
        
        // Only clear and recreate tiles if this is the first render
        if (!gameDiv.querySelector('.tile')) {
            // Clear existing content only on first render
            gameDiv.innerHTML = '';
            
            // Render grid tiles (only once)
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const tile = this.getTile(x, y);
                    if (tile) {
                        const tileDiv = document.createElement('div');
                        tileDiv.className = 'tile';
                        tileDiv.style.position = 'absolute';
                        tileDiv.style.left = (x * tileSize) + 'px';
                        tileDiv.style.top = (y * tileSize) + 'px';
                        tileDiv.style.width = tileSize + 'px';
                        tileDiv.style.height = tileSize + 'px';
                        tileDiv.style.zIndex = '1';
                        
                        // Set tile texture based on road type
                        const roadType = tile.getRoadType();
                        tileDiv.style.backgroundImage = `url('Assets/Textures/tiles/Road-${roadType}.png')`;
                        tileDiv.style.backgroundSize = 'contain';
                        
                        gameDiv.appendChild(tileDiv);
                    }
                }
            }
        }
        
        // Update all entities (preserve existing DOM elements)
        this.entities.forEach(({ entity, x, y }) => {
            // Update traffic light connections if needed
            if (entity.type === 'trafficlight' && entity.updateConnectionsFromWorld) {
                entity.updateConnectionsFromWorld();
            }
            
            if (entity.render) {
                entity.render(gameDiv, tileSize, instant);
            }
        });
    }
    
    // Canonical state query methods
    getMode() {
        if (!this.mode) {
            throw new Error('CRITICAL: getMode called but mode is null/undefined - level may not be loaded');
        }
        
        if (typeof this.mode !== 'string') {
            throw new Error('CRITICAL: getMode: stored mode is not a string: ' + typeof this.mode);
        }
        
        return this.mode;
    }
    
    getCarNames() {
        const cars = this.getEntitiesOfType('car');
        if (!Array.isArray(cars)) {
            throw new Error('CRITICAL: getCarNames: getEntitiesOfType("car") returned non-array: ' + typeof cars);
        }
        
        const result = cars.map(car => {
            if (!car || !car.carType) {
                throw new Error('CRITICAL: Car missing carType in getCarNames: ' + JSON.stringify(car));
            }
            return car.carType;
        });
        
        if (!Array.isArray(result)) {
            throw new Error('CRITICAL: getCarNames returned non-array: ' + typeof result);
        }
        
        return result;
    }
    
    // GPS system access
    getGPS() {
        return this.gps;
    }
    
    // Debug GPS system
    debugGPS() {
        if (this.gps) {
            debug('[World] Triggering GPS debug output...');
            this.gps.printDebugInfo();
        } else {
            debug('[World] GPS system not available');
        }
    }
}

export default World; 