// server/src/controllers/accountController.js
// Lets a logged-in user change their own email or password. The user id
// always comes from the token (req.user.id), never from the body, so a
// user can only ever modify their own account. Both actions require the
// current password: a valid JWT lives for a while, so re-checking the
// password stops someone with a borrowed session from taking the account
// over by changing its credentials. Same validation rules as register.

const bcrypt = require('bcrypt');
const User = require('../models/User');

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const MAX_EMAIL_LENGTH = 254;

// PATCH /api/auth/email
// Body: { password, newEmail }
async function changeEmail(req, res) {
  try {
    let { password, newEmail } = req.body;
    if (typeof password !== 'string' || typeof newEmail !== 'string') {
      return res.status(400).json({ error: 'password and newEmail are required' });
    }

    newEmail = newEmail.trim().toLowerCase();
    if (!password || !newEmail) {
      return res.status(400).json({ error: 'password and newEmail cannot be empty' });
    }
    if (newEmail.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({ error: `Email cannot exceed ${MAX_EMAIL_LENGTH} characters` });
    }
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Re-authenticate with the current password before any change.
    const user = await User.findByIdWithHash(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Decision 5: changing to the same email is a no-op, reported clearly
    // instead of surfacing as a confusing 409 against the user's own row.
    if (newEmail === user.email) {
      return res.status(400).json({ error: 'This is already your email' });
    }

    let updated;
    try {
      updated = await User.updateEmail(req.user.id, newEmail);
    } catch (dbErr) {
      if (dbErr.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw dbErr;
    }

    return res.status(200).json({ user: updated });
  } catch (err) {
    console.error('changeEmail failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/auth/password
// Body: { currentPassword, newPassword }
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }

    // New password validated with the same rules as registration.
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` });
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters` });
    }
    if (newPassword.trim().length === 0) {
      return res.status(400).json({ error: 'Password cannot be only whitespace' });
    }

    const user = await User.findByIdWithHash(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    const passwordOk = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await User.updatePassword(req.user.id, newHash);

    // No body needed; the client keeps its existing (still valid) token.
    return res.status(204).end();
  } catch (err) {
    console.error('changePassword failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { changeEmail, changePassword };