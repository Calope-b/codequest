import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { gameConfig } from '../game/config'
import { loadQuest } from '../game/questLoader'
import QuestScene from '../game/scenes/QuestScene'
import BlocklyEditor from '../components/BlocklyEditor'
import { runWorkspace } from '../game/runner'

// Student-facing page. Hosts the Blockly editor on the left and the
// Phaser game canvas on the right.
function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const gameContainerRef = useRef(null)
  const gameRef = useRef(null)

  // Blockly workspace reference, captured once the editor is ready.
  // Used in sprint 3.6 to read the blocks and generate code.
  const workspaceRef = useRef(null)

  const [questComplete, setQuestComplete] = useState(false)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState('')

  useEffect(() => {
    const quest = loadQuest('quest_001')

    gameRef.current = new Phaser.Game({
      ...gameConfig,
      parent: gameContainerRef.current,
    })

    gameRef.current.scene.add('QuestScene', QuestScene, true, {
      quest,
      onQuestComplete: () => setQuestComplete(true),
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

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

    // Grab the live KnightController from the running scene. QuestScene
    // stores it on itself; we also exposed it on window during dev.
    const scene = gameRef.current?.scene.getScene('QuestScene')
    const knight = scene?.knight
    if (!knight) {
      setRunError('Game not ready yet.')
      return
    }

    setRunning(true)
    try {
      await runWorkspace(workspace, knight)
    } catch (err) {
      // Surface generation/runtime errors so the student (and you) can
      // see what went wrong instead of a silent console-only failure.
      setRunError(err.message || 'Something went wrong while running.')
    } finally {
      setRunning(false)
    }
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
        Assemble blocks on the left. Use the arrow keys on the game to
        move the knight for now. The "Run" button comes next.
      </p>

      <div style={{ marginTop: '1rem' }}>
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

        {runError && (
          <span style={{ marginLeft: '1rem', color: '#ff8a8a' }}>{runError}</span>
        )}
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