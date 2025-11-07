# Deer Implementation Plan

## Overview
Implement a new "Deer" entity that moves continuously in a circular path through multiple waypoints. Deer are obstacles that crash cars on collision and don't respond to honks.

## Requirements Summary
- Deer has at least 2 positions (waypoints)
- Moves continuously in straight lines (Manhattan distance) between waypoints in a circular pattern
- Movement is continuous like traffic lights (even before level starts)
- Doesn't respond to honks
- Car crashes when hitting a deer (both car and deer are destroyed)
- Replace `isCowAhead()` with new `isObstacleAhead()` function that checks for both cows and deer
- Add `isRoadClear()` as alias/alternative name (checks only for obstacles, independent of roads)
- Level creator: Click deer icon, then click grid positions to place waypoints
- Visual: Semi-transparent deer at each waypoint (like secondary cow position)
- Multiple deer shown with different colored path indicators
- Cancel deer placement mode when clicking outside grid or right-click (only delete if <2 positions)

## Architecture & Code Conventions

Based on existing code patterns:

### Entity Structure
- Extend `Entity.js` base class (like `Cow.js` and `TrafficLight.js`)
- Use strict type checking in constructor with `CRITICAL` error messages
- Implement standard methods: `reset()`, `render()`, `getData()`, `fromData()`
- Store in `Assets/Scripts/Deer.js`

### Movement Pattern
- Similar to `TrafficLight.js` continuous cycle
- Use `setInterval()` for continuous movement updates
- Store waypoints array: `positions = [{x, y}, {x, y}, ...]`
- Pre-calculate complete tile path on initialization (all tiles in circular route)
- Move tile-by-tile through the path
- Entity position (`this.x`, `this.y`) updated IMMEDIATELY to new tile
- CSS transitions handle smooth visual movement between tiles
- Deer is always "registered" at its current logical position, not where it's visually animating from

### Naming Conventions
- camelCase for methods and variables
- PascalCase for class names
- Descriptive error messages with context
- Use `debug()` from `commonFunctions.js` for logging

## Implementation Tasks

### 1. Create Deer Entity Class
**File**: `Assets/Scripts/Deer.js`

**Features**:
- Constructor: `constructor(id, positions)` where positions is array of {x, y}
  - Validate: id is string, positions is array with length >= 2
  - Each position has valid number x, y coordinates
- Properties:
  - `positions`: Array of waypoint coordinates [{x, y}, {x, y}, ...]
  - `tilePath`: Pre-calculated array of ALL tiles in circular path
  - `currentTileIndex`: Current position in tilePath array
  - `x`, `y`: Current position (inherits from Entity) - always at exact tile coordinates
  - `moveSpeed`: Time in ms to move to next tile (e.g., 1000ms = 1 second per tile)
  - `lastMoveTime`: Timestamp of last tile movement
  - `movementInterval`: setInterval ID for continuous movement
  - `initialTileIndex`: Starting position for reset

**Methods**:
- `calculateTilePath()`: Pre-calculate complete circular path through all waypoints
- `getManhattenPath(start, end, skipFirst)`: Get all tiles between two waypoints
- `initialize()`: Start continuous movement cycle
- `updateMovement()`: Check if it's time to move to next tile
- `moveToNextTile()`: Move to next tile in circular path (updates x, y immediately)
- `render(gameDiv, tileSize)`: Visual rendering with CSS transitions
- `reset()`: Return to first tile in path
- `blocksMovement(x, y)`: Check if deer blocks a position (returns this.isAtPosition(x, y))
- `destroy()`: Cleanup intervals
- `getData()`: Serialize for saving
- `static fromData(data)`: Deserialize from level data

**Movement Logic**:
```javascript
// Pre-calculate the complete tile path on initialization
calculateTilePath() {
  const path = [];
  
  // Build path from each waypoint to the next
  for (let i = 0; i < this.positions.length; i++) {
    const start = this.positions[i];
    const end = this.positions[(i + 1) % this.positions.length];
    
    // Get all tiles between start and end (excluding start to avoid duplicates)
    const segment = this.getManhattenPath(start, end, i > 0);
    path.push(...segment);
  }
  
  this.tilePath = path;
}

getManhattenPath(start, end, skipFirst = false) {
  const tiles = [];
  let x = start.x;
  let y = start.y;
  
  if (!skipFirst) {
    tiles.push({x, y});
  }
  
  // Move in X direction first
  while (x !== end.x) {
    x += Math.sign(end.x - x);
    tiles.push({x, y});
  }
  
  // Then move in Y direction
  while (y !== end.y) {
    y += Math.sign(end.y - y);
    tiles.push({x, y});
  }
  
  return tiles;
}

// Check periodically if it's time to move
updateMovement() {
  const currentTime = Date.now();
  const timeSinceLastMove = currentTime - this.lastMoveTime;
  
  if (timeSinceLastMove >= this.moveSpeed) {
    this.moveToNextTile();
    this.lastMoveTime = currentTime;
  }
}

// Move to next tile (position updated IMMEDIATELY)
moveToNextTile() {
  // Move to next tile in circular path
  this.currentTileIndex = (this.currentTileIndex + 1) % this.tilePath.length;
  const nextTile = this.tilePath[this.currentTileIndex];
  
  // Update world entity tracking
  const oldX = this.x;
  const oldY = this.y;
  
  // UPDATE POSITION IMMEDIATELY (not gradually)
  this.x = nextTile.x;
  this.y = nextTile.y;
  
  if (window.world) {
    window.world.moveEntity(this, oldX, oldY, this.x, this.y);
  }
  
  // CSS transition in render() will animate visually
}
```

