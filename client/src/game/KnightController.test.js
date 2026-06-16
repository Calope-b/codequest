// client/src/game/KnightController.test.js
// Unit tests for KnightController, driven by a fake scene instead of a
// real Phaser game. This is the concrete proof of the GAME_DESIGN.md
// claim that the controller is "unit-testable without booting Phaser":
// the fake scene below records calls and resolves tweens immediately, so
// the controller's async methods complete without animation or a canvas.

import { describe, test, expect, vi } from 'vitest'

// config.js imports Phaser at module load, and Phaser's import-time
// initialization touches a real canvas 2d context that jsdom does not
// provide, which throws. The controller never needs Phaser (it reads
// only TILE_SIZE/GRID_WIDTH/GRID_HEIGHT numbers from config), so we stub
// the module out entirely. This IS the GAME_DESIGN claim made concrete:
// the controller is exercised with no game engine present at all.
vi.mock('phaser', () => ({ default: {} }))

import KnightController from './KnightController'

// A stand-in for the Phaser scene. The controller only ever touches
// scene.tweens.add({ targets, ...props, onComplete }); the real Phaser
// animates then calls onComplete, so here we apply the target props
// immediately and call onComplete synchronously. That makes every
// awaited move/turn/attack resolve at once, with no timers.
function makeFakeScene() {
  const tweenCalls = []
  return {
    tweenCalls,
    tweens: {
      add(config) {
        tweenCalls.push(config)
        // Apply the animated properties straight to the target so the
        // sprite's x/y/rotation reflect the end state, as Phaser would.
        const { targets, onComplete, duration, ...props } = config
        Object.assign(targets, props)
        if (onComplete) onComplete()
      },
    },
  }
}

// A minimal sprite: just the mutable fields the controller reads/writes.
function makeSprite() {
  return { x: 0, y: 0, rotation: 0 }
}

// Builds a controller with sensible defaults, overridable per test.
function makeKnight(options = {}) {
  const scene = makeFakeScene()
  const sprite = makeSprite()
  const knight = new KnightController(scene, sprite, {
    startX: 1,
    startY: 1,
    facing: 'right',
    ...options,
  })
  return { knight, scene, sprite }
}

describe('movement', () => {
  test('moveForward advances one cell in the facing direction', async () => {
    const { knight } = makeKnight({ startX: 1, startY: 1, facing: 'right' })
    await knight.moveForward()
    expect(knight.cellX).toBe(2)
    expect(knight.cellY).toBe(1)
  })

  test('moveForward respects the facing direction (down)', async () => {
    const { knight } = makeKnight({ startX: 1, startY: 1, facing: 'down' })
    await knight.moveForward()
    expect(knight.cellX).toBe(1)
    expect(knight.cellY).toBe(2)
  })

  test('moveForward is blocked by a wall and the knight stays put', async () => {
    // Wall directly to the right of the start cell.
    const walls = Array.from({ length: 8 }, () => Array(12).fill(0))
    walls[1][2] = 1
    const { knight } = makeKnight({ startX: 1, startY: 1, facing: 'right', walls })
    await knight.moveForward()
    expect(knight.cellX).toBe(1) // did not move
    expect(knight.cellY).toBe(1)
  })

  test('moveForward is blocked by the grid edge', async () => {
    // Facing left from column 0: the next cell is off-grid.
    const { knight } = makeKnight({ startX: 0, startY: 1, facing: 'left' })
    await knight.moveForward()
    expect(knight.cellX).toBe(0)
  })
})

describe('turning', () => {
  test('turnLeft rotates counter-clockwise', async () => {
    const { knight } = makeKnight({ facing: 'right' })
    await knight.turnLeft()
    expect(knight.facing).toBe('up')
  })

  test('turnRight rotates clockwise', async () => {
    const { knight } = makeKnight({ facing: 'right' })
    await knight.turnRight()
    expect(knight.facing).toBe('down')
  })

  test('four turnLeft calls return to the original facing', async () => {
    const { knight } = makeKnight({ facing: 'right' })
    await knight.turnLeft()
    await knight.turnLeft()
    await knight.turnLeft()
    await knight.turnLeft()
    expect(knight.facing).toBe('right')
  })
})

