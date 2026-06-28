# Test plan: authentication module

## 1. Purpose

This document lists every test case planned for the CodeQuest authentication module. It covers the five entry points implemented so far: registration, login, JWT verification, role-based access control, and the current-user endpoint.

The Jest suite under `server/tests/` gets a reference to work from, and the status column on the right of every table moves each case from `planned` to `implemented` to `passing` as the suite is built.

## 2. Scope

In scope:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `verifyToken` middleware
- `requireRole` middleware
- `GET /api/auth/me`

Out of scope for this iteration, but planned for separate test plans when those modules ship:

- Phaser game core
- Blockly editor integration
- Teacher progress dashboard
- Admin user management
- Quest content rendering

Out of scope, and not planned for the MVP:

- Performance and load testing
- End-to-end browser tests
- Cross-browser frontend testing

## 3. Tools and conventions

| Concern | Choice |
|---|---|
| Test runner | Jest (already in `devDependencies`) |
| HTTP testing | Supertest (already in `devDependencies`) |
| Database | Real PostgreSQL, on a dedicated `codequest_test` database |
| Isolation | `TRUNCATE TABLE users RESTART IDENTITY CASCADE` in `beforeEach` |
| File layout | `server/tests/<module>.test.js` |
| Run command | `npm test` (Jest auto-discovers `*.test.js`) |
| Environment | `.env.test` loaded via `dotenv` when `NODE_ENV=test` |

Real Postgres rather than mocks. The auth module depends on actual database behaviour: the `UNIQUE` constraint on `email`, the case-sensitive comparison of `VARCHAR` columns, the `23505` error code on duplicate inserts. A mocked User model would leave those failure modes untested, which defeats the point.

## 4. Categories

Each test case below carries one of these category codes:

| Code | Category | What it covers |
|---|---|---|
| HP | Happy path | The endpoint returns the documented success response for valid input. |
| IV | Input validation | The endpoint rejects malformed input with a clean 400 instead of a 500 or a hang. |
| EC | Edge case | Inputs that are technically valid but surface non-obvious behaviour: case sensitivity, whitespace, duplicate emails. |
| SEC | Security | Inputs designed to exploit a vulnerability: SQL injection, account enumeration, token tampering. |
| ERR | Error handling | The endpoint behaves correctly when a dependency fails: DB error, expired token, deleted user. |

## 5. Test cases

### 5.1 POST /api/auth/register

