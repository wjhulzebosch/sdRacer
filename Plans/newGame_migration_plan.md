# Migration Plan: game.html → newGame.html

## Overview
Migrate all game functionality from `game.html` to `newGame.html` with a new functional layout structure. Focus on minimal, functional CSS positioning without decorative styling.

## Current Structure Analysis

### game.html DOM Elements Required by JS:
1. **Game Container**: `#game` - Canvas/render area for the game world
2. **Code Editor**: `#code-editor` - CodeMirror editor container
3. **Code Editor Container**: `#code-editor-container` - Wrapper for editor
4. **Parser Display**: `#parser-display` - Shows AST and validation results
5. **Instructions Panel**: `#instructions` - Shows level instructions
6. **Mode Indicator**: `#mode-indicator` - Shows single/multi-car mode
   - Child: `#mode-text` - Mode text display
   - Child: `#car-count` - Car count badge
7. **Line Count**: `#line-count` - Shows line count in editor

### Buttons Required:
- `#homeBtn` - Navigate to home
- `#infoBtn` - Show info overlay
- `#saveBtn` - Save code to localStorage
- `#loadBtn` - Load code from localStorage
- `#checkCodeBtn` - Validate code
- `#fixIndentationBtn` - Auto-indent code
- `#playBtn` - Run the code
- `#resetLvlBtn` - Reset level to initial state
- `#resetBtn` - Reset code to default

### Modal/Overlay Elements:
- `#win-message` - Win message modal
  - `#win-details` - Win message details
  - `#retryBtn` - Retry button
  - `#nextLevelBtn` - Next level button
- `#info-overlay` - Info/help overlay
  - `#closeInfoBtn` - Close button

### Editor Elements:
- `#validation-status` - Validation status text

## New Layout Structure

```
<body>
  <div class="content">
    <div class="title">
      <h1>sdRacer - code your way out</h1>
    </div>
    
    <div class="gameButtons">
      [All control buttons go here in a horizontal layout]
    </div>
    
    <div class="main">
      <!-- This is a FLEXBOX: horizontal by default, vertical when gameContainer is too large -->
      
      <div class="gameContainer">
        <!-- Visual game canvas -->
        <div id="game"></div>
        <!-- Instructions panel below game -->
        <div id="instructions"></div>
      </div>
      
      <div class="codeContainer">
        <!-- Mode indicator at top -->
        <div id="mode-indicator"></div>
        
        <!-- Code editor -->
        <div id="code-editor-container"></div>
      </div>
    </div>
    
    <div class="debug">
      <!-- Parser display / AST output -->
      <div id="parser-display"></div>
    </div>
  </div>
  
  <!-- Keep all modals at end of body -->
  <div id="win-message">...</div>
  <div id="info-overlay">...</div>
</body>
```

## CSS Requirements (Minimal Functional Only)

### Layout Rules:
1. `.content` - Main container, vertical flexbox
2. `.title` - Centers title text
3. `.gameButtons` - Horizontal layout for buttons
4. `.main` - **CRITICAL**: 
   - `display: flex`
   - `flex-direction: row` (default)
   - Use `flex-wrap: wrap` to switch to vertical when gameContainer is too wide
5. `.gameContainer` - Vertical flexbox, holds game + instructions
6. `.codeContainer` - Vertical flexbox, holds mode indicator + editor
7. `.debug` - Vertical layout, centered with `margin: 0 auto`

### Responsive Behavior:
- `.main` switches from horizontal to vertical when `.gameContainer` width exceeds a threshold
- Use `flex-wrap: wrap`
- `.gameContainer` should have `flex-shrink: 0` to prevent squishing

### JS-Required Styles:
- `#game` - Must have defined width/height for canvas rendering
- Modal displays (`#win-message`, `#info-overlay`) - Must be `display: none` initially
- Parser display - Needs `overflow-y: auto` for scrolling

### Explicitly Excluded (No Styling):
- ❌ Background colors (except where required for game rendering)
- ❌ Rounded borders
- ❌ Box shadows
- ❌ Gradients
- ❌ Fancy button styles
- ❌ Animations/transitions
- ❌ Custom fonts beyond system defaults

### Allowed Only:
- ✅ Flexbox positioning
- ✅ Basic margins/padding for spacing
- ✅ Border for visual separation (1px solid)
- ✅ Width/height constraints
- ✅ Display properties
- ✅ Overflow handling
- ✅ Game grid display styles (tile borders, etc. - from existing game logic)

## Implementation Tasks

### Task 1: Update newGame.html Structure
- [ ] Add all required DOM elements with correct IDs
- [ ] Organize elements according to new layout structure
- [ ] Include all required buttons in `.gameButtons` section
- [ ] Add mode indicator and editor container in `.codeContainer`
- [ ] Include parser display in `.debug` section
- [ ] Keep modals at end of body
- [ ] Link to `newGameStyles.css`
- [ ] Link to CodeMirror CSS
- [ ] Include all script imports from game.html
- [ ] Include CodeMirror initialization scripts

### Task 2: Create newGameStyles.css
- [ ] Set up `.content` as vertical flexbox
- [ ] Style `.title` with centered text
- [ ] Style `.gameButtons` as horizontal container with gap
- [ ] **CRITICAL**: Style `.main` as responsive flexbox (horizontal → vertical)
- [ ] Style `.gameContainer` as vertical flexbox (game + instructions)
- [ ] Style `.codeContainer` as vertical flexbox (mode + editor)
- [ ] Style `.debug` with centered layout (`margin: 0 auto`)
- [ ] Add minimal button styling (display, padding only)
- [ ] Set `#game` dimensions (min-width, min-height)
- [ ] Style modal overlays (position: fixed, display: none)
- [ ] Add scrolling to parser display
- [ ] **NO decorative styles** (colors, shadows, borders beyond 1px, etc.)

### Task 3: Test Responsive Behavior
- [ ] Verify `.main` is horizontal when gameContainer is small
- [ ] Verify `.main` switches to vertical when gameContainer is large
- [ ] Test with different level grid sizes
- [ ] Ensure all elements remain accessible
- [ ] Check that no elements overlap or get cut off

## File Changes Summary

### Files to Modify:
1. `newGame.html` - Complete rewrite with new structure
2. `newGameStyles.css` - Write from scratch (currently empty)

### Files NOT Modified:
- `game.html` - Keep as reference, no changes
- `style.css` - No changes (used by old game.html)
- All JavaScript files - No changes needed (works with DOM IDs)

## Success Criteria

1. ✅ All game functionality works in newGame.html
2. ✅ Layout switches from horizontal to vertical flexbox based on content size
3. ✅ All buttons and controls are accessible and functional
4. ✅ Code editor (CodeMirror) initializes correctly
5. ✅ Parser display shows AST/validation results
6. ✅ Win modal appears on level completion
7. ✅ Info overlay can be opened/closed
8. ✅ **Absolutely minimal CSS** - only positioning and JS-required styles
9. ✅ No decorative styling whatsoever (except game grid rendering)
10. ✅ Game looks FUNCTIONAL, not pretty

## Notes

- The JS files already use `getElementById()` for all elements, so maintaining the same IDs ensures compatibility
- CodeMirror initialization stays the same (inline scripts at bottom)
- Game rendering logic (tiles, cars, etc.) will still apply their own styles via JS
- Focus is on layout structure, not appearance
- User explicitly wants NO decorative styling at this stage
