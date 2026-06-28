# CodeQuest

A web platform where French high school students learn programming by playing a pixel art RPG. Built for the NSI (Numérique et Sciences Informatiques) curriculum.

[![CI](https://github.com/Calope-b/codequest/actions/workflows/ci.yml/badge.svg)](https://github.com/Calope-b/codequest/actions/workflows/ci.yml)
![Status](https://img.shields.io/badge/status-in%20development-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Table of contents

- [CodeQuest](#codequest)
  - [Table of contents](#table-of-contents)
  - [What is this?](#what-is-this)
  - [Features](#features)
  - [Tech stack](#tech-stack)
  - [Project structure](#project-structure)
  - [Getting started](#getting-started)
    - [What you need](#what-you-need)
    - [Setup](#setup)
  - [Environment variables](#environment-variables)
  - [Tests](#tests)
    - [Running the tests locally](#running-the-tests-locally)
    - [Test isolation](#test-isolation)
    - [CI](#ci)
  - [Usage](#usage)
  - [API endpoints](#api-endpoints)
  - [Roadmap](#roadmap)
  - [Contributing](#contributing)
  - [License](#license)
  - [Author](#author)

---

## What is this?

Students play a knight in a pixel art world. They fight bosses, complete quests, and progress through the game except everything is controlled through code. At the start, they use a block-based editor (like Scratch) where they drag pre-made blocks like "move forward 1 meter" and chain them together. As they advance, the blocks gradually give way to real programming. The end goal: students write their own code to control the knight's movements and actions.

The platform covers Python, HTML/CSS, JavaScript, and SQL the four languages in the NSI program. The target audience is students who have never written a line of code, so it has to start simple and build up from there.

---

## Features

Three separate interfaces.

**Students** see the game itself: a pixel art world with a knight, quests tied to programming challenges, and a drag-and-drop block editor powered by Google Blockly. Students can also create and save their own custom blocks. Progression is tracked with XP and levels.

**Teachers** get a dashboard to monitor their class: who completed what, success rates, that kind of thing.

**Admins** can manage users, assign roles, and change platform settings.

Authentication uses JWT tokens, and passwords are hashed with bcrypt. The three roles (student, teacher, admin) each land on a different interface after login. All inputs are validated server-side against type, length, format, and a role whitelist. The backend has 127 automated tests running on every push (see the [Tests](#tests) section).

---

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Phaser.js, Google Blockly |
| Backend | Node.js, Express.js, JWT |
| Database | PostgreSQL, bcrypt |
| Tests | Jest, Supertest |
| DevOps | Docker, GitHub Actions, Vercel / Render |

**Why these specifically?**

React because it's component-based and has a big enough community that help is easy to find.

Phaser.js is a 2D game framework that runs in the browser with no plugins or installs. It handles pixel art well and stays out of the way.

Google Blockly is the same library behind Scratch's block editor. It has good documentation and handles custom blocks cleanly, which matters here since students can define their own.

Express.js is minimal and doesn't force any structure on the project. That felt right for a REST API of this size.

PostgreSQL because everything here users, quests, progression, scores is relational. There was no case for anything else.

Jest and Supertest are the standard pair for testing Express APIs. Tests make real HTTP calls against a real Postgres database, no mocking.

Docker runs PostgreSQL so the database setup is the same on every machine. The server and client run on the host containerizing them added nothing for a project deployed to Vercel and Render.

---

## Project structure

```
codequest/
│
├── .github/
│   └── workflows/
│       └── ci.yml              → CI: Postgres sidecar + npm test on every push
│
├── client/                     → React frontend (Vite)
│   ├── index.html              → Vite entry
│   ├── public/
│   │   └── sprites/            → Kenney CC0 tiles (knight, goblins, floor/, wall/, goal)
│   └── src/
│       ├── App.jsx             → Routes and role-based redirects
│       ├── index.jsx           → React entry
│       ├── pages/              → Login, Register, NotFound, and the three dashboards
│       ├── components/         → BlocklyEditor, ClassProgressTable, DashboardHeader, ProtectedRoute
│       ├── context/            → AuthContext
│       ├── services/           → API wrappers (api, progress, teachers, admin)
│       ├── css/                → Page and theme stylesheets (theme.css + per-page)
│       ├── game/               → Phaser game logic
│       │   ├── config.js       → Phaser config, grid/tile constants
│       │   ├── scenes/
│       │   │   └── QuestScene.js   → Draws the map, spawns the knight
│       │   ├── KnightController.js      → Public API for generated code
│       │   ├── KnightController.test.js → Unit tests (no Phaser boot)
│       │   ├── questLoader.js   → Loads/lists the quest JSON
│       │   ├── runner.js        → AsyncFunction execution wrapper
│       │   └── sound.js         → Sound effects
│       ├── blockly/            → Block editor config
│       │   ├── toolbox.js      → Toolbox, filtered per-quest
│       │   ├── blocks/         → movement.js, sensors.js
│       │   └── generators/     → movement.js, sensors.js
│       └── quests/             → quest_001.json … quest_005.json
│
├── server/                     → Express.js backend
│   ├── scripts/
│   │   └── seed-admin.js       → CLI: create an admin account
│   ├── src/
│   │   ├── config/             → db.js (pg pool)
│   │   ├── routes/             → auth, students, teachers, admin
│   │   ├── controllers/        → auth, account, student, teacher, admin
│   │   ├── middlewares/        → verifyToken, requireRole
│   │   ├── models/             → User, Class, Attempt
│   │   └── utils/              → jwt.js (sign/verify)
│   └── tests/
│       ├── helpers/            → Shared test utilities (DB truncate, pool)
│       ├── setup.js            → Jest bootstrap, loads .env.test
│       ├── sanity.test.js      → Harness sanity checks (3)
│       ├── register.test.js    → POST /api/auth/register (25)
│       ├── login.test.js       → POST /api/auth/login (11)
│       ├── middlewares.test.js → verifyToken + requireRole (11)
│       ├── me.test.js          → GET /api/auth/me (5)
│       ├── account.test.js     → PATCH /api/auth/email + /password (12)
│       ├── students.test.js    → student progress (9)
│       ├── teacher-classes.test.js  → class create/list (10)
│       ├── teacher-members.test.js  → add/remove students (14)
│       ├── teacher-progress.test.js → class progress (9)
│       └── admin.test.js       → user management (18)
│
├── database/
│   └── schema.sql              → Database schema (4 tables, constraints, indexes)
│
├── photo/                      → UML exports (usecase.png, classdiagram.png)
│
├── AUTH_DESIGN.md              → Authentication design with sequence diagrams
├── GAME_DESIGN.md              → Game runtime, KnightController, quest format
├── TEACHER_DESIGN.md           → Teacher backend design and test plan
├── ADMIN_DESIGN.md             → Admin backend design and test plan
├── PRIORITIZATION.md           → MoSCoW prioritization of MVP features
├── REQUIREMENTS.md             → Functional and non-functional requirements
├── TEST_PLAN.md                → Test case design for the auth module
│
├── .env.example                → Template for environment variables
├── .gitignore
├── docker-compose.yml          → PostgreSQL container (server and client run on the host)
└── README.md
```

The Phase 3 game folders (`game/`, `blockly/`, `quests/`) and the Phase 4 backend routes (`teachers`, `admin`) are now filled in. The remaining work is the React teacher and admin dashboards.

---

## Getting started

### What you need

- [Node.js](https://nodejs.org/) v18 or higher (v20 used in CI)
- [PostgreSQL](https://www.postgresql.org/) v15 recommended
- [Docker](https://www.docker.com/) (runs the PostgreSQL database)

### Setup

1. Clone the repo:

```bash
git clone https://github.com/Calope-b/codequest.git
cd codequest
```

2. Copy the env file and fill in your values:

```bash
cp .env.example .env
```

3. Start the database:

```bash
docker compose up -d db
```

Docker only runs PostgreSQL here. The server and the client run directly on the host containerizing them added nothing for a project deployed to Vercel and Render, so the compose file stays db-only.

1. Apply the schema (first run only), then start the backend and the frontend, each in its own terminal:

```bash
docker compose exec -T db psql -U postgres -d codequest < database/schema.sql

# Backend
cd server
npm install
npm run dev

# In another terminal
cd client
npm install
npm run dev
```

5. Create an admin account if you need one. Registration only allows the student and teacher roles, so admins are created from the command line:

```bash
cd server
npm run seed:admin -- admin@codequest.dev pick-a-password
```

---

## Environment variables

The values in `.env.example` are placeholders. Copy the file to `.env` and replace them with real values before running anything.

| Variable | What it does | Example |
|---|---|---|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name (dev) | `codequest` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | (your local password, can be empty) |
| `PORT` | Backend port | `5000` |
| `JWT_SECRET` | Secret key for signing JWTs | Generate with `openssl rand -hex 32` |
| `NODE_ENV` | Dev or production | `development` |

To run the test suite, you also need a second file, `.env.test`, pointing at the separate `codequest_test` database. See the [Tests](#tests) section.

Both `.env` and `.env.test` are gitignored. Never commit them.

---

## Tests

The backend has 127 automated tests written with Jest and Supertest, covering the cases listed in `TEST_PLAN.md`, `TEACHER_DESIGN.md`, and `ADMIN_DESIGN.md`, plus the account self-service cases and 3 sanity checks for the harness itself. Every test makes a real HTTP call against an Express app and hits a real Postgres database.

Breakdown by module:

| File | What it tests | Cases |
|---|---|---|
| `register.test.js` | `POST /api/auth/register` | 25 |
| `login.test.js` | `POST /api/auth/login` | 11 |
| `middlewares.test.js` | `verifyToken` and `requireRole` | 11 |
| `me.test.js` | `GET /api/auth/me` | 5 |
| `account.test.js` | `PATCH /api/auth/email` and `/password` | 12 |
| `students.test.js` | student progress endpoints | 9 |
| `teacher-classes.test.js` | teacher class create/list | 10 |
| `teacher-members.test.js` | add/remove students in a class | 14 |
| `teacher-progress.test.js` | class progress aggregation | 9 |
| `admin.test.js` | user management (list/role/delete) | 18 |
| `sanity.test.js` | test harness itself | 3 |
| **Total** | | **127** |

### Running the tests locally

1. Make sure your Postgres container is up:

```bash
docker compose up -d db
```

2. Create the test database and apply the schema:

```bash
docker compose exec db psql -U postgres -c "CREATE DATABASE codequest_test;"
docker compose exec -T db psql -U postgres -d codequest_test < database/schema.sql
```

3. Create `.env.test` next to `.env` at the repo root, with the same shape as `.env` but `DB_NAME=codequest_test` and a different `JWT_SECRET`. For example:

```
NODE_ENV=test
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=codequest_test
DB_USER=postgres
DB_PASSWORD=
JWT_SECRET=test-secret-not-for-production
```

4. Run the suite:

```bash
cd server
npm test
```

### Test isolation

The bootstrap in `tests/setup.js` refuses to run unless `DB_NAME` is `codequest_test`, so a misconfigured environment can't wipe the dev data. Each test starts with a truncated `users` table to keep cases independent.

### CI

The same suite runs on every push and pull request through `.github/workflows/ci.yml`. GitHub Actions spins up a fresh Postgres 15 container, applies the schema, and runs `npm test`. A failing test blocks the merge.

---

## Usage

Once running:

| URL | What's there |
|---|---|
| `http://localhost:5173` | The app (React + Vite) |
| `http://localhost:5000` | The API |
| `http://localhost:5000/api/health` | Health check (returns `{status: "ok"}`) |
| `http://localhost:5000/api/auth` | Auth endpoints (register, login, me, account self-service) |
| `http://localhost:5000/api/students` | Student progress (student role) |
| `http://localhost:5000/api/teachers` | Class management and progress (teacher role) |
| `http://localhost:5000/api/admin` | User management (admin role) |

## API endpoints

Every protected route runs `verifyToken`; role-restricted groups also run `requireRole(...)`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Liveness check |
| POST | `/api/auth/register` | Public | Create a student or teacher account |
| POST | `/api/auth/login` | Public | Authenticate, return a JWT |
| GET | `/api/auth/me` | Bearer | Current user, for session restore |
| PATCH | `/api/auth/email` | Bearer | Change own email (re-checks password) |
| PATCH | `/api/auth/password` | Bearer | Change own password (re-checks password) |
| POST | `/api/students/progress` | student | Record one quest attempt |
| GET | `/api/students/progress` | student | Own progress summary, one row per quest |
| POST | `/api/teachers/classes` | teacher | Create a class |
| GET | `/api/teachers/classes` | teacher | List own classes with student counts |
| POST | `/api/teachers/classes/:id/students` | teacher | Add a student by email |
| DELETE | `/api/teachers/classes/:id/students/:studentId` | teacher | Remove a student from a class |
| GET | `/api/teachers/classes/:id/progress` | teacher | Aggregated class progress |
| GET | `/api/admin/users` | admin | List every account |
| PATCH | `/api/admin/users/:id/role` | admin | Change a user's role (student/teacher) |
| DELETE | `/api/admin/users/:id` | admin | Delete an account |

See `AUTH_DESIGN.md`, `TEACHER_DESIGN.md`, and `ADMIN_DESIGN.md` for per-module contracts, error tables, and sequence diagrams.

---

## Roadmap

- **Phase 1 — Foundations**: project structure, schema, scaffolding. ✓
- **Phase 2 — Authentication**: JWT backend, bcrypt, role-based access, auth test suite, CI, React frontend with AuthContext and role-based routing. ✓
- **Phase 3 — Game core**: Phaser scenes, knight entity, five quests, Blockly integration, combat against static enemies, progress saved on every run. ✓
- **Phase 4 — Teacher dashboard and admin panel**: class management, progress tracking, user CRUD. Backend routes done and tested; React dashboards in progress.✓
- **Phase 5 — Content, QA, and deployment** to Vercel + Render.

See `PRIORITIZATION.md` for the full MoSCoW breakdown and `REQUIREMENTS.md` for the functional and non-functional requirements.

---

## Contributing

This is a school project and not open to outside contributions for now.

---

## License

MIT

---

## Author

Maxime Bucher--Martin, Bachelor's project