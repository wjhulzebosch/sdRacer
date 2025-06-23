/**
 * Maze Generator for sdRacer Level Creator
 * Generates a maze with a guaranteed path from start to finish
 * Returns maze in NESW format (North=8, East=4, South=2, West=1)
 */

function generateMaze(width, height, start, end) {
    // Initialize maze with all walls (no connections)
    const maze = Array.from({length: height}, () => 
        Array.from({length: width}, () => '0000')
    );
    
    // Convert start and end to [y, x] format if they're in [x, y] format
    const startPos = Array.isArray(start) && start.length === 2 ? 
        (start[0] < width ? [start[1], start[0]] : start) : [0, 0];
    const endPos = Array.isArray(end) && end.length === 2 ? 
        (end[0] < width ? [end[1], end[0]] : end) : [height-1, width-1];
    
    // Validate positions
    if (startPos[0] < 0 || startPos[0] >= height || startPos[1] < 0 || startPos[1] >= width ||
        endPos[0] < 0 || endPos[0] >= height || endPos[1] < 0 || endPos[1] >= width) {
        throw new Error('Start or end position is out of bounds');
    }
    
    // Generate maze using depth-first search
    const visited = Array.from({length: height}, () => Array(width).fill(false));
    const stack = [];
    
    // Start from the start position
    stack.push(startPos);
    visited[startPos[0]][startPos[1]] = true;
    
    // Direction vectors: [y, x] for North, East, South, West
    const directions = [
        [-1, 0], // North
        [0, 1],  // East
        [1, 0],  // South
        [0, -1]  // West
    ];
    
    // Direction indices for NESW
    const dirIndices = [0, 1, 2, 3]; // N, E, S, W
    
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const [y, x] = current;
        
        // Get unvisited neighbors
        const neighbors = [];
        for (let i = 0; i < 4; i++) {
            const [dy, dx] = directions[i];
            const ny = y + dy;
            const nx = x + dx;
            
            if (ny >= 0 && ny < height && nx >= 0 && nx < width && !visited[ny][nx]) {
                neighbors.push({y: ny, x: nx, dir: i});
            }
        }
        
        if (neighbors.length > 0) {
            // Choose a random neighbor
            const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            const [ny, nx] = [neighbor.y, neighbor.x];
            const dir = neighbor.dir;
            
            // Remove wall between current and neighbor
            const oppositeDir = (dir + 2) % 4; // Opposite direction
            
            // Update current cell
            let currentCell = maze[y][x].split('');
            currentCell[dir] = '1';
            maze[y][x] = currentCell.join('');
            
            // Update neighbor cell
            let neighborCell = maze[ny][nx].split('');
            neighborCell[oppositeDir] = '1';
            maze[ny][nx] = neighborCell.join('');
            
            // Mark neighbor as visited and add to stack
            visited[ny][nx] = true;
            stack.push([ny, nx]);
        } else {
            // Backtrack
            stack.pop();
        }
    }
    
    // Ensure path from start to end exists by creating a direct path if needed
    ensurePathExists(maze, startPos, endPos, visited);
    
    return {
        maze: maze,
        start: startPos,
        end: endPos
    };
}

function ensurePathExists(maze, start, end, visited) {
    // Use A* pathfinding to find a path from start to end
    const path = findPath(maze, start, end);
    
    if (path.length === 0) {
        // If no path exists, create a simple path by removing walls
        createSimplePath(maze, start, end);
    }
}

function findPath(maze, start, end) {
    const height = maze.length;
    const width = maze[0].length;
    const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // N, E, S, W
    
    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    
    gScore.set(start.toString(), 0);
    fScore.set(start.toString(), heuristic(start, end));
    
    while (openSet.length > 0) {
        // Find node with lowest fScore
        let current = openSet.reduce((lowest, node) => 
            fScore.get(node.toString()) < fScore.get(lowest.toString()) ? node : lowest
        );
        
        if (current[0] === end[0] && current[1] === end[1]) {
            // Reconstruct path
            const path = [];
            while (current) {
                path.unshift(current);
                current = cameFrom.get(current.toString());
            }
            return path;
        }
        
        openSet.splice(openSet.indexOf(current), 1);
        
        // Check neighbors
        for (let i = 0; i < 4; i++) {
            const [dy, dx] = directions[i];
            const ny = current[0] + dy;
            const nx = current[1] + dx;
            
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                // Check if there's a connection in this direction
                const currentCell = maze[current[0]][current[1]].split('');
                if (currentCell[i] === '1') {
                    const neighbor = [ny, nx];
                    const tentativeGScore = gScore.get(current.toString()) + 1;
                    
                    if (!gScore.has(neighbor.toString()) || tentativeGScore < gScore.get(neighbor.toString())) {
                        cameFrom.set(neighbor.toString(), current);
                        gScore.set(neighbor.toString(), tentativeGScore);
                        fScore.set(neighbor.toString(), tentativeGScore + heuristic(neighbor, end));
                        
                        if (!openSet.some(node => node[0] === neighbor[0] && node[1] === neighbor[1])) {
                            openSet.push(neighbor);
                        }
                    }
                }
            }
        }
    }
    
    return []; // No path found
}

function heuristic(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); // Manhattan distance
}

function createSimplePath(maze, start, end) {
    // Create a simple path by removing walls in a direct line
    const [sy, sx] = start;
    const [ey, ex] = end;
    
    // Move horizontally first, then vertically
    let currentY = sy;
    let currentX = sx;
    
    // Move horizontally
    while (currentX !== ex) {
        const nextX = currentX + (ex > currentX ? 1 : -1);
        const dir = ex > currentX ? 1 : 3; // East or West
        const oppositeDir = (dir + 2) % 4;
        
        // Remove wall in current cell
        let currentCell = maze[currentY][currentX].split('');
        currentCell[dir] = '1';
        maze[currentY][currentX] = currentCell.join('');
        
        // Remove wall in next cell
        let nextCell = maze[currentY][nextX].split('');
        nextCell[oppositeDir] = '1';
        maze[currentY][nextX] = nextCell.join('');
        
        currentX = nextX;
    }
    
    // Move vertically
    while (currentY !== ey) {
        const nextY = currentY + (ey > currentY ? 1 : -1);
        const dir = ey > currentY ? 2 : 0; // South or North
        const oppositeDir = (dir + 2) % 4;
        
        // Remove wall in current cell
        let currentCell = maze[currentY][currentX].split('');
        currentCell[dir] = '1';
        maze[currentY][currentX] = currentCell.join('');
        
        // Remove wall in next cell
        let nextCell = maze[nextY][currentX].split('');
        nextCell[oppositeDir] = '1';
        maze[nextY][currentX] = nextCell.join('');
        
        currentY = nextY;
    }
}

export { generateMaze };
