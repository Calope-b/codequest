# CodeQuest

A web platform where French high school students learn programming by playing a pixel art RPG. Built for the NSI (Numerique et Sciences Informatiques) curriculum.

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
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [License](#license)
  - [Author](#author)

---

## What is this?

Students play as a knight in a pixel art world. They fight bosses, complete quests, and progress through the game, but the catch is: everything is controlled through code. At the start, students use a block-based editor (think Scratch) where they drag and drop pre-made blocks like "move forward 1 meter" and chain them together. As they progress, the blocks gradually give way to actual programming. The end goal is for students to write their own code to control the knight's movements and actions.

The platform covers Python, HTML/CSS, JavaScript, and SQL, which are the four languages in the NSI program.
The target audience is beginners who have never written a line of code. So the whole thing needs to start simple and build up from there.

---

## Features

The platform has three separate interfaces:

**For students** -- the game itself. A pixel art world with a knight character, quests tied to programming challenges, and a drag-and-drop block editor powered by Google Blockly. Students can create and save their own custom blocks. Progression is tracked with XP and levels.

**For teachers** -- a dashboard to monitor their class. Who completed what, success rates, that kind of thing.

**For admins** -- user management, role assignment, platform settings.

Authentication uses JWT tokens and passwords are hashed with bcrypt. The three roles (student, teacher, admin) each see a different interface after login.

---

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Phaser.js, Google Blockly |
| Backend | Node.js, Express.js, JWT |
| Database | PostgreSQL, bcrypt |
| DevOps | Docker, GitHub, Vercel / Render |

**Why these specifically?**

- **React** -- component-based, huge community, easy to find help when stuck.
- **Phaser.js** -- it's a 2D game framework that runs in the browser. No plugins, no installs, just JavaScript. Good fit for pixel art.
- **Google Blockly** -- the library behind Scratch's block editor. Battle-tested for education.
- **Express.js** -- minimal Node.js framework for REST APIs. Does the job without overcomplicating things.
- **PostgreSQL** -- relational database. Users, quests, progression, scores: it's all structured data, so SQL makes sense here.
- **Docker** -- so the project runs the same way on every machine, regardless of OS or local setup.

---

## Project structure

```
codequest/
│
├── client/                     → React frontend
│   ├── public/                 → Static files (index.html)
│   └── src/
│       ├── assets/             → Sprites, sounds, images
│       ├── components/         → Reusable UI pieces
│       │   ├── common/         → Shared (buttons, modals...)
│       │   ├── student/        → Student-only components
│       │   ├── teacher/        → Teacher-only components
│       │   └── admin/          → Admin-only components
│       ├── pages/              → Full views (Login, Dashboards...)
│       ├── game/               → Phaser.js game logic
│       │   ├── scenes/         → Game scenes (map, battle, quest...)
│       │   └── entities/       → Game objects (knight, bosses, NPCs...)
│       ├── blockly/            → Block editor config
│       │   ├── blocks/         → Custom block definitions
│       │   └── generators/     → Code generators for blocks
│       ├── services/           → API calls
│       ├── context/            → React context (auth state)
│       └── utils/              → Helper functions
│
├── server/                     → Express.js backend
│   ├── src/
│   │   ├── config/             → Database connection
│   │   ├── routes/             → API routes
│   │   ├── controllers/        → Request handlers
│   │   ├── middlewares/        → Auth checks, error handling
│   │   ├── models/             → Database models
│   │   └── utils/              → Helper functions
│   └── tests/                  → Tests
│
├── database/
│   ├── init.sql                → Initial schema
│   └── migrations/             → Schema changes over time
│
├── .env.example                → Template for env variables
├── .gitignore                  → Files Git should ignore
├── docker-compose.yml          → Runs everything in containers
└── README.md
```

---

## Getting started

### What you need

- [Node.js](https://nodejs.org/) v18 or higher
- [PostgreSQL](https://www.postgresql.org/) v15 recommended
- [Docker](https://www.docker.com/) (optional but makes setup easier)

### Setup

1. Clone the repo

```bash
git clone https://github.com/your-username/codequest.git
cd codequest
```

2. Copy the env file and fill in your values

```bash
cp .env.example .env
```

3. Run with Docker (easiest way)

```bash
docker-compose up
```

This starts three containers: the PostgreSQL database, the Express backend on port 5000, and the React frontend on port 3000.

4. Or run manually if you prefer

```bash
# Backend
cd server
npm install
npm run dev

# In another terminal
cd client
npm install
npm start
```

---

## Environment variables

| Variable | What it does | Example |
|---|---|---|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `codequest` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `your_password_here` |
| `PORT` | Backend port | `5000` |
| `JWT_SECRET` | Secret key for signing tokens | `your_secret_key_here` |
| `NODE_ENV` | Dev or production | `development` |

---

## Usage

Once running:

| URL | What's there |
|---|---|
| `http://localhost:3000` | The app (React) |
| `http://localhost:5000` | The API |
| `http://localhost:5000/api/auth` | Auth endpoints |

---


## Contributing

This is a school project. Not open to outside contributions for now.

---

## License

MIT

---

## Author

Maxime -- Bachelor's project