---

### 2. Update World.js to Support Deer
**File**: `Assets/Scripts/World.js`

**Changes**:
- Import Deer class: `import Deer from './Deer.js';`
- In `loadLevelData()`: Add deer loading section (similar to cows/traffic lights)
  ```javascript
  // Add deer
  if (levelData.deer && Array.isArray(levelData.deer)) {
    levelData.deer.forEach((deerConfig, index) => {
      const deerId = this.generateEntityId();
      // Adjust positions for grass border (+1 offset)
      const positions = deerConfig.positions.map(pos => ({
        x: pos[0] + 1,
        y: pos[1] + 1
      }));
      const deer = new Deer(deerId, positions);
      this.addEntity(deer, positions[0].x, positions[0].y);
    });
  }
  ```
- Deer collision handled by existing `canMoveTo()` checks in `Car.js`

---

### 3. Update Car.js - Add isObstacleAhead() and isRoadClear()
**File**: `Assets/Scripts/Car.js`

**Changes**:
- Add new method `isObstacleAhead(world)`:
  ```javascript
  isObstacleAhead(world) {
    const aheadPos = this.getPositionAhead();
    const entities = world.getEntitiesAt(aheadPos.x, aheadPos.y);
    return entities.some(entity => 
      entity.type === 'cow' || entity.type === 'deer'
    );
  }
  ```
- Add alias method `isRoadClear(world)`:
  ```javascript
  isRoadClear(world) {
    // Inverted logic: road is clear if NO obstacles ahead
    return !this.isObstacleAhead(world);
  }
  ```
- Keep `isCowAhead(world)` for backward compatibility
- Update `canMoveTo(world, x, y)` to check for deer collisions:
  ```javascript
  // Check for cow or deer collision
  const entities = world.getEntitiesAt(x, y);
  const obstacle = entities.find(entity => 
    entity.type === 'cow' || entity.type === 'deer'
  );
  if (obstacle) {
    debug(`[canMoveTo] CRASH: ${obstacle.type} at position (${x}, ${y})`);
    this.crash();
    
    // Destroy the deer if hit
    if (obstacle.type === 'deer') {
      world.removeEntity(obstacle);
      obstacle.destroy();
    }
    
    return false;
  }
  ```

---

### 4. Update CommandableObject.js
**File**: `Assets/Scripts/CommandableObject.js`

**Changes**:
- Add new methods:
  ```javascript
  isObstacleAhead() {
    return this.entity.isObstacleAhead(window.world);
  }
  
  isRoadClear() {
    return this.entity.isRoadClear(window.world);
  }
  ```
- Keep `isCowAhead()` for backward compatibility

---

### 5. Update CarLang Engine
**File**: `Assets/Scripts/carlang-engine.js`

**Changes**:
- Add to default commandable object functions (around line 68):
  ```javascript
  'isObstacleAhead': () => this.defaultCommandableObject.isObstacleAhead(),
  'isRoadClear': () => this.defaultCommandableObject.isRoadClear(),
  ```
- Add to function definitions (around line 84):
  ```javascript
  'isObstacleAhead': { args: 0, description: 'Check if there is an obstacle (cow or deer) ahead' },
  'isRoadClear': { args: 0, description: 'Check if the road ahead is clear (no obstacles)' },
  ```
- Add to OOP mode commandable object functions (around line 524):
  ```javascript
  'isObstacleAhead': () => targetCommandableObject.isObstacleAhead(),
  'isRoadClear': () => targetCommandableObject.isRoadClear(),
  ```
- Add to function execution contexts (around line 1200):
  ```javascript
  'isObstacleAhead': () => commandableObject.isObstacleAhead(),
  'isRoadClear': () => commandableObject.isRoadClear(),
  ```

---

### 6. Update CarLang Parser
**File**: `Assets/Scripts/CarLang-parser.js`

