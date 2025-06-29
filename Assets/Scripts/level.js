class Level {
    constructor({ instruction = '', defaultCode = '', tiles = [[]], cars = null } = {}) {
        this.instruction = instruction;
        this.defaultCode = defaultCode;
        // Pad the tiles with one row/column of '0000' (grass) on every side
        const height = tiles.length;
        const width = tiles[0]?.length || 0;
        const grassRow = Array(width + 2).fill('0000');
        this.tiles = [
            grassRow,
            ...tiles.map(row => ['0000', ...row, '0000']),
            grassRow
        ];
        // Store cars info if provided
        this.cars = cars;
        // Determine mode
        this._singleMode = !(Array.isArray(cars) && cars.length > 1);
    }

    static fromJSON(json) {
        return new Level({
            instruction: json.instruction,
            defaultCode: json.defaultCode,
            tiles: json.tiles
        });
    }

    getTile(x, y) {
        if (
            y >= 0 && y < this.tiles.length &&
            x >= 0 && x < this.tiles[y].length
        ) {
            return this.tiles[y][x];
        }
        return null;
    }

    get width() {
        return this.tiles[0]?.length || 0;
    }

    get height() {
        return this.tiles.length;
    }

    render(gameDiv, finishPos) {
        const tileSize = 64;
        gameDiv.innerHTML = '';
        gameDiv.style.position = 'relative';
        // Remove JavaScript sizing - let CSS handle it

        for (let y = 0; y < this.tiles.length; y++) {
            for (let x = 0; x < this.tiles[y].length; x++) {
                const code = this.tiles[y][x];
                const tileDiv = document.createElement('div');
                tileDiv.className = 'level-tile';
                tileDiv.style.left = (x * tileSize) + 'px';
                tileDiv.style.top = (y * tileSize) + 'px';
                tileDiv.style.backgroundImage = `url('Assets/Textures/tiles/Road-${code}.png')`;
                gameDiv.appendChild(tileDiv);
            }
        }
        // Overlay finish image if finishPos is provided
        if (finishPos && Array.isArray(finishPos) && finishPos.length === 2) {
            const finishDiv = document.createElement('div');
            finishDiv.className = 'finish-tile';
            finishDiv.style.left = (finishPos[0] * tileSize) + 'px';
            finishDiv.style.top = (finishPos[1] * tileSize) + 'px';
            gameDiv.appendChild(finishDiv);
        }
    }

    isSingleMode() {
        return this._singleMode;
    }
}

function loadLevel1AndDisplay() {
    fetch('Assets/Maps/Levels.json')
        .then(response => response.json())
        .then(data => {
            const levelData = data.levels.find(lvl => lvl.id === '1');
            if (!levelData) {
                debug('Level 1 not found!', null, 'error');
                return;
            }
            const level = new Level({
                instruction: levelData.Instructions || '',
                defaultCode: '',
                tiles: levelData.rows
            });
            const gameDiv = document.getElementById('game');
            level.render(gameDiv);
        })
        .catch(err => debug('Failed to load level: ' + err, null, 'error'));
}

export default Level;
export { loadLevel1AndDisplay };