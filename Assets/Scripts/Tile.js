class Tile {
    constructor() {
        this.roadType = '0000'; // Default grass
        this.entities = new Set(); // Cars, cows, finish, etc.
    }
    
    setRoadType(type) {
        this.roadType = type;
    }
    
    getRoadType() {
        return this.roadType;
    }
    
    addEntity(entity) {
        this.entities.add(entity);
    }
    
    removeEntity(entity) {
        this.entities.delete(entity);
    }
    
    getEntities() {
        return Array.from(this.entities);
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
            return false;
        }
        
        // Road connection logic
        const oppositeDirection = this.getOppositeDirection(direction);
        return this.roadType[direction] === '1' && 
               otherTile.roadType[oppositeDirection] === '1';
    }
    
    getOppositeDirection(direction) {
        const opposites = {
            0: 2, // North -> South
            1: 3, // East -> West
            2: 0, // South -> North
            3: 1  // West -> East
        };
        return opposites[direction] || direction;
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
}

export default Tile; 