**Changes**:
- Add to function name arrays (lines 937, 969):
  ```javascript
  'honk', 'isRoadAhead', 'isCowAhead', 'isObstacleAhead', 'isRoadClear', 'isAtFinish', 'output'
  ```

---

### 7. Update Level Creator - Backend Logic
**File**: `Assets/Scripts/levelCreator.js`

**Changes**:

#### A. Global State
```javascript
let deer = []; // Array to store deer data: [{positions: [[x, y], [x, y], ...]}]
let deerPlacementMode = false;
let currentDeerPositions = []; // Temporary array while placing a deer
let deerColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']; // Path colors
```

#### B. Update `placeMode` handling
- Add `'deer'` to the placement modes
- Update `setPlaceMode('deer')` handler

#### C. Deer Placement Logic
```javascript
function handleDeerPlacement(y, x) {
  if (!deerPlacementMode) {
    // Start new deer placement
    deerPlacementMode = true;
    currentDeerPositions = [{x, y}];
    renderGrid();
  } else {
    // Add position to current deer
    // Validate: must be orthogonally adjacent to last position
    const lastPos = currentDeerPositions[currentDeerPositions.length - 1];
    const isOrthogonal = 
      (Math.abs(x - lastPos.x) === 1 && y === lastPos.y) || 
      (Math.abs(y - lastPos.y) === 1 && x === lastPos.x);
    
    if (!isOrthogonal) {
      debug('Deer waypoints must be orthogonally adjacent', null, 'error');
      return;
    }
    
    // Check for duplicate position
    if (currentDeerPositions.some(pos => pos.x === x && pos.y === y)) {
      debug('Position already added to deer path', null, 'error');
      return;
    }
    
    currentDeerPositions.push({x, y});
    renderGrid();
  }
}

function finalizeDeerPlacement() {
  if (currentDeerPositions.length >= 2) {
    deer.push({
      positions: [...currentDeerPositions],
      color: deerColors[deer.length % deerColors.length]
    });
  }
  
  deerPlacementMode = false;
  currentDeerPositions = [];
  placeMode = null;
  updatePlaceModeUI();
  updatePlacementStatus();
  renderGrid();
}

function cancelDeerPlacement() {
  if (currentDeerPositions.length < 2) {
    // Delete incomplete deer
    currentDeerPositions = [];
  } else {
    // Finalize if valid
    finalizeDeerPlacement();
    return;
  }
  
  deerPlacementMode = false;
  currentDeerPositions = [];
  placeMode = null;
  updatePlaceModeUI();
  updatePlacementStatus();
  renderGrid();
}
```

#### D. Mouse Event Handling
```javascript
// Add to grid container
gridDiv.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (placeMode === 'deer' && deerPlacementMode) {
    cancelDeerPlacement();
  }
});

// Add click outside detection
document.addEventListener('click', (e) => {
  if (placeMode === 'deer' && deerPlacementMode) {
    if (!gridDiv.contains(e.target)) {
      cancelDeerPlacement();
    }
  }
});
```

#### E. Update `renderGrid()`
```javascript
// In renderGrid(), add deer visualization
deer.forEach((deerData, deerIndex) => {
  deerData.positions.forEach((pos, posIndex) => {
    if (pos.x === x && pos.y === y) {
      cell.classList.add('deer-waypoint');
      cell.style.setProperty('--deer-color', deerData.color || deerColors[deerIndex % deerColors.length]);
      
      // Draw path line to next waypoint
      if (posIndex < deerData.positions.length - 1) {
        const nextPos = deerData.positions[posIndex + 1];
        drawPathLine(cell, pos, nextPos, deerData.color);
      } else {
        // Draw line back to first position (circular)
        const firstPos = deerData.positions[0];
        drawPathLine(cell, pos, firstPos, deerData.color);
      }
    }
  });
});

// Show current deer being placed
if (deerPlacementMode && currentDeerPositions.some(pos => pos.x === x && pos.y === y)) {
  cell.classList.add('deer-waypoint-preview');
}
```

#### F. Update `getLevelDetails()`
```javascript
deer: deer.map(deerData => ({
  positions: deerData.positions.map(pos => [pos.x, pos.y])
}))
```

#### G. Update `setLevelDetails()`
```javascript
// Handle deer data
if (level.deer) {
  deer = level.deer.map((deerData, index) => ({
    positions: deerData.positions.map(pos => ({x: pos[0], y: pos[1]})),
    color: deerColors[index % deerColors.length]
  }));
}
```

---

### 8. Update Level Creator - UI Elements
**File**: `levelCreator.html`

**Changes**:
- Add deer icon in tools section (after cow icon):
  ```html
  <span id="deerIcon" class="tool-icon deer-icon" title="Place Deer (click waypoints)"></span>
  ```
- Update tips text to mention deer placement

---

