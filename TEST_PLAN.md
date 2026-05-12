# Test plan: authentication module

## 1. Purpose

This document lists every test case planned for the CodeQuest authentication module. It covers the five entry points implemented so far: registration, login, JWT verification, role-based access control, and the current-user endpoint.

Writing it before the test code itself has one reasons. The Jest suite under `server/tests/` ends up with a reference to work from. The status column on the right of every table moves each case from `planned` to `implemented` to `passing` as the suite is built.

The order matches `AUTH_DESIGN.md`: design first, code second.

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

Out of scope, and not planned at all for the MVP:

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

Real Postgres rather than mocks. The auth module depends on actual database behaviour: the `UNIQUE` constraint on `email`, the case-sensitive comparison of `VARCHAR` columns, the `23505` error code Postgres returns on duplicate inserts. None of that survives mocking, and a mocked User model would leave the most interesting failure modes untested.

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
| TC-REG-01 | HP | Valid student registration | `{ email: "alice@test.com", password: "password123", role: "student" }` | 201 | `{ token, user: { id, email, role: "student" } }` | planned |
| TC-REG-02 | HP | Valid teacher registration | `{ email: "bob@test.com", password: "password123", role: "teacher" }` | 201 | `{ token, user: { id, email, role: "teacher" } }` | planned |
| TC-REG-03 | EC | Email normalized to lowercase in storage | `{ email: "ALICE@TEST.com", ... }` | 201 | `user.email === "alice@test.com"` | planned |
| TC-REG-04 | SEC | Response never contains password_hash | Any valid registration | 201 | no `password_hash` field anywhere in response | planned |
| TC-REG-05 | IV | Missing email field | `{ password, role }` | 400 | `error: "email, password and role are required"` | planned |
| TC-REG-06 | IV | Missing password field | `{ email, role }` | 400 | same | planned |
| TC-REG-07 | IV | Missing role field | `{ email, password }` | 400 | same | planned |
| TC-REG-08 | IV | Email is a number | `{ email: 123, ... }` | 400 | same | planned |
| TC-REG-09 | IV | Password is an array | `{ password: [], ... }` | 400 | same | planned |
| TC-REG-10 | IV | All fields null | `{ email: null, password: null, role: null }` | 400 | same | planned |
| TC-REG-11 | EC | Empty string email | `{ email: "", ... }` | 400 | `error: "email, password and role cannot be empty"` | planned |
| TC-REG-12 | EC | Whitespace-only email | `{ email: "   ", ... }` | 400 | same (normalized to empty after trim) | planned |
| TC-REG-13 | EC | Whitespace-only password (8 spaces) | `{ password: "        ", ... }` | 400 | `error: "Password cannot be only whitespace"` | planned |
| TC-REG-14 | IV | Email missing @ | `{ email: "alicetest.com", ... }` | 400 | `error: "Invalid email format"` | planned |
| TC-REG-15 | IV | Email missing dot | `{ email: "alice@test", ... }` | 400 | same | planned |
| TC-REG-16 | IV | Password too short (7 chars) | `{ password: "1234567", ... }` | 400 | `error: "Password must be at least 8 characters long"` | planned |
| TC-REG-17 | EC | Password exactly at max (72 chars) | `{ password: "a".repeat(72), ... }` | 201 | success | planned |
| TC-REG-18 | IV | Password too long (73 chars) | `{ password: "a".repeat(73), ... }` | 400 | `error: "Password cannot exceed 72 characters"` | planned |
| TC-REG-19 | IV | Email too long (255 chars) | `{ email: 255-char string, ... }` | 400 | `error: "Email cannot exceed 254 characters"` | planned |
| TC-REG-20 | IV | Role is "admin" | `{ ..., role: "admin" }` | 400 | `error: "role must be either \"student\" or \"teacher\""` | planned |
| TC-REG-21 | IV | Role is unknown | `{ ..., role: "wizard" }` | 400 | same | planned |
| TC-REG-22 | EC | Duplicate email, same case | second register with same email | 409 | `error: "Email already registered"` | planned |
| TC-REG-23 | EC | Duplicate email, different case | first `alice@x.com`, then `ALICE@X.com` | 409 | same | planned |
| TC-REG-24 | SEC | SQL injection in email field | `{ email: "x' OR '1'='1@x.com", ... }` | 400 | `error: "Invalid email format"` (regex rejects before DB) | planned |
| TC-REG-25 | SEC | SQL injection in role field | `{ ..., role: "student'; DROP TABLE users--" }` | 400 | `error: "role must be either ..."` (whitelist rejects) | planned |

### 5.2 POST /api/auth/login

| ID | Cat | Scenario | Input | Expected status | Expected body | Status |
|---|---|---|---|---|---|---|
| TC-LOG-01 | HP | Valid credentials | `{ email, password }` of an existing user | 200 | `{ token, user: { id, email, role } }` | planned |
| TC-LOG-02 | EC | Email case-insensitive | login with `ALICE@TEST.COM` for an account stored as `alice@test.com` | 200 | success | planned |
| TC-LOG-03 | IV | Missing email | `{ password }` | 400 | `error: "email and password are required"` | planned |
| TC-LOG-04 | IV | Missing password | `{ email }` | 400 | same | planned |
| TC-LOG-05 | IV | Email is a number | `{ email: 123, password }` | 400 | same | planned |
| TC-LOG-06 | EC | Empty string email | `{ email: "", password }` | 400 | `error: "email and password cannot be empty"` | planned |
| TC-LOG-07 | EC | Empty string password | `{ email, password: "" }` | 400 | same | planned |
| TC-LOG-08 | SEC | Unknown email | `{ email: "nobody@x.com", password: "anything" }` | 401 | `error: "Invalid email or password"` | planned |
| TC-LOG-09 | SEC | Wrong password | correct email, wrong password | 401 | `error: "Invalid email or password"` | planned |
| TC-LOG-10 | SEC | Anti-enumeration: TC-08 and TC-09 return identical body | (comparison check) | n/a | byte-for-byte same error body in both cases | planned |
| TC-LOG-11 | SEC | SQL injection in email | `{ email: "' OR '1'='1", password: "anything" }` | 401 | `error: "Invalid email or password"` (no user found) | planned |

