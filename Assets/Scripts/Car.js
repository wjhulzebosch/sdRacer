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
        // Check if new position is a road
        const tile = level.getTile(newX, newY);
        if (!tile || tile === '0000') {
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
        // Check if new position is a road
        const tile = level.getTile(newX, newY);
        if (!tile || tile === '0000') {
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
        const tile = level.getTile(newX, newY);
        // Return true if the tile exists and is not '0000' (grass)
        return !!(tile && tile !== '0000');
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