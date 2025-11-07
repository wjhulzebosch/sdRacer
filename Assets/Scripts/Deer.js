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
        this.pathActions = []; // Pre-calculated complete path with move and rotate actions
        this.currentActionIndex = 0;
        this.initialActionIndex = 0;
        this.moveSpeed = 1000; // 1 second per action (move or rotate)
        this.lastMoveTime = Date.now();
        this.movementInterval = null;
        this.visualRotation = 0; // Track cumulative rotation like Car does
        this.currentDirection = null; // Track current direction: 'N', 'E', 'S', 'W'
        this.directionMap = {
            'N': 0,    // North = 0°
            'E': 90,   // East = 90°
            'S': 180,  // South = 180°
            'W': 270   // West = 270°
        };
        
        // Pre-calculate the complete path with rotation actions
        this.calculatePathActions();
        
        // Start continuous movement
        this.initialize();
    }
    
    getDirectionToTile(fromTile, toTile) {
        const dx = toTile.x - fromTile.x;
        const dy = toTile.y - fromTile.y;
        
        if (dx > 0) return 'E';
        if (dx < 0) return 'W';
        if (dy > 0) return 'S';
        if (dy < 0) return 'N';
        
        throw new Error(`[Deer ${this.id}] Cannot determine direction - tiles are the same or invalid`);
    }
    
    getLastMoveAction(actions) {
        // Find the last move action in the array
        for (let i = actions.length - 1; i >= 0; i--) {
            if (actions[i].type === 'move') {
                return actions[i];
            }
        }
        
        // If no move action found, return first position
        return {x: this.positions[0].x, y: this.positions[0].y};
    }
    
    calculateRotationActions(fromDir, toDir) {
        const actions = [];
        const dirOrder = ['N', 'E', 'S', 'W'];
        const fromIdx = dirOrder.indexOf(fromDir);
        const toIdx = dirOrder.indexOf(toDir);
        
        // Calculate shortest rotation
        let diff = toIdx - fromIdx;
        
        // Normalize to -2, -1, 0, 1, 2
        if (diff > 2) diff -= 4;
        if (diff < -2) diff += 4;
        
        if (diff === 0) {
            // No rotation needed
            return actions;
        } else if (diff === 1 || diff === -3) {
            // Turn right 90°
            actions.push({type: 'rotate', direction: 'right', degrees: 90});
        } else if (diff === -1 || diff === 3) {
            // Turn left 90°
            actions.push({type: 'rotate', direction: 'left', degrees: 90});
        } else if (diff === 2 || diff === -2) {
            // 180° turn - two rotations (choose right for consistency)
            actions.push({type: 'rotate', direction: 'right', degrees: 90});
            actions.push({type: 'rotate', direction: 'right', degrees: 90});
        }
        
        debug(`[Deer ${this.id}] Rotation from ${fromDir} to ${toDir}: ${actions.length} rotation(s)`);
        return actions;
    }
    
    calculatePathActions() {
        const actions = [];
        
        // Set initial direction based on first two positions
        if (this.positions.length >= 2) {
            const first = this.positions[0];
            const second = this.positions[1];
            this.currentDirection = this.getDirectionToTile(first, second);
            this.visualRotation = this.directionMap[this.currentDirection];
        } else {
            // Default to North if only one position (shouldn't happen)
            this.currentDirection = 'N';
            this.visualRotation = 0;
        }
        
        debug(`[Deer ${this.id}] Initial direction: ${this.currentDirection} (${this.visualRotation}°)`);
        
        // Build path from each waypoint to the next
        for (let i = 0; i < this.positions.length; i++) {
            const start = this.positions[i];
            const end = this.positions[(i + 1) % this.positions.length];
            
            // Get tiles between waypoints
            // For the first segment (i=0), skip the first tile since deer is already there
            const segment = this.getManhattenPath(start, end, true); // Always skip first tile to avoid duplicates
            
            // Convert tiles to move actions with rotation checks
            segment.forEach((tile) => {
                // Determine required direction to reach this tile
                const lastAction = this.getLastMoveAction(actions);
                const requiredDirection = this.getDirectionToTile(lastAction, tile);
                
                // Check if rotation is needed
                if (this.currentDirection && this.currentDirection !== requiredDirection) {
                    // Calculate rotation needed
                    const rotationActions = this.calculateRotationActions(
                        this.currentDirection, 
                        requiredDirection
                    );
                    actions.push(...rotationActions);
                }
                
                // Update current direction
                this.currentDirection = requiredDirection;
                
                // Add move action
                actions.push({type: 'move', x: tile.x, y: tile.y});
            });
        }
        
        // Check if rotation is needed at the end to face the initial direction again
        // (for when the path loops back to the start)
        const initialDirection = this.getDirectionToTile(this.positions[0], this.positions[1]);
        if (this.currentDirection !== initialDirection) {
            const finalRotationActions = this.calculateRotationActions(
                this.currentDirection,
                initialDirection
            );
            actions.push(...finalRotationActions);
            this.currentDirection = initialDirection; // Update to match initial direction
            debug(`[Deer ${this.id}] Added ${finalRotationActions.length} rotation(s) at end to face initial direction`);
        }
        
        this.pathActions = actions;
        debug(`[Deer ${this.id}] Calculated path with ${this.pathActions.length} actions (moves + rotations)`);
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
        // Execute actions at regular intervals
        // Each action (move or rotate) takes moveSpeed time
        this.movementInterval = setInterval(() => {
            this.executeNextAction();
        }, this.moveSpeed);
        
        debug(`[Deer ${this.id}] Movement initialized with ${this.pathActions.length} actions - executing every ${this.moveSpeed}ms`);
    }
    
    executeNextAction() {
        // Get current action
        const action = this.pathActions[this.currentActionIndex];
        
        if (!action) {
            debug(`[Deer ${this.id}] ERROR: No action at index ${this.currentActionIndex}`, null, 'error');
            return;
        }
        
        if (action.type === 'move') {
            // Execute move action
            this.executeMoveAction(action);
        } else if (action.type === 'rotate') {
            // Execute rotate action
            this.executeRotateAction(action);
        }
        
        // Move to next action (circular)
        this.currentActionIndex = (this.currentActionIndex + 1) % this.pathActions.length;
        
        // Update visual
        this.updateVisualPosition();
    }
    
    executeMoveAction(action) {
        const oldX = this.x;
        const oldY = this.y;
        
        // Update position immediately
        this.x = action.x;
        this.y = action.y;
        
        // Update world tracking
        if (window.world) {
            window.world.moveEntity(this, oldX, oldY, this.x, this.y);
        }
        
        debug(`[Deer ${this.id}] Moved to (${this.x}, ${this.y})`);
    }
    
    executeRotateAction(action) {
        // Update visual rotation
        if (action.direction === 'right') {
            this.visualRotation += action.degrees;
            // Update current direction
            const dirOrder = ['N', 'E', 'S', 'W'];
            const currentIdx = dirOrder.indexOf(this.currentDirection);
            this.currentDirection = dirOrder[(currentIdx + action.degrees / 90) % 4];
        } else if (action.direction === 'left') {
            this.visualRotation -= action.degrees;
            // Update current direction
            const dirOrder = ['N', 'E', 'S', 'W'];
            const currentIdx = dirOrder.indexOf(this.currentDirection);
            this.currentDirection = dirOrder[(currentIdx - action.degrees / 90 + 4) % 4];
        }
        
        debug(`[Deer ${this.id}] Rotated ${action.direction} ${action.degrees}° (now facing ${this.currentDirection}, visualRotation: ${this.visualRotation}°)`);
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
        
        // Return to first action
        this.currentActionIndex = this.initialActionIndex;
        
        // Find first move action to get initial position
        const firstMoveAction = this.pathActions.find(action => action.type === 'move');
        if (firstMoveAction) {
            this.setPosition(firstMoveAction.x, firstMoveAction.y);
        }
        
        // Reset direction and rotation to initial state
        if (this.positions.length >= 2) {
            const first = this.positions[0];
            const second = this.positions[1];
            this.currentDirection = this.getDirectionToTile(first, second);
            this.visualRotation = this.directionMap[this.currentDirection];
        } else {
            this.currentDirection = 'N';
            this.visualRotation = 0;
        }
        
        this.lastMoveTime = Date.now();
        
        // Update world tracking
        if (window.world) {
            window.world.moveEntity(this, oldX, oldY, this.x, this.y);
        }
        
        debug(`[Deer ${this.id}] Reset to position (${this.x}, ${this.y}), direction: ${this.currentDirection}`);
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
            currentActionIndex: this.currentActionIndex
        };
    }
    
    static fromData(data) {
        const deer = new Deer(data.id, data.positions);
        if (typeof data.currentActionIndex === 'number') {
            deer.currentActionIndex = data.currentActionIndex;
            // Find the action and update position if it's a move action
            const action = deer.pathActions[deer.currentActionIndex];
            if (action && action.type === 'move') {
                deer.setPosition(action.x, action.y);
            }
        }
        return deer;
    }
}

export default Deer;
