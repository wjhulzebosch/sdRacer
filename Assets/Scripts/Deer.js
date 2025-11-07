import { debug } from './commonFunctions.js';
import Entity from './Entity.js';

class Deer extends Entity {
    constructor(id, positions) {
        if (typeof id !== 'string') {
            throw new Error('CRITICAL: Deer constructor: id must be string, got: ' + typeof id);
        }
        if (!Array.isArray(positions)) {
            throw new Error('CRITICAL: Deer constructor: positions must be array, got: ' + typeof positions);
        }
        if (positions.length < 2) {
            throw new Error('CRITICAL: Deer constructor: positions must have at least 2 waypoints, got: ' + positions.length);
        }
        
        // Validate all positions
        positions.forEach((pos, index) => {
            if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
                throw new Error(`CRITICAL: Deer constructor: position at index ${index} must have number x and y, got: x=${typeof pos.x}, y=${typeof pos.y}`);
            }
        });
        
        super(id, 'deer', positions[0].x, positions[0].y);
        
        this.positions = positions; // Waypoints
        this.tilePath = []; // Pre-calculated complete tile path
        this.currentTileIndex = 0;
        this.initialTileIndex = 0;
        this.moveSpeed = 1000; // 1 second per tile
        this.lastMoveTime = Date.now();
        this.movementInterval = null;
        this.visualRotation = 0; // Track cumulative rotation like Car does
        this.lastDirection = null; // Track last direction faced
        
        // Pre-calculate the complete circular path
        this.calculateTilePath();
        
        // Calculate initial rotation based on first movement direction
        this.calculateInitialRotation();
        
