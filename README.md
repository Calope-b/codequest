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
  - [Roadmap](#roadmap)
  - [Contributing](#contributing)
  - [License](#license)
  - [Author](#author)

---

## What is this?

Students play a knight in a pixel art world. They fight bosses, complete quests, and progress through the game, except everything is controlled through code. At the start, they use a block-based editor (like Scratch) where they drag pre-made blocks like "move forward 1 meter" and chain them together. As they progress, the blocks gradually give way to real programming. The end goal: students write their own code to control the knight's movements and actions.

The platform covers Python, HTML/CSS, JavaScript, and SQL, the four languages in the NSI program. The target audience is beginners who have never written a line of code, so the whole thing has to start simple and build up from there.

---

## Features

Three separate interfaces.

**Students** see the game itself: a pixel art world with a knight, quests tied to programming challenges, and a drag-and-drop block editor powered by Google Blockly. Students can also create and save their own custom blocks. Progression is tracked with XP and levels.

**Teachers** get a dashboard to monitor their class. Who completed what, success rates, that kind of thing.

**Admins** can manage users, assign roles, and change platform settings.

Authentication uses JWT tokens, and passwords are hashed with bcrypt. The three roles (student, teacher, admin) each land on a different interface after login. All inputs are validated server-side against type, length, format, and a role whitelist. The auth backend has 55 automated tests running on every push (see the [Tests](#tests) section).

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

I picked React because it's component-based, has a huge community, and finding help when stuck is easy.

Phaser.js is a 2D game framework that runs in the browser. No plugins, no installs, just JavaScript. Good fit for pixel art.

Google Blockly is the same library that powers Scratch's block editor, so it's already proven on millions of kids.

Express.js is a minimal Node.js framework for REST APIs. Does the job without overcomplicating things.

PostgreSQL is the obvious pick here: users, quests, progression, scores, it's all structured data, so SQL makes sense.

Jest and Supertest are the standard pair for testing Express APIs. Real HTTP calls hitting a real Postgres, no mocking gymnastics.

Docker keeps the project running the same way on every machine, regardless of OS or local setup.

---

## Project structure

```
codequest/
│
├── .github/
│   └── workflows/
│       └── ci.yml              → CI: Postgres sidecar + npm test on every push
│
├── client/                     → React frontend
│   ├── public/                 → Static files (favicon, etc.)
│   ├── index.html              → Vite entry
│   └── src/
│       ├── assets/             → Sprites, sounds, images (Phase 3)
│       ├── components/         → Reusable UI pieces
│       │   ├── common/         → Shared (buttons, modals...)
│       │   ├── student/        → Student-only components
│       │   ├── teacher/        → Teacher-only components
│       │   └── admin/          → Admin-only components
│       ├── pages/              → Login, Register, dashboards
│       ├── game/               → Phaser.js game logic (Phase 3)
│       │   ├── scenes/         → Game scenes (map, battle, quest...)
│       │   └── entities/       → Game objects (knight, bosses, NPCs...)
│       ├── blockly/            → Block editor config (Phase 3)
│       │   ├── blocks/         → Custom block definitions
│       │   └── generators/     → Code generators for blocks
│       ├── services/           → API calls (services/api.js)
│       ├── context/            → React context (AuthContext)
│       └── utils/              → Helper functions
│
├── server/                     → Express.js backend
│   ├── scripts/
│   │   └── seed-admin.js       → CLI: create an admin account
│   ├── src/
│   │   ├── config/             → Database connection
│   │   ├── routes/             → API routes
│   │   ├── controllers/        → Request handlers
│   │   ├── middlewares/        → verifyToken, requireRole
│   │   ├── models/             → Database models
│   │   └── utils/              → Helper functions (JWT signing, etc.)
│   └── tests/
│       ├── helpers/            → Shared test utilities (DB truncate, pool)
│       ├── setup.js            → Jest bootstrap, loads .env.test
│       ├── sanity.test.js      → Harness sanity checks
│       ├── register.test.js    → POST /api/auth/register (25 cases)
│       ├── login.test.js       → POST /api/auth/login (11 cases)
│       ├── middlewares.test.js → verifyToken + requireRole (11 cases)
│       └── me.test.js          → GET /api/auth/me (5 cases)
│
├── database/
│   └── schema.sql              → Database schema (tables, constraints)
│
├── AUTH_DESIGN.md              → Authentication design with sequence diagrams
├── PRIORITIZATION.md           → MoSCoW prioritization of MVP features
├── REQUIREMENTS.md             → Functional and non-functional requirements
├── TEST_PLAN.md                → Test case design for the auth module
│
├── .env.example                → Template for environment variables
├── .gitignore
├── docker-compose.yml          → PostgreSQL container (server and client run on the host)
└── README.md
```

Folders tagged "Phase 3" are empty for now. They'll be filled in once the game core and Blockly integration are written.

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

Docker only runs PostgreSQL here. The server and the client run directly on the host: containerizing them added nothing for a project deployed to Vercel and Render, so the compose file stays db-only.

4. Apply the schema (first run only), then start the backend and the frontend, each in its own terminal:

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

5. Create an admin account if you need one. Registration only allows the student and teacher roles, so admins are seeded from the command line:

```bash
cd server
npm run seed:admin -- admin@codequest.dev pick-a-password
```

---

## Environment variables

The values in `.env.example` are placeholders. Copy the file to `.env` and replace them with your real values before running anything.

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

The auth backend has 55 automated tests written with Jest and Supertest, covering all 52 cases listed in `TEST_PLAN.md` plus 3 sanity checks for the harness itself. Every test makes a real HTTP call against an Express app and hits a real Postgres database.

Breakdown by module:

| File | What it tests | Cases |
|---|---|---|
| `register.test.js` | `POST /api/auth/register` | 25 |
| `login.test.js` | `POST /api/auth/login` | 11 |
| `middlewares.test.js` | `verifyToken` and `requireRole` | 11 |
| `me.test.js` | `GET /api/auth/me` | 5 |
| `sanity.test.js` | Test harness itself | 3 |

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

The bootstrap in `tests/setup.js` refuses to run unless `DB_NAME` is `codequest_test`, so a misconfigured environment can't wipe the dev data. Each test starts with a truncated `users` table, which keeps cases independent.

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
| `http://localhost:5000/api/auth` | Auth endpoints (register, login, me) |

---

## Roadmap

- **Phase 1, Foundations**: project structure, schema, scaffolding. ✓
- **Phase 2, Authentication**: JWT backend, bcrypt, role-based access, hardening, 55 tests, CI, plus the React frontend (AuthContext, role-based routing). ✓
- **Phase 3, Game core**: Phaser scenes, knight entity, first quest, Blockly integration. (in progress)
- **Phase 4, Teacher dashboard and admin panel**: class management, progress tracking, user CRUD.
- **Phase 5, Content seeding, QA, and deployment** to Vercel + Render.

See `PRIORITIZATION.md` for the full MoSCoW breakdown and `REQUIREMENTS.md` for the functional and non-functional requirements.

---

## Contributing

This is a school project. Not open to outside contributions for now.

---

## License

MIT

---

## Author

Maxime, Bachelor's project