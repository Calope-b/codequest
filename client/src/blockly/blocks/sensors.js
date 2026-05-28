import * as Blockly from 'blockly'

// Sensor blocks return a boolean (output: 'Boolean'), which makes them
// pluggable into logic blocks like "if".
Blockly.defineBlocksWithJsonArray([
  {
    type: 'is_wall_ahead',
    message0: 'wall ahead?',
    output: 'Boolean',
    colour: 120,
    tooltip: 'True if the cell ahead is a wall or the grid edge',
    helpUrl: '',
  },
  {
    type: 'is_enemy_ahead',
    message0: 'enemy ahead?',
    output: 'Boolean',
    colour: 120,
    tooltip: 'True if an enemy is in the cell ahead',
    helpUrl: '',
  },
  {
    type: 'is_at_goal',
    message0: 'at goal?',
    output: 'Boolean',
    colour: 120,
    tooltip: 'True if the knight is standing on the goal',
    helpUrl: '',
  },
])