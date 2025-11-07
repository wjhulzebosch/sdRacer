# Level Creator Checklist Plan

## Overview
Add a visual progress checklist above the level grid to guide users through the level creation process. Reorganize UI elements to improve workflow and add warnings for experimental features.

## Requirements Summary

### 1. Add Level Generator Checklist (Above Grid)
Show completion status for:
- ✅ **Level created**: Green when user presses "Create Level" button (or Enter key)
- ✅ **Roads placed**: Green when at least 3 road pieces exist (2+ clicks on borders)
- ✅ **Car placed**: Green when at least one car is in the grid
- ✅ **Finish placed**: Green when finish line is placed
- ✅ **Level information entered**: Green when all required fields are filled

### 2. Remove Grid Info Under Grid
- Remove the current display showing:
  - `Cars: 0`
  - `Finish: Not placed`
- Keep: `Grid: 4x4` in it's current place

### 3. Move Placement Tools Under Grid
- Currently placement tools are ABOVE the grid
- Move them to BELOW the grid

### 4. Split Car Management from Level Info Panel
- Create separate "Car Management" panel
- Add red warning "⚠️ Experimental" to Car Management panel, right behind 'Car Management'

## UI Layout Changes

### Current Right Column Structure:
```
Right Column:
  ├── Placement Tools Panel (TOP)
  ├── Game Grid Panel (MIDDLE)
  └── Grid Info (BOTTOM - to be removed)
```

### New Right Column Structure:
```
Right Column:
  ├── Level Generator Checklist (NEW - TOP)
  ├── Game Grid Panel (MIDDLE)
  └── Placement Tools Panel (BOTTOM - moved from top)
```

### Current Left Column Structure:
```
Left Column:
  ├── Level Management Panel
  └── Level Info Panel (includes Car Management)
```

### New Left Column Structure:
```
Left Column:
  ├── Level Management Panel
  ├── Level Info Panel (WITHOUT Car Management)
  └── Car Management Panel (NEW - split off, with warning)
```

## Detailed Implementation Plan

### Task 1: Create Checklist Component (HTML)
**File**: `levelCreator.html`

Add new checklist section in right column, BEFORE the game grid:

```html
<div class="panel checklist-panel">
    <h3>Level Creation Progress</h3>
    <div class="checklist">
        <div class="checklist-item" id="checkWorldGenerated">
            <span class="check-icon">☐</span>
            <span class="check-label">World generated</span>
        </div>
        <div class="checklist-item" id="checkRoadsPlaced">
            <span class="check-icon">☐</span>
            <span class="check-label">Roads placed (min 3 pieces)</span>
        </div>
        <div class="checklist-item" id="checkCarPlaced">
            <span class="check-icon">☐</span>
            <span class="check-label">Car placed</span>
        </div>
        <div class="checklist-item" id="checkFinishPlaced">
            <span class="check-icon">☐</span>
            <span class="check-label">Finish placed</span>
        </div>
        <div class="checklist-item" id="checkLevelInfo">
            <span class="check-icon">☐</span>
            <span class="check-label">Level information entered</span>
        </div>
    </div>
</div>
```

**Location**: Insert as first child of `.right-column`, before `.game-grid`

### Task 2: Reorganize Right Column (HTML)
**File**: `levelCreator.html`

1. Move checklist panel to TOP of right column (Task 1)
2. Keep game grid panel in MIDDLE
3. Move placement tools panel to BOTTOM (after game grid)
4. Remove grid info div (`<div class="grid-info">...</div>`)

**Result Order**:
```html
<div class="right-column">
    <!-- NEW: Checklist Panel -->
    <div class="panel checklist-panel">...</div>
    
    <!-- EXISTING: Game Grid Panel (no changes) -->
    <div class="panel game-grid">
        <div id="levelGrid" class="level-grid"></div>
        <!-- REMOVE: grid-info div -->
    </div>
    
    <!-- MOVED: Placement Tools Panel (from top to bottom) -->
    <div class="panel placement-tools">...</div>
</div>
```

