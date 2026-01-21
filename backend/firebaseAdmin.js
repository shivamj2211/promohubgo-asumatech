const admin = require("firebase-admin");

function initFirebase() {
  if (admin.apps.length) return;

  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

async function verifyFirebaseIdToken(idToken) {
  initFirebase();
  return await admin.auth().verifyIdToken(idToken);
}

module.exports = { verifyFirebaseIdToken };
