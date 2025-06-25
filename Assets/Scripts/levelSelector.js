import { navigateToLevel, loadCustomLevel, getLevelDifficulty } from './commonFunctions.js';

let allLevels = [];

async function initializeLevelSelector() {
    try {
        allLevels = await loadLevelsFromAPI();
        displayLevels(allLevels);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('level-selector').style.display = 'block';
    } catch (error) {
        console.error('Failed to load levels:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = 'Failed to load levels. Please try refreshing the page.';
    }
}

function loadLevelsFromAPI() {
    return fetch('https://wjhulzebosch.nl/json_ape/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'list', category: 'sd_racer' })
    }).then(r => r.json())
    .then(response => {
        // Extract ids from response and fetch each level
        const { ids } = response;
        return Promise.all(
            ids.map(async id => {
                const level = await fetch('https://wjhulzebosch.nl/json_ape/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ action: 'get', category: 'sd_racer', id })
                }).then(r => r.json());
                level.apiId = id;
                return level;
            })
        );
    });
}

function displayLevels(levels) {
    const categoriesContainer = document.getElementById('level-categories');
    categoriesContainer.innerHTML = '';
    
    // Group levels by category
    const categories = {};
    levels.forEach(level => {
        const category = level.category || 'Uncategorized';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(level);
    });
    
    // Create category elements
    Object.keys(categories).forEach(categoryName => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'level-category';
        
        const categoryHeader = document.createElement('div');
        categoryHeader.textContent = categoryName;
        categoryHeader.className = 'category-header';
        
        const levelList = document.createElement('div');
        levelList.className = 'level-list';
        
        // Add level items
        categories[categoryName].forEach(levelData => {
            const levelItem = document.createElement('div');
            levelItem.className = 'level-item';
            levelItem.onclick = () => {
                window.location.href = `game.html?levelId=${levelData.apiId}`;
            };
            
            const levelName = document.createElement('span');
            levelName.className = 'level-name';
            levelName.textContent = levelData.name || `Level ${levelData.apiId}`;
            
            const difficulty = document.createElement('span');
            const difficultyLevel = getLevelDifficulty(levelData);
            difficulty.className = `level-difficulty difficulty-${difficultyLevel}`;
            
            // Convert numeric difficulty to string representation
            const difficultyText = ['Easy', 'Easy', 'Medium', 'Hard', 'Expert'][difficultyLevel - 1] || 'Easy';
            difficulty.textContent = difficultyText;
            
            levelItem.appendChild(levelName);
            levelItem.appendChild(difficulty);
            levelList.appendChild(levelItem);
        });
        
        categoryDiv.appendChild(categoryHeader);
        categoryDiv.appendChild(levelList);
        categoriesContainer.appendChild(categoryDiv);
    });
}

// Set up custom level loader
document.getElementById('loadCustomBtn').onclick = () => {
    document.getElementById('custom-level-modal').style.display = 'block';
    document.getElementById('custom-level-textarea').focus();
};

document.getElementById('cancelCustomBtn').onclick = () => {
    document.getElementById('custom-level-modal').style.display = 'none';
    document.getElementById('custom-level-textarea').value = '';
};

document.getElementById('loadCustomLevelBtn').onclick = () => {
    const levelData = document.getElementById('custom-level-textarea').value;
    try {
        const parsedData = JSON.parse(levelData);
        if (parsedData.rows) {
            // Store custom level data in localStorage for game.html to pick up
            localStorage.setItem('sdRacer_customLevel', JSON.stringify(parsedData));
            window.location.href = 'game.html?levelId=custom';
        } else {
            alert('Invalid level format. Please make sure the JSON contains "rows" field.');
        }
    } catch (e) {
        alert('Invalid JSON format. Please check your level data.');
    }
};

// Close modal when clicking outside
document.getElementById('custom-level-modal').onclick = (e) => {
    if (e.target.id === 'custom-level-modal') {
        document.getElementById('custom-level-modal').style.display = 'none';
        document.getElementById('custom-level-textarea').value = '';
    }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeLevelSelector); 