import Entity from './Entity.js';

class Car extends Entity {
    constructor(id, x, y, direction = 'N', carType = 'default') {
        super(id, 'car', x, y);
        this.direction = direction;
        this.carType = carType;
        this.crashed = false;
        this.visualRotation = 0;
        this.directions = ['N', 'E', 'S', 'W'];
        
        // Store initial state for reset
        this.initialX = x;
        this.initialY = y;
        this.initialDirection = direction;
    }
    
    // Reset car to initial state
    reset() {
        this.setPosition(this.initialX, this.initialY);
        this.direction = this.initialDirection;
        this.crashed = false;
        this.visualRotation = 0;
    }
    
    isCowAhead(world) {
        const aheadPos = this.getPositionAhead();
        const entities = world.getEntitiesAt(aheadPos.x, aheadPos.y);
        return entities.some(entity => entity.type === 'cow');
    }
    
    isRoadAhead(world) {
        const aheadPos = this.getPositionAhead();
        return this.isRoadConnected(world, aheadPos.x, aheadPos.y);
    }
    
    isRoadConnected(world, targetX, targetY) {
        const currentTile = world.getTile(this.x, this.y);
        const targetTile = world.getTile(targetX, targetY);
        
        if (!currentTile || !targetTile || !currentTile.isRoad() || !targetTile.isRoad()) {
            return false;
        }
        
        // Determine the direction from current to target
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        
        // Check if the movement direction is valid (orthogonal only)
        if (Math.abs(dx) + Math.abs(dy) !== 1) {
            return false;
        }
        
        // Determine which direction we're moving
        let currentDirection, targetDirection;
        if (dx === 1) { // Moving East
            currentDirection = 1; // East
            targetDirection = 3;  // West
        } else if (dx === -1) { // Moving West
            currentDirection = 3; // West
            targetDirection = 1;  // East
        } else if (dy === 1) { // Moving South
            currentDirection = 2; // South
            targetDirection = 0;  // North
        } else if (dy === -1) { // Moving North
            currentDirection = 0; // North
            targetDirection = 2;  // South
        } else {
            return false;
        }
        
        return currentTile.isConnectedTo(targetTile, currentDirection);
    }
    
    getPositionAhead() {
        const { x, y } = this.getPosition();
        switch (this.direction) {
            case 'N': return { x, y: y - 1 };
            case 'E': return { x: x + 1, y };
            case 'S': return { x, y: y + 1 };
            case 'W': return { x: x - 1, y };
        }
    }
    
    moveForward(world) {
        const newPos = this.getPositionAhead();
        const currentPos = this.getPosition();
        
        // Check if movement is valid
        if (this.canMoveTo(world, newPos.x, newPos.y)) {
            world.moveEntity(this, currentPos.x, currentPos.y, newPos.x, newPos.y);
            this.setPosition(newPos.x, newPos.y);
            return true;
        }
        return false;
    }
    
    moveBackward(world) {
        const newPos = this.getPositionBehind();
        const currentPos = this.getPosition();
        
        // Check if movement is valid
        if (this.canMoveTo(world, newPos.x, newPos.y)) {
            world.moveEntity(this, currentPos.x, currentPos.y, newPos.x, newPos.y);
            this.setPosition(newPos.x, newPos.y);
            return true;
        }
        return false;
    }
    
    getPositionBehind() {
        const { x, y } = this.getPosition();
        switch (this.direction) {
            case 'N': return { x, y: y + 1 };
            case 'E': return { x: x - 1, y };
            case 'S': return { x, y: y - 1 };
            case 'W': return { x: x + 1, y };
        }
    }
    
    canMoveTo(world, x, y) {
        // Check if roads are connected
        if (!this.isRoadConnected(world, x, y)) {
            this.crash(); // Car crashes when trying to move to unconnected road
            return false;
        }
        
        // Check for cow collision
        const entities = world.getEntitiesAt(x, y);
        if (entities.some(entity => entity.type === 'cow')) {
            this.crash(); // Car crashes when hitting cow
            return false;
        }
        
        return true;
    }
    
    turnRight() {
        let idx = this.directions.indexOf(this.direction);
        idx = (idx + 1) % 4;
        this.direction = this.directions[idx];
        this.visualRotation += 90;
    }
    
    turnLeft() {
        let idx = this.directions.indexOf(this.direction);
        idx = (idx - 1 + 4) % 4;
        this.direction = this.directions[idx];
        this.visualRotation -= 90;
    }
    
    crash() {
        this.crashed = true;
    }
    
    isSafeToMove(world) {
        const aheadPos = this.getPositionAhead();
        
        // Check if roads are connected
        if (!this.isRoadConnected(world, aheadPos.x, aheadPos.y)) {
            return false;
        }
        
        // Check if new position has a cow
        const entities = world.getEntitiesAt(aheadPos.x, aheadPos.y);
        if (entities.some(entity => entity.type === 'cow')) {
            return false;
        }
        
        return true;
    }
    
    // Render method for compatibility
    render(gameDiv, tileSize = 64) {
        // Find or create the car div
        let carDiv = gameDiv.querySelector(`.car-${this.carType}`);
        if (!carDiv) {
            carDiv = document.createElement('div');
            carDiv.className = `car car-${this.carType}`;
            carDiv.style.width = tileSize + 'px';
            carDiv.style.height = tileSize + 'px';
            gameDiv.appendChild(carDiv);
        }
        
        carDiv.style.left = (this.x * tileSize) + 'px';
        carDiv.style.top = (this.y * tileSize) + 'px';
        
        // Set texture based on car type
        let texturePath = 'Assets/Textures/Car.png'; // default
        if (this.crashed) {
            texturePath = 'Assets/Textures/Wreck.png';
        } else {
            switch (this.carType) {
                case 'red':
                    texturePath = 'Assets/Textures/RedCar.png';
                    break;
                case 'blue':
                    texturePath = 'Assets/Textures/BlueCar.png';
                    break;
                case 'green':
                    texturePath = 'Assets/Textures/GreenCar.png';
                    break;
                case 'yellow':
                    texturePath = 'Assets/Textures/YellowCar.png';
                    break;
                default:
                    texturePath = 'Assets/Textures/Car.png';
            }
        }
        
        carDiv.style.backgroundImage = `url('${texturePath}')`;
        carDiv.style.transform = `rotate(${this.visualRotation}deg)`;
    }
}

export default Car; 