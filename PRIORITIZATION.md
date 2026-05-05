# CodeQuest — Feature prioritization

This document prioritizes the functional requirements listed in [`REQUIREMENTS.md`](./REQUIREMENTS.md). It defines the MVP scope and the order in which features should be built.

## Method

The standard MoSCoW model (Must / Should / Could / Won't) is used here with one tweak: the **Must** category is split in two.

- **Must 1 — Headline features.** The features visible during a demo. They are what makes CodeQuest CodeQuest.
- **Must 2 — Enabling dependencies.** Features the Must 1 items rely on to work. They can be mocked during early development, but they must be working code in the final release. Most of them are invisible to the end user (middleware, database writes, validation logic).

Both levels are required at the final delivery. The split is about development order, not about optionality.

The **Should** category lists features that improve the product but whose absence would not block it. **Could** features are nice-to-haves, kept for the end of the timeline if time allows.

---

## Must 1 — Headline features

| ID | Feature | Why |
|---|---|---|
| FR-A1 | Registration | No accounts, no users. |
| FR-A2 | Authentication (JWT) | Required to separate the three interfaces. |
| FR-S1 | Explore the game world | First thing a student sees and does. |
| FR-S3 | Solve quests via Blockly | The pedagogical core of the project. |
| FR-S4 | Execute code | Closes the loop between Blockly and the game. |
| FR-T4 | Monitor student progress | The main reason a teacher would log in. |
| FR-AD1 | Manage users | Without it, the admin role does nothing. |

## Must 2 — Enabling dependencies

| ID | Feature | What it enables |
|---|---|---|
| FR-A3 | Role-based access control | Required for FR-AD1 and FR-T4 to be safe. Without RBAC, any logged-in user can hit admin or teacher routes. |
| FR-A5 | Bcrypt password hashing | Non-negotiable for security and GDPR. Already in the scaffold. |
| FR-S2 | Interact with bosses | Triggers FR-S3 and FR-S4. Without it, the gameplay loop has no entry point. |
| FR-S5 | Validate quest completion | Provides feedback after FR-S4. Without it, code execution leads nowhere. |
| FR-S6 | Record quest attempts | Generates the data shown by FR-T4. Without it, the teacher dashboard is empty. |
| FR-T1 | Manage classes | Provides the context within which FR-T4 operates. |
| FR-T2 | Manage students in a class | Required so FR-T4 knows which students to display. |

## Should

| ID | Feature | Comment |
|---|---|---|
| FR-A4 | Logout | Cheap to add and expected by users, but token expiration covers the gap if it slips. |
| FR-S7 | Create custom blocks | Advanced pedagogical feature. Powerful, not essential. |
| FR-S9 | View assigned quests | Convenient for students, but they can still find quests in-game. |
| FR-T3 | Assign quests to a class | Useful for classroom organization, not blocking individual progression. |
| FR-T5 | Class analytics | Aggregated view that complements FR-T4 (per-student). |
| FR-AD2 | Manage quest content | If left out, content is seeded via SQL at install time. |
| FR-AD3 | Manage boss content | Same as above. |

## Could

| ID | Feature | Comment |
|---|---|---|
| FR-S8 | View XP and level on the profile | The data is already tracked; only a display screen is missing. |
| FR-AD4 | Global platform statistics | Useful in production, not in a school-project context. |

## Won't (this iteration)

Nothing falls in this category yet. Every requirement in `REQUIREMENTS.md` is planned for the MVP or a follow-up iteration.

---

## Trade-offs worth flagging

**FR-AD2 and FR-AD3 in Should.** The plan is to seed quests and bosses directly via SQL migrations (one or two bosses, a handful of quests) rather than build a full content-management UI. That UI competes for time with the gameplay features, and the trade-off is not worth it in an 11-week project. If time allows once the Must features are stable, the admin content interface goes in; otherwise content stays in the seed scripts.

**FR-S6 in Must 2.** Recording attempts produces no visible value on its own, which would normally make it a Should. It was promoted because FR-T4 (Must 1) reads its data directly. A teacher dashboard with nothing to display would not survive a demo.