// CommonJS serverless handler for Vercel (node runtime)
const nodemailer = require('nodemailer')

// Minimal CORS helper (allow only your frontend origin in production)
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || '*'

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
}

module.exports = async (req, res) => {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' })
  }

  try {
    const { recipients, fromEmail, username } = req.body || {}
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ status: 'error', message: 'recipients array required' })
    }

    // Validate required envs
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, MAIL_FROM } = process.env
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.error('Missing SMTP envs')
      return res.status(500).json({ status: 'error', message: 'Mailer not configured' })
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE || '').toLowerCase() === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    const mailFrom = MAIL_FROM || fromEmail || SMTP_USER
    const results = []

    // IMPORTANT: sending sequentially is simpler but slow for many recipients.
    // For many recipients, use provider batch API or queueing.
    for (const r of recipients) {
      if (!r.email || !r.shareHex) continue
      const info = await transporter.sendMail({
        from: mailFrom,
        to: r.email,
        subject: `Social Recovery Share${username ? ` for ${username}` : ''}`,
        text: `Secret share:\n\n${r.shareHex}`,
        html: `<p>Secret share:<br><code>${r.shareHex.replace(/</g,'&lt;')}</code></p>`
      })
      results.push({ email: r.email, messageId: info.messageId })
    }

    return res.json({ status: 'success', sent: results.length, results })
  } catch (err) {
    console.error('Mailer error', err)
    return res.status(500).json({ status: 'error', message: err.message || 'Send failed' })
  }
}