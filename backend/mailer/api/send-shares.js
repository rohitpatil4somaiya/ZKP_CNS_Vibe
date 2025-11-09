const nodemailer = require('nodemailer')
const path = require('path')
const dotenv = require('dotenv')

// Try load .env files for local testing; in Vercel use project env vars
const candidates = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
]
for (const p of candidates) {
  try {
    dotenv.config({ path: p })
    break
  } catch (e) {
    // ignore
  }
}

function setCorsHeaders(req, res) {
  const allowedOriginsRaw = process.env.ALLOWED_ORIGIN || process.env.FRONTEND_ORIGINS || '*'
  const allowedOrigins = allowedOriginsRaw.split ? allowedOriginsRaw.split(',').map(s => s.trim()).filter(Boolean) : ['*']
  const origin = req.headers.origin
  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (allowedOrigins.length > 0) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0])
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

module.exports = async (req, res) => {
  setCorsHeaders(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const { recipients, fromEmail, username } = req.body || {}
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ status: 'error', message: 'recipients array is required' })
    }

    for (const r of recipients) {
      if (!r || !r.email || !r.shareHex) {
        return res.status(400).json({ status: 'error', message: 'Each recipient needs email and shareHex' })
      }
    }

    const SMTP_HOST = process.env.SMTP_HOST
    const SMTP_PORT = process.env.SMTP_PORT
    const SMTP_USER = process.env.SMTP_USER
    const SMTP_PASS = process.env.SMTP_PASS
    const SMTP_SECURE = process.env.SMTP_SECURE

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      return res.status(500).json({ status: 'error', message: 'SMTP config missing on server' })
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE || '').toLowerCase() === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    const mailFrom = process.env.MAIL_FROM || fromEmail || SMTP_USER
    const results = []
    for (const r of recipients) {
      const subject = `Social Recovery Share${username ? ` for ${username}` : ''} (ID #${r.id || '?'})`
      const text = `Hello,\n\nYou have been designated as a trusted contact for social recovery.\n\nShare ID: ${r.id ?? ''}\nSecret Share (keep confidential):\n${r.shareHex}\n\nPublic Commitment (Y):\n${r.publicKeyY || 'N/A'}\n\nInstructions:\n- Keep this share private. Do not forward or post it.\n- When recovery is needed, you'll be asked to verify possession without revealing it.\n\nIf you were not expecting this, you can ignore and delete this email.`

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <p>Hello,</p>
          <p>You have been designated as a trusted contact for social recovery${username ? ` for <b>${username}</b>` : ''}.</p>
          <p><b>Share ID:</b> ${r.id ?? ''}</p>
          <p><b>Secret Share (keep confidential):</b><br>
            <code style="display:inline-block;padding:8px;background:#f6f8fa;border:1px solid #eaecef;border-radius:6px;">${(r.shareHex || '').replace(/</g, '&lt;')}</code>
          </p>
          ${r.publicKeyY ? `<p><b>Public Commitment (Y):</b><br>
            <code style="display:inline-block;padding:8px;background:#f6f8fa;border:1px solid #eaecef;border-radius:6px;">${r.publicKeyY.replace(/</g, '&lt;')}</code>
          </p>` : ''}
          <p><b>Instructions:</b></p>
          <ul>
            <li>Keep this share private. Do not forward or post it.</li>
            <li>When recovery is needed, you'll be asked to verify possession without revealing it.</li>
          </ul>
          <p>If you were not expecting this, you can ignore and delete this email.</p>
        </div>
      `

      const info = await transporter.sendMail({
        from: mailFrom,
        to: r.email,
        subject,
        text,
        html,
      })
      results.push({ email: r.email, messageId: info.messageId })
    }

    return res.json({ status: 'success', sent: results.length, results })
  } catch (err) {
    console.error('Mailer error:', err)
    // ensure CORS header
    setCorsHeaders(req, res)
    return res.status(500).json({ status: 'error', message: err.message || 'Send failed' })
  }
}