| ID | Cat | Scenario | Input | Expected status | Expected body | Status |
|---|---|---|---|---|---|---|
| TC-REG-01 | HP | Valid student registration | `{ email: "alice@test.com", password: "password123", role: "student" }` | 201 | `{ token, user: { id, email, role: "student" } }` | passing |
| TC-REG-02 | HP | Valid teacher registration | `{ email: "bob@test.com", password: "password123", role: "teacher" }` | 201 | `{ token, user: { id, email, role: "teacher" } }` | passing |
| TC-REG-03 | EC | Email normalized to lowercase in storage | `{ email: "ALICE@TEST.com", ... }` | 201 | `user.email === "alice@test.com"` | passing |
| TC-REG-04 | SEC | Response never contains password_hash | Any valid registration | 201 | no `password_hash` field anywhere in response | passing |
| TC-REG-05 | IV | Missing email field | `{ password, role }` | 400 | `error: "email, password and role are required"` | passing |
| TC-REG-06 | IV | Missing password field | `{ email, role }` | 400 | same | passing |
| TC-REG-07 | IV | Missing role field | `{ email, password }` | 400 | same | passing |
| TC-REG-08 | IV | Email is a number | `{ email: 123, ... }` | 400 | same | passing |
| TC-REG-09 | IV | Password is an array | `{ password: [], ... }` | 400 | same | passing |
| TC-REG-10 | IV | All fields null | `{ email: null, password: null, role: null }` | 400 | same | passing |
| TC-REG-11 | EC | Empty string email | `{ email: "", ... }` | 400 | `error: "email, password and role cannot be empty"` | passing |
| TC-REG-12 | EC | Whitespace-only email | `{ email: "   ", ... }` | 400 | same (normalized to empty after trim) | passing |
| TC-REG-13 | EC | Whitespace-only password (8 spaces) | `{ password: "        ", ... }` | 400 | `error: "Password cannot be only whitespace"` | passing |
| TC-REG-14 | IV | Email missing @ | `{ email: "alicetest.com", ... }` | 400 | `error: "Invalid email format"` | passing |
| TC-REG-15 | IV | Email missing dot | `{ email: "alice@test", ... }` | 400 | same | passing |
| TC-REG-16 | IV | Password too short (7 chars) | `{ password: "1234567", ... }` | 400 | `error: "Password must be at least 8 characters long"` | passing |
| TC-REG-17 | EC | Password exactly at max (72 chars) | `{ password: "a".repeat(72), ... }` | 201 | success | passing |
| TC-REG-18 | IV | Password too long (73 chars) | `{ password: "a".repeat(73), ... }` | 400 | `error: "Password cannot exceed 72 characters"` | passing |
| TC-REG-19 | IV | Email too long (255 chars) | `{ email: 255-char string, ... }` | 400 | `error: "Email cannot exceed 254 characters"` | passing |
| TC-REG-20 | IV | Role is "admin" | `{ ..., role: "admin" }` | 400 | `error: "role must be either \"student\" or \"teacher\""` | passing |
| TC-REG-21 | IV | Role is unknown | `{ ..., role: "wizard" }` | 400 | same | passing |
| TC-REG-22 | EC | Duplicate email, same case | second register with same email | 409 | `error: "Email already registered"` | passing |
| TC-REG-23 | EC | Duplicate email, different case | first `alice@x.com`, then `ALICE@X.com` | 409 | same | passing |
| TC-REG-24 | SEC | SQL injection in email field | `{ email: "x' OR '1'='1@x.com", ... }` | 400 | `error: "Invalid email format"` (regex rejects before DB) | passing |
| TC-REG-25 | SEC | SQL injection in role field | `{ ..., role: "student'; DROP TABLE users--" }` | 400 | `error: "role must be either ..."` (whitelist rejects) | passing |

### 5.2 POST /api/auth/login

| ID | Cat | Scenario | Input | Expected status | Expected body | Status |
|---|---|---|---|---|---|---|
| TC-LOG-01 | HP | Valid credentials | `{ email, password }` of an existing user | 200 | `{ token, user: { id, email, role } }` | passing |
| TC-LOG-02 | EC | Email case-insensitive | login with `ALICE@TEST.COM` for an account stored as `alice@test.com` | 200 | success | passing |
| TC-LOG-03 | IV | Missing email | `{ password }` | 400 | `error: "email and password are required"` | passing |
| TC-LOG-04 | IV | Missing password | `{ email }` | 400 | same | passing |
| TC-LOG-05 | IV | Email is a number | `{ email: 123, password }` | 400 | same | passing |
| TC-LOG-06 | EC | Empty string email | `{ email: "", password }` | 400 | `error: "email and password cannot be empty"` | passing |
| TC-LOG-07 | EC | Empty string password | `{ email, password: "" }` | 400 | same | passing |
| TC-LOG-08 | SEC | Unknown email | `{ email: "nobody@x.com", password: "anything" }` | 401 | `error: "Invalid email or password"` | passing |
| TC-LOG-09 | SEC | Wrong password | correct email, wrong password | 401 | `error: "Invalid email or password"` | passing |
| TC-LOG-10 | SEC | Anti-enumeration: TC-08 and TC-09 return identical body | (comparison check) | n/a | byte-for-byte same error body in both cases | passing |
| TC-LOG-11 | SEC | SQL injection in email | `{ email: "' OR '1'='1", password: "anything" }` | 401 | `error: "Invalid email or password"` (no user found) | passing |

### 5.3 verifyToken middleware

These cases test the middleware through `GET /api/auth/me`, the simplest protected route in the codebase.

