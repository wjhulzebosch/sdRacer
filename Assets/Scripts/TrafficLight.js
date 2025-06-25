import Entity from './Entity.js';

class TrafficLight extends Entity {
    constructor(id, x, y) {
        if (typeof id !== 'string') {
            throw new Error('CRITICAL: TrafficLight constructor: id must be string, got: ' + typeof id);
        }
        if (typeof x !== 'number') {
            throw new Error('CRITICAL: TrafficLight constructor: x must be number, got: ' + typeof x);
        }
        if (typeof y !== 'number') {
            throw new Error('CRITICAL: TrafficLight constructor: y must be number, got: ' + typeof y);
        }
        
        super(id, 'trafficlight', x, y);
        
        // Traffic light state
        this.connections = []; // Array of connection directions (0=N, 1=E, 2=S, 3=W)
        this.currentGreenConnection = 0; // Index of current green connection
        this.lastSwitchTime = Date.now();
        this.switchInterval = 2000; // 2 seconds per connection
        this.isInDelay = false; // Track if we're in the delay period
        
        // Visual elements for each connection
        this.lightElements = new Map(); // direction -> DOM element
        
        // Initialize the traffic light
        this.initialize();
    }
    
    initialize() {
        // Start the traffic light cycle
        this.startCycle();
        
        // Try to update connections if world is available
        this.updateConnectionsFromWorld();
    }
    
    updateConnectionsFromWorld() {
        // Get the tile at this position to determine connections
        if (window.world) {
            const tile = window.world.getTile(this.x, this.y);
            if (tile && tile.isRoad()) {
                this.updateConnections(tile);
            }
        }
    }
    
    updateConnections(tile) {
        this.connections = [];
        const roadType = tile.getRoadType();
        
        // Check each direction for connections (0=N, 1=E, 2=S, 3=W)
        for (let i = 0; i < 4; i++) {
            if (roadType[i] === '1') {
                this.connections.push(i);
            }
        }
        
        // Create visual elements for each connection
        this.createLightElements();
    }
    
    createLightElements() {
        // Clear existing elements
        this.lightElements.clear();
        
        // Create a light element for each connection
        this.connections.forEach(direction => {
            const lightElement = this.createLightElement(direction);
            this.lightElements.set(direction, lightElement);
        });
    }
    
    createLightElement(direction) {
        const lightElement = document.createElement('div');
        lightElement.className = 'traffic-light-indicator';
        lightElement.style.position = 'absolute';
        lightElement.style.width = '12px';
        lightElement.style.height = '12px';
        lightElement.style.borderRadius = '50%';
        lightElement.style.border = '2px solid #333';
        lightElement.style.zIndex = '10';
        
        // Position the light based on direction - moved slightly outward
        // 0=N (top), 1=E (right), 2=S (bottom), 3=W (left)
        const tileSize = 64;
        const lightSize = 12;
        const margin = 4; // Increased from 4 to 8 for more outward positioning
        
        switch (direction) {
            case 0: // North - top left
                lightElement.style.left = (margin + 4) + 'px';
                lightElement.style.top = (margin - 4) + 'px'; // Move up
                break;
            case 1: // East - top right
                lightElement.style.right = (margin - 4) + 'px'; // Move right
                lightElement.style.top = (margin + 4) + 'px';
                break;
            case 2: // South - bottom right
                lightElement.style.right = (margin + 4) + 'px';
                lightElement.style.bottom = (margin - 4) + 'px'; // Move down
                break;
            case 3: // West - bottom left
                lightElement.style.left = (margin - 4) + 'px'; // Move left
                lightElement.style.bottom = (margin + 4) + 'px';
                break;
        }
        
        return lightElement;
    }
    
    startCycle() {
        // Update the cycle every 100ms to check for switches
        this.cycleInterval = setInterval(() => {
            this.updateCycle();
        }, 100);
        
        // Also update the visual display continuously
        this.displayInterval = setInterval(() => {
            this.updateLightDisplay();
        }, 50);
    }
    
    updateCycle() {
        const currentTime = Date.now();
        const timeSinceLastSwitch = currentTime - this.lastSwitchTime;
        
        if (this.isInDelay && timeSinceLastSwitch >= 500) {
            // Delay period is over, switch to next light
            this.isInDelay = false;
            this.switchToNextConnection();
            this.lastSwitchTime = currentTime;
        } else if (!this.isInDelay && timeSinceLastSwitch >= this.switchInterval && this.connections.length > 0) {
            // Switch to delay period
            this.isInDelay = true;
            this.lastSwitchTime = currentTime;
        }
    }
    
    switchToNextConnection() {
        if (this.connections.length === 0) return;
        
        this.currentGreenConnection = (this.currentGreenConnection + 1) % this.connections.length;
    }
    
