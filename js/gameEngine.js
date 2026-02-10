/**
 * gameEngine.js
 * "Catch Fruit" Game Logic
 * 
 * - Basket controlled by Pose (Left, Center, Right)
 * - Falling Items (Apple, Grape, Bomb)
 * - Collision detection and Scoring
 */

class GameEngine {
  constructor() {
    this.score = 0;
    this.level = 1;
    this.timeLimit = 60;
    this.timeLimit = 60;
    this.isGameActive = false;
    this.isGameOver = false; // Game Over state

    // Game Objects
    this.basket = { x: 100, y: 180, width: 40, height: 20, color: "blue", position: "CENTER" };
    this.items = []; // Array of {x, y, type, speed}

    // Constants
    this.LANES = [40, 100, 160]; // Left, Center, Right x-coordinates
    this.ITEM_TYPES = [
      { type: "APPLE", score: 100, color: "red", prob: 0.6 },
      { type: "GRAPE", score: 200, color: "purple", prob: 0.3 },
      { type: "BOMB", score: -500, color: "black", prob: 0.1 } // Bomb ends game or high penalty
    ];

    this.spawnRate = 1000; // ms
    this.lastSpawnTime = 0;
    this.baseSpeed = 2;

    // Callbacks
    this.onScoreChange = null;
    this.onGameEnd = null;

    // Timer
    this.gameTimer = null;
  }

  /**
   * Start the game
   */
  start(config = {}) {
    this.isGameActive = true;
    this.isGameOver = false;
    this.score = 0;
    this.level = 1;
    this.timeLimit = config.timeLimit || 60;
    this.items = [];
    this.basket.position = "CENTER";
    this.basket.x = this.LANES[1];
    this.lastSpawnTime = Date.now();

    this.startTimer();
    console.log("Game Started: Catch Fruit");
  }

  /**
   * Stop the game
   */
  stop() {
    this.isGameActive = false;
    this.isGameOver = true;
    this.clearTimer();
    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  startTimer() {
    this.clearTimer();
    this.gameTimer = setInterval(() => {
      this.timeLimit--;
      if (this.timeLimit <= 0) {
        this.stop();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
  }

  /**
   * Update game state (called every frame)
   * @param {string} poseLabel - Current detected pose
   */
  update(poseLabel) {
    if (!this.isGameActive) return;

    // 1. Update Basket Position
    this.updateBasket(poseLabel);

    // 2. Spawn Items
    const now = Date.now();
    if (now - this.lastSpawnTime > this.spawnRate) {
      this.spawnItem();
      this.lastSpawnTime = now;

      // Increase difficulty (spawn faster as level increases)
      this.spawnRate = Math.max(400, 1000 - (this.level - 1) * 100);
    }

    // 3. Update Items (Fall & Collision)
    this.updateItems();
  }

  updateBasket(poseLabel) {
    // Map Korean labels to positions
    // New labels: ["왼쪽", "오른쪽", "중앙"]
    if (poseLabel === "왼쪽") {
      this.basket.x = this.LANES[0];
      this.basket.position = "LEFT";
    } else if (poseLabel === "오른쪽") {
      this.basket.x = this.LANES[2];
      this.basket.position = "RIGHT";
    } else {
      // "중앙" or any other label including "정면", "위", "아래"
      // Default to CENTER to avoid non-responsive behavior
      this.basket.x = this.LANES[1];
      this.basket.position = "CENTER";
    }
  }

  spawnItem() {
    const laneIdx = Math.floor(Math.random() * 3);
    const x = this.LANES[laneIdx];

    // Pick item type based on probability
    const rand = Math.random();
    let typeObj = this.ITEM_TYPES[0];
    let cumulativeProb = 0;

    for (const item of this.ITEM_TYPES) {
      cumulativeProb += item.prob;
      if (rand <= cumulativeProb) {
        typeObj = item;
        break;
      }
    }

    this.items.push({
      x: x,
      y: 0,
      type: typeObj.type,
      score: typeObj.score,
      color: typeObj.color,
      speed: this.baseSpeed + (this.level * 0.5)
    });
  }

  updateItems() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.speed;

      // Check Collision with Basket
      // Basket is around y=180, height=20 -> 170~190
      if (item.y >= 170 && item.y <= 190 && item.x === this.basket.x) {
        // Hit!
        this.handleCollision(item);
        this.items.splice(i, 1);
        continue;
      }

      // Remove if off screen
      if (item.y > 200) {
        this.items.splice(i, 1);
      }
    }
  }

  handleCollision(item) {
    if (item.type === "BOMB") {
      this.stop(); // Game Over
      alert("폭탄을 받았습니다! 게임 오버!");
    } else {
      this.addScore(item.score);
    }
  }

  addScore(points) {
    this.score += points;

    // Level Up every 500 points
    if (Math.floor(this.score / 500) + 1 > this.level) {
      this.level++;
    }

    if (this.onScoreChange) {
      this.onScoreChange(this.score, this.level);
    }
  }

  /**
   * Draw game elements on canvas
   * @param {CanvasRenderingContext2D} ctx 
   */
  render(ctx) {
    if (!this.isGameActive && !this.isGameOver) return;

    // Draw Basket (Emoji)
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🧺", this.basket.x, this.basket.y);

    // Reset text align for other elements if needed
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    // Draw Items
    for (const item of this.items) {
      // Use emojis instead of circles
      ctx.font = "24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      let emoji = "🍎";
      if (item.type === "GRAPE") emoji = "🍇";
      else if (item.type === "BOMB") emoji = "💣";

      ctx.fillText(emoji, item.x, item.y);

      // Reset text align - important for other drawings!
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }

    // Draw HUD (Heads Up Display)
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    ctx.fillText(`Score: ${this.score}`, 10, 20);
    ctx.fillText(`Time: ${this.timeLimit}`, 150, 20);
    ctx.fillText(`Lv: ${this.level}`, 90, 20);

    // Draw Game Over Screen
    if (this.isGameOver) {
      // Semi-transparent background
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, 200, 200);

      // Game Over Text
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = "bold 30px Arial";
      ctx.fillText("GAME OVER", 100, 80);

      // Score Text
      ctx.fillStyle = "#FF4D80"; // Pink color
      ctx.font = "bold 24px Arial";
      ctx.fillText(`Score: ${this.score}`, 100, 120);

      // Reset text align
      ctx.textAlign = "start";
    }
  }

  onPoseDetected(poseLabel) {
    // This is called by main.js, we use it to update state
    this.update(poseLabel);
  }

  // Setters for callbacks
  setScoreChangeCallback(callback) { this.onScoreChange = callback; }
  setGameEndCallback(callback) { this.onGameEnd = callback; }
  setCommandChangeCallback(callback) { } // Unused in this game
}

window.GameEngine = GameEngine;
