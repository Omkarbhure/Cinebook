const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'cinebook-c196c',
});

module.exports = admin;
