import Tile from './Tile.js';
import Car from './NewCar.js';
import Cow from './NewCow.js';
import Finish from './Finish.js';
import WinCondition from './WinCondition.js';

class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = this.createGrid(width, height);
        this.entities = new Map(); // All entities (cars, cows, finish)
        this.winCondition = null;
        this.entityIdCounter = 0;
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
        return Array.from(this.entities.values())
            .filter(({ entity }) => entity.type === type)
            .map(({ entity }) => entity);
    }
    
    getEntityById(id) {
        const entityInfo = this.entities.get(id);
        return entityInfo ? entityInfo.entity : null;
    }
    
    checkWinCondition() {
        if (this.winCondition) {
            return this.winCondition.check(this);
        }
        return false;
    }
    
    setWinCondition(winCondition) {
        this.winCondition = winCondition;
    }
    
    // Load level data into the world
    loadLevelData(levelData) {
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
            const finishId = this.generateEntityId();
            const finish = new Finish(finishId, levelData.end[1] + 1, levelData.end[0] + 1);
            this.addEntity(finish, finish.x, finish.y);
        }
        
        // Add cars
        if (levelData.cars && Array.isArray(levelData.cars)) {
            levelData.cars.forEach((carConfig, index) => {
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
                this.addEntity(car, carX, carY);
            });
        } else if (levelData.start && Array.isArray(levelData.start)) {
            // Single car level
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
            this.addEntity(car, carX, carY);
        }
        
        // Add cows
        if (levelData.cows && Array.isArray(levelData.cows)) {
            levelData.cows.forEach((cowConfig, index) => {
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
                this.addEntity(cow, cowX, cowY);
            });
        }
        
        // Set win condition
        const carCount = this.getEntitiesOfType('car').length;
        if (carCount > 1) {
            this.setWinCondition(new WinCondition('multi-car', { requiredCars: carCount }));
        } else {
            this.setWinCondition(new WinCondition('single-car'));
        }
    }
    
    // Reset world to initial state
    reset() {
        // Reset all entities to their initial positions
        this.entities.forEach(({ entity }) => {
            if (entity.reset) {
                entity.reset();
            }
        });
    }
    
    // Render world to game div
    render(gameDiv) {
        if (!gameDiv) return;
        
        // Clear existing content
        gameDiv.innerHTML = '';
        
        // Render grid tiles
        const tileSize = 64;
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
                    
                    // Set tile texture based on road type
                    const roadType = tile.getRoadType();
                    tileDiv.style.backgroundImage = `url('Assets/Textures/tiles/Road-${roadType}.png')`;
                    tileDiv.style.backgroundSize = 'contain';
                    
                    gameDiv.appendChild(tileDiv);
                }
            }
        }
        
        // Render all entities
        this.entities.forEach(({ entity, x, y }) => {
            if (entity.render) {
                entity.render(gameDiv);
            }
        });
    }
    
    // Canonical state query methods
    getMode() {
        const cars = this.getEntitiesOfType('car');
        return cars.length > 1 ? 'oop' : 'single';
    }
    
    getCarNames() {
        return this.getEntitiesOfType('car').map(car => car.carType);
    }
}

export default World; 