        // Start continuous movement
        this.initialize();
    }
    
    calculateInitialRotation() {
        // Get the first two tiles to determine initial direction
        if (this.tilePath.length >= 2) {
            const firstTile = this.tilePath[0];
            const secondTile = this.tilePath[1];
            const dx = secondTile.x - firstTile.x;
            const dy = secondTile.y - firstTile.y;
            
            // Determine initial direction and set visualRotation
            // N = 0°, E = 90°, S = 180°, W = 270°
            if (dx > 0) {
                this.visualRotation = 90; // East
                this.lastDirection = 'E';
            } else if (dx < 0) {
                this.visualRotation = 270; // West
                this.lastDirection = 'W';
            } else if (dy > 0) {
                this.visualRotation = 180; // South
                this.lastDirection = 'S';
            } else if (dy < 0) {
                this.visualRotation = 0; // North
                this.lastDirection = 'N';
            }
        }
    }
    
    calculateTilePath() {
        const path = [];
        
        // Build path from each waypoint to the next
        for (let i = 0; i < this.positions.length; i++) {
            const start = this.positions[i];
            const end = this.positions[(i + 1) % this.positions.length];
            
            // Get all tiles between start and end (excluding start to avoid duplicates)
            const segment = this.getManhattenPath(start, end, i > 0);
            path.push(...segment);
        }
        
        this.tilePath = path;
        debug(`[Deer ${this.id}] Calculated tile path with ${this.tilePath.length} tiles`);
    }
    
    getManhattenPath(start, end, skipFirst = false) {
        const tiles = [];
        let x = start.x;
        let y = start.y;
        
        if (!skipFirst) {
            tiles.push({x, y});
        }
        
        // Move in X direction first
        while (x !== end.x) {
            x += Math.sign(end.x - x);
            tiles.push({x, y});
        }
        
        // Then move in Y direction
        while (y !== end.y) {
            y += Math.sign(end.y - y);
            tiles.push({x, y});
        }
        
        return tiles;
    }
    
    initialize() {
        // Simple: Just move one tile every moveSpeed interval
        // CSS transition handles the smooth visual movement
        this.movementInterval = setInterval(() => {
            this.moveToNextTile();
        }, this.moveSpeed);
        
        debug(`[Deer ${this.id}] Movement initialized - moving every ${this.moveSpeed}ms`);
    }
    
    moveToNextTile() {
        // Move to next tile in circular path
        this.currentTileIndex = (this.currentTileIndex + 1) % this.tilePath.length;
        const nextTile = this.tilePath[this.currentTileIndex];
        
        // Calculate rotation change based on direction of movement
        const dx = nextTile.x - this.x;
        const dy = nextTile.y - this.y;
        
        // Calculate current and next directions
        let currentDir = null;
        let nextDir = null;
        
        // Determine next direction
        if (dx > 0) nextDir = 'E';
        else if (dx < 0) nextDir = 'W';
        else if (dy > 0) nextDir = 'S';
        else if (dy < 0) nextDir = 'N';
        
        // Determine current direction (from last position)
        if (this.lastDirection) {
            currentDir = this.lastDirection;
        } else {
            // First move, assume we're already facing the right direction
            currentDir = nextDir;
        }
        
        // Calculate rotation change (incremental, like Car does)
        const dirOrder = ['N', 'E', 'S', 'W'];
        const currentIdx = dirOrder.indexOf(currentDir);
        const nextIdx = dirOrder.indexOf(nextDir);
        
        if (currentIdx !== -1 && nextIdx !== -1 && currentDir !== nextDir) {
            // Calculate shortest rotation
            let diff = nextIdx - currentIdx;
            if (diff > 2) diff -= 4;
            if (diff < -2) diff += 4;
            this.visualRotation += diff * 90;
        }
        
        this.lastDirection = nextDir;
        
        // Update world entity tracking
        const oldX = this.x;
        const oldY = this.y;
        
        // UPDATE POSITION IMMEDIATELY (not gradually)
        this.x = nextTile.x;
        this.y = nextTile.y;
        
        if (window.world) {
            window.world.moveEntity(this, oldX, oldY, this.x, this.y);
        }
        
        // Update visual position with rotation - CSS transition makes it smooth
        this.updateVisualPosition();
    }
    
    updateVisualPosition() {
        // Find the deer div and update its position and rotation
        const deerDiv = document.querySelector(`.deer-${this.id}`);
        if (deerDiv) {
            const tileSize = 64;
            deerDiv.style.left = (this.x * tileSize) + 'px';
            deerDiv.style.top = (this.y * tileSize) + 'px';
            deerDiv.style.transform = `rotate(${this.visualRotation}deg)`;
        }
    }
    
    render(gameDiv, tileSize = 64) {
        // Find or create the deer div
        let deerDiv = gameDiv.querySelector(`.deer-${this.id}`);
        if (!deerDiv) {
            deerDiv = document.createElement('div');
            deerDiv.className = `deer deer-${this.id}`;
            deerDiv.style.width = tileSize + 'px';
            deerDiv.style.height = tileSize + 'px';
            deerDiv.style.backgroundImage = 'url("Assets/Textures/Deer.png")';
            deerDiv.style.backgroundSize = 'contain';
            deerDiv.style.backgroundRepeat = 'no-repeat';
            deerDiv.style.backgroundPosition = 'center';
            deerDiv.style.position = 'absolute';
            // Match transition timing to moveSpeed - include transform for rotation
            deerDiv.style.transition = `left ${this.moveSpeed}ms linear, top ${this.moveSpeed}ms linear, transform ${this.moveSpeed}ms linear`;
            deerDiv.style.zIndex = '2';
            gameDiv.appendChild(deerDiv);
        }
        
        // Update position (CSS transition makes it smooth)
        deerDiv.style.left = (this.x * tileSize) + 'px';
        deerDiv.style.top = (this.y * tileSize) + 'px';
        deerDiv.style.transform = `rotate(${this.visualRotation}deg)`;
    }
    
    reset() {
        const oldX = this.x;
        const oldY = this.y;
        
        // Return to first tile in path
        this.currentTileIndex = this.initialTileIndex;
        const firstTile = this.tilePath[this.currentTileIndex];
        this.setPosition(firstTile.x, firstTile.y);
        this.lastMoveTime = Date.now();
        
        // Update World's entity tracking if world exists
        if (window.world) {
            window.world.moveEntity(this, oldX, oldY, this.x, this.y);
        }
        
        debug(`[Deer ${this.id}] Reset to position (${this.x}, ${this.y})`);
    }
    
    blocksMovement(x, y) {
        return this.isAtPosition(x, y);
    }
    
    destroy() {
        // Cleanup interval
        if (this.movementInterval) {
            clearInterval(this.movementInterval);
            this.movementInterval = null;
        }
        
        // Remove visual element
        if (typeof document !== 'undefined') {
            const deerDiv = document.querySelector(`.deer-${this.id}`);
            if (deerDiv && deerDiv.parentElement) {
                deerDiv.parentElement.removeChild(deerDiv);
            }
        }
        
        debug(`[Deer ${this.id}] Destroyed`);
    }
    
    getData() {
        return {
            id: this.id,
            type: this.type,
            positions: this.positions.map(pos => ({x: pos.x, y: pos.y})),
            currentTileIndex: this.currentTileIndex
        };
    }
    
    static fromData(data) {
        const deer = new Deer(data.id, data.positions);
        if (typeof data.currentTileIndex === 'number') {
            deer.currentTileIndex = data.currentTileIndex;
            const tile = deer.tilePath[deer.currentTileIndex];
            deer.setPosition(tile.x, tile.y);
        }
        return deer;
    }
}

export default Deer;
