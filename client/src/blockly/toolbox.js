// Toolbox definition for the quest editor.
//
// Uses a category toolbox so blocks are grouped. The Movement and
// Sensors categories hold our custom knight blocks; Logic and Loops
// pull in Blockly's built-in blocks so students can branch and repeat.
//
// In Phase 4, the categories and blocks shown will be filtered
// per-quest using the quest's `allowedBlocks` field. For now the full
// set is always available.
export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Movement',
      colour: '210',
      contents: [
        { kind: 'block', type: 'move_forward' },
        { kind: 'block', type: 'turn_left' },
        { kind: 'block', type: 'turn_right' },
        { kind: 'block', type: 'attack' },
      ],
    },
    {
      kind: 'category',
      name: 'Sensors',
      colour: '120',
      contents: [
        { kind: 'block', type: 'is_wall_ahead' },
        { kind: 'block', type: 'is_enemy_ahead' },
        { kind: 'block', type: 'is_at_goal' },
      ],
    },
    {
      kind: 'category',
      name: 'Logic',
      colour: '210',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_boolean' },
        { kind: 'block', type: 'logic_negate' },
      ],
    },
    {
      kind: 'category',
      name: 'Loops',
      colour: '120',
      contents: [
        {
          kind: 'block',
          type: 'controls_repeat_ext',
          // Shadow block gives the "repeat N times" a default value of 3
          // so the block is usable the moment it's dragged out.
          inputs: {
            TIMES: {
              shadow: { type: 'math_number', fields: { NUM: 3 } },
            },
          },
        },
        { kind: 'block', type: 'controls_whileUntil' },
      ],
    },
  ],
}