# Level Creator Redesign Plan

## Overview
Redesign the levelCreator.html with a clean, functional layout using ABSOLUTE MINIMAL CSS styling. Focus on structure and positioning only.

## New Layout Structure

```
<body>
  <div class="content">
    <div class="title">
      <h1>Level Creator - sdRacer</h1>
    </div>
    
    <div class="explanation">
      <!-- Instructions/explanation text -->
    </div>
    
    <div class="creator-main">
      <!-- Two column layout (horizontal flexbox) -->
      
      <div class="left-column">
        <!-- LEVEL MANAGEMENT PANEL -->
        <div class="panel level-management">
          <h3>Level Management</h3>
          <!-- Grid Settings -->
          <div class="section grid-settings">
            <label>Width: <input id="width"></label>
            <label>Height: <input id="height"></label>
            <button id="generateMazeBtn">Generate Maze</button>
          </div>
          
          <!-- Import/Export -->
          <div class="section import-export">
            <button id="showJsonBtn">Export JSON</button>
            <button id="loadJsonBtn">Import JSON</button>
            <textarea id="jsonArea"></textarea>
          </div>
          
          <!-- Load Existing -->
          <div class="section load-existing">
            <select id="levelSelector"></select>
            <button id="loadLevelBtn">Load Level</button>
          </div>
          
          <!-- Play Level -->
          <div class="section play-level">
            <button id="playLevelBtn">Play Level</button>
          </div>
        </div>
        
        <!-- LEVEL INFO PANEL -->
        <div class="panel level-info">
          <h3>Level Information</h3>
          
          <!-- Basic Info -->
          <div class="section basic-info">
            <label>Level ID: <input id="id"></label>
            <label>Category: <input id="category"></label>
            <label>Name: <input id="name"></label>
            <label>Author: <input id="author"></label>
          </div>
          
          <!-- Win Condition -->
          <div class="section win-condition">
            <label>Win Condition: <select id="winCondition"></select></label>
          </div>
          
          <!-- Instructions -->
          <div class="section instructions">
            <label>Instructions: <textarea id="instructions"></textarea></label>
          </div>
          
          <!-- Default Code -->
          <div class="section default-code">
            <label>Default Code: <textarea id="defaultCode"></textarea></label>
          </div>
          
          <!-- Car Management -->
          <div class="section car-management">
            <h4>Car Management</h4>
            <button id="addCarBtn">Add Car</button>
            <button id="clearCarsBtn">Clear All Cars</button>
            <div id="carList"></div>
          </div>
        </div>
      </div>
      
      <div class="right-column">
        <!-- PLACEMENT TOOLS PANEL -->
        <div class="panel placement-tools">
          <h3>Placement Tools</h3>
          <div class="tool-group">
            <span>Cars:</span>
            <span id="redCarIcon" class="tool-icon"></span>
            <span id="blueCarIcon" class="tool-icon"></span>
            <span id="greenCarIcon" class="tool-icon"></span>
            <span id="yellowCarIcon" class="tool-icon"></span>
          </div>
          <div class="tool-group">
            <span>Objects:</span>
            <span id="finishIcon" class="tool-icon"></span>
            <span id="cowIcon" class="tool-icon"></span>
            <span id="trafficLightIcon" class="tool-icon"></span>
          </div>
          <div id="placementStatus"></div>
        </div>
        
        <!-- GAME GRID -->
        <div class="panel game-grid">
          <div id="levelGrid" class="level-grid"></div>
          <div class="grid-info">
            <span>Grid: <span id="gridSizeInfo"></span></span>
            <span>Cars: <span id="carsPlacedInfo"></span></span>
            <span>Finish: <span id="finishInfo"></span></span>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Car Configuration Modal (keep as is) -->
  <div id="carModal">...</div>
</body>
```

## CSS Requirements (ABSOLUTE MINIMAL)

### Layout Structure:
1. `.content` - Main vertical container
2. `.title` - Centered title
3. `.explanation` - Full-width explanation text
4. `.creator-main` - Horizontal flexbox (2 columns)
5. `.left-column` - Vertical flexbox, flex: 1
6. `.right-column` - Vertical flexbox, flex: 1
7. `.panel` - Individual panels with border, vertical layout
8. `.section` - Sections within panels, with gap

### Responsive Behavior:
- `.creator-main` uses `flex-wrap: wrap` to stack columns vertically on smaller screens
- Both columns have `min-width: 45%` to ensure ~50% split
- On wrap, each column takes full width

### Required Styles:
- **Panels**: `border: 1px solid`, `padding`, vertical flexbox
- **Sections**: `margin-bottom` for spacing
- **Tool icons**: `width`, `height`, `border`, `cursor: pointer`, `background-image`
- **Grid**: Existing grid styles (absolute positioning for cells/borders)
- **Modal**: `position: fixed`, `background: rgba()` for overlay
- **Inputs/textareas**: Basic `border`, `padding`, `width: 100%`
- **Buttons**: `border`, `padding`, `cursor: pointer`

### Explicitly Excluded:
- ❌ No background colors (except modal overlay and white for modal content)
- ❌ No gradients
- ❌ No rounded borders
- ❌ No box shadows
- ❌ No transitions/animations
- ❌ No hover effects (except for tool icons - may add simple border change)
- ❌ No fancy typography

### Allowed Only:
- ✅ Flexbox positioning
- ✅ Basic borders (1px solid)
- ✅ Padding/margins for spacing
- ✅ Width/height constraints
- ✅ Background images for tool icons
- ✅ Position properties (absolute, relative, fixed)
- ✅ Display properties

## DOM Element IDs (Must Preserve)

### Inputs/Controls:
- `#width` - Grid width input
- `#height` - Grid height input
- `#id` - Level ID input
- `#category` - Category input
- `#name` - Level name input
- `#author` - Author input
- `#winCondition` - Win condition select
- `#instructions` - Instructions textarea
- `#defaultCode` - Default code textarea
- `#jsonArea` - Import/export textarea
- `#levelSelector` - Load existing level select

### Buttons:
- `#generateMazeBtn` - Generate maze
- `#showJsonBtn` - Export JSON
- `#loadJsonBtn` - Import JSON
- `#loadLevelBtn` - Load existing level
- `#playLevelBtn` - Play level (if exists, otherwise add)
- `#addCarBtn` - Add car
- `#clearCarsBtn` - Clear all cars

### Tool Icons:
- `#redCarIcon` - Red car placement
- `#blueCarIcon` - Blue car placement
- `#greenCarIcon` - Green car placement
- `#yellowCarIcon` - Yellow car placement
- `#finishIcon` - Finish placement
- `#cowIcon` - Cow placement
- `#trafficLightIcon` - Traffic light placement

### Display Elements:
- `#levelGrid` - Grid container
- `#carList` - Car list container
- `#placementStatus` - Status message
- `#gridSizeInfo` - Grid size display
- `#carsPlacedInfo` - Cars placed count
- `#finishInfo` - Finish status

### Modal Elements:
- `#carModal` - Car configuration modal
- `#closeCarModal` - Close modal button
- `#carName` - Car name input
- `#carType` - Car type select
- `#carDirection` - Car direction select
- `#saveCarBtn` - Save car button
- `#cancelCarBtn` - Cancel button

## Implementation Tasks

### Task 1: Update levelCreator.html Structure
- [ ] Wrap content in `.content` div
- [ ] Add `.title` section with h1
- [ ] Add `.explanation` section with instructions (simplified)
- [ ] Create `.creator-main` with horizontal flexbox
- [ ] Build `.left-column` with two panels:
  - [ ] Level Management panel (grid settings, maze gen, import/export, load, play)
  - [ ] Level Info panel (basic info, win condition, instructions, code, car mgmt)
- [ ] Build `.right-column` with two panels:
  - [ ] Placement Tools panel (car icons, object icons, status)
  - [ ] Game Grid panel (grid container, grid info)
- [ ] Keep car modal at end of body (preserve structure)
- [ ] Link to `newGameStyles.css`

### Task 2: Add Level Creator Styles to newGameStyles.css
- [ ] Style `.creator-main` as horizontal flexbox with wrap
- [ ] Style `.left-column` and `.right-column` with flex: 1, min-width: 45%
- [ ] Style `.panel` with border and padding
- [ ] Style `.section` with bottom margin
- [ ] Add tool icon styles (width, height, border, background-image)
- [ ] Preserve existing grid styles (cells, borders)
- [ ] Style car modal (position fixed, overlay background)
- [ ] Add minimal input/textarea/button styles
- [ ] **NO decorative styling**

### Task 3: Simplify Explanation Text
- [ ] Condense long explanation into concise bullet points
- [ ] Remove repetitive instructions
- [ ] Keep essential workflow info only

### Task 4: Test Functionality
- [ ] Verify all form inputs work
- [ ] Test grid creation and resizing
- [ ] Test placement tools (cars, finish, cow, traffic light)
- [ ] Test maze generation
- [ ] Test import/export JSON
- [ ] Test load existing level
- [ ] Test car management (add, edit, delete)
- [ ] Verify modal opens/closes
- [ ] Check responsive layout (columns stack on small screens)

## File Changes Summary

### Files to Modify:
1. `levelCreator.html` - Complete restructure
2. `newGameStyles.css` - Add level creator styles

### Files NOT Modified:
- `levelCreator.js` - No changes (works with same DOM IDs)
- `mazeCreator.js` - No changes

## Success Criteria

1. ✅ Clean two-column layout (left: management/info, right: tools/grid)
2. ✅ All panels clearly separated with borders
3. ✅ Level Management and Level Info grouped logically in left column
4. ✅ Placement Tools and Game Grid grouped in right column
5. ✅ Generate Maze button in Level Management section
6. ✅ Responsive layout (stacks vertically on small screens)
7. ✅ All existing functionality preserved
8. ✅ **Absolutely minimal CSS** - only structure and positioning
9. ✅ No decorative styling whatsoever
10. ✅ Concise, clear explanation at top

## Notes

- The JavaScript files use specific DOM IDs, so we must preserve all IDs
- Grid rendering uses absolute positioning (preserve existing styles)
- Tool icons need background images from existing texture files
- Modal overlay needs semi-transparent background for visibility
- Focus is purely on functional layout, not appearance
- User wants NO decorative styling - prepare for designer to style later
