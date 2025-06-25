import { debug } from './commonFunctions.js';
import Entity from './Entity.js';

class Car extends Entity {
    constructor(id, x, y, direction = 'N', carType = 'default') {
        if (typeof id !== 'string') {
            throw new Error('CRITICAL: Car constructor: id must be string, got: ' + typeof id);
        }
        if (typeof x !== 'number') {
            throw new Error('CRITICAL: Car constructor: x must be number, got: ' + typeof x);
        }
        if (typeof y !== 'number') {
            throw new Error('CRITICAL: Car constructor: y must be number, got: ' + typeof y);
        }
        if (typeof direction !== 'string') {
            throw new Error('CRITICAL: Car constructor: direction must be string, got: ' + typeof direction);
        }
        if (typeof carType !== 'string') {
            throw new Error('CRITICAL: Car constructor: carType must be string, got: ' + typeof carType);
        }
        
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
        const oldX = this.x;
        const oldY = this.y;
        
        this.setPosition(this.initialX, this.initialY);
        this.direction = this.initialDirection;
        this.crashed = false;
        this.visualRotation = 0;
        
        // Update World's entity tracking if world exists
        if (window.world) {
            window.world.moveEntity(this, oldX, oldY, this.initialX, this.initialY);
        }
        
        // Immediately update visual position without transitions
        const gameDiv = document.getElementById('game');
        if (gameDiv) {
            const carDiv = gameDiv.querySelector(`.car-${this.carType}`);
            if (carDiv) {
                carDiv.style.transition = 'none';
                carDiv.style.left = (this.x * 64) + 'px';
                carDiv.style.top = (this.y * 64) + 'px';
                carDiv.style.transform = `rotate(${this.visualRotation}deg)`;
                // Re-enable transitions after instant positioning
                setTimeout(() => {
                    carDiv.style.transition = 'left 1s linear, top 1s linear, transform 1s linear';
                }, 0);
            }
        }
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

        let dirIndex = -1;
        if (dx === 1 && dy === 0) dirIndex = 1; // East
        else if (dx === -1 && dy === 0) dirIndex = 3; // West
        else if (dx === 0 && dy === 1) dirIndex = 2; // South
        else if (dx === 0 && dy === -1) dirIndex = 0; // North
        else return false;

        return currentTile.roadType[dirIndex] === '1';
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
        if (!world) {
            throw new Error('CRITICAL: moveForward called with null/undefined world');
        }
        
        const newPos = this.getPositionAhead();
        if (!newPos || typeof newPos.x !== 'number' || typeof newPos.y !== 'number') {
            throw new Error('CRITICAL: getPositionAhead returned invalid position: ' + JSON.stringify(newPos));
        }
        
        const currentPos = this.getPosition();
        if (!currentPos || typeof currentPos.x !== 'number' || typeof currentPos.y !== 'number') {
            throw new Error('CRITICAL: getPosition returned invalid position: ' + JSON.stringify(currentPos));
        }
        
        // Check if movement is valid
        if (this.canMoveTo(world, newPos.x, newPos.y)) {
            world.moveEntity(this, currentPos.x, currentPos.y, newPos.x, newPos.y);
            this.setPosition(newPos.x, newPos.y);
            return true;
        }

        world.moveEntity(this, currentPos.x, currentPos.y, newPos.x, newPos.y);
        this.setPosition(newPos.x, newPos.y);
        return false;
    }
    
    moveBackward(world) {
        if (!world) {
            throw new Error('CRITICAL: moveBackward called with null/undefined world');
        }
        
        const newPos = this.getPositionBehind();
        if (!newPos || typeof newPos.x !== 'number' || typeof newPos.y !== 'number') {
            throw new Error('CRITICAL: getPositionBehind returned invalid position: ' + JSON.stringify(newPos));
        }
        
        const currentPos = this.getPosition();
        if (!currentPos || typeof currentPos.x !== 'number' || typeof currentPos.y !== 'number') {
            throw new Error('CRITICAL: getPosition returned invalid position: ' + JSON.stringify(currentPos));
        }
        
        // Check if movement is valid
        if (this.canMoveTo(world, newPos.x, newPos.y)) {
            world.moveEntity(this, currentPos.x, currentPos.y, newPos.x, newPos.y);
            this.setPosition(newPos.x, newPos.y);
            return true;
        }

        world.moveEntity(this, currentPos.x, currentPos.y, newPos.x, newPos.y);
        this.setPosition(newPos.x, newPos.y);

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
            debug(`[canMoveTo] CRASH: Roads not connected to (${x}, ${y})`);
            this.crash(); // Car crashes when trying to move to unconnected road
            return false;
        }
        
