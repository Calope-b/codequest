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

// Available quests, loaded once for the picker. Phase 4 will fetch these
// from /api/quests instead of a static module.
const AVAILABLE_QUESTS = listQuests()

// Student-facing page. Hosts the Blockly editor on the left and the
// Phaser game canvas on the right.
function StudentDashboard() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()

  const gameContainerRef = useRef(null)
  const gameRef = useRef(null)

  // Blockly workspace reference, captured once the editor is ready.
  // Used in sprint 3.6 to read the blocks and generate code.
  const workspaceRef = useRef(null)

  const [questComplete, setQuestComplete] = useState(false)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState('')
  const [questId, setQuestId] = useState('quest_001')

  // Ids of the quests this student has already completed at least once.
  // Filled from the backend on mount, then updated locally after each
  // confirmed save. Lazy initializer so the empty Set is built once,
  // not rebuilt on every render.
  const [completedQuests, setCompletedQuests] = useState(() => new Set())

  // Create the Phaser game once. The scene is registered but not started
  // here; the quest effect below starts it, so quest data always flows
  // through a single path and switching quests never recreates the game.
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

  // (Re)start the scene whenever the selected quest changes. scene.start
  // stops any running instance and re-runs init() + create() with fresh
  // data, so switching quests needs no game teardown. Phaser queues the
  // call if the game has not finished booting yet on first mount.
  useEffect(() => {
    const game = gameRef.current
    if (!game) return

    setQuestComplete(false)
    setRunError('')

    game.scene.start('QuestScene', {
      quest: loadQuest(questId),
      onQuestComplete: () => setQuestComplete(true),
      onQuestReset: () => setQuestComplete(false),
    })
  }, [questId])

  // Load which quests this student has already completed, to mark them
  // in the selector. One fetch on mount; afterwards the Set is updated
  // locally when a save succeeds, so no polling is needed.
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


  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

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


  return (
    <div
      style={{
        padding: '2rem',
        color: '#fff',
        backgroundColor: '#0f1320',
        minHeight: '100vh',
      }}
    >
      <h1>Student Dashboard</h1>
      <p>Logged in as: {user?.email}</p>
      <button onClick={handleLogout}>Log out</button>

      <p style={{ color: '#8a93a8', fontSize: '0.9rem', marginTop: '1.5rem' }}>
        Pick a quest, assemble blocks, then press Run. Arrow keys also move the knight
      </p>

      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

      <label style={{ color: '#c7cde0', fontSize: '0.95rem' }}>
          Quest:{' '}
          <select
            value={questId}
            onChange={(e) => setQuestId(e.target.value)}
            disabled={running}
            style={{
              padding: '0.5rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid #2a3147',
              background: '#0f1320',
              color: '#fff',
              fontSize: '0.95rem',
              cursor: running ? 'not-allowed' : 'pointer',
            }}
          >
            {AVAILABLE_QUESTS.map((q) => (
              <option key={q.id} value={q.id}>
                {completedQuests.has(q.id) ? `✓ ${q.title}` : q.title}
              </option>
            ))}
          </select>
      </label>

      <button
        onClick={handleRun}
        disabled={running}
        style={{
          padding: '0.6rem 1.5rem',
          borderRadius: '6px',
          border: 'none',
          background: running ? '#5a6b8a' : '#6abf69',
          color: '#0f1320',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: running ? 'not-allowed' : 'pointer',
        }}
      >
        {running ? 'Running...' : '▶ Run'}
      </button>

      <button
        onClick={handleReset}
        disabled={running}
        style={{
          padding: '0.6rem 1.5rem',
          borderRadius: '6px',
          border: '1px solid #2a3147',
          background: 'transparent',
          color: running ? '#5a6b8a' : '#c7cde0',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: running ? 'not-allowed' : 'pointer',
        }}
      >
        ↺ Reset
      </button>

      {runError && <span style={{ color: '#ff8a8a' }}>{runError}</span>}
    </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <BlocklyEditor onWorkspaceReady={(ws) => { workspaceRef.current = ws }} />

        <div>
          <div ref={gameContainerRef} />
          {questComplete && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'rgba(106, 191, 105, 0.15)',
                border: '1px solid #6abf69',
                borderRadius: '6px',
                color: '#6abf69',
                fontWeight: 600,
              }}
            >
              Quest complete!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard