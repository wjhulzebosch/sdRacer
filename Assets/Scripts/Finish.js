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
        debug(`[Finish] checkWinCondition at (${this.x}, ${this.y}) found entities: ${entities.map(e => `${e.type} at (${e.x}, ${e.y})`).join(', ')}`);
        const result = entities.some(entity => entity.type === 'car');
        debug(`[Finish] checkWinCondition result: ${result}`);
        return result;
    }
    
    // Get all cars at the finish
    getCarsAtFinish(world) {
        const entities = world.getEntitiesAt(this.x, this.y);
        return entities.filter(entity => entity.type === 'car');
    }
    
    // Render method for compatibility
    render(gameDiv, tileSize = 64) {
        // Find or create the finish div
        let finishDiv = gameDiv.querySelector(`.finish-${this.id}`);
        if (!finishDiv) {
            finishDiv = document.createElement('div');
            finishDiv.className = `finish finish-${this.id}`;
            finishDiv.style.width = tileSize + 'px';
            finishDiv.style.height = tileSize + 'px';
            finishDiv.style.backgroundImage = 'url("Assets/Textures/Finish.png")';
            finishDiv.style.backgroundSize = 'contain';
            finishDiv.style.position = 'absolute';
            finishDiv.style.zIndex = '3';
            gameDiv.appendChild(finishDiv);
        }
        
        // Update position
        finishDiv.style.left = (this.x * tileSize) + 'px';
        finishDiv.style.top = (this.y * tileSize) + 'px';
    }
}

export default Finish; 