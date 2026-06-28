# CodeQuest — Requirements Analysis and UML Modelling

> A gamified web platform to teach programming to French NSI high school students.
>
> **Author:** Maxime · **Date:** April 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Actors](#2-system-actors)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Use Case Diagram](#5-use-case-diagram)
6. [Class Diagram](#6-class-diagram)
7. [Conclusion](#7-conclusion)

---

## 1. Introduction

This document covers the requirements analysis and UML modelling for **CodeQuest**, a web platform that teaches programming to French high school students in the NSI (*Numérique et Sciences Informatiques*) curriculum. Students play a knight in a pixel art world, fight bosses, and solve quests through a visual block-based editor built on Google Blockly.

The document identifies the actors who interact with the system, lists the functional and non-functional requirements the platform must meet, and provides a high-level UML view through a use case diagram and a class diagram. Both models feed directly into the implementation phase.

The scope reflects the project as of April 2026. Some requirements and model elements will evolve as development progresses.

---

## 2. System Actors

Four actors interact with CodeQuest, each with a dedicated interface.

### 2.1 Guest

An unauthenticated visitor. A Guest can register an account or log in with existing credentials, but cannot access any protected feature until authenticated. Once logged in, they become one of the three roles below.

### 2.2 Student

The main user of the platform. A Student is typically a high school student with no prior programming background. They interact through the game: exploring the world, fighting bosses, solving quests in the visual block editor, and progressively learning the languages covered by the NSI curriculum (Python, HTML, CSS, JavaScript, SQL). Progression is tracked through XP, levels, and completed quests.

### 2.3 Teacher

The NSI teacher in charge of one or several classes. A Teacher manages their students, assigns quests with due dates, and monitors progress at the individual and class level. Their interface centers on a dashboard showing completion rates, scores, and attempts enough to spot at a glance who is stuck and who is ahead.

### 2.4 Admin

The platform administrator. An Admin has full access: managing users (create, edit, delete), curating quest and boss content, and consulting global usage statistics. Every protected backend endpoint is gated by role-based access control.

---

## 3. Functional Requirements

Functional requirements describe what the system must do, grouped by subsystem.

### 3.1 Authentication and User Management

- **FR-A1 — Registration:** The system shall allow a Guest to register an account by providing an email, a password, and a role (student or teacher by default; admin accounts are created internally).
- **FR-A2 — Authentication:** The system shall authenticate users with a JWT token issued after successful login.
- **FR-A3 — Role-based access:** The system shall enforce role-based access control, restricting each endpoint to the appropriate role(s).
- **FR-A4 — Logout:** Authenticated users shall be able to log out, invalidating their current session on the client side.
- **FR-A5 — Password security:** Passwords shall be stored in the database only as bcrypt hashes, never in plain text.

### 3.2 Student — Gameplay and Learning

- **FR-S1 — Explore the game world:** A Student shall be able to navigate a pixel art map controlling a knight character.
- **FR-S2 — Interact with bosses:** A Student shall be able to approach a boss and initiate a quest linked to it.
- **FR-S3 — Solve quests via Blockly:** A Student shall be able to assemble blocks in the Google Blockly editor to solve a quest challenge.
- **FR-S4 — Execute code:** A Student shall be able to run their assembled blocks; the system shall execute the corresponding code and return the result.
- **FR-S5 — Validate quest completion:** The system shall validate the Student's submission against the quest's expected outcome and mark the quest as completed or failed accordingly.
- **FR-S6 — Record attempts:** The system shall record every quest attempt, its score, and its completion status.
- **FR-S7 — Create custom blocks:** A Student shall be able to compose their own reusable blocks from existing ones and save them for later use.
- **FR-S8 — Track progression:** A Student shall be able to consult their XP, level, and completed quests on their profile.
- **FR-S9 — View assigned quests:** A Student shall be able to view the list of quests assigned by their teacher, along with due dates.

### 3.3 Teacher — Classroom Management and Monitoring

- **FR-T1 — Manage classes:** A Teacher shall be able to create, edit, and delete the classes they own.
- **FR-T2 — Manage students in a class:** A Teacher shall be able to add and remove students from their own classes.
- **FR-T3 — Assign quests:** A Teacher shall be able to assign one or several quests to a class, optionally with a due date.
- **FR-T4 — Monitor individual progress:** A Teacher shall be able to consult any student's progression (XP, level, quests completed, scores, attempts).
- **FR-T5 — View class analytics:** A Teacher shall be able to view class-wide statistics (completion rates, average scores, active students).

### 3.4 Admin — Platform Management

- **FR-AD1 — Manage users:** An Admin shall be able to create, edit, and delete users of any role.
- **FR-AD2 — Manage quest content:** An Admin shall be able to create, edit, and delete quests, including their language, difficulty, block set, and associated boss.
- **FR-AD3 — Manage boss content:** An Admin shall be able to create, edit, and delete bosses, including their sprite, HP, and attack pattern.
- **FR-AD4 — View platform statistics:** An Admin shall be able to consult global statistics about platform usage (number of users per role, quests completed, etc.).

---

## 4. Non-Functional Requirements

Non-functional requirements describe how the system should behave quality attributes beyond the raw feature list.

| Category | ID | Requirement |
|---|---|---|
| Usability | NFR-U1 | The student interface shall be intuitive for beginners with no programming experience, relying on visual feedback and drag-and-drop interaction. |
| Usability | NFR-U2 | The platform shall support French as its primary language; English may be added later. |
| Usability | NFR-U3 | Error messages shall be written in plain language and shall guide the user toward a solution. |
| Performance | NFR-P1 | Page load time on the student game interface shall remain below 3 seconds on a standard broadband connection. |
| Performance | NFR-P2 | Feedback after code execution shall be returned to the student in under 2 seconds in nominal conditions. |
| Performance | NFR-P3 | The backend shall support at least 30 concurrent students per class without noticeable degradation. |
| Security | NFR-S1 | All passwords shall be hashed with bcrypt before storage. |
| Security | NFR-S2 | Authentication shall rely on signed JWT tokens with a reasonable expiration window. |
| Security | NFR-S3 | Role-based access control shall be enforced on every protected endpoint. |
| Security | NFR-S4 | All communications between client and server shall use HTTPS in production. |
| Security | NFR-S5 | Student data shall be handled in compliance with GDPR, including the right to erasure. |
| Reliability | NFR-R1 | The platform shall handle unexpected errors gracefully, without exposing stack traces to the end user. |
| Reliability | NFR-R2 | The database shall be backed up at least once a day. |
| Maintainability | NFR-M1 | The codebase shall follow conventional style rules enforced by ESLint and Prettier. |
| Maintainability | NFR-M2 | Backend and frontend shall be organized in modular folders (routes / controllers / models / components / pages / hooks). |
| Maintainability | NFR-M3 | The project shall include a CI pipeline (GitHub Actions) running tests and builds on every pull request. |
| Maintainability | NFR-M4 | Every public API endpoint shall be documented in the README. |
| Portability | NFR-PO1 | The web client shall run correctly on recent versions of Chrome, Firefox, Safari, and Edge. |
| Portability | NFR-PO2 | PostgreSQL shall run in Docker so the local database starts with a single command (`docker compose up -d db`). The client and server run on the host, since production deploys to Vercel (front) and Render (back), which build and containerize independently. |
| Portability | NFR-PO3 | The production deployment shall target Vercel for the frontend and Render for the backend. |

---

## 5. Use Case Diagram

The diagram below shows how the four actors interact with the CodeQuest system. Dashed arrows labelled `<<include>>` mean that one use case always involves another for example, *Solve a Quest* always includes *Write Code with Blocks* and *Execute Code*.

Mermaid does not natively support UML use case diagrams, so the flowchart below approximates one. Actors appear as rectangles on the edges; use cases appear as stadium-shaped nodes inside the system boundary.

![alt text](photo/usecase.png)

---

## 6. Class Diagram

The model is built around an abstract `User` class from which `Student`, `Teacher`, and `Admin` inherit. It is the target domain model for the platform. Four entities are already PostgreSQL tables: `users`, `classes`, `class_students`, and `attempts`. The rest `PlayerProfile`, `CustomBlock`, `Assignment`, `Boss`, `Quest`, `QuestProgress` belong to later phases and are not in the schema yet. `ClassStudent` maps to the `class_students` join table; `Assignment` would similarly materialize a many-to-many relationship rather than a first-class entity.

![alt text](photo/classdiagram.png)

### 6.1 Key relationships

- `User` is abstract; `Student`, `Teacher`, and `Admin` inherit from it.
- A `Student` has exactly one `PlayerProfile` (composition) and may create multiple `CustomBlock`s.
- A `Teacher` teaches zero or more `Class`es, and each `Class` enrolls zero or more `Student`s, materialized in the database by the `ClassStudent` join table.
- An `Assignment` links a `Class`, a `Quest`, and the `Teacher` who assigned it, with an optional due date.
- A `Boss` appears in zero or more `Quest`s; each `Quest` has exactly one `Boss`.
- `QuestProgress` records the relationship between a `Student` and a `Quest`. In the current schema, this role is filled by the append-only `attempts` table one row per attempt, holding the quest id, a `completed` boolean, and a `score` rather than a single mutable status row. The richer status enum (`not_started`, `in_progress`, `completed`, `failed`) is part of the target model and is not implemented yet.

---

## 7. Conclusion

Three phases of work flow from this document: the authentication layer, the student game loop, and the teacher/admin management interfaces. The class diagram defines the domain model the implementation builds toward; the use case diagram maps which actor triggers which feature. Both will be updated as edge cases surface during development.