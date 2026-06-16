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


// Maximum number of loop iterations a single run may execute before we
// abort it. A student's `while true` with no movement is a synchronous
// loop that never yields to the browser, so a wall-clock timeout cannot
// fire to stop it (the tab is frozen). Instead we inject a counter into
// every generated loop via Blockly's INFINITE_LOOP_TRAP: it runs once
// per iteration, even in a tight synchronous loop, and throws when the
// budget is exhausted. 100000 is high enough for any legitimate quest
// program yet trips near-instantly on a runaway loop.
const MAX_LOOP_ITERATIONS = 100000

/**
 * Generates code from the workspace and runs it against the knight.
 *
 * @param {Blockly.Workspace} workspace - The block workspace to run
 * @param {KnightController} knight      - The controller to drive
 * @returns {Promise<void>} resolves when the program finishes
 * @throws {Error} 'Too many steps...' if the loop budget is exceeded
 */
export async function runWorkspace(workspace, knight) {
  javascriptGenerator.STATEMENT_PREFIX = ''

  // Inject a guard at the top of every generated loop body. Blockly
  // replaces this string verbatim inside each loop, so the counter is
  // checked once per iteration. The thrown Error propagates out of the
  // program and is caught by the caller (handleRun shows runError).
  javascriptGenerator.INFINITE_LOOP_TRAP =
    `if (--__loopBudget < 0) { throw new Error('Too many steps — check your loops for an endless repeat.'); }\n`

  const code = javascriptGenerator.workspaceToCode(workspace)

  // __loopBudget is declared in the function scope, before the generated
  // code, so every injected check decrements the same shared counter.
  const program = new AsyncFunction(
    'knight',
    `let __loopBudget = ${MAX_LOOP_ITERATIONS};\n${code}`
  )
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