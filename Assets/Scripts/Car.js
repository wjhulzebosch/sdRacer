class Car {
    constructor({ position = { x: 0, y: 0 }, direction = 'N' } = {}) {
        this.currentPosition = { ...position };
        this.direction = direction; // 'N', 'E', 'S', 'W'
        this.directions = ['N', 'E', 'S', 'W'];
        this.crashed = false;
    }

    // Move the car forward by 1 tile
    MoveForward() {
        switch (this.direction) {
            case 'N': this.currentPosition.y -= 1; break;
            case 'E': this.currentPosition.x += 1; break;
            case 'S': this.currentPosition.y += 1; break;
            case 'W': this.currentPosition.x -= 1; break;
        }
    }

    // Move the car backward by 1 tile
    MoveBackward() {
        switch (this.direction) {
            case 'N': this.currentPosition.y += 1; break;
            case 'E': this.currentPosition.x -= 1; break;
            case 'S': this.currentPosition.y -= 1; break;
            case 'W': this.currentPosition.x += 1; break;
        }
    }

    // Rotate the car by degree (must be multiple of 90)
    rotate(degree, gameDiv, tileSize = 64) {
        if (typeof degree !== 'number' || degree % 90 !== 0) return;
        const steps = ((degree / 90) % 4 + 4) % 4; // normalize to 0-3
        let idx = this.directions.indexOf(this.direction);
        idx = (idx + steps) % 4;
        this.direction = this.directions[idx];
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
            carDiv.style.position = 'absolute';
            carDiv.style.width = tileSize + 'px';
            carDiv.style.height = tileSize + 'px';
            carDiv.style.backgroundSize = 'cover';
            carDiv.style.pointerEvents = 'none';
            parent.appendChild(carDiv);
        }
        carDiv.style.left = (this.currentPosition.x * tileSize) + 'px';
        carDiv.style.top = (this.currentPosition.y * tileSize) + 'px';
        carDiv.style.backgroundImage = this.crashed ? "url('Assets/Textures/wreck.png')" : "url('Assets/Textures/Car.png')";
        // Rotate the car visually
        let rotation = 0;
        switch (this.direction) {
            case 'N': rotation = 0; break;
            case 'E': rotation = 90; break;
            case 'S': rotation = 180; break;
            case 'W': rotation = 270; break;
        }
        carDiv.style.transform = `rotate(${rotation}deg)`;
    }

    // Check if the car can move forward (is there a road ahead?)
    canMove(level) {
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
} 