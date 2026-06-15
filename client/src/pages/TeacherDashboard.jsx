import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  fetchClasses,
  createClass,
  addStudent,
  removeStudent,
  fetchClassProgress,
} from '../services/teachers'
import ClassProgressTable from '../components/ClassProgressTable'
import '../css/TeacherDashboard.css'

// Teacher-facing page. One page, three zones: header, classes (list +
// create), and the selected class (add student + progress table). The
// file reads top to bottom in lifecycle order: state, effects, handlers,
// render. Mirrors the structure of StudentDashboard.
function TeacherDashboard() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()

  // ----- State -----

  // The teacher's classes, each with a student_count.
  const [classes, setClasses] = useState([])
  // Id of the class whose progress is shown below; null = none selected.
  const [selectedId, setSelectedId] = useState(null)
  // The selected class's progress: { class, students }. Null while none
  // is selected or while the first load is in flight.
  const [progress, setProgress] = useState(null)
  const [loadingProgress, setLoadingProgress] = useState(false)

  // Form fields.
  const [newClassName, setNewClassName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')

  // Error lines, scoped to where they happen so each surfaces next to its
  // own form rather than in one shared banner.
  const [classError, setClassError] = useState('')
  const [studentError, setStudentError] = useState('')

  // ----- Effect 1: load the teacher's classes on mount -----
  useEffect(() => {
    if (!token) return
    let cancelled = false

    fetchClasses(token)
      .then((rows) => {
        if (!cancelled) setClasses(rows)
      })
      .catch((err) => {
        if (!cancelled) setClassError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  // ----- Effect 2: load progress whenever the selected class changes -----
  // The cancelled guard matters here: if the teacher clicks class A then
  // quickly class B, A's slower response must not overwrite B's table.
  useEffect(() => {
    if (!token || selectedId === null) {
      setProgress(null)
      return
    }
    let cancelled = false
    setLoadingProgress(true)
    setStudentError('')

    fetchClassProgress(token, selectedId)
      .then((data) => {
        if (!cancelled) setProgress(data)
      })
      .catch((err) => {
        if (!cancelled) setStudentError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingProgress(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, selectedId])

  // ----- Helpers -----

  // Refetches both the class list (for student counts) and the selected
  // class's progress. Used after add/remove so the screen reflects the
  // database rather than a guessed local update.
  async function refresh() {
    const rows = await fetchClasses(token)
    setClasses(rows)
    if (selectedId !== null) {
      const data = await fetchClassProgress(token, selectedId)
      setProgress(data)
    }
  }

  // ----- Handlers -----

  async function handleCreateClass() {
    setClassError('')
    const name = newClassName.trim()
    if (!name) {
      setClassError('Please enter a class name.')
      return
    }
    try {
      const created = await createClass(token, name)
      setNewClassName('')
      // Refetch the list so the new class appears with its count, then
      // select it so the teacher lands straight on its (empty) table.
      const rows = await fetchClasses(token)
      setClasses(rows)
      setSelectedId(created.id)
    } catch (err) {
      setClassError(err.message)
    }
  }

  async function handleAddStudent() {
    setStudentError('')
    const email = studentEmail.trim()
    if (!email) {
      setStudentError('Please enter an email.')
      return
    }
    try {
      await addStudent(token, selectedId, email)
      setStudentEmail('')
      await refresh()
    } catch (err) {
      // The backend's message is already human-readable (unknown email,
      // not a student, already in class), so we show it as-is.
      setStudentError(err.message)
    }
  }

  async function handleRemoveStudent(studentId, email) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Remove ${email} from this class?`)) {
      return
    }
    setStudentError('')
    try {
      await removeStudent(token, selectedId, studentId)
      await refresh()
    } catch (err) {
      setStudentError(err.message)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // ----- Render -----

  const selectedClass = classes.find((c) => c.id === selectedId) || null

  return (
    <div className="teacher-page">
      <h1>Teacher Dashboard</h1>
      <p>Logged in as: {user?.email}</p>
      <button onClick={handleLogout}>Log out</button>

      {/* Classes zone: pick an existing class or create a new one */}
      <div className="class-bar">
        <label className="muted">
          Class:{' '}
          <select
            className="class-select"
            value={selectedId ?? ''}
            onChange={(e) =>
              setSelectedId(e.target.value === '' ? null : Number(e.target.value))
            }
          >
            <option value="">— select a class —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.student_count})
              </option>
            ))}
          </select>
        </label>

        <input
          className="text-input"
          type="text"
          placeholder="New class name"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
        />
        <button className="btn" onClick={handleCreateClass}>
          Create class
        </button>

        {classError && <span className="form-error">{classError}</span>}
      </div>

      {/* Selected class zone: add a student + the progress table */}
      {selectedClass && (
        <>
          <h2 style={{ marginTop: '2rem' }}>{selectedClass.name}</h2>

          <div className="class-bar">
            <input
              className="text-input"
              type="text"
              placeholder="Student email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
            />
            <button className="btn" onClick={handleAddStudent}>
              Add student
            </button>
            {studentError && <span className="form-error">{studentError}</span>}
          </div>

          {loadingProgress && <p className="muted">Loading…</p>}

          {!loadingProgress && progress && (
            <ClassProgressTable
              students={progress.students}
              onRemoveStudent={handleRemoveStudent}
            />
          )}
        </>
      )}
    </div>
  )
}

export default TeacherDashboard