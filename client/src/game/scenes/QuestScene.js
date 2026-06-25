// Main scene for Phase 3. Loads a quest definition, draws the map
// (walls + goal), spawns the knight, and exposes a KnightController.
//
// In sprint 3.4 the quest is passed via scene data when the scene is
// started. Keyboard input still drives the controller for manual
// testing; the same controller will later be passed to generated
// code from Blockly without changes to this scene.
import Phaser from 'phaser'
import { TILE_SIZE, GRID_WIDTH, GRID_HEIGHT } from '../config'
import KnightController from '../KnightController'

const FLOOR_VARIANTS = 16
const WALL_VARIANTS = 15
const GOAL_VARIANTS = 2

// Reads a tile index from an optional matrix, falling back to 0 when the
// matrix is absent or the cell is out of range, so quests without
// floorTiles/wallTiles still render with a default look.
function tileIndexAt(matrix, x, y, fallback = 0) {
  if (!matrix || !matrix[y] || matrix[y][x] === undefined) return fallback
  return matrix[y][x]
}
class QuestScene extends Phaser.Scene {
  constructor() {
    super({ key: 'QuestScene' })
  }

  // Loads all sprite images before the scene is drawn. Files live under
  // client/public/sprites, served at /sprites by Vite. Kenney assets
  // (CC0), 16x16, scaled up by Phaser with pixelArt rendering.
  preload() {
    this.load.image('knight', '/sprites/knight.png')
    this.load.image('goblin_a', '/sprites/goblin_a.png')
    this.load.image('goblin_b', '/sprites/goblin_b.png')
    for (let i = 0; i < GOAL_VARIANTS; i++) this.load.image(`goal_${i}`, `/sprites/goal_${i}.png`)
    for (let i = 0; i < FLOOR_VARIANTS; i++) {
      this.load.image(`floor_${i}`, `/sprites/floor/floor_${i}.png`)
    }
    for (let i = 0; i < WALL_VARIANTS; i++) {
      this.load.image(`wall_${i}`, `/sprites/wall/wall_${i}.png`)
    }
  }

  // Phaser calls init() with the data passed to scene.start(key, data).
  // We use it to grab the quest definition before create() runs.
  init(data) {
    this.quest = data.quest
    this.onQuestComplete = data.onQuestComplete
    this.onQuestReset = data.onQuestReset
  }