### Task 3: Split Car Management Panel (HTML)
**File**: `levelCreator.html`

1. Remove car management section from level-info panel
2. Create new standalone car-management panel
3. Add experimental warning

**New Panel Structure**:
```html
<div class="panel car-management">
    <div class="panel-header">
        <h3>Car Management</h3>
        <span class="experimental-badge">⚠️ Experimental</span>
    </div>
    <div class="section car-controls">
        <button id="addCarBtn">Add Car</button>
        <button id="clearCarsBtn">Clear All Cars</button>
    </div>
    <div id="carList"></div>
</div>
```

**Location**: Insert as third panel in `.left-column`, after `.level-info`

### Task 4: Style Checklist Component (CSS)
**File**: `Assets/Styles/levelCreator.css` or `Assets/Styles/newGameStyles.css`

Add styles for checklist (MINIMAL - black on white, 1px borders only):

```css
/* Checklist Panel */
.checklist-panel {
    border: 1px solid black;
    padding: 10px;
    margin-bottom: 10px;
}

.checklist {
    display: flex;
    flex-direction: column;
}

.checklist-item {
    display: flex;
    align-items: center;
    padding: 5px;
    border-left: 1px solid black;
    margin-bottom: 5px;
}

.checklist-item.done {
    color: green;
}

.check-icon {
    margin-right: 10px;
}

.checklist-item.done .check-icon::before {
    content: '✓';
}
```

### Task 5: Style Car Management Panel (CSS)
**File**: `Assets/Styles/levelCreator.css` or `Assets/Styles/newGameStyles.css`

Add styles for experimental warning (MINIMAL):

```css
/* Car Management Panel */
.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.experimental-badge {
    color: red;
    border: 1px solid red;
    padding: 2px 5px;
}

.car-controls {
    display: flex;
    margin-bottom: 10px;
}

.car-controls button {
    margin-right: 5px;
}
```

### Task 6: Implement Checklist Logic (JavaScript)
**File**: `Assets/Scripts/levelCreator.js`

Add new state tracking and update functions:

```javascript
// Add to global state
let worldGenerated = false;
let checklistUpdateTimer = null;

// DOM elements for checklist
const checkWorldGenerated = document.getElementById('checkWorldGenerated');
const checkRoadsPlaced = document.getElementById('checkRoadsPlaced');
const checkCarPlaced = document.getElementById('checkCarPlaced');
const checkFinishPlaced = document.getElementById('checkFinishPlaced');
const checkLevelInfo = document.getElementById('checkLevelInfo');

// Function to count road pieces
function countRoadPieces() {
    let count = 0;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = grid[y][x];
            // Count each connection (N, E, S, W)
            for (let i = 0; i < 4; i++) {
                if (cell[i] === '1') {
                    count++;
                }
            }
        }
    }
    // Each road connection is counted twice (once from each side)
    // So divide by 2 to get actual road pieces
    return Math.floor(count / 2);
}

// Function to check if all level info fields are filled
function checkLevelInfoComplete() {
    const id = document.getElementById('id').value.trim();
    const category = document.getElementById('category').value.trim();
    const name = document.getElementById('name').value.trim();
    const author = document.getElementById('author').value.trim();
    const instructions = document.getElementById('instructions').value.trim();
    
    return id && category && name && author && instructions;
}

// Function to update checklist UI
function updateChecklist() {
    // 1. World generated
    if (worldGenerated) {
        checkWorldGenerated.classList.add('done');
    } else {
        checkWorldGenerated.classList.remove('done');
    }
    
    // 2. Roads placed (at least 3 pieces)
    const roadCount = countRoadPieces();
    if (roadCount >= 3) {
        checkRoadsPlaced.classList.add('done');
    } else {
        checkRoadsPlaced.classList.remove('done');
    }
    
    // 3. Car placed
    if (cars.length > 0) {
        checkCarPlaced.classList.add('done');
    } else {
        checkCarPlaced.classList.remove('done');
    }
    
    // 4. Finish placed
    if (finishPos !== null) {
        checkFinishPlaced.classList.add('done');
    } else {
        checkFinishPlaced.classList.remove('done');
    }
    
    // 5. Level info complete
    if (checkLevelInfoComplete()) {
        checkLevelInfo.classList.add('done');
    } else {
        checkLevelInfo.classList.remove('done');
    }
}

// Debounced checklist update for input fields
function scheduleChecklistUpdate() {
    if (checklistUpdateTimer) {
        clearTimeout(checklistUpdateTimer);
    }
    checklistUpdateTimer = setTimeout(updateChecklist, 300);
}
```

