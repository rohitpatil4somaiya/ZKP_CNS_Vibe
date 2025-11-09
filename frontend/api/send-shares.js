// Re-export the root-level mailer handler so Vercel projects using `frontend/` as
// the root directory will still expose /api/send-shares.
module.exports = require('../../api/send-shares.js')
