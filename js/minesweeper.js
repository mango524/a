/**
 * minesweeper.js
 * 9x9 Minesweeper Game
 */

class Minesweeper {
    constructor() {
        this.ROWS = 9;
        this.COLS = 9;
        this.MINE_COUNT = 9;
        this.CELL_SIZE = 500 / 9; // Canvas is 500x500

        this.grid = []; // 2D array: { isMine, isRevealed, neighborCount, isFlagged }
        this.isGameOver = false;
        this.isGameWon = false;
        this.isActive = false;

        // 'REVEAL' (Number) or 'FLAG' (Mine)
        this.mode = 'REVEAL';
    }

    init() {
        this.isActive = true;
        this.isGameOver = false;
        this.isGameWon = false;
        this.mode = 'REVEAL';
        this.createGrid();
        this.placeMines();
        this.calculateNeighbors();
    }

    setMode(mode) {
        this.mode = mode;
        console.log("Mode set to:", this.mode);
    }

    createGrid() {
        this.grid = [];
        for (let r = 0; r < this.ROWS; r++) {
            const row = [];
            for (let c = 0; c < this.COLS; c++) {
                row.push({
                    isMine: false,
                    isRevealed: false,
                    neighborCount: 0,
                    isFlagged: false
                });
            }
            this.grid.push(row);
        }
    }

    placeMines() {
        let minesPlaced = 0;
        while (minesPlaced < this.MINE_COUNT) {
            const r = Math.floor(Math.random() * this.ROWS);
            const c = Math.floor(Math.random() * this.COLS);

            if (!this.grid[r][c].isMine) {
                this.grid[r][c].isMine = true;
                minesPlaced++;
            }
        }
    }

    calculateNeighbors() {
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.grid[r][c].isMine) continue;

                let count = 0;
                // Check 8 neighbors
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
                            if (this.grid[nr][nc].isMine) count++;
                        }
                    }
                }
                this.grid[r][c].neighborCount = count;
            }
        }
    }

    handleClick(x, y) {
        if (!this.isActive || this.isGameOver || this.isGameWon) return;

        const c = Math.floor(x / this.CELL_SIZE);
        const r = Math.floor(y / this.CELL_SIZE);

        if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS) {
            if (this.mode === 'REVEAL') {
                this.reveal(r, c);
            } else if (this.mode === 'FLAG') {
                this.toggleFlag(r, c);
            }
            this.checkWinCondition();
        }
    }

    toggleFlag(r, c) {
        const cell = this.grid[r][c];
        if (cell.isRevealed) return;

        cell.isFlagged = !cell.isFlagged;
    }

    reveal(r, c) {
        const cell = this.grid[r][c];
        if (cell.isRevealed || cell.isFlagged) return;

        cell.isRevealed = true;

        if (cell.isMine) {
            this.isGameOver = true;
            this.revealAllMines();
            setTimeout(() => alert("💥 쾅! 지뢰를 밟았습니다."), 100);
        } else if (cell.neighborCount === 0) {
            // Flood fill for empty cells
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
                        if (!this.grid[nr][nc].isRevealed) {
                            this.reveal(nr, nc);
                        }
                    }
                }
            }
        }
    }

    revealAllMines() {
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.grid[r][c].isMine) {
                    this.grid[r][c].isRevealed = true;
                }
            }
        }
    }

    checkWinCondition() {
        if (this.isGameOver) return;

        let unrevealedSafeCells = 0;
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (!this.grid[r][c].isMine && !this.grid[r][c].isRevealed) {
                    unrevealedSafeCells++;
                }
            }
        }

        if (unrevealedSafeCells === 0) {
            this.isGameWon = true;
            this.isGameOver = true;
            // Text will be rendered in render()
        }
    }

    render(ctx) {
        if (!this.isActive) return;

        // Background
        ctx.fillStyle = "#ccc";
        ctx.fillRect(0, 0, 500, 500);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "20px Arial";

        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const x = c * this.CELL_SIZE;
                const y = r * this.CELL_SIZE;
                const cell = this.grid[r][c];

                // Draw Cell Border
                ctx.strokeStyle = "#888";
                ctx.strokeRect(x, y, this.CELL_SIZE, this.CELL_SIZE);

                if (cell.isRevealed) {
                    if (cell.isMine) {
                        ctx.fillStyle = "#ffcccc";
                        ctx.fillRect(x, y, this.CELL_SIZE, this.CELL_SIZE);
                        ctx.fillStyle = "black";
                        ctx.fillText("💣", x + this.CELL_SIZE / 2, y + this.CELL_SIZE / 2);
                    } else {
                        ctx.fillStyle = "#eee";
                        ctx.fillRect(x, y, this.CELL_SIZE, this.CELL_SIZE);
                        if (cell.neighborCount > 0) {
                            ctx.fillStyle = this.getNumberColor(cell.neighborCount);
                            ctx.fillText(cell.neighborCount, x + this.CELL_SIZE / 2, y + this.CELL_SIZE / 2);
                        }
                    }
                } else {
                    // Hidden cell
                    ctx.fillStyle = "#999";
                    ctx.fillRect(x + 1, y + 1, this.CELL_SIZE - 2, this.CELL_SIZE - 2);

                    // Draw Flag
                    if (cell.isFlagged) {
                        ctx.fillStyle = "red";
                        ctx.fillText("🚩", x + this.CELL_SIZE / 2, y + this.CELL_SIZE / 2);
                    }
                }
            }
        }
    }

    getNumberColor(n) {
        const colors = ["blue", "green", "red", "darkblue", "brown", "cyan", "black", "gray"];
        return colors[n - 1] || "black";
    }
}

window.Minesweeper = Minesweeper;
