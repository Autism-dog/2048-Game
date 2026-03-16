document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.querySelector('.game-container');
    const scoreDisplay = document.getElementById('score');
    const bestScoreDisplay = document.getElementById('best-score');
    const restartButton = document.getElementById('restart-button');
    const tileContainer = document.getElementById('tile-container');
    const gameMessage = document.getElementById('game-message');
    const retryButton = document.querySelector('.retry-button');
    const keepPlayingButton = document.querySelector('.keep-playing-button');

    let grid = []; // 存储数值
    let tiles = []; // 存储 Tile 对象 {r, c, value, element, mergedFrom}
    let score = 0;
    let bestScore = localStorage.getItem('bestScore') || 0;
    let isGameOver = false;
    let isWon = false;
    let keepPlaying = false;

    // 初始化游戏
    function initGame() {
        grid = Array(4).fill().map(() => Array(4).fill(0));
        tiles = [];
        score = 0;
        isGameOver = false;
        isWon = false;
        keepPlaying = false;
        bestScoreDisplay.textContent = bestScore;
        updateScore(0);
        tileContainer.innerHTML = '';
        gameMessage.style.display = 'none';
        gameMessage.className = 'game-message';

        addRandomTile();
        addRandomTile();
    }

    // 在随机空位添加方块 (2 或 4)
    function addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === 0) {
                    emptyCells.push({ r, c });
                }
            }
        }

        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            grid[r][c] = value;
            const tile = createTileElement(r, c, value, true);
            tiles.push(tile);
            return tile;
        }
        return null;
    }

    // 创建方块 DOM 元素并返回 Tile 对象
    function createTileElement(r, c, value, isNew = false) {
        const element = document.createElement('div');
        element.className = `tile tile-${value}`;
        if (isNew) element.classList.add('tile-new');
        element.textContent = value;
        
        const tile = { r, c, value, element };
        updateTilePosition(tile);
        tileContainer.appendChild(element);
        return tile;
    }

    // 更新方块位置
    function updateTilePosition(tile) {
        const cellSize = getCellSize();
        const cellGap = getCellGap();
        const x = tile.c * (cellSize + cellGap);
        const y = tile.r * (cellSize + cellGap);
        tile.element.style.transform = `translate(${x}px, ${y}px)`;
    }

    function getCellSize() {
        return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'));
    }

    function getCellGap() {
        return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-gap'));
    }

    // 更新分数
    function updateScore(amount) {
        score += amount;
        scoreDisplay.textContent = score;
        if (score > bestScore) {
            bestScore = score;
            bestScoreDisplay.textContent = bestScore;
            localStorage.setItem('bestScore', bestScore);
        }
    }

    // 移动逻辑
    function move(direction) {
        if (isGameOver || (isWon && !keepPlaying)) return;

        let moved = false;
        const mergedThisTurn = Array(4).fill().map(() => Array(4).fill(false));
        const newTiles = [];
        const tilesToRemove = [];

        // 辅助函数：获取指定位置的 Tile
        const getTileAt = (r, c) => tiles.find(t => t.r === r && t.c === c && !tilesToRemove.includes(t));

        const traverse = (direction, callback) => {
            const rows = [0, 1, 2, 3];
            const cols = [0, 1, 2, 3];
            if (direction === 'right') cols.reverse();
            if (direction === 'down') rows.reverse();

            rows.forEach(r => {
                cols.forEach(c => {
                    callback(r, c);
                });
            });
        };

        const vector = {
            left: { r: 0, c: -1 },
            right: { r: 0, c: 1 },
            up: { r: -1, c: 0 },
            down: { r: 1, c: 0 }
        }[direction];

        traverse(direction, (r, c) => {
            const tile = getTileAt(r, c);
            if (tile) {
                let currR = r;
                let currC = c;
                let nextR = r + vector.r;
                let nextC = c + vector.c;

                // 寻找最远空位
                while (nextR >= 0 && nextR < 4 && nextC >= 0 && nextC < 4 && grid[nextR][nextC] === 0) {
                    currR = nextR;
                    currC = nextC;
                    nextR += vector.r;
                    nextC += vector.c;
                }

                // 检查是否可以合并
                if (nextR >= 0 && nextR < 4 && nextC >= 0 && nextC < 4 && 
                    grid[nextR][nextC] === tile.value && !mergedThisTurn[nextR][nextC]) {
                    
                    const targetTile = getTileAt(nextR, nextC);
                    
                    // 更新逻辑网格
                    grid[tile.r][tile.c] = 0;
                    grid[nextR][nextC] *= 2;
                    
                    // 移动当前 tile 到目标位置
                    tile.r = nextR;
                    tile.c = nextC;
                    updateTilePosition(tile);
                    tilesToRemove.push(tile);

                    // 标记合并
                    mergedThisTurn[nextR][nextC] = true;
                    updateScore(grid[nextR][nextC]);
                    
                    if (grid[nextR][nextC] === 2048 && !isWon) isWon = true;

                    // 稍后更新目标 tile 的数值和动画
                    setTimeout(() => {
                        targetTile.value *= 2;
                        targetTile.element.textContent = targetTile.value;
                        targetTile.element.className = `tile tile-${targetTile.value} tile-merged`;
                        tile.element.remove();
                    }, 100);

                    moved = true;
                } else if (currR !== r || currC !== c) {
                    // 移动到最远空位
                    grid[tile.r][tile.c] = 0;
                    grid[currR][currC] = tile.value;
                    tile.r = currR;
                    tile.c = currC;
                    updateTilePosition(tile);
                    moved = true;
                }
            }
        });

        if (moved) {
            // 清理已移除的 tiles
            tiles = tiles.filter(t => !tilesToRemove.includes(t));
            
            setTimeout(() => {
                addRandomTile();
                checkGameOver();
                if (isWon && !keepPlaying) {
                    showGameMessage('你赢了！');
                    gameMessage.classList.add('game-won');
                }
            }, 100);
        }
    }

    // 检查游戏结束
    function checkGameOver() {
        // 检查是否有空位
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === 0) return;
            }
        }

        // 检查是否有可以合并的相邻方块
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (c < 3 && grid[r][c] === grid[r][c + 1]) return;
                if (r < 3 && grid[r][c] === grid[r + 1][c]) return;
            }
        }

        isGameOver = true;
        showGameMessage('游戏结束！');
        gameMessage.classList.add('game-over');
    }

    function showGameMessage(text) {
        gameMessage.querySelector('p').textContent = text;
        gameMessage.style.display = 'flex';
        if (isWon && !keepPlaying) {
            keepPlayingButton.style.display = 'inline-block';
        } else {
            keepPlayingButton.style.display = 'none';
        }
    }

    // 事件监听
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowleft', 'a'].includes(key)) move('left');
        else if (['arrowright', 'd'].includes(key)) move('right');
        else if (['arrowup', 'w'].includes(key)) move('up');
        else if (['arrowdown', 's'].includes(key)) move('down');
    });

    // 触摸支持
    let touchStartX, touchStartY;
    gameContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    gameContainer.addEventListener('touchend', (e) => {
        if (!touchStartX || !touchStartY) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) > 30) {
                move(dx > 0 ? 'right' : 'left');
            }
        } else {
            if (Math.abs(dy) > 30) {
                move(dy > 0 ? 'down' : 'up');
            }
        }
        
        touchStartX = null;
        touchStartY = null;
    }, { passive: true });

    // 窗口调整大小时更新位置
    window.addEventListener('resize', () => {
        tiles.forEach(tile => updateTilePosition(tile));
    });

    restartButton.addEventListener('click', initGame);
    retryButton.addEventListener('click', initGame);
    keepPlayingButton.addEventListener('click', () => {
        keepPlaying = true;
        gameMessage.style.display = 'none';
    });

    // 启动游戏
    initGame();
});
