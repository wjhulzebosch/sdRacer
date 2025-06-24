class GPS {

    constructor(world) {
        this.world = world;
        this.nodes = [];

        console.log('[GPS] Initializing GPS system for world:', world.width, 'x', world.height);
        this.createNodeGrid(world);
        this.printDebugInfo();
    }

    createNodeGrid(world) {
        console.log('[GPS] Creating node grid...');
        
        // Create 2D array of nodes
        this.nodes = Array(world.height).fill(null).map(() => 
            Array(world.width).fill(null).map(() => null)
        );

        // Initialize all nodes
        for (let x = 0; x < world.width; x++) {
            for (let y = 0; y < world.height; y++) {
                this.nodes[y][x] = new GPSNode(world, { x, y });
            }
        }

        console.log('[GPS] Created', world.width * world.height, 'nodes');

        // Loop through all the world's tiles, get the tile's getRoadType. 
        // This is string with 4 0's and 1's. 0 is no road, 1 is road (N/E/S/W)
        // For all 1's, add a connection to the node in that direction.
        let connectionCount = 0;
        for (let x = 0; x < world.width; x++) {
            for (let y = 0; y < world.height; y++) {
                let tile = world.getTile(x, y);
                if (!tile || !tile.isRoad()) continue; // Skip non-road tiles
                
                let roadType = tile.getRoadType();
                
                for (let i = 0; i < 4; i++) {
                    if (roadType[i] === '1') {
                        let neighborX = x;
                        let neighborY = y;
                        let direction = ['North', 'East', 'South', 'West'][i];
                        
                        switch (i) {
                            case 0: // North
                                neighborY--;
                                break;
                            case 1: // East
                                neighborX++;
                                break;
                            case 2: // South
                                neighborY++;
                                break;
                            case 3: // West
                                neighborX--;
                                break;
                        }

                        // Check if neighbor position is valid
                        if (world.isValidPosition(neighborX, neighborY)) {
                            let neighborTile = world.getTile(neighborX, neighborY);
                            // Check if tiles are actually connected (both have roads in opposite directions)
                            if (neighborTile && neighborTile.isRoad() && tile.isConnectedTo(neighborTile, i)) {
                                // Only create connection in one direction, let addConnection handle the reverse
                                this.nodes[y][x].addConnection(this.nodes[neighborY][neighborX], true);
                                connectionCount++;
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`[GPS] Created ${connectionCount} total connections`);
    }
    
    printDebugInfo() {
        console.log('[GPS] === GPS Debug Info ===');
        console.log(`[GPS] World size: ${this.world.width} x ${this.world.height}`);
        console.log(`[GPS] Total nodes: ${this.world.width * this.world.height}`);
        
        let roadNodes = 0;
        let totalConnections = 0;
        
        for (let y = 0; y < this.world.height; y++) {
            for (let x = 0; x < this.world.width; x++) {
                const node = this.nodes[y][x];
                const tile = this.world.getTile(x, y);
                
                if (tile && tile.isRoad()) {
                    roadNodes++;
                    const connections = node.connections.length;
                    totalConnections += connections;
                    console.log(`[GPS] Node (${x}, ${y}) - Road type: ${tile.getRoadType()}, Connections: ${connections}`);
                }
            }
        }
        
        console.log(`[GPS] Road nodes: ${roadNodes}`);
        console.log(`[GPS] Average connections per road node: ${roadNodes > 0 ? (totalConnections / roadNodes).toFixed(2) : 0}`);
        console.log('[GPS] === End GPS Debug Info ===');
    }

    getDirection(from, to) {
        // A* from from to to, only return the direction of the next step for the car to take.
        // Return the direction as a string: 'North', 'East', 'South', 'West'
        // If there is no path, return null
        // If there are multiple paths, return the direction of the shortest path

        // Convert positions to node indices
        const fromNode = this.nodes[from.y][from.x];
        const toNode = this.nodes[to.y][to.x];
        
        if (!fromNode || !toNode) {
            console.log(`[GPS] Invalid positions: from (${from.x}, ${from.y}) to (${to.x}, ${to.y})`);
            return null;
        }
        
        // If same position, no movement needed
        if (from.x === to.x && from.y === to.y) {
            return null;
        }
        
        // A* pathfinding
        const path = this.findPath(fromNode, toNode);
        
        if (!path || path.length < 2) {
            console.log(`[GPS] No path found from (${from.x}, ${from.y}) to (${to.x}, ${to.y})`);
            return null;
        }
        
        // Get the first step direction
        const firstStep = path[1]; // path[0] is current position, path[1] is next step
        const direction = this.getDirectionBetween(from, firstStep.position);
        
        console.log(`[GPS] Path from (${from.x}, ${from.y}) to (${to.x}, ${to.y}): ${path.map(n => `(${n.position.x}, ${n.position.y})`).join(' -> ')}`);
        console.log(`[GPS] First step direction: ${direction}`);
        
        return direction;
    }
    
    findPath(startNode, endNode) {
        const openSet = [startNode];
        const closedSet = new Set();
        const cameFrom = new Map();
        
        const gScore = new Map();
        const fScore = new Map();
        
        gScore.set(startNode, 0);
        fScore.set(startNode, this.heuristic(startNode, endNode));
        
        while (openSet.length > 0) {
            // Find node with lowest fScore
            let current = openSet.reduce((lowest, node) => {
                const currentF = fScore.get(node) || Infinity;
                const lowestF = fScore.get(lowest) || Infinity;
                return currentF < lowestF ? node : lowest;
            });
            
            if (current === endNode) {
                // Reconstruct path
                const path = [];
                while (current) {
                    path.unshift(current);
                    current = cameFrom.get(current);
                }
                return path;
            }
            
            // Remove current from openSet and add to closedSet
            const currentIndex = openSet.indexOf(current);
            openSet.splice(currentIndex, 1);
            closedSet.add(current);
            
            // Check all neighbors
            for (const neighbor of current.connections) {
                if (closedSet.has(neighbor)) {
                    continue;
                }
                
                const tentativeGScore = (gScore.get(current) || Infinity) + 1; // Cost of 1 for each step
                
                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= (gScore.get(neighbor) || Infinity)) {
                    continue;
                }
                
                // This path is the best until now
                cameFrom.set(neighbor, current);
                gScore.set(neighbor, tentativeGScore);
                fScore.set(neighbor, tentativeGScore + this.heuristic(neighbor, endNode));
            }
        }
        
        // No path found
        return null;
    }
    
    heuristic(nodeA, nodeB) {
        // Manhattan distance heuristic
        return Math.abs(nodeA.position.x - nodeB.position.x) + Math.abs(nodeA.position.y - nodeB.position.y);
    }
    
    getDirectionBetween(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        
        if (dy < 0) return 'North';
        if (dx > 0) return 'East';
        if (dy > 0) return 'South';
        if (dx < 0) return 'West';
        
        return null; // Same position
    }
}

class GPSNode {
    constructor(world, position) {
        this.world = world;
        this.position = position;
        this.connections = [];
    }

    addConnection(connection, propagate) {
        // Check if connection already exists to prevent duplicates
        if (!this.connections.includes(connection)) {
            this.connections.push(connection);
        }
        
        if (propagate) {
            connection.addConnection(this, false);
        }
    }
}

export default GPS;
