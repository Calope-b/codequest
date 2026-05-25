import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { gameConfig } from '../game/config'
import { loadQuest } from '../game/questLoader'
import QuestScene from '../game/scenes/QuestScene'

// Student-facing page. Hosts the Phaser game canvas, loads a quest,
// and shows quest-completion feedback driven from the scene.
function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const gameContainerRef = useRef(null)
  const gameRef = useRef(null)

  // React state for the quest-complete banner.
  const [questComplete, setQuestComplete] = useState(false)

  useEffect(() => {
    const quest = loadQuest('quest_001')

    // Boot Phaser without any scene attached (see config.js).
    gameRef.current = new Phaser.Game({
      ...gameConfig,
      parent: gameContainerRef.current,
    })

    // Add and start the scene, passing both the quest data and a
    // callback the scene can invoke when the quest is won.
    //
    // Using a callback (instead of subscribing to scene events from
    // here) sidesteps Phaser's add/init/create timing entirely: the
    // scene calls back when it's ready, no race condition possible.
    gameRef.current.scene.add(
      'QuestScene',
      QuestScene,
      true,         // autoStart
      {
        quest,
        onQuestComplete: () => setQuestComplete(true),
      }
    )

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
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

      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ color: '#8a93a8', fontSize: '0.9rem' }}>
          Use the arrow keys to navigate the knight to the green chest.
        </p>
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
  )
}

export default StudentDashboard