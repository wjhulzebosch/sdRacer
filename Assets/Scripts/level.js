class Level {
    constructor({ instruction = '', defaultCode = '', tiles = [[]] } = {}) {
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
        gameDiv.style.width = (this.width * tileSize) + 'px';
        gameDiv.style.height = (this.height * tileSize) + 'px';

        for (let y = 0; y < this.tiles.length; y++) {
            for (let x = 0; x < this.tiles[y].length; x++) {
                const code = this.tiles[y][x];
                const tileDiv = document.createElement('div');
                tileDiv.style.position = 'absolute';
                tileDiv.style.left = (x * tileSize) + 'px';
                tileDiv.style.top = (y * tileSize) + 'px';
                tileDiv.style.width = tileSize + 'px';
                tileDiv.style.height = tileSize + 'px';
                tileDiv.style.backgroundImage = `url('Assets/Textures/tiles/Road-${code}.png')`;
                tileDiv.style.backgroundSize = 'cover';
                tileDiv.style.boxSizing = 'border-box';
                gameDiv.appendChild(tileDiv);
            }
        }
        // Overlay finish image if finishPos is provided
        if (finishPos && Array.isArray(finishPos) && finishPos.length === 2) {
            const finishDiv = document.createElement('div');
            finishDiv.style.position = 'absolute';
            finishDiv.style.left = (finishPos[0] * tileSize) + 'px';
            finishDiv.style.top = (finishPos[1] * tileSize) + 'px';
            finishDiv.style.width = tileSize + 'px';
            finishDiv.style.height = tileSize + 'px';
            finishDiv.style.backgroundImage = "url('Assets/Textures/Finish.png')";
            finishDiv.style.backgroundSize = 'cover';
            finishDiv.style.pointerEvents = 'none';
            gameDiv.appendChild(finishDiv);
        }
    }
}

function loadLevel1AndDisplay() {
    fetch('Assets/Maps/Levels.json')
        .then(response => response.json())
        .then(data => {
            const levelData = data.levels.find(lvl => lvl.id === '1');
            if (!levelData) {
                alert('Level 1 not found!');
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
        .catch(err => alert('Failed to load level: ' + err));
}