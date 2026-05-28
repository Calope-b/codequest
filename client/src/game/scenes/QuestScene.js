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

class QuestScene extends Phaser.Scene {
  constructor() {
    super({ key: 'QuestScene' })
  }

  // Phaser calls init() with the data passed to scene.start(key, data).
  // We use it to grab the quest definition before create() runs.
  init(data) {
    this.quest = data.quest
    this.onQuestComplete = data.onQuestComplete
    this.onQuestReset = data.onQuestReset
  }

  create() {
    this.drawGrid()
    this.drawWalls(this.quest.walls)
    this.drawGoal(this.quest.goal)

    // Build the knight container with a body and a facing arrow.
    const { x: startX, y: startY, facing } = this.quest.startPosition

    this.knightSprite = this.add.container(0, 0)
    const body = this.add.rectangle(0, 0, TILE_SIZE * 0.8, TILE_SIZE * 0.8, 0xf0c674)
    const arrow = this.add.triangle(
      TILE_SIZE * 0.25, 0,
      -TILE_SIZE * 0.1, -TILE_SIZE * 0.15,
      -TILE_SIZE * 0.1, TILE_SIZE * 0.15,
      0x0f1320
    )
    this.knightSprite.add([body, arrow])

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
      goal: { x: this.quest.goal.x, y: this.quest.goal.y },
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

  // Fills every cell where walls[y][x] === 1 with a darker square.
  // Will be replaced by a real tilemap when Tiled integration lands.
  drawWalls(walls) {
    if (!walls) return
    for (let y = 0; y < walls.length; y++) {
      for (let x = 0; x < walls[y].length; x++) {
        if (walls[y][x] === 1) {
          this.add.rectangle(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
            0x2a3147
          )
        }
      }
    }
  }

  // Draws the goal cell as a green square so it stands out.
  // Will become a chest sprite once we have assets.
  drawGoal(goal) {
    if (!goal) return
    this.add.rectangle(
      goal.x * TILE_SIZE + TILE_SIZE / 2,
      goal.y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE * 0.6,
      TILE_SIZE * 0.6,
      0x6abf69
    )
  }
}

export default QuestScene