// Top-level Vercel API shim that forwards to the mailer handler in backend/mailer
// This file ensures the `/api/send-shares` route exists even if Vercel's project
// root is the repository root. It simply re-exports the handler implemented
// at `backend/mailer/api/send-shares.js`.

module.exports = require('./backend/mailer/api/send-shares.js')