| ID | Cat | Scenario | Input | Expected status | Expected body | Status |
|---|---|---|---|---|---|---|
| TC-VTK-01 | IV | No Authorization header | call `/me` without header | 401 | `error: "Access token required"` | passing |
| TC-VTK-02 | IV | Header without "Bearer " prefix | `Authorization: <raw token>` | 401 | same | passing |
| TC-VTK-03 | IV | Malformed JWT | `Bearer notajwt` | 401 | `error: "Invalid or expired token"` | passing |
| TC-VTK-04 | SEC | JWT signed with wrong secret | token forged with a different secret | 401 | same | passing |
| TC-VTK-05 | SEC | Expired JWT | token with `exp` in the past | 401 | same | passing |
| TC-VTK-06 | SEC | Tampered payload | valid token with modified `role` field, signature broken | 401 | same | passing |
| TC-VTK-07 | HP | Valid token | freshly issued token from login | 200 | `{ user: ... }` returned by /me | passing |

### 5.4 requireRole middleware

These cases mount a temporary route guarded by `requireRole` in the test setup, then issue tokens for users of different roles.

| ID | Cat | Scenario | Setup | Expected status | Expected body | Status |
|---|---|---|---|---|---|---|
| TC-RRO-01 | IV | No req.user (middleware misused, called without verifyToken) | call requireRole directly | 403 | `error: "Insufficient permissions"` | passing |
| TC-RRO-02 | HP | Single allowed role, user matches | `requireRole('admin')` with admin user | 200 | passes through | passing |
| TC-RRO-03 | HP | Array of allowed roles, user matches | `requireRole(['teacher', 'admin'])` with teacher user | 200 | passes through | passing |
| TC-RRO-04 | SEC | User role does not match | `requireRole('admin')` with student token | 403 | `error: "Insufficient permissions"` | passing |

### 5.5 GET /api/auth/me

| ID | Cat | Scenario | Input | Expected status | Expected body | Status |
|---|---|---|---|---|---|---|
| TC-ME-01 | IV | No token | no Authorization header | 401 | `error: "Access token required"` | passing |
| TC-ME-02 | IV | Invalid token | `Bearer garbage` | 401 | `error: "Invalid or expired token"` | passing |
| TC-ME-03 | HP | Valid token, user exists | freshly issued token | 200 | `{ user: { id, email, role } }` | passing |
| TC-ME-04 | ERR | Valid token, user deleted from DB | issue token, then `DELETE FROM users WHERE id = ?`, then call /me | 401 | `error: "User no longer exists"` | passing |
| TC-ME-05 | SEC | Response never contains password_hash | any successful call | 200 | no `password_hash` field in response | passing |

## 6. Security considerations

The SEC-tagged cases each map to a real attack surface.

**SQL injection.** The model layer uses parameterized queries throughout, so any payload in `email` or `role` reaches Postgres as a value, not as SQL. TC-REG-24, TC-REG-25, and TC-LOG-11 confirm that the email regex and role whitelist also catch the obvious payloads before they even reach the database. The two defences are independent removing the regex wouldn't open a SQL injection hole, but it would let garbage travel further than it needs to.

**Account enumeration.** Returning an identical 401 body for both "unknown email" and "wrong password" on login keeps the two cases indistinguishable to an attacker. TC-LOG-10 verifies that the two response bodies are byte-for-byte the same.

**JWT tampering.** HMAC-SHA256 signing on every issued token means a modified payload always breaks the signature. TC-VTK-04 through TC-VTK-06 cover the three realistic scenarios: wrong secret, expired token, tampered payload.

Two attack surfaces are acknowledged but left unmitigated for now.

The first is a timing attack on login. When the email is unknown, the endpoint returns before `bcrypt.compare` runs which normally takes ~100ms. An attacker who can measure response times can therefore distinguish "unknown email" from "wrong password", undermining the enumeration protection above. The fix is comparing against a dummy hash when no user is found. Not worth it on a school platform with no high-value accounts, but documented here so it isn't silently ignored.

The second is brute force on login. That needs rate limiting at the route or IP level. Neither is planned for the MVP.