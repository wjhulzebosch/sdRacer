// Cow class for sdRacer
// Cows have two positions and move when honked at

class Cow {
    constructor(defaultX, defaultY, secondaryX, secondaryY) {
        this.defaultX = defaultX;
        this.defaultY = defaultY;
        this.secondaryX = secondaryX;
        this.secondaryY = secondaryY;
        
        // Current position (starts at default)
        this.currentX = defaultX;
        this.currentY = defaultY;

        this.defaultDirection = 0;
        this.secondaryDirection = 0;
        
        // State tracking
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
                // Moving up to default
                this.defaultDirection = 180;
            } else if(defaultDy > 0) {
                // Moving down to default
                this.defaultDirection = 0;
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
    
    // Get current position
    getPosition() {
        return { x: this.currentX, y: this.currentY };
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
        return this.currentX === this.defaultX && this.currentY === this.defaultY;
    }
    
    // Check if a position is occupied by this cow
    isAtPosition(x, y) {
        return this.currentX === x && this.currentY === y;
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
        this.element.style.transform = `translate(${this.currentX * 64}px, ${this.currentY * 64}px) rotate(${shouldRotateTo}deg)`;
    }
    
    // Move cow to secondary position (when honked)
    GetHonked() {
        console.log('COW: GetHonked called for cow at position:', { x: this.currentX, y: this.currentY });
        
        if (this.isMoving) {
            console.log('COW: Cow is already moving, ignoring honk');
            return; // Prevent multiple simultaneous moves
        }
        
        console.log('COW: Setting cow to moving state');
        this.isMoving = true;
        
        // Play cow sound if available
        if (typeof soundController !== 'undefined') {
            console.log('COW: Playing cow sound');
            soundController.playCow();
        }
                    
        if (this.isAtDefaultPosition()) {
            // If at primary, move to secondary
            console.log('COW: Moving from primary to secondary position:', { x: this.targetX, y: this.targetY });
        } else {
            // If at secondary, move to primary
            console.log('COW: Moving from secondary to primary position:', { x: this.targetX, y: this.targetY });
        }
        
        // Animate movement over 1 second (with correct rotation)
        if (this.element) {
            // Determine which direction to face based on target
            let targetDirection;
            if (this.targetX === this.defaultX && this.targetY === this.defaultY) {
                // Moving to default position
                targetDirection = this.defaultDirection;
            } else {
                // Moving to secondary position
                targetDirection = this.secondaryDirection;
            }
            
            this.element.style.transition = 'transform 1s ease-in-out';
            this.element.style.transform = `translate(${this.targetX * 64}px, ${this.targetY * 64}px) rotate(${targetDirection}deg)`;
        }
        
        // Update position immediately for collision detection
        this.switchTarget();

        // Movement is complete after 1 second
        setTimeout(() => {
            console.log('COW: Movement completed, allowing movement again');
            this.isMoving = false;
        }, 1000);
        setTimeout(() => {
            this.fixVisualRotationAfterMovement();
        }, 1000);
        
        console.log('COW: GetHonked method completed');
    }
    
    // Update the visual position of the cow element (with rotation)
    updateVisualPosition() {
        console.log('COW: updateVisualPosition called');
        console.log('COW: Current position:', { x: this.currentX, y: this.currentY });
        console.log('COW: Element exists:', !!this.element);
        console.log('COW: Parent element exists:', !!(this.element && this.element.parentElement));
        
        if (this.element && this.element.parentElement) {
            const tileSize = 64; // Use the same tile size as the game
            const x = this.currentX * tileSize;
            const y = this.currentY * tileSize;
            
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
            console.log('COW: Transform applied with rotation:', this.element.style.transform);
        } else {
            console.log('COW: Cannot update position - element or parent missing');
        }
    }
    
    // Add cow to the game grid
    addToGrid(gridContainer) {
        if (gridContainer && this.element) {
            gridContainer.appendChild(this.element);
            this.updateVisualPosition();
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
        const distance = Math.abs(carX - this.currentX) + Math.abs(carY - this.currentY);
        return distance <= honkDistance;
    }
    
    // Reset cow to default state
    reset() {
        this.currentX = this.defaultX;
        this.currentY = this.defaultY;
        this.isAtDefault = true;
        this.isMoving = false;
        this.updateVisualPosition();
    }
    
    // Get cow data for saving/loading
    getData() {
        return {
            defaultX: this.defaultX,
            defaultY: this.defaultY,
            secondaryX: this.secondaryX,
            secondaryY: this.secondaryY,
            currentX: this.currentX,
            currentY: this.currentY,
            isAtDefault: this.isAtDefault
        };
    }
    
    // Create cow from data
    static fromData(data) {
        const cow = new Cow(data.defaultX, data.defaultY, data.secondaryX, data.secondaryY);
        cow.currentX = data.currentX;
        cow.currentY = data.currentY;
        cow.isAtDefault = data.isAtDefault;
        return cow;
    }
} 