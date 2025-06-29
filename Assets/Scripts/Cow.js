import Entity from './Entity.js';

class Cow extends Entity {
    constructor(id, defaultX, defaultY, secondaryX, secondaryY) {
        if (typeof id !== 'string') {
            throw new Error('CRITICAL: Cow constructor: id must be string, got: ' + typeof id);
        }
        if (typeof defaultX !== 'number') {
            throw new Error('CRITICAL: Cow constructor: defaultX must be number, got: ' + typeof defaultX);
        }
        if (typeof defaultY !== 'number') {
            throw new Error('CRITICAL: Cow constructor: defaultY must be number, got: ' + typeof defaultY);
        }
        if (typeof secondaryX !== 'number') {
            throw new Error('CRITICAL: Cow constructor: secondaryX must be number, got: ' + typeof secondaryX);
        }
        if (typeof secondaryY !== 'number') {
            throw new Error('CRITICAL: Cow constructor: secondaryY must be number, got: ' + typeof secondaryY);
        }
        
        super(id, 'cow', defaultX, defaultY);
        this.defaultX = defaultX;
        this.defaultY = defaultY;
        this.secondaryX = secondaryX;
        this.secondaryY = secondaryY;
        this.isMoving = false;
        this.moveAnimation = null;
        
        // Visual properties
        this.width = 1; // Grid units
        this.height = 1; // Grid units
        
        // Initialize the cow's visual representation
        this.element = this.createCowElement();

        this.targetX = this.secondaryX;
        this.targetY = this.secondaryY;
        
        // Calculate initial rotation and directions
        this.calculateRotation();
    }
    
    // Create the visual element for the cow
    createCowElement() {
        const cowElement = document.createElement('div');
        cowElement.className = 'cow';
        return cowElement;
    }

    calculateRotation() {
        // Calculate default direction (direction cow faces when moving to default position)
        const defaultDx = this.defaultX - this.secondaryX;
        const defaultDy = this.defaultY - this.secondaryY;
        
        if(defaultDx === 0) {
            // Moving vertically to default
            if(defaultDy < 0) {
                // Moving up to default (north)
                this.defaultDirection = 0; // Face north (up)
            } else if(defaultDy > 0) {
                // Moving down to default (south)
                this.defaultDirection = 180; // Face south (down)
            }
        } else if(defaultDy === 0) {
            // Moving horizontally to default
            if(defaultDx > 0) {
                // Moving left to default
                this.defaultDirection = 90;
            } else if(defaultDx < 0) {
                // Moving right to default
                this.defaultDirection = 270;
            }
        }
        
        // Calculate secondary direction (opposite of default)
        this.secondaryDirection = (this.defaultDirection + 180) % 360;
    }
    
    switchTarget() {
        let tempX = this.targetX;
        let tempY = this.targetY;
        this.targetX = this.currentX;
        this.targetY = this.currentY;
        this.currentX = tempX;
        this.currentY = tempY;
    }
    
    // Get default position
    getDefaultPosition() {
        return { x: this.defaultX, y: this.defaultY };
    }
    
    // Get secondary position
    getSecondaryPosition() {
        return { x: this.secondaryX, y: this.secondaryY };
    }
    
    // Check if cow is at default position
    isAtDefaultPosition() {
        return this.x === this.defaultX && this.y === this.defaultY;
    }
    
    // Check if cow blocks movement at given position
    blocksMovement(x, y) {
        return this.isAtPosition(x, y);
    }
    
    // Fix the visual direction of the cow with CSS animation
    fixVisualRotationAfterMovement() {
        let shouldRotateTo;
        if(this.isAtDefaultPosition()) {
            shouldRotateTo = this.secondaryDirection;
        } else {
            shouldRotateTo = this.defaultDirection;
        }   
        this.element.style.transform = `translate(${this.x * 64}px, ${this.y * 64}px) rotate(${shouldRotateTo}deg)`;
    }
    
    // Move cow to secondary position (when honked)
    getHonked(world) {
        if (this.isMoving) {
            return; // Prevent multiple simultaneous moves
        }

        this.isMoving = true;
        
        // Play cow sound if available
        if (typeof soundController !== 'undefined') {
            soundController.playCow();
        }

        // Update position immediately for collision detection
        const currentPos = this.getPosition();
        const targetPos = this.isAtDefaultPosition() 
            ? { x: this.secondaryX, y: this.secondaryY }
            : { x: this.defaultX, y: this.defaultY };
            
        world.moveEntity(this, currentPos.x, currentPos.y, targetPos.x, targetPos.y);
        this.setPosition(targetPos.x, targetPos.y);

        // Force immediate render to show movement
        window.world.render(document.getElementById('game'));

        // Movement is complete after a short delay
        setTimeout(() => {
            this.isMoving = false;
        }, 1000);
        
        // Fix rotation after movement completes
        setTimeout(() => {
            this.fixVisualRotationAfterMovement();
        }, 1000);
    }
    
