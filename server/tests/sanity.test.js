// server/tests/sanity.test.js
// Validates that the test harness is correctly wired:
//   - .env.test is loaded
//   - the test DB is reachable
//   - truncate works and leaves the table empty
// If this passes, the rest of the test suite can build on it.

const { db, truncateUsers, closePool } = require('./helpers/db');

beforeEach(async () => {
    await truncateUsers();
});

afterAll(async () => {
    await closePool();
});

describe('test harness', () => {
    test('points at the test database', () => {
        expect(process.env.DB_NAME).toBe('codequest_test');
    });

    test('users table is empty after truncate', async () => {
        const { rows } = await db.query('SELECT COUNT(*) FROM users');
        expect(rows[0].count).toBe('0'); // pg returns counts as strings
    });

    test('can insert and read back a row', async () => {
        await db.query(
            "INSERT INTO users (email, password_hash, role) VALUES ('x@y.com', 'fake', 'student')"
        );
        const { rows } = await db.query('SELECT email FROM users');
        expect(rows).toHaveLength(1);
        expect(rows[0].email).toBe('x@y.com');
    });
});