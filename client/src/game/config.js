// Phaser game configuration. Imported by StudentDashboard.jsx to
// instantiate a Phaser.Game instance.
//
// Note: scenes are NOT listed here. They are added manually by the
// React layer once quest data is available, to avoid the scene's
// create() running before it has the data it needs.
import Phaser from 'phaser'

export const TILE_SIZE = 48
export const GRID_WIDTH = 12
export const GRID_HEIGHT = 8

export const gameConfig = {
  type: Phaser.AUTO,
  width: TILE_SIZE * GRID_WIDTH,
  height: TILE_SIZE * GRID_HEIGHT,
  backgroundColor: '#1a2033',
  pixelArt: true,
  // No `scene` field. The React layer adds the QuestScene manually
  // via game.scene.add(...) once it has loaded the quest.
}