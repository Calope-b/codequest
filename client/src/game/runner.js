import { javascriptGenerator } from 'blockly/javascript'

// Turns a Blockly workspace into runnable code and executes it against
// a KnightController instance.
//
// How it works:
//   1. javascriptGenerator walks the blocks and produces a JS string
//      made of `await knight.xxx()` calls.
//   2. We wrap that string in an async function body via the
//      AsyncFunction constructor, with `knight` as its parameter.
//   3. Calling it runs the program; because every action is awaited,
//      the returned promise resolves only when the whole program is
//      done.
//
// See GAME_DESIGN.md section 3 for the rationale (option B: async
// commands, with a documented migration path to a sandboxed
// interpreter if we ever need isolation).

// AsyncFunction is not a global binding, so we grab its constructor
// from an async function instance.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

/**
 * Generates code from the workspace and runs it against the knight.
 *
 * @param {Blockly.Workspace} workspace - The block workspace to run
 * @param {KnightController} knight      - The controller to drive
 * @returns {Promise<void>} resolves when the program finishes
 */
export async function runWorkspace(workspace, knight) {
  // Tell the generator to mark generated functions as async so our
  // `await` calls are syntactically valid in the produced code.
  javascriptGenerator.STATEMENT_PREFIX = ''
  const code = javascriptGenerator.workspaceToCode(workspace)

  // Build and run: async function(knight) { <generated code> }
  const program = new AsyncFunction('knight', code)
  await program(knight)
}

/**
 * Generates the code string without running it. Handy for debugging
 * and for showing students the code their blocks produce later on.
 *
 * @param {Blockly.Workspace} workspace
 * @returns {string}
 */
export function generateCode(workspace) {
  return javascriptGenerator.workspaceToCode(workspace)
}