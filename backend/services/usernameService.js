const pool = require("../db");

async function recordUsernameChange(userId, oldUsername, newUsername) {
  const oldU = String(oldUsername || "").trim().toLowerCase();
  const newU = String(newUsername || "").trim().toLowerCase();
  if (!userId || !oldU || !newU) return;
  if (oldU === newU) return;

  try {
    await pool.query(
      `INSERT INTO username_history (user_id, old_username, new_username)
       VALUES ($1, $2, $3)
       ON CONFLICT (old_username) DO NOTHING`,
      [userId, oldU, newU]
    );
  } catch (e) {
    console.error("recordUsernameChange error:", e);
  }
}

module.exports = { recordUsernameChange };
