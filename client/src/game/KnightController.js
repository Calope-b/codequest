// KnightController is the only object exposed to student code (later,
// to generated code from Blockly). It wraps the knight sprite living
// in a Phaser scene and exposes async methods that resolve only when
// the corresponding animation completes.
//
// Keeping this class separate from QuestScene gives us:
//   - A stable public API that blocks/generators depend on, decoupled
//     from Phaser internals (sprite names, animation keys, tween
//     specifics can all change without touching block code).
//   - Unit-testability: a fake scene that just records calls can
//     replace the real Phaser scene in tests, without booting Phaser.
//   - A clear security boundary: student code can only call what this
//     class exposes; it cannot reach the broader Phaser/DOM surface.
//
// See GAME_DESIGN.md section 4 for the full rationale.
import { TILE_SIZE, GRID_WIDTH, GRID_HEIGHT } from './config'

const MOVE_DURATION_MS = 200
const TURN_DURATION_MS = 150
const ATTACK_DURATION_MS = 300

// Maps a facing direction to the (dx, dy) cell offset for one step
// forward. Single source of truth for "what does forward mean".
const DIRECTION_VECTORS = {
  right: { dx: 1, dy: 0 },
  left:  { dx: -1, dy: 0 },
  up:    { dx: 0, dy: -1 },
  down:  { dx: 0, dy: 1 },
}

class KnightController {
  /**
   * @param {Phaser.Scene} scene  - The scene that owns the sprite
   * @param {object} sprite       - The Phaser game object representing the knight
   * @param {object} options
   * @param {number} options.startX   - Initial cell X
   * @param {number} options.startY   - Initial cell Y
   * @param {string} options.facing   - Initial direction ('right' by default)
   * @param {Array<Array<number>>} [options.walls] - Optional 2D grid of walls.
   *        walls[y][x] === 1 means cell (x, y) is blocked. Defaults to no walls.
   * @param {{x: number, y: number}} [options.goal] - Optional goal cell.
   */
  constructor(scene, sprite, options) {
    this.scene = scene
    this.sprite = sprite

    this.cellX = options.startX
    this.cellY = options.startY
    this.facing = options.facing || 'right'

    this.walls = options.walls || null
    this.goal = options.goal || null

    // Remember the starting state so reset() can restore it after a run.
    // We snapshot primitives (not references) so later moves don't mutate
    // these saved values.
    this.startState = {
      cellX: options.startX,
      cellY: options.startY,
      facing: options.facing || 'right',
  }
  // Callback fired once when the knight first reaches the goal cell.
  // Lives on the controller so detection works no matter how the knight
  // is driven (keyboard, console, or Blockly-generated code).
  this.onGoalReached = options.onGoalReached || null
  this.goalReached = false
}

  // ----- Movement -----

  /**
   * Moves the knight one cell forward in its current facing direction.
   * If a wall or the grid edge blocks the move, the knight stays in
   * place but the call still resolves (the failure is non-fatal so
   * student code does not need to try/catch every move).
   */
  async moveForward() {
    const { dx, dy } = DIRECTION_VECTORS[this.facing]
    const targetX = this.cellX + dx
    const targetY = this.cellY + dy

    if (!this.isCellWalkable(targetX, targetY)) {
      // Could play a "bumped into wall" animation here later.
      return
    }

    this.cellX = targetX
    this.cellY = targetY

    await this.tweenSprite(
      this.cellToPixel(targetX),
      this.cellToPixel(targetY),
      MOVE_DURATION_MS
    )

    // Once the knight has arrived, check the goal. Fire the callback only
    // the first time so it doesn't re-trigger if the knight stays put.
    if (!this.goalReached && this.isAtGoal()) {
      this.goalReached = true
      this.onGoalReached?.()
    }
}

