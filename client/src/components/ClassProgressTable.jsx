// client/src/components/ClassProgressTable.jsx
// Pure presentational table of quests (columns) by students (rows).
// Receives the class progress already fetched by the parent; makes no
// network calls of its own. Each cell shows one of three states:
//   done   - completed at least once  (green check)
//   tried  - attempted, never completed (orange dot + attempt count)
//   none   - never attempted          (dim dash)

import { listQuests } from '../game/questLoader'

const QUESTS = listQuests()

// Maps one student's quests array into a lookup by quest_id, so the table
// can find a cell's data in O(1) instead of scanning the array per column.
function indexByQuest(quests) {
  const map = new Map()
  for (const q of quests) {
    map.set(q.quest_id, q)
  }
  return map
}

// Decides the visual state of a single quest cell for a student.
function renderCell(entry) {
  // No entry: the student never attempted this quest.
  if (!entry) {
    return <span className="cell-none" aria-label="not attempted">—</span>
  }
  if (entry.completed) {
    return <span className="cell-done" aria-label="completed">✓</span>
  }
  // Attempted but never completed: show the dot and how many tries.
  return (
    <span className="cell-tried" aria-label={`${entry.attempts} attempts, not completed`}>
      ● {entry.attempts}
    </span>
  )
}

function ClassProgressTable({ students, onRemoveStudent }) {
  if (students.length === 0) {
    return <p className="muted">No students in this class yet.</p>
  }

  return (
    <div className="progress-wrap">
      <table className="progress-table">
        <thead>
          <tr>
            <th className="student-col">Student</th>
            {QUESTS.map((q) => (
              <th key={q.id}>{q.title}</th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const byQuest = indexByQuest(student.quests)
            return (
              <tr key={student.id}>
                <td className="student-col">{student.email}</td>
                {QUESTS.map((q) => (
                  <td key={q.id}>{renderCell(byQuest.get(q.id))}</td>
                ))}
                <td>
                  <button
                    className="btn-danger"
                    onClick={() => onRemoveStudent(student.id, student.email)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ClassProgressTable