  create() {
    this.drawFloor()
    this.drawGrid()
    this.drawWalls(this.quest.walls)
    this.drawGoal(this.quest.goal)
    this.drawEnemies(this.quest.enemies)

    // Build the knight container with a body and a facing arrow.
    const { x: startX, y: startY, facing } = this.quest.startPosition

    // The knight is a single image. We still rotate it to show facing,
    // so the sprite should read well when turned (a top-down or side view
    // works best). setOrigin(0.5) keeps rotation centered on the cell.
    this.knightSprite = this.add.image(0, 0, 'knight')
    this.knightSprite.setDisplaySize(TILE_SIZE * 0.9, TILE_SIZE * 0.9)
    this.knightSprite.setOrigin(0.5)

    this.knightSprite.x = startX * TILE_SIZE + TILE_SIZE / 2
    this.knightSprite.y = startY * TILE_SIZE + TILE_SIZE / 2

    // Apply initial facing rotation so the arrow points the right way.
    const initialRotation = {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: -Math.PI / 2,
    }[facing]
    this.knightSprite.rotation = initialRotation

    // Build the controller with the quest's walls and goal.
    this.knight = new KnightController(this, this.knightSprite, {
      startX,
      startY,
      facing,
      walls: this.quest.walls,
      // Only 'reach' quests have a goal cell; 'defeat_all' wins on kills.
      goal:
        this.quest.goal.type === 'reach'
          ? { x: this.quest.goal.x, y: this.quest.goal.y }
          : null,
      goalType: this.quest.goal.type,
      enemies: this.quest.enemies || [],
      onEnemyDefeated: (enemy) => this.handleEnemyDefeated(enemy),
      onGoalReached: () => this.onQuestComplete?.(),
    })

    this.questComplete = false

    // Dev convenience: pilot the knight from the browser console.
    if (typeof window !== 'undefined') {
      window.knight = this.knight
    }

    // Keyboard bindings, same as sprint 3.3.
    this.isBusy = false
    // Phaser sometimes loses keyboard focus when the canvas is embedded
    // in a React DOM tree. Forcing the target to `window` ensures arrow
    // keys are captured regardless of which element is focused.
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE')
    this.cursors = this.input.keyboard.createCursorKeys()
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    )
  }

  update() {
    if (this.isBusy) return

    if (this.cursors.up.isDown)         this.runAction(() => this.knight.moveForward())
    else if (this.cursors.left.isDown)  this.runAction(() => this.knight.turnLeft())
    else if (this.cursors.right.isDown) this.runAction(() => this.knight.turnRight())
    else if (this.spaceKey.isDown)      this.runAction(() => this.knight.attack())
  }

  // Runs a Controller action under the busy lock, then checks if the
  // quest has just been completed. We emit a Phaser event the React
  // layer subscribes to, rather than coupling the scene to React.
  async runAction(actionFn) {
    this.isBusy = true
    try {
      await actionFn()
    } finally {
      this.isBusy = false
    }
  }

  // Calls the React-supplied callback the first time the knight stands
  // on the goal cell. The flag prevents re-firing on subsequent moves.
  checkQuestComplete() {
    if (this.questComplete) return
    if (!this.knight.isAtGoal()) return

    this.questComplete = true
    this.onQuestComplete?.()
  }

  // Resets the scene to its initial state: knight back to start, and the
  // quest-complete flag re-armed so the win can trigger again. Called by
  // the React Reset button via the scene reference.
  resetQuest() {
    this.knight.reset()
    // The controller revived the enemies' state; bring their sprites back.
    Object.values(this.enemySprites).forEach((s) => s.setVisible(true))
    this.onQuestReset?.()
  }

  // ----- Drawing helpers -----

  drawGrid() {
    const graphics = this.add.graphics()
    graphics.lineStyle(1, 0x2a3147, 1)
    for (let x = 0; x <= GRID_WIDTH; x++) {
      graphics.moveTo(x * TILE_SIZE, 0)
      graphics.lineTo(x * TILE_SIZE, TILE_SIZE * GRID_HEIGHT)
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      graphics.moveTo(0, y * TILE_SIZE)
      graphics.lineTo(TILE_SIZE * GRID_WIDTH, y * TILE_SIZE)
    }
    graphics.strokePath()
  }

  // Fills every cell where walls[y][x] === 1 with a png.
  // Will be replaced by a real tilemap when Tiled integration lands.
  drawWalls(walls) {
    if (!walls) return
    const wallTiles = this.quest.wallTiles
    for (let y = 0; y < walls.length; y++) {
      for (let x = 0; x < walls[y].length; x++) {
        if (walls[y][x] === 1) {
          const v = tileIndexAt(wallTiles, x, y, 0)
          const img = this.add.image(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            `wall_${v}`
          )
          img.setDisplaySize(TILE_SIZE, TILE_SIZE)
        }
      }
    }
  }

  // Draws the goal cell as a green square so it stands out.
  // Will become a chest sprite once we have assets.
  drawGoal(goal) {
    if (!goal || goal.x === undefined) return
    // Optional goalTile picks which goal sprite to show (0 = door,
    // 1 = ladder). Absent means the default door.
    const v = this.quest.goalTile ?? 0
    const img = this.add.image(
      goal.x * TILE_SIZE + TILE_SIZE / 2,
      goal.y * TILE_SIZE + TILE_SIZE / 2,
      `goal_${v}`
    )
    img.setDisplaySize(TILE_SIZE, TILE_SIZE)
  }

  // Draws each enemy as a red square and keeps a handle to its sprite,
  // keyed by cell, so we can hide it the instant it's defeated. Becomes
  // a goblin sprite once we have art.
  drawEnemies(enemies) {
    this.enemySprites = {}
    if (!enemies) return
    enemies.forEach((e, i) => {
      // Alternate the two goblin looks so a group is not all identical.
      const key = i % 2 === 0 ? 'goblin_a' : 'goblin_b'
      const img = this.add.image(
        e.x * TILE_SIZE + TILE_SIZE / 2,
        e.y * TILE_SIZE + TILE_SIZE / 2,
        key
      )
      img.setDisplaySize(TILE_SIZE * 0.9, TILE_SIZE * 0.9)
      this.enemySprites[`${e.x},${e.y}`] = img
    })
  }

  // Lays a floor tile in every cell, picking a stable variant per cell.
  drawFloor() {
    const floorTiles = this.quest.floorTiles
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const v = tileIndexAt(floorTiles, x, y, 0)
        const img = this.add.image(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          `floor_${v}`
        )
        img.setDisplaySize(TILE_SIZE, TILE_SIZE)
      }
    }
  }


  // Hides the sprite of a defeated enemy. Called by the controller via
  // the onEnemyDefeated callback, so visuals stay in sync with state.
  handleEnemyDefeated(enemy) {
    const sprite = this.enemySprites[`${enemy.x},${enemy.y}`]
    if (sprite) sprite.setVisible(false)
  }

}

export default QuestScene