    // Update the visual position of the cow element (with rotation)
    updateVisualPosition() {
        if (this.element && this.element.parentElement) {
            const tileSize = 64; // Use the same tile size as the game
            const x = this.x * tileSize;
            const y = this.y * tileSize;
            
            // Determine which direction to face based on current target
            let targetDirection;
            if (this.targetX === this.defaultX && this.targetY === this.defaultY) {
                // Moving to default position
                targetDirection = this.defaultDirection;
            } else {
                // Moving to secondary position
                targetDirection = this.secondaryDirection;
            }
            
            this.element.style.transition = 'none'; // Disable transitions during movement
            this.element.style.transform = `translate(${x}px, ${y}px) rotate(${targetDirection}deg)`;
        }
    }
    
    // Add cow to the game grid
    addToGrid(gridContainer) {
        if (gridContainer && this.element) {
            gridContainer.appendChild(this.element);
            this.updateVisualPosition();
        }
    }
    
    // Render method for compatibility
    render(gameDiv, tileSize = 64) {
        // Find or create the cow div
        let cowDiv = gameDiv.querySelector(`.cow-${this.id}`);
        if (!cowDiv) {
            cowDiv = document.createElement('div');
            cowDiv.className = `cow cow-${this.id}`;
            cowDiv.style.width = tileSize + 'px';
            cowDiv.style.height = tileSize + 'px';
            cowDiv.style.backgroundImage = 'url("Assets/Textures/Cow.png")';
            cowDiv.style.backgroundSize = 'contain';
            cowDiv.style.position = 'absolute';
            cowDiv.style.transition = 'left 1s ease, top 1s ease, transform 1s ease';
            cowDiv.style.zIndex = '2';
            gameDiv.appendChild(cowDiv);
        }
        
        // Update position and rotation (preserves smooth transitions)
        cowDiv.style.left = (this.x * tileSize) + 'px';
        cowDiv.style.top = (this.y * tileSize) + 'px';
        
        // Only update rotation if not moving (keep current rotation during movement)
        if (!this.isMoving) {
            let rotation = 0;
            if (this.isAtDefaultPosition()) {
                rotation = this.secondaryDirection;
            } else {
                rotation = this.defaultDirection;
            }
            cowDiv.style.transform = `rotate(${rotation}deg)`;
        }
    }
    
    // Remove cow from the game grid
    removeFromGrid() {
        if (this.element && this.element.parentElement) {
            this.element.parentElement.removeChild(this.element);
        }
    }
    
    // Check if a car is close enough to honk at the cow
    isCarClose(carX, carY, honkDistance = 2) {
        const distance = Math.abs(carX - this.x) + Math.abs(carY - this.y);
        return distance <= honkDistance;
    }
    
    // Reset cow to default state
    reset() {
        const oldX = this.x;
        const oldY = this.y;
        
        this.setPosition(this.defaultX, this.defaultY);
        this.targetX = this.secondaryX;
        this.targetY = this.secondaryY;
        this.isMoving = false;
        
        // Update World's entity tracking if world exists
        if (window.world) {
            window.world.moveEntity(this, oldX, oldY, this.defaultX, this.defaultY);
        }
        
        this.updateVisualPosition();
    }
    
    // Get cow data for saving/loading
    getData() {
        return {
            defaultX: this.defaultX,
            defaultY: this.defaultY,
            secondaryX: this.secondaryX,
            secondaryY: this.secondaryY,
            currentX: this.x,
            currentY: this.y,
            isAtDefault: this.isAtDefaultPosition()
        };
    }
    
    // Create cow from data
    static fromData(data) {
        const cow = new Cow(data.defaultX, data.defaultY, data.secondaryX, data.secondaryY);
        cow.setPosition(data.currentX, data.currentY);
        return cow;
    }
    
    // Legacy compatibility methods
    get currentX() {
        return this.x;
    }
    
    set currentX(x) {
        this.x = x;
    }
    
    get currentY() {
        return this.y;
    }
    
    set currentY(y) {
        this.y = y;
    }
    
    GetHonked(world) {
        this.getHonked(world);
    }
}

export default Cow; 