import Entity from './Entity.js';

class Finish extends Entity {
    constructor(id, x, y) {
        if (typeof id !== 'string') {
            throw new Error('CRITICAL: Finish constructor: id must be string, got: ' + typeof id);
        }
        if (typeof x !== 'number') {
            throw new Error('CRITICAL: Finish constructor: x must be number, got: ' + typeof x);
        }
        if (typeof y !== 'number') {
            throw new Error('CRITICAL: Finish constructor: y must be number, got: ' + typeof y);
        }
        
        super(id, 'finish', x, y);
    }
    
    checkWinCondition(world) {
        const entities = world.getEntitiesAt(this.x, this.y);
        return entities.some(entity => entity.type === 'car');
    }
    
    // Get all cars at the finish
    getCarsAtFinish(world) {
        const entities = world.getEntitiesAt(this.x, this.y);
        return entities.filter(entity => entity.type === 'car');
    }
}

export default Finish; 