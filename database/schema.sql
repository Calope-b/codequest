-- database/schema.sql
-- CodeQuest database schema (MVP version)
-- Run this once against an empty database to create the tables.

-- Drop in reverse dependency order if re-running.
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS class_students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- users
-- Stores all user accounts (students, teachers, admins).
-- Role is enforced at the application level, not via SQL enum,
-- to keep migrations easy.
-- ============================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

-- ============================================================
-- classes
-- A class is owned by a teacher and groups students together.
-- ============================================================
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_teacher ON classes (teacher_id);

-- ============================================================
-- class_students
-- Many-to-many link between classes and students.
-- ============================================================
CREATE TABLE class_students (
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);

-- ============================================================
-- attempts
-- Records every quest attempt by a student.
-- Quests themselves will be added later (phase 3).
-- ============================================================
CREATE TABLE attempts (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attempts_student ON attempts (student_id);
CREATE INDEX idx_attempts_quest ON attempts (quest_id);