### 5.3 verifyToken middleware

These cases test the middleware through `GET /api/auth/me`, which is the simplest protected route in the codebase.

| ID | Cat | Scenario | Input | Expected status | Expected body | Status |
|---|---|---|---|---|---|---|
| TC-VTK-01 | IV | No Authorization header | call `/me` without header | 401 | `error: "Access token required"` | planned |
| TC-VTK-02 | IV | Header without "Bearer " prefix | `Authorization: <raw token>` | 401 | same | planned |
| TC-VTK-03 | IV | Malformed JWT | `Bearer notajwt` | 401 | `error: "Invalid or expired token"` | planned |
| TC-VTK-04 | SEC | JWT signed with wrong secret | token forged with a different secret | 401 | same | planned |
| TC-VTK-05 | SEC | Expired JWT | token with `exp` in the past | 401 | same | planned |
| TC-VTK-06 | SEC | Tampered payload | valid token with modified `role` field, signature broken | 401 | same | planned |
| TC-VTK-07 | HP | Valid token | freshly issued token from login | 200 | `{ user: ... }` returned by /me | planned |

### 5.4 requireRole middleware

These cases mount a temporary route guarded by `requireRole` in the test setup, then issue tokens for users of different roles.

| ID | Cat | Scenario | Setup | Expected status | Expected body | Status |
|---|---|---|---|---|---|---|
| TC-RRO-01 | IV | No req.user (middleware misused, called without verifyToken) | call requireRole directly | 403 | `error: "Insufficient permissions"` | planned |
| TC-RRO-02 | HP | Single allowed role, user matches | `requireRole('admin')` with admin user | 200 | passes through | planned |
| TC-RRO-03 | HP | Array of allowed roles, user matches | `requireRole(['teacher', 'admin'])` with teacher user | 200 | passes through | planned |
| TC-RRO-04 | SEC | User role does not match | `requireRole('admin')` with student token | 403 | `error: "Insufficient permissions"` | planned |

### 5.5 GET /api/auth/me

| ID | Cat | Scenario | Input | Expected status | Expected body | Status |
|---|---|---|---|---|---|---|
| TC-ME-01 | IV | No token | no Authorization header | 401 | `error: "Access token required"` | planned |
| TC-ME-02 | IV | Invalid token | `Bearer garbage` | 401 | `error: "Invalid or expired token"` | planned |
| TC-ME-03 | HP | Valid token, user exists | freshly issued token | 200 | `{ user: { id, email, role } }` | planned |
| TC-ME-04 | ERR | Valid token, user deleted from DB | issue token, then `DELETE FROM users WHERE id = ?`, then call /me | 401 | `error: "User no longer exists"` | planned |
| TC-ME-05 | SEC | Response never contains password_hash | any successful call | 200 | no `password_hash` field in response | planned |

## 6. Security considerations

The SEC-tagged cases each map to a real attack surface.

For SQL injection, the model layer relies on parameterized queries throughout, so any payload in `email` or `role` reaches Postgres as a value rather than as SQL. TC-REG-24, TC-REG-25 and TC-LOG-11 confirm that the input filters (the email regex and the role whitelist) also catch the obvious payloads earlier in the chain. The two defences are independent: removing the regex would not open a SQL injection hole, but it would let malformed input travel further than it needs to.

Account enumeration is closed by returning an identical 401 body for both "unknown email" and "wrong password" in `login`. TC-LOG-10 verifies that the two response bodies are byte-for-byte the same.

JWT tampering is prevented by HMAC-SHA256 signing on every token issued by `signToken`. TC-VTK-04 to TC-VTK-06 cover the three realistic forgery scenarios: a token signed with the wrong secret, a valid token whose `exp` has already passed, and a payload modified after signing.

Two attack surfaces are acknowledged but not mitigated in this version. The first is a timing attack on `login`. When the email is unknown, the endpoint returns before `bcrypt.compare` runs, which normally takes around 100 ms. An attacker who can measure response times precisely can therefore tell "unknown email" apart from "wrong password". Fixing this means comparing against a dummy hash when no user is found. The cost is not worth it on a school platform without high-value accounts, but the trade-off is documented here so it is not silently ignored.

The second is brute force on `login`, which would need rate limiting at the route or IP level. Neither is in this version and neither is planned for the MVP.

## 7. Implementation plan 

#### Order of work once this plan is approved:

1. Set up the `codequest_test` database and the `.env.test` file (one-time setup).
2. Add a Jest helper that truncates `users` between tests.
3. Write `register.test.js` for TC-REG-*.
4. Write `login.test.js` for TC-LOG-*.
5. Write `middlewares.test.js` for TC-VTK-* and TC-RRO-*.
6. Write `me.test.js` for TC-ME-*.
7. Wire `npm test` into the existing GitHub Actions pipeline so every push runs the suite.

The status column in every table moves each case through `planned` to `implemented` to `passing` as work progresses.
