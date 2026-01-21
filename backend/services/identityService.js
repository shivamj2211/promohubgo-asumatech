const pool = require("../db");

// ----------------------------
// Helpers
// ----------------------------
async function findUserByEmail(email) {
  if (!email) return null;
  const lower = String(email).toLowerCase();
  const { rows } = await pool.query(`SELECT * FROM users WHERE email=$1 LIMIT 1`, [lower]);
  return rows[0] || null;
}

async function findUserByPhone(phone) {
  if (!phone) return null;
  const { rows } = await pool.query(`SELECT * FROM users WHERE phone=$1 LIMIT 1`, [String(phone)]);
  return rows[0] || null;
}

async function findIdentity(provider, providerUserId) {
  const { rows } = await pool.query(
    `SELECT * FROM user_identities WHERE provider=$1 AND provider_user_id=$2 LIMIT 1`,
    [String(provider), String(providerUserId)]
  );
  return rows[0] || null;
}

// IMPORTANT: users table uses camelCase columns like "countryCode", "updatedAt"
async function createUser({ email, phone, full_name, country_code, password_hash }) {
  const { rows } = await pool.query(
    `
    INSERT INTO users (email, phone, name, "countryCode", password_hash, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, now(), now())
    RETURNING *
    `,
    [
      email ? String(email).toLowerCase() : null,
      phone ? String(phone) : null,
      full_name ? String(full_name) : null,
      country_code ? String(country_code) : null,
      password_hash ? String(password_hash) : null,
    ]
  );
  return rows[0];
}

async function upsertIdentity({ userId, provider, providerUserId, email, phone }) {
  await pool.query(
    `
    INSERT INTO user_identities(user_id, provider, provider_user_id, email, phone, created_at, updated_at)
    VALUES($1,$2,$3,$4,$5, now(), now())
    ON CONFLICT (provider, provider_user_id)
    DO UPDATE SET
      user_id=EXCLUDED.user_id,
      email=EXCLUDED.email,
      phone=EXCLUDED.phone,
      updated_at=now()
    `,
    [
      String(userId),
      String(provider),
      String(providerUserId),
      email ? String(email).toLowerCase() : null,
      phone ? String(phone) : null,
    ]
  );
}

async function linkOrCreateUser({
  provider,
  providerUserId,
  email,
  phone,
  full_name,
  country_code,
  password_hash,
}) {
  // 1) If identity exists -> return that user
  const identity = await findIdentity(provider, providerUserId);
  if (identity) {
    const { rows } = await pool.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [identity.user_id]);
    return rows[0] || null;
  }

  // 2) Match existing user by email/phone
  let user =
    (email && (await findUserByEmail(email))) ||
    (phone && (await findUserByPhone(phone)));

  // 3) If no user -> create one
  if (!user) {
    user = await createUser({ email, phone, full_name, country_code, password_hash });
  } else {
    // 4) Update missing fields safely (DB uses: name, "countryCode", "updatedAt")
    await pool.query(
      `
      UPDATE users
      SET
        name = COALESCE(name, $1),
        email = COALESCE(email, $2),
        phone = COALESCE(phone, $3),
        "countryCode" = COALESCE("countryCode", $4),
        "updatedAt" = now()
      WHERE id=$5
      `,
      [
        full_name ? String(full_name) : null,
        email ? String(email).toLowerCase() : null,
        phone ? String(phone) : null,
        country_code ? String(country_code) : null,
        user.id,
      ]
    );
  }

  // 5) Link identity row for future providers (email/password/firebase/phone/google)
  await upsertIdentity({ userId: user.id, provider, providerUserId, email, phone });

  // 6) Return fresh row
  const { rows } = await pool.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [user.id]);
  return rows[0] || null;
}

module.exports = { linkOrCreateUser };
