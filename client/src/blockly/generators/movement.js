import { javascriptGenerator, Order } from 'blockly/javascript'

// Code generators for the movement blocks. Each one returns the
// JavaScript string that the block should produce. We emit calls
// against a `knight` variable, which the runner injects at execution
// time (see game/runner.js).
//
// `await` is essential: each knight method is async and resolves when
// its animation finishes, so awaiting serializes the actions and the
// player sees them one at a time.

javascriptGenerator.forBlock['move_forward'] = function () {
  return 'await knight.moveForward();\n'
}

javascriptGenerator.forBlock['turn_left'] = function () {
  return 'await knight.turnLeft();\n'
}

javascriptGenerator.forBlock['turn_right'] = function () {
  return 'await knight.turnRight();\n'
}

javascriptGenerator.forBlock['attack'] = function () {
  return 'await knight.attack();\n'
}