describe('sensors', () => {
  test('isWallAhead is true when a wall blocks the next cell', () => {
    const walls = Array.from({ length: 8 }, () => Array(12).fill(0))
    walls[1][2] = 1
    const { knight } = makeKnight({ startX: 1, startY: 1, facing: 'right', walls })
    expect(knight.isWallAhead()).toBe(true)
  })

  test('isWallAhead is true at the grid edge', () => {
    const { knight } = makeKnight({ startX: 0, startY: 1, facing: 'left' })
    expect(knight.isWallAhead()).toBe(true)
  })

  test('isWallAhead is false on an open cell', () => {
    const { knight } = makeKnight({ startX: 1, startY: 1, facing: 'right' })
    expect(knight.isWallAhead()).toBe(false)
  })

  test('isEnemyAhead detects a living enemy in front', () => {
    const { knight } = makeKnight({
      startX: 1, startY: 1, facing: 'right',
      enemies: [{ x: 2, y: 1 }],
    })
    expect(knight.isEnemyAhead()).toBe(true)
  })
})

describe('combat', () => {
  test('attacking a goblin ahead defeats it and frees its cell', async () => {
    const onEnemyDefeated = vi.fn()
    const { knight } = makeKnight({
      startX: 1, startY: 1, facing: 'right',
      enemies: [{ x: 2, y: 1 }],
      onEnemyDefeated,
    })
    expect(knight.isCellWalkable(2, 1)).toBe(false) // blocked while alive
    await knight.attack()
    expect(onEnemyDefeated).toHaveBeenCalledOnce()
    expect(knight.isCellWalkable(2, 1)).toBe(true) // freed after defeat
  })

  test('attacking empty air defeats nothing', async () => {
    const onEnemyDefeated = vi.fn()
    const { knight } = makeKnight({
      startX: 1, startY: 1, facing: 'right',
      enemies: [{ x: 5, y: 5 }],
      onEnemyDefeated,
    })
    await knight.attack()
    expect(onEnemyDefeated).not.toHaveBeenCalled()
  })
})

describe('goal detection', () => {
  test("reaching the goal cell fires onGoalReached once", async () => {
    const onGoalReached = vi.fn()
    const { knight } = makeKnight({
      startX: 1, startY: 1, facing: 'right',
      goal: { x: 2, y: 1 },
      onGoalReached,
    })
    await knight.moveForward() // steps onto (2,1)
    expect(knight.goalReached).toBe(true)
    expect(onGoalReached).toHaveBeenCalledOnce()
  })

  test('defeat_all completes only when every enemy is dead', async () => {
    const onGoalReached = vi.fn()
    const { knight } = makeKnight({
      startX: 1, startY: 1, facing: 'right',
      goalType: 'defeat_all',
      enemies: [{ x: 2, y: 1 }],
      onGoalReached,
    })
    await knight.attack()
    expect(knight.goalReached).toBe(true)
    expect(onGoalReached).toHaveBeenCalledOnce()
  })
})

describe('reset', () => {
  test('reset restores position, facing, and revives enemies', async () => {
    const { knight } = makeKnight({
      startX: 1, startY: 1, facing: 'right',
      enemies: [{ x: 2, y: 1 }],
      goalType: 'defeat_all',
    })
    await knight.attack()        // kill the enemy, win the quest
    await knight.turnLeft()      // change facing

    knight.reset()

    expect(knight.cellX).toBe(1)
    expect(knight.cellY).toBe(1)
    expect(knight.facing).toBe('right')
    expect(knight.goalReached).toBe(false)
    expect(knight.enemies[0].alive).toBe(true) // revived
  })
})