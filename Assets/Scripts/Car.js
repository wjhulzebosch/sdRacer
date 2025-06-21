class Car {
    constructor({ position = { x: 0, y: 0 }, direction = 'N' } = {}) {
        this.currentPosition = { ...position };
        this.direction = direction; // 'N', 'E', 'S', 'W'
        this.directions = ['N', 'E', 'S', 'W'];
        this.crashed = false;
        this.visualRotation = 0; // Track visual rotation separately
    }

    // Move the car forward by 1 tile
    moveForward() {
        switch (this.direction) {
            case 'N': this.currentPosition.y -= 1; break;
            case 'E': this.currentPosition.x += 1; break;
            case 'S': this.currentPosition.y += 1; break;
            case 'W': this.currentPosition.x -= 1; break;
        }
    }

    // Move the car backward by 1 tile
    moveBackward() {
        switch (this.direction) {
            case 'N': this.currentPosition.y += 1; break;
            case 'E': this.currentPosition.x -= 1; break;
            case 'S': this.currentPosition.y -= 1; break;
            case 'W': this.currentPosition.x += 1; break;
        }
    }

    // Turn the car right by 90 degrees
    turnRight(gameDiv, tileSize = 64) {
        let idx = this.directions.indexOf(this.direction);
        idx = (idx + 1) % 4;
        this.direction = this.directions[idx];
        this.visualRotation += 90; // Increment visual rotation by 90 degrees
        this.render(gameDiv, tileSize);
    }

    // Turn the car left by 90 degrees
    turnLeft(gameDiv, tileSize = 64) {
        let idx = this.directions.indexOf(this.direction);
        idx = (idx - 1 + 4) % 4;
        this.direction = this.directions[idx];
        this.visualRotation -= 90; // Decrement visual rotation by 90 degrees
        this.render(gameDiv, tileSize);
    }

    crash(gameDiv, tileSize = 64) {
        this.crashed = true;
        this.render(gameDiv, tileSize);
    }

    moveForward(level, gameDiv, tileSize = 64) {
        // Calculate new position
        let newX = this.currentPosition.x;
        let newY = this.currentPosition.y;
        switch (this.direction) {
            case 'N': newY -= 1; break;
            case 'E': newX += 1; break;
            case 'S': newY += 1; break;
            case 'W': newX -= 1; break;
        }
        
        // Check if new position is connected to current road
        if (!this.isRoadConnected(level, newX, newY)) {
            this.currentPosition = { x: newX, y: newY };
            this.crash(gameDiv, tileSize);
            return;
        }
        
        // Check if new position has a cow
        const globalCows = window.cows || [];
        const cowAtPosition = globalCows.find(cow => cow.isAtPosition(newX, newY));
        if (cowAtPosition) {
            this.currentPosition = { x: newX, y: newY };
            this.crash(gameDiv, tileSize);
            return;
        }
        
        this.currentPosition = { x: newX, y: newY };
        this.render(gameDiv, tileSize);
    }

    moveBackward(level, gameDiv, tileSize = 64) {
        // Calculate new position
        let newX = this.currentPosition.x;
        let newY = this.currentPosition.y;
        switch (this.direction) {
            case 'N': newY += 1; break;
            case 'E': newX -= 1; break;
            case 'S': newY -= 1; break;
            case 'W': newX += 1; break;
        }
        
        // Check if new position is connected to current road
        if (!this.isRoadConnected(level, newX, newY)) {
            this.currentPosition = { x: newX, y: newY };
            this.crash(gameDiv, tileSize);
            return;
        }
        
        // Check if new position has a cow
        const globalCows = window.cows || [];
        const cowAtPosition = globalCows.find(cow => cow.isAtPosition(newX, newY));
        if (cowAtPosition) {
            this.currentPosition = { x: newX, y: newY };
            this.crash(gameDiv, tileSize);
            return;
        }
        
        this.currentPosition = { x: newX, y: newY };
        this.render(gameDiv, tileSize);
    }

    // Render the car as a 64x64 div at its current position
    render(parent, tileSize = 64) {
        // Find or create the car div
        let carDiv = parent.querySelector('.car');
        if (!carDiv) {
            carDiv = document.createElement('div');
            carDiv.className = 'car';
            carDiv.style.width = tileSize + 'px';
            carDiv.style.height = tileSize + 'px';
            parent.appendChild(carDiv);
        }
        carDiv.style.left = (this.currentPosition.x * tileSize) + 'px';
        carDiv.style.top = (this.currentPosition.y * tileSize) + 'px';
        carDiv.style.backgroundImage = this.crashed ? "url('Assets/Textures/wreck.png')" : "url('Assets/Textures/Car.png')";
        // Use the visual rotation value directly
        carDiv.style.transform = `rotate(${this.visualRotation}deg)`;
    }

    // Check if there is a road ahead (ignores cows)
    isRoadAhead(level) {
        let newX = this.currentPosition.x;
        let newY = this.currentPosition.y;
        switch (this.direction) {
            case 'N': newY -= 1; break;
            case 'E': newX += 1; break;
            case 'S': newY += 1; break;
            case 'W': newX -= 1; break;
        }
        
        // First check if the tile exists and is not grass
        const tile = level.getTile(newX, newY);
        if (!tile || tile === '0000') {
            return false;
        }
        
        // Now check if the road is actually connected
        return this.isRoadConnected(level, newX, newY);
    }
    
    // Check if a road tile is connected to the current road network
    isRoadConnected(level, targetX, targetY) {
        const currentTile = level.getTile(this.currentPosition.x, this.currentPosition.y);
        const targetTile = level.getTile(targetX, targetY);
        
        if (!currentTile || !targetTile || currentTile === '0000' || targetTile === '0000') {
            return false;
        }
        
        // Determine the direction from current to target
        const dx = targetX - this.currentPosition.x;
        const dy = targetY - this.currentPosition.y;
        
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
        
        // Check if both tiles have connections in the right directions
        const currentConnections = currentTile.split('').map(Number);
        const targetConnections = targetTile.split('').map(Number);
        
        return currentConnections[currentDirection] === 1 && targetConnections[targetDirection] === 1;
    }

    // Check if it's safe to move forward (road exists AND no cow blocking)
    isSafeToMove(level) {
        let newX = this.currentPosition.x;
        let newY = this.currentPosition.y;
        switch (this.direction) {
            case 'N': newY -= 1; break;
            case 'E': newX += 1; break;
            case 'S': newY += 1; break;
            case 'W': newX -= 1; break;
        }
        const tile = level.getTile(newX, newY);
        // Return false if the tile doesn't exist or is grass
        if (!tile || tile === '0000') {
            return false;
        }
        
        // Check if new position has a cow
        const globalCows = window.cows || [];
        const cowAtPosition = globalCows.find(cow => cow.isAtPosition(newX, newY));
        if (cowAtPosition) {
            return false;
        }
        
        // Return true if the tile exists, is not grass, and has no cow
        return true;
    }

    // Check if there is a cow ahead (ignores roads)
    isCowAhead() {
        let newX = this.currentPosition.x;
        let newY = this.currentPosition.y;
        switch (this.direction) {
            case 'N': newY -= 1; break;
            case 'E': newX += 1; break;
            case 'S': newY += 1; break;
            case 'W': newX -= 1; break;
        }
        
        // Check if new position has a cow
        const globalCows = window.cows || [];
        const cowAtPosition = globalCows.find(cow => cow.isAtPosition(newX, newY));
        return !!cowAtPosition;
    }
} 