### 9. Update Level Creator - Styles
**File**: `Assets/Styles/levelCreator.css`

**Changes**:

```css
/* Deer Icon */
.deer-icon {
    background-image: url('../Textures/Deer.png') !important;
    background-size: cover !important;
}

/* Deer waypoint visualization */
.level-creator-cell.deer-waypoint::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('../Textures/Deer.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0.6;
    pointer-events: none;
    z-index: 3;
    border: 2px solid var(--deer-color, #FF6B6B);
}

.level-creator-cell.deer-waypoint-preview::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('../Textures/Deer.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0.4;
    pointer-events: none;
    z-index: 3;
    border: 2px dashed #888;
}

/* Path line indicator */
.deer-path-line {
    position: absolute;
    background-color: var(--deer-color, #FF6B6B);
    opacity: 0.5;
    z-index: 2;
    pointer-events: none;
}
```

Also update in `Assets/Styles/newGameStyles.css` for game view.

---

### 10. Update Game UI Documentation
**File**: `game.html`

**Changes**:
- Add to function reference list:
  ```html
  <li><code>isObstacleAhead()</code> - Check if there's an obstacle (cow or deer) ahead</li>
  <li><code>isRoadClear()</code> - Check if the road ahead is clear (no obstacles)</li>
  ```
- Update example code to use new functions

---

## Testing Checklist

### Deer Entity
- [ ] Deer spawns at first waypoint position
- [ ] Deer moves continuously in circular path through all waypoints
- [ ] Movement is smooth and follows Manhattan distance
- [ ] Deer starts moving immediately when level loads
- [ ] Multiple deer can exist simultaneously with independent movement
- [ ] Deer visual element renders correctly with rotation based on direction

### Collision & Interaction
- [ ] Car crashes when moving into deer
- [ ] Deer is destroyed when hit by car
- [ ] `isObstacleAhead()` returns true when deer is ahead
- [ ] `isRoadClear()` returns false when deer is ahead
- [ ] `isCowAhead()` still works for backward compatibility
- [ ] Deer doesn't respond to honk() command

### Level Creator
- [ ] Deer icon appears in tool palette
- [ ] Clicking deer icon activates deer placement mode
- [ ] First grid click places first waypoint
- [ ] Subsequent clicks add waypoints (must be orthogonally adjacent)
- [ ] Semi-transparent deer appears at each waypoint
- [ ] Path lines connect waypoints with colored indicators
- [ ] Multiple deer show different colored paths
- [ ] Right-click cancels deer placement (deletes if <2 waypoints)
- [ ] Clicking outside grid cancels deer placement (deletes if <2 waypoints)
- [ ] Deer data exports correctly to JSON
- [ ] Deer data imports correctly from JSON
- [ ] "Play Level" button preserves deer data

### Integration
- [ ] Deer appears in game when level is loaded
- [ ] Deer continues moving during level execution
- [ ] World.reset() resets deer to initial position
- [ ] Multiple deer instances work correctly
- [ ] Level saves and loads correctly with deer data

---

## Implementation Order

1. ✅ Create `Deer.js` entity class with movement logic
2. ✅ Update `World.js` to load and manage deer
3. ✅ Update `Car.js` with new obstacle detection methods
4. ✅ Update `CommandableObject.js` to expose new methods
5. ✅ Update `carlang-engine.js` to register new functions
6. ✅ Update `CarLang-parser.js` to recognize new function names
7. ✅ Update `levelCreator.js` with deer placement logic
8. ✅ Update `levelCreator.html` with deer icon
9. ✅ Update CSS files with deer styles
10. ✅ Update `game.html` documentation
11. ✅ Test all functionality

---

## Notes & Considerations

- **Position vs Visual**: Deer position (`this.x`, `this.y`) is updated IMMEDIATELY to new tile, CSS handles smooth visual transition
- **Collision Detection**: Deer blocks the tile at its current logical position, NOT the tile it's visually animating from
- **Performance**: Multiple deer with continuous movement may impact performance. Consider throttling update frequency if needed.
- **Path Validation**: Ensure waypoints form a valid path (all orthogonally connected).
- **Visual Feedback**: Color-coded paths help distinguish multiple deer in level creator.
- **Backward Compatibility**: Keep `isCowAhead()` for existing levels, but encourage use of `isObstacleAhead()`.
- **Edge Cases**: Handle deer at world boundaries, deer on finish line, deer overlapping with other entities.
- **Movement Consistency**: Deer movement follows same pattern as Cow - position updates immediately, CSS transition provides smooth animation

---

## Future Enhancements (Out of Scope)

- Different deer movement speeds
- Deer pause/wait at waypoints
- Diagonal movement support
- Deer animations/sprites
- Sound effects for deer collision
- Maximum number of deer per level
