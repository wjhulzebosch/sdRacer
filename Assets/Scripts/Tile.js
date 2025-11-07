class Tile {
    constructor() {
        this.roadType = '0000'; // Default grass
        this.entities = new Set(); // Cars, cows, finish, etc.
        this.plant = null; // Plant decoration (null, 'plant_1', or 'plant_2')
    }
    
    setRoadType(type) {
        if (typeof type !== 'string') {
            throw new Error('CRITICAL: setRoadType called with non-string type: ' + typeof type);
        }
        this.roadType = type;
    }
    
    getRoadType() {
        if (typeof this.roadType !== 'string') {
            throw new Error('CRITICAL: roadType is not a string: ' + typeof this.roadType);
        }
        return this.roadType;
    }
    
    addEntity(entity) {
        if (!entity) {
            throw new Error('CRITICAL: addEntity called with null/undefined entity');
        }
        if (!entity.id) {
            throw new Error('CRITICAL: Entity missing id: ' + JSON.stringify(entity));
        }
        this.entities.add(entity);
    }
    
    removeEntity(entity) {
        if (!entity) {
            throw new Error('CRITICAL: removeEntity called with null/undefined entity');
        }
        this.entities.delete(entity);
    }
    
    getEntities() {
        const result = Array.from(this.entities);
        if (!Array.isArray(result)) {
            throw new Error('CRITICAL: getEntities returned non-array: ' + typeof result);
        }
        return result;
    }
    
    getEntitiesOfType(type) {
        return this.getEntities().filter(entity => entity.type === type);
    }
    
    hasEntityOfType(type) {
        return this.getEntitiesOfType(type).length > 0;
    }
    
    isRoad() {
        return this.roadType !== '0000';
    }
    
    isConnectedTo(otherTile, direction) {
        if (!otherTile || !this.isRoad() || !otherTile.isRoad()) {
            debug(`[isConnectedTo] FAIL: Invalid tiles or not roads`);
            return false;
        }
        
        // Road connection logic
        const oppositeDirection = this.getOppositeDirection(direction);
        const thisHasConnection = this.roadType[direction] === '1';
        const otherHasConnection = otherTile.roadType[oppositeDirection] === '1';
        
        debug(`[isConnectedTo] Checking connection:`);
        debug(`  This tile: ${this.roadType}, direction: ${direction}, has connection: ${thisHasConnection}`);
        debug(`  Other tile: ${otherTile.roadType}, opposite direction: ${oppositeDirection}, has connection: ${otherHasConnection}`);
        debug(`  Result: ${thisHasConnection && otherHasConnection}`);
        
        return thisHasConnection && otherHasConnection;
    }
    
    getOppositeDirection(direction) {
        const opposites = {
            0: 2, // North -> South
            1: 3, // East -> West
            2: 0, // South -> North
            3: 1  // West -> East
        };
        const result = opposites[direction] || direction;
        debug(`[getOppositeDirection] Input: ${direction}, Output: ${result}`);
        return result;
    }
    
    // Check if this tile has a specific entity
    hasEntity(entity) {
        return this.entities.has(entity);
    }
    
    // Get count of entities of a specific type
    getEntityCount(type) {
        return this.getEntitiesOfType(type).length;
    }
    
    // Clear all entities from this tile
    clearEntities() {
        this.entities.clear();
    }
    
    // Set plant decoration
    setPlant(plantType) {
        this.plant = plantType;
    }
    
    // Get plant decoration
    getPlant() {
        return this.plant;
    }
}

export default Tile; 