    updateLightDisplay() {
        // Ensure light elements exist
        if (this.lightElements.size === 0 && this.connections.length > 0) {
            this.createLightElements();
        }
        
        this.connections.forEach((direction, index) => {
            const lightElement = this.lightElements.get(direction);
            if (lightElement) {
                if (this.isInDelay) {
                    // All lights red during delay period
                    lightElement.className = 'traffic-light-indicator red';
                } else {
                    const isGreen = index === this.currentGreenConnection;
                    if (isGreen) {
                        // Check if we're in the last 200ms of green (yellow warning phase)
                        const currentTime = Date.now();
                        const timeSinceLastSwitch = currentTime - this.lastSwitchTime;
                        const isYellowWarning = timeSinceLastSwitch >= (this.switchInterval - 800);
                        
                        lightElement.className = `traffic-light-indicator ${isYellowWarning ? 'yellow' : 'green'}`;
                    } else {
                        lightElement.className = 'traffic-light-indicator red';
                    }
                }
            }
        });
    }
    
    // Get the current green connection direction
    getCurrentGreenDirection() {
        if (this.connections.length === 0) return null;
        return this.connections[this.currentGreenConnection];
    }
    
    // Check if a specific direction has green light
    isGreenForDirection(direction) {
        return this.getCurrentGreenDirection() === direction;
    }
    
    // Check if a specific direction has red light
    isRedForDirection(direction) {
        return this.getCurrentGreenDirection() !== direction;
    }
    
    // Render method for compatibility with World.render
    render(gameDiv, tileSize = 64, instant = false) {
        // Ensure connections are set up
        this.updateConnectionsFromWorld();
        
        // Find or create the traffic light div
        let trafficLightDiv = gameDiv.querySelector(`.traffic-light-${this.id}`);
        if (!trafficLightDiv) {
            trafficLightDiv = document.createElement('div');
            trafficLightDiv.className = `traffic-light traffic-light-${this.id}`;
            trafficLightDiv.style.width = tileSize + 'px';
            trafficLightDiv.style.height = tileSize + 'px';
            trafficLightDiv.style.position = 'absolute';
            trafficLightDiv.style.zIndex = '5';
            trafficLightDiv.style.pointerEvents = 'none';
            gameDiv.appendChild(trafficLightDiv);
        }
        
        // Ensure light elements are added to the DOM
        if (this.lightElements.size > 0) {
            this.lightElements.forEach((lightElement, direction) => {
                if (!trafficLightDiv.contains(lightElement)) {
                    trafficLightDiv.appendChild(lightElement);
                }
            });
        }
        
        // Update position
        const x = this.x * tileSize;
        const y = this.y * tileSize;
        
        if (instant) {
            trafficLightDiv.style.transition = 'none';
        } else {
            trafficLightDiv.style.transition = 'left 0.3s ease, top 0.3s ease';
        }
        
        trafficLightDiv.style.left = x + 'px';
        trafficLightDiv.style.top = y + 'px';
        
        // Update light display
        this.updateLightDisplay();
    }
    
    // Add traffic light to the game grid
    addToGrid(gridContainer) {
        if (gridContainer) {
            // Add the main traffic light element
            const trafficLightElement = document.createElement('div');
            trafficLightElement.className = 'traffic-light';
            trafficLightElement.style.position = 'absolute';
            trafficLightElement.style.width = '64px';
            trafficLightElement.style.height = '64px';
            trafficLightElement.style.left = (this.x * 64) + 'px';
            trafficLightElement.style.top = (this.y * 64) + 'px';
            trafficLightElement.style.zIndex = '5';
            
            // Add light indicators for each connection
            this.lightElements.forEach((lightElement, direction) => {
                trafficLightElement.appendChild(lightElement);
            });
            
            gridContainer.appendChild(trafficLightElement);
            this.updateLightDisplay();
        }
    }
    
    // Stop the traffic light cycle without removing visual elements
    stopCycle() {
        if (this.cycleInterval) {
            clearInterval(this.cycleInterval);
            this.cycleInterval = null;
        }
        if (this.displayInterval) {
            clearInterval(this.displayInterval);
            this.displayInterval = null;
        }
    }
    
    // Remove from grid
    removeFromGrid() {
        this.stopCycle();
        
        const trafficLightElement = document.querySelector('.traffic-light');
        if (trafficLightElement) {
            trafficLightElement.remove();
        }
    }
    
    // Update visual position
    updateVisualPosition() {
        const trafficLightElement = document.querySelector('.traffic-light');
        if (trafficLightElement) {
            trafficLightElement.style.left = (this.x * 64) + 'px';
            trafficLightElement.style.top = (this.y * 64) + 'px';
        }
    }
    
    // Reset traffic light to initial state
    reset() {
        this.currentGreenConnection = 0;
        this.lastSwitchTime = Date.now();
        this.updateLightDisplay();
    }
    
    // Get data for serialization
    getData() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            connections: this.connections,
            currentGreenConnection: this.currentGreenConnection
        };
    }
    
    // Create from data
    static fromData(data) {
        const trafficLight = new TrafficLight(data.id, data.x, data.y);
        trafficLight.connections = data.connections || [];
        trafficLight.currentGreenConnection = data.currentGreenConnection || 0;
        return trafficLight;
    }
    
    // Cleanup when destroyed
    destroy() {
        this.removeFromGrid();
    }
}

export default TrafficLight;