  /**
   * Rotates the knight 90 degrees counter-clockwise. Updates `facing`
   * and animates the sprite's rotation accordingly.
   */
  async turnLeft() {
    const order = ['up', 'left', 'down', 'right']
    this.facing = order[(order.indexOf(this.facing) + 1) % order.length]
    await this.tweenRotation()
  }

  /**
   * Rotates the knight 90 degrees clockwise.
   */
  async turnRight() {
    const order = ['up', 'right', 'down', 'left']
    this.facing = order[(order.indexOf(this.facing) + 1) % order.length]
    await this.tweenRotation()
  }

  // ----- Combat -----

  /**
   * Triggers an attack animation in the current facing direction.
   * Phase 3 implements this as a brief forward-and-back jab; actual
   * damage to enemies is added in sprint 3.4 once enemies exist.
   */
  async attack() {
    const { dx, dy } = DIRECTION_VECTORS[this.facing]
    const originX = this.cellToPixel(this.cellX)
    const originY = this.cellToPixel(this.cellY)
    const jabX = originX + dx * (TILE_SIZE * 0.3)
    const jabY = originY + dy * (TILE_SIZE * 0.3)

    await this.tweenSprite(jabX, jabY, ATTACK_DURATION_MS / 2)
    await this.tweenSprite(originX, originY, ATTACK_DURATION_MS / 2)
  }

  // ----- Lifecycle -----

  /**
   * Resets the knight to its starting cell and orientation, instantly
   * (no tween). Used by the Reset button so a student can re-run a
   * program from a clean state without reloading the page.
   */
  reset() {
    this.cellX = this.startState.cellX
    this.cellY = this.startState.cellY
    this.facing = this.startState.facing

    // Snap the sprite back to the start cell's pixel position.
    this.sprite.x = this.cellToPixel(this.cellX)
    this.sprite.y = this.cellToPixel(this.cellY)

    // Restore the facing rotation to match.
    this.sprite.rotation = {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: -Math.PI / 2,
    }[this.facing]

    // Re-arm goal detection so the quest can be won again after a reset.
    this.goalReached = false
  }

  // ----- Sensors (synchronous) -----

  /**
   * Returns true if the cell directly ahead is a wall or off-grid.
   * Sensors are intentionally synchronous: they read state, they
   * don't animate, so async would be misleading.
   */
  isWallAhead() {
    const { dx, dy } = DIRECTION_VECTORS[this.facing]
    return !this.isCellWalkable(this.cellX + dx, this.cellY + dy)
  }

  /**
   * Returns true if an enemy sits in the cell directly ahead.
   * Stubbed in Phase 3.3 (no enemies yet); will read from the scene's
   * enemy list once enemies are introduced in sprint 3.4.
   */
  isEnemyAhead() {
    return false
  }

  /**
   * Returns true if the knight currently stands on the goal cell.
   * Returns false if no goal is set for this scene.
   */
  isAtGoal() {
    if (!this.goal) return false
    return this.cellX === this.goal.x && this.cellY === this.goal.y
  }

  // ----- Internals -----

  // Returns true if (x, y) is on-grid and not a wall.
  isCellWalkable(x, y) {
    if (x < 0 || x >= GRID_WIDTH) return false
    if (y < 0 || y >= GRID_HEIGHT) return false
    if (this.walls && this.walls[y] && this.walls[y][x] === 1) return false
    return true
  }

  // Wraps Phaser's tween API in a Promise so callers can await it.
  tweenSprite(x, y, duration) {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.sprite,
        x,
        y,
        duration,
        onComplete: resolve,
      })
    })
  }

  // Animates the sprite's rotation to match the current facing.
  // Rotation values are in radians; 0 means facing right.
  tweenRotation() {
    const radians = {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: -Math.PI / 2,
    }[this.facing]

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.sprite,
        rotation: radians,
        duration: TURN_DURATION_MS,
        onComplete: resolve,
      })
    })
  }

  cellToPixel(cell) {
    return cell * TILE_SIZE + TILE_SIZE / 2
  }
}

export default KnightController