        // Check for cow collision
        const entities = world.getEntitiesAt(x, y);
        if (entities.some(entity => entity.type === 'cow')) {
            debug(`[canMoveTo] CRASH: Cow at position (${x}, ${y})`);
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
        debug(`[crash] Car ${this.carType} is crashing!`);
        this.crashed = true;
        debug(`[crash] Car crashed property is now: ${this.crashed}`);
        
        // Force a render to show the wreck image immediately
        const gameDiv = document.getElementById('game');
        if (gameDiv) {
            debug(`[crash] Forcing render after crash`);
            this.render(gameDiv);
        } else {
            debug(`[crash] gameDiv not found!`);
        }
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
            carDiv.style.position = 'absolute';
            carDiv.style.transition = 'left 1s linear, top 1s linear, transform 1s linear';
            carDiv.style.zIndex = '2';
            gameDiv.appendChild(carDiv);
        }
        
        // Update position and rotation (preserves smooth transitions)
        carDiv.style.left = (this.x * tileSize) + 'px';
        carDiv.style.top = (this.y * tileSize) + 'px';
        carDiv.style.transform = `rotate(${this.visualRotation}deg)`;
        
        // Set texture based on car type
        let texturePath = 'Assets/Textures/Car.png'; // default
        if (this.crashed) {
            texturePath = 'Assets/Textures/Wreck.png';
            debug(`[render] Car ${this.carType} is crashed, using wreck texture: ${texturePath}`);
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
            debug(`[render] Car ${this.carType} is not crashed, using texture: ${texturePath}`);
        }
        
        debug(`[render] Setting background image to: ${texturePath}`);
        carDiv.style.backgroundImage = `url('${texturePath}')`;
        carDiv.style.backgroundSize = 'contain';
    }
    
    // Get direction to finish using GPS - returns degrees
    getDirectionToFinish() {
        debug("IN CAR.JS getDirectionToFinish, window.world is:", window.world);
        const world = window.world;

        debug("IN CAR.JS getDirectionToFinish");
        if (!world || !world.gps) {
            debug('[Car] GPS not available for direction to finish');
            return null;
        }
        
        // Find finish entity
        const finishes = world.getEntitiesOfType('finish');
        if (finishes.length === 0) {
            debug('[Car] No finish found in world');
            return null;
        }
        
        const finish = finishes[0]; // Use first finish
        const currentPos = { x: this.x, y: this.y };
        const finishPos = { x: finish.x, y: finish.y };
        
        // Get direction string from GPS
        const directionString = world.gps.getDirection(currentPos, finishPos);
        
        if (!directionString) {
            debug('[Car] No path to finish found');
            return null;
        }
        
        // Convert direction string to degrees
        const directionToDegrees = {
            'North': 0,
            'East': 90,
            'South': 180,
            'West': 270
        };
        
        const degrees = directionToDegrees[directionString];
        debug(`[Car] Direction to finish: ${directionString} (${degrees}°)`);
        
        return degrees;
    }
    
    // Get current direction as degrees
    getCurrentDirection() {
        const directionToDegrees = {
            'N': 0,    // North
            'E': 90,   // East
            'S': 180,  // South
            'W': 270   // West
        };
        
        const degrees = directionToDegrees[this.direction];
        debug(`[Car] Current direction: ${this.direction} (${degrees}°)`);
        
        return degrees;
    }
}

debug("Car.js loaded, window.world is:", window.world);
export default Car; 