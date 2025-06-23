import Entity from './Entity.js';

class Finish extends Entity {
    constructor(id, x, y) {
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