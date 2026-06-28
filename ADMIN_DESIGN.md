# Admin backend design

This document describes the admin side of the API: listing every account, changing a user's role, and deleting an account. It covers FR-AD1. The React admin panel that will consume these routes is a separate sprint; this is the contract it gets built against.

Design first, code second, trade-offs in writing.

The `users` table has existed since Phase 1, and registration plus the seed script already write to it. This module needs no migration only new read, update, and delete paths.

## Design choices

- **An admin cannot touch their own role or account.** Both the role change and the delete refuse with a 400 when `:id` equals the caller's own id. This is the one safety rule that matters most here: the only way to create an admin is the seed script, so an admin who demotes or deletes themselves could leave the platform with no administrator and no in-app way back. The self check runs before anything else.
- **The role API never grants admin.** A role change accepts `student` or `teacher`, nothing else. Sending `admin` is rejected the same as sending `wizard`: one 400, one message, no special case. Admin accounts come from the seed script alone, keeping that power off the network entirely. Demoting another admin to teacher is allowed, since that is a legitimate action and the self check already prevents the only dangerous version of it.
- **Responses never carry password_hash.** Listing users returns `id`, `email`, `role`, `created_at`. A test serializes the whole response and checks the hash appears nowhere the same guard as registration.
- **Deletion leans on the schema's cascades.** Removing a user removes their attempts, their class memberships, and any classes they own, through the `ON DELETE CASCADE` rules already in place. No soft delete for the MVP.
- **SQL stays in models.** Three functions added to `User.js`: `findAll`, `updateRole`, `deleteById`. No new model file.

## Endpoints

All three routes run `verifyToken` then `requireRole('admin')`, mounted at `/api/admin`. This fills `routes/admin.js`, empty since April, and uncomments its line in `index.js`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/users` | List every account |
| PATCH | `/api/admin/users/:id/role` | Change a user's role. Body: `{ role }` |
| DELETE | `/api/admin/users/:id` | Delete an account |

Success responses: `200 { users }` on listing, `200 { user }` on role change, `204` with no body on deletion.

## Role change contract

Checks run in this order:

1. `:id` is not a positive integer → 400 "Invalid user id".
2. `:id` equals the caller's own id → 400 "You cannot change your own role".
3. `role` is missing or not a string → 400 "role is required".
4. `role` is not `student` or `teacher` → 400 "role must be either student or teacher".
5. No user has that id → 404 "User not found".
6. Otherwise the role is updated and the user returned without the hash.

The self check sits above the role validation on purpose: an admin who sends a malformed body for their own id should be told it is their own account, not that the body is malformed.

## Delete contract

1. `:id` is not a positive integer → 400 "Invalid user id".
2. `:id` equals the caller's own id → 400 "You cannot delete your own account".
3. No user has that id → 404 "User not found".
4. Otherwise the user and their cascaded data are removed, and the response is 204.

## Error responses

| Status | When |
|---|---|
| `400 Bad Request` | Non-integer id, acting on your own account, missing role, or a role outside student and teacher |
| `401 Unauthorized` | Missing, invalid, or expired token |
| `403 Forbidden` | Valid token, but the role is not admin |
| `404 Not Found` | No user with that id |

## Not covered yet

Content management (admin creates or edits quests) stays in the Should bucket from `PRIORITIZATION.md`. Editing a user's email or resetting a password are left out for now. No pagination: the user count for a demo platform is small enough that a flat list holds up fine.

## Test plan

Same harness as the rest: Jest and Supertest against `codequest_test`, `.env.test`, truncation in `beforeEach`. Each test creates its own users through the real `/api/auth/register` endpoint; admin accounts are either promoted directly in the database or seeded with a direct insert, since registration cannot mint an admin by design.

File: `tests/admin.test.js`.

| ID | Cat | Scenario | Input | Expected status | Expected body | Status |
|---|---|---|---|---|---|---|
| TC-ADM-01 | HP | List all users | three accounts exist | 200 | `{ users }` of length 3, each with id, email, role, created_at | passing |
| TC-ADM-02 | SEC | Listing never exposes password_hash | any users | 200 | no `password_hash` anywhere in the response | passing |
| TC-ADM-03 | SEC | No token | GET without Authorization header | 401 | `error: "Access token required"` | passing |
| TC-ADM-04 | SEC | Student token | valid student JWT | 403 | `error: "Insufficient permissions"` | passing |
| TC-ADM-05 | SEC | Teacher token | valid teacher JWT | 403 | `error: "Insufficient permissions"` | passing |
| TC-ADM-06 | HP | Change a user's role | `{ role: "teacher" }` on a student | 200 | `user.role === "teacher"`, no hash | passing |
| TC-ADM-07 | EC | Demote another admin to teacher | `{ role: "teacher" }` on a second admin | 200 | success | passing |
| TC-ADM-08 | IV | Promote to admin is rejected | `{ role: "admin" }` | 400 | `error: "role must be either student or teacher"` | passing |
| TC-ADM-09 | IV | Unknown role | `{ role: "wizard" }` | 400 | same | passing |
| TC-ADM-10 | IV | Missing role | `{}` | 400 | `error: "role is required"` | passing |
| TC-ADM-11 | SEC | Admin cannot change own role | `{ role: "teacher" }` on own id | 400 | `error: "You cannot change your own role"`, role unchanged in DB | passing |
| TC-ADM-12 | IV | Non-integer id on role change | `PATCH /users/abc/role` | 400 | `error: "Invalid user id"` | passing |
| TC-ADM-13 | EC | Unknown id on role change | `PATCH /users/99999/role` | 404 | `error: "User not found"` | passing |
| TC-ADM-14 | HP | Delete a user | DELETE an existing account | 204 | empty body, row gone | passing |
| TC-ADM-15 | EC | Deleting a user cascades their attempts | delete a student who has attempts | 204 | `attempts` rows for that student gone | passing |
| TC-ADM-16 | SEC | Admin cannot delete own account | DELETE own id | 400 | `error: "You cannot delete your own account"`, account still in DB | passing |
| TC-ADM-17 | IV | Non-integer id on delete | `DELETE /users/abc` | 400 | `error: "Invalid user id"` | passing |
| TC-ADM-18 | EC | Unknown id on delete | `DELETE /users/99999` | 404 | `error: "User not found"` | passing |