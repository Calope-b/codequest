import * as Blockly from 'blockly'

// Custom Blockly blocks for knight movement. Defining them via a JSON
// array keeps the shape declarative. The code generators for these
// blocks live in blockly/generators/ and are wired in sprint 3.6;
// importing this file only registers the block shapes.
Blockly.defineBlocksWithJsonArray([
  {
    type: 'move_forward',
    message0: 'move forward',
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: 'Move the knight one cell in the direction it faces',
    helpUrl: '',
  },
  {
    type: 'turn_left',
    message0: 'turn left',
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: 'Rotate the knight 90 degrees counter-clockwise',
    helpUrl: '',
  },
  {
    type: 'turn_right',
    message0: 'turn right',
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: 'Rotate the knight 90 degrees clockwise',
    helpUrl: '',
  },
  {
    type: 'attack',
    message0: 'attack',
    previousStatement: null,
    nextStatement: null,
    colour: 0,
    tooltip: 'Attack in the direction the knight faces',
    helpUrl: '',
  },
])