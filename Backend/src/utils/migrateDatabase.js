const Invitation = require('../models/Invitation');

async function migrateDatabase() {
  // Older ZooOps versions stored invitation tokens in `token` and created a
  // unique token_1 index. The current version stores only a SHA-256 tokenHash.
  // Remove the obsolete index so multiple new documents do not collide on
  // the missing legacy field (`token: null`). No documents are deleted.
  const indexes = await Invitation.collection.indexes();
  if (indexes.some((index) => index.name === 'token_1')) {
    await Invitation.collection.dropIndex('token_1');
    console.log('Removed obsolete invitations token_1 index.');
  }
}

module.exports = migrateDatabase;
