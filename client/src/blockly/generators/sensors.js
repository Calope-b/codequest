import { javascriptGenerator, Order } from 'blockly/javascript'

// Sensor generators return a [code, order] tuple because they are
// value blocks (they produce a boolean used inside if/while), not
// statement blocks. Order.AWAIT makes the precedence explicit so
// Blockly wraps the expression correctly when nesting.
//
// Sensors are synchronous on the controller, but we still await for
// uniformity and to keep the door open for async sensors later.

javascriptGenerator.forBlock['is_wall_ahead'] = function () {
  return ['(await knight.isWallAhead())', Order.AWAIT]
}

javascriptGenerator.forBlock['is_enemy_ahead'] = function () {
  return ['(await knight.isEnemyAhead())', Order.AWAIT]
}

javascriptGenerator.forBlock['is_at_goal'] = function () {
  return ['(await knight.isAtGoal())', Order.AWAIT]
}