### Task 7: Hook Checklist Updates (JavaScript)
**File**: `Assets/Scripts/levelCreator.js`

Add checklist update calls to existing functions:

1. **Create Level button** - Set `worldGenerated = true` and update checklist
2. **toggleConnection()** - Update checklist after modifying roads
3. **handleCarPlacement()** - Update checklist after adding car
4. **removeCar()** - Update checklist after removing car
5. **clearAllCars()** - Update checklist after clearing cars
6. **handleCellClick()** (finish placement) - Update checklist
7. **setLevelDetails()** - Update checklist when loading level
8. **Level info input fields** - Add event listeners for input changes

**Modifications**:

```javascript
// Modify Create Level button handler
document.getElementById('createLevelBtn').onclick = () => {
    // ... existing code ...
    
    // Set world generated flag
    worldGenerated = true;
    
    // Update checklist
    updateChecklist();
    
    debug(`Created new ${cols}x${rows} level`);
};

// Modify toggleConnection
function toggleConnection(y1, x1, y2, x2, dir1, dir2) {
    // ... existing code ...
    
    renderGrid();
    updateChecklist(); // ADD THIS
}

// Modify handleCarPlacement
function handleCarPlacement(y, x) {
    // ... existing code ...
    
    renderGrid();
    renderCarList();
    updateChecklist(); // ADD THIS
}

// Modify removeCar
function removeCar(carId) {
    // ... existing code ...
    
    renderGrid();
    renderCarList();
    updateChecklist(); // ADD THIS
}

// Modify clearAllCars
function clearAllCars() {
    // ... existing code ...
    
    renderGrid();
    renderCarList();
    updateChecklist(); // ADD THIS
}

// Modify handleCellClick (finish placement)
function handleCellClick(y, x) {
    if (placeMode === 'finish') {
        finishPos = [y, x];
        // ... existing code ...
        updateChecklist(); // ADD THIS
        renderGrid();
    }
    // ... rest of function ...
}

// Modify setLevelDetails
function setLevelDetails(level) {
    // ... existing code ...
    
    worldGenerated = true; // Set flag when loading level
    updateChecklist(); // ADD THIS
}

// Add input event listeners in DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    
    // Add checklist update listeners for level info fields
    ['id', 'category', 'name', 'author', 'instructions'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', scheduleChecklistUpdate);
        }
    });
});
```

### Task 8: Add Enter Key Support for Create Level
**File**: `Assets/Scripts/levelCreator.js`

Add keyboard event listener:

```javascript
// Add in DOMContentLoaded or at initialization
widthInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('createLevelBtn').click();
    }
});

heightInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('createLevelBtn').click();
    }
});
```

### Task 9: Remove Grid Info Display (JavaScript)
**File**: `Assets/Scripts/levelCreator.js`

1. Remove or comment out references to removed DOM elements:
   - `carsPlacedInfo`
   - `finishInfo`
2. Update `updateGridInfo()` function to only update `gridSizeInfo`

```javascript
// Update this function
function updateGridInfo() {
    gridSizeInfo.textContent = `${cols}x${rows}`;
    // REMOVE: carsPlacedInfo.textContent = cars.length;
    // REMOVE: finishInfo.textContent = finishPos ? `(${finishPos[1]}, ${finishPos[0]})` : 'Not placed';
    
    // Update checklist instead
    updateChecklist();
}
```

### Task 10: Update Grid Info Element References (JavaScript)
**File**: `Assets/Scripts/levelCreator.js`

Remove variable declarations for deleted elements:

```javascript
// REMOVE these lines from DOM elements section:
// const carsPlacedInfo = document.getElementById('carsPlacedInfo');
// const finishInfo = document.getElementById('finishInfo');
```

## Testing Checklist

### Functionality Tests:
- [ ] Checklist shows all 5 items initially unchecked (☐)
- [ ] "Create Level" button marks "World generated" as done (✓, green)
- [ ] Pressing Enter in width/height input creates level and marks "World generated" as done
- [ ] Placing 3+ road pieces marks "Roads placed" as done
- [ ] Placing a car marks "Car placed" as done
- [ ] Placing finish marks "Finish placed" as done
- [ ] Filling all level info fields marks "Level information entered" as done
- [ ] Removing cars unchecks "Car placed" if no cars remain
- [ ] Removing finish unchecks "Finish placed"
- [ ] Loading an existing level updates checklist correctly

### UI Layout Tests:
- [ ] Right column shows: Checklist → Grid → Placement Tools (top to bottom)
- [ ] Left column shows: Level Management → Level Info → Car Management (top to bottom)
- [ ] Grid info (Cars, Finish) removed from under grid
- [ ] Car Management panel shows "⚠️ Experimental" badge
- [ ] Car Management section removed from Level Info panel
- [ ] Layout is responsive (columns stack on small screens)

### Visual Tests:
- [ ] Checklist items are gray when incomplete
- [ ] Checklist items turn green when complete
- [ ] Check icon changes from ☐ to ✓ when complete
- [ ] Experimental badge is red with warning icon
- [ ] Panels are visually distinct and organized

## Files to Modify

### 1. `levelCreator.html`
- Add checklist panel HTML
- Reorganize right column (checklist → grid → tools)
- Split car management into separate panel
- Remove grid info div

### 2. `Assets/Styles/levelCreator.css` (or `newGameStyles.css`)
- Add checklist panel styles
- Add checklist item styles (default and .done states)
- Add car management panel styles
- Add experimental badge styles
- Remove styles for deleted grid-info elements

### 3. `Assets/Scripts/levelCreator.js`
- Add checklist state variables
- Add checklist DOM element references
- Implement `countRoadPieces()` function
- Implement `checkLevelInfoComplete()` function
- Implement `updateChecklist()` function
- Implement `scheduleChecklistUpdate()` function
- Hook checklist updates into existing functions
- Add Enter key support for Create Level
- Update `updateGridInfo()` to use checklist
- Remove references to deleted DOM elements

## Implementation Order

1. **HTML Changes First** (Task 1, 2, 3)
   - Add checklist panel
   - Reorganize right column
   - Split car management panel

2. **CSS Styling** (Task 4, 5)
   - Style checklist component
   - Style car management panel with warning

3. **JavaScript Logic** (Task 6, 7, 8, 9, 10)
   - Implement checklist tracking functions
   - Hook updates into existing code
   - Add Enter key support
   - Clean up removed element references

4. **Testing** (Use testing checklist above)

## Success Criteria

- ✅ Checklist visible above grid with 5 trackable items
- ✅ Checklist updates automatically based on user actions
- ✅ "World generated" turns green after Create Level (button or Enter)
- ✅ "Roads placed" turns green at 3+ road pieces
- ✅ "Car placed" turns green when car exists
- ✅ "Finish placed" turns green when finish exists
- ✅ "Level information entered" turns green when all fields filled
- ✅ Grid info (Cars, Finish) removed from under grid
- ✅ Placement tools moved below grid
- ✅ Car Management split into separate panel
- ✅ "⚠️ Experimental" warning on Car Management panel
- ✅ All existing functionality preserved
- ✅ UI is clean, organized, and user-friendly

## Notes

- The checklist provides visual feedback to guide users through the level creation workflow
- Green checkmarks create a sense of progress and accomplishment
- Road piece counting uses actual connections in the grid (not just cells clicked)
- Level info completeness requires: id, category, name, author, instructions (defaultCode optional)
- Experimental badge warns users that Car Management is still in development
- Layout changes improve logical grouping: management/info/cars on left, checklist/grid/tools on right
