/**
 * Maze Generator for sdRacer Level Creator
 * Generates a maze with a guaranteed path from start to finish
 * Returns maze in NESW format (North=8, East=4, South=2, West=1)
 */

function generateMaze(width, height) {
    // Initialize maze with all walls (no connections)
    const maze = Array.from({length: height}, () => 
        Array.from({length: width}, () => '0000')
    );
    
    // Always use [0,0] as start and [height-1, width-1] as end
    const startPos = [0, 0];
    const endPos = [height - 1, width - 1];
    
    // Validate positions
    if (startPos[0] < 0 || startPos[0] >= height || startPos[1] < 0 || startPos[1] >= width ||
        endPos[0] < 0 || endPos[0] >= height || endPos[1] < 0 || endPos[1] >= width) {
        throw new Error('Start or end position is out of bounds');
    }
    
    // Generate maze using the selected algorithm
    generateMazeDFS(maze, startPos, endPos);
    
    
    return {
        maze: maze,
        start: startPos,
        end: endPos
    };
}

function generateMazeDFS(maze, startPos, endPos) {
    const height = maze.length;
    const width = maze[0].length;
    
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
}

export { generateMaze };
