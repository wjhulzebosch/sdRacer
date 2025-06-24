class Entity {
    constructor(id, type, x, y) {
        if (typeof id !== 'string') {
            throw new Error('CRITICAL: Entity constructor: id must be string, got: ' + typeof id);
        }
        if (typeof type !== 'string') {
            throw new Error('CRITICAL: Entity constructor: type must be string, got: ' + typeof type);
        }
        if (typeof x !== 'number') {
            throw new Error('CRITICAL: Entity constructor: x must be number, got: ' + typeof x);
        }
        if (typeof y !== 'number') {
            throw new Error('CRITICAL: Entity constructor: y must be number, got: ' + typeof y);
        }
        
        this.id = id;
        this.type = type; // 'car', 'cow', 'finish'
        this.x = x;
        this.y = y;
    }
    
    getPosition() {
        return { x: this.x, y: this.y };
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    // Check if this entity is at a specific position
    isAtPosition(x, y) {
        return this.x === x && this.y === y;
    }
    
    // Get distance to another position
    getDistanceTo(x, y) {
        return Math.abs(this.x - x) + Math.abs(this.y - y);
    }
    
    // Check if this entity is within a certain distance of a position
    isWithinDistance(x, y, distance) {
        return this.getDistanceTo(x, y) <= distance;
    }
}

export default Entity; 