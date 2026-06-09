// Loads a quest definition and validates its shape.
// In Phase 3.4 the quest is imported statically; Phase 4 will fetch
// quests from /api/quests instead and this module is where that
// switch will happen.
import quest001 from '../quests/quest_001.json'
import quest002 from '../quests/quest_002.json'

const QUESTS = {
  quest_001: quest001,
  quest_002: quest002,
}

/**
 * Returns the quest definition for the given id.
 * Throws if the id is unknown so the caller fails loud instead of
 * silently rendering an empty map.
 *
 * @param {string} questId
 * @returns {object}
 */
export function loadQuest(questId) {
  const quest = QUESTS[questId]
  if (!quest) {
    throw new Error(`Unknown quest id: ${questId}`)
  }
  return quest
}

/**
 * Returns the available quests as { id, title } pairs, in a stable order,
 * for building a quest picker. Phase 4 will replace this with a call to
 * /api/quests.
 *
 * @returns {Array<{id: string, title: string}>}
 */
export function listQuests() {
  return Object.values(QUESTS).map((q) => ({ id: q.id, title: q.title }))
}