import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { gameConfig } from '../game/config'
import { loadQuest, listQuests } from '../game/questLoader'
import QuestScene from '../game/scenes/QuestScene'
import BlocklyEditor from '../components/BlocklyEditor'
import { runWorkspace } from '../game/runner'
import { recordAttempt, fetchProgress } from '../services/progress'
import '../css/StudentDashboard.css'
import DashboardHeader from '../components/DashboardHeader'

// Available quests, loaded once for the picker. Phase 4 will fetch these
// from /api/quests instead of a static module.
const AVAILABLE_QUESTS = listQuests()

// Student-facing page: Blockly editor on the left, Phaser canvas on the
// right. The file reads top to bottom in lifecycle order: refs and state,
// then the three effects (create game, start scene, load progress), then
// the handlers, then the render.
function StudentDashboard() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()

  // ----- Refs (objects living outside the render cycle) -----

  // DOM node Phaser mounts its canvas into.
  const gameContainerRef = useRef(null)
  // The Phaser.Game instance, created once on mount.
  const gameRef = useRef(null)
  // The Blockly workspace, captured when the editor signals it is ready.
  const workspaceRef = useRef(null)

  // ----- State -----

  // True once the current quest's objective has been met; shows the banner.
  const [questComplete, setQuestComplete] = useState(false)
  // True while a Blockly program is executing; disables the controls.
  const [running, setRunning] = useState(false)
  // Last error to surface to the student (run failure, save failure).
  const [runError, setRunError] = useState('')
  // Id of the quest currently loaded in the scene.
  const [questId, setQuestId] = useState('quest_001')
  // Ids of the quests this student has already completed at least once.
  // Filled from the backend on mount, then updated locally after each
  // confirmed save. Lazy initializer so the empty Set is built once,
  // not rebuilt on every render.
  const [completedQuests, setCompletedQuests] = useState(() => new Set())

  // True once the student has revealed the current quest's hint. Reset on
  // quest change so each quest starts with its hint hidden.
  const [hintRevealed, setHintRevealed] = useState(false)

  // ----- Effect 1: create the Phaser game, once -----
  // The scene is registered but not started here; effect 2 starts it, so
  // quest data always flows through a single path and switching quests
  // never recreates the game.
  useEffect(() => {
    gameRef.current = new Phaser.Game({
      ...gameConfig,
      parent: gameContainerRef.current,
    })
    gameRef.current.scene.add('QuestScene', QuestScene, false)

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  // ----- Effect 2: (re)start the scene whenever the quest changes -----
  // scene.start stops any running instance and re-runs init() + create()
  // with fresh data, so switching quests needs no game teardown. Phaser
  // queues the call if the game has not finished booting on first mount.
  useEffect(() => {
    const game = gameRef.current
    if (!game) return

    setQuestComplete(false)
    setRunError('')
    setHintRevealed(false)

    game.scene.start('QuestScene', {
      quest: loadQuest(questId),
      onQuestComplete: () => setQuestComplete(true),
      onQuestReset: () => setQuestComplete(false),
    })
  }, [questId])

  // ----- Effect 3: load which quests are already completed -----
  // One fetch on mount to mark them in the selector; afterwards the Set
  // is updated locally when a save succeeds, so no polling is needed.
  useEffect(() => {
    if (!token) return

    // Guards against a slow response landing after unmount (or after
    // StrictMode's dev-only remount): without it we would setState on
    // a component that no longer exists.
    let cancelled = false

    fetchProgress(token)
      .then((rows) => {
        if (cancelled) return
        setCompletedQuests(
          new Set(rows.filter((r) => r.completed).map((r) => r.quest_id))
        )
      })
      .catch((err) => {
        // Non-blocking: the game works fine without the checkmarks.
        console.warn('Could not load progress:', err.message)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  // ----- Handlers: game flow -----

  // Reads the assembled blocks, generates async code, and runs it on
  // the knight controller exposed by the Phaser scene.
  async function handleRun() {
    setRunError('')

    const workspace = workspaceRef.current
    if (!workspace) {
      setRunError('Editor not ready yet.')
      return
    }

    const scene = gameRef.current?.scene.getScene('QuestScene')
    const knight = scene?.knight
    if (!knight) {
      setRunError('Game not ready yet.')
      return
    }

    // Auto-reset before each run so the program always starts from the
    // quest's initial state. The manual Reset button stays available for
    // resetting without launching a program.
    scene.resetQuest()

    setRunning(true)
    try {
      await runWorkspace(workspace, knight)
    } catch (err) {
      setRunError(err.message || 'Something went wrong while running.')
    } finally {
      setRunning(false)
    }

    // Record the attempt, win or lose: the teacher dashboard needs the
    // failed tries too (attempt counts, success rates), not only wins.
    // We read knight.goalReached, not the questComplete state: this
    // closure captured questComplete from the render where Run was
    // clicked, BEFORE the run, so it still holds that stale value here.
    // The controller is a plain object outside React; reading it is
    // always current.
    saveAttempt(knight.goalReached)
  }

  // Sends one attempt to the backend, fire-and-forget: the game never
  // blocks on bookkeeping. The checkmark in the selector is only added
  // once the server confirms the save, so a visible mark always means
  // "stored in the database". On failure we reuse the run error line;
  // an offline retry queue is out of scope for the MVP.
  function saveAttempt(completed) {
    recordAttempt(token, { questId, completed })
      .then(() => {
        if (completed) {
          // Copy-then-add: React only re-renders if the state reference
          // changes, so mutating the existing Set in place would be a
          // silent no-op for the UI.
          setCompletedQuests((prev) => new Set(prev).add(questId))
        }
      })
      .catch((err) => {
        setRunError(`Attempt not saved: ${err.message}`)
      })
  }

  // Resets the knight to its starting position so the student can run a
  // new program from scratch. Disabled while a program is running to
  // avoid resetting mid-execution.
  function handleReset() {
    setRunError('')
    const scene = gameRef.current?.scene.getScene('QuestScene')
    scene?.resetQuest()
  }

  // ----- Handlers: session -----

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }
  // Hint text for the current quest, if it defines one. Quests without a
  // hint simply show no hint button.
  const currentHint = loadQuest(questId).hint

  // ----- Render -----

  return (
    <div className="student-page">
      <DashboardHeader title="Student Dashboard" />
      <p className="student-hint">
        Pick a quest, assemble blocks, then press Run. Arrow keys also move the knight
      </p>

      {/* Toolbar: quest picker, Run, Reset, error line */}
      <div className="student-toolbar">
        <label className="quest-label">
          Quest:{' '}
          <select
            className="quest-select"
            value={questId}
            onChange={(e) => setQuestId(e.target.value)}
            disabled={running}
          >
            {AVAILABLE_QUESTS.map((q) => (
              <option key={q.id} value={q.id}>
                {completedQuests.has(q.id) ? `✓ ${q.title}` : q.title}
              </option>
            ))}
          </select>
        </label>

        <button className="run-button" onClick={handleRun} disabled={running}>
          {running ? 'Running...' : '▶ Run'}
        </button>

        <button className="reset-button" onClick={handleReset} disabled={running}>
          ↺ Reset
        </button>

        {currentHint && !hintRevealed && (
          <button className="hint-button" onClick={() => setHintRevealed(true)}>
            💡 Indice ?
          </button>
        )}

        {runError && <span className="run-error">{runError}</span>}
      </div>

      {/* Revealed hint, shown under the toolbar once the student asks for it */}
      {currentHint && hintRevealed && (
        <div className="hint-box">
          <span className="hint-text">{currentHint}</span>
          <span className="hint-used">indice utilisé</span>
        </div>
      )}

      {/* Workspace: Blockly on the left, game canvas on the right */}
      <div className="workspace-row">
        <BlocklyEditor onWorkspaceReady={(ws) => { workspaceRef.current = ws }} />

        <div>
          <div ref={gameContainerRef} />
          {questComplete && (
            <div className="quest-banner">Quest complete!</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard