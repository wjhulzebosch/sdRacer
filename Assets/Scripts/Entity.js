class Entity {
    constructor(id, type, x, y) {
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