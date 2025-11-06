// Simple mailer service using Express + Nodemailer
// Exposes POST /api/send-shares to email User shares to friends

const path = require('path')
const dotenv = require('dotenv')

// Try loading .env from several locations so devs can run the mailer from backend/ or repo root
const candidates = [
  path.join(__dirname, '..', '.env'),       // backend/.env
  path.join(__dirname, '..', '..', '.env'), // repo-root .env
]

let loadedFrom = null
for (const p of candidates) {
  try {
    const res = dotenv.config({ path: p })
    if (res.parsed) {
      loadedFrom = p
      break
    }
  } catch (e) {
    // ignore and try next
  }
}
if (!loadedFrom) {
  // final fallback to default locations
  const res = dotenv.config()
  if (res.parsed) loadedFrom = 'default'
}
console.log(`[dotenv] injecting env (${loadedFrom ? 'from ' + loadedFrom : 'none loaded'})`)

// Snapshot SMTP configuration at startup (don't print secrets). This makes behavior
// deterministic even if the process.env changes later or when dotenv injection is
// handled by other tooling.
const smtpConfig = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_SECURE: process.env.SMTP_SECURE,
  MAIL_FROM: process.env.MAIL_FROM,
}

console.log('[mailer] SMTP env presence:', {
  SMTP_HOST: !!smtpConfig.SMTP_HOST,
  SMTP_PORT: !!smtpConfig.SMTP_PORT,
  SMTP_USER: !!smtpConfig.SMTP_USER,
  SMTP_PASS: !!smtpConfig.SMTP_PASS,
  SMTP_SECURE: !!smtpConfig.SMTP_SECURE,
})

const express = require('express')
const cors = require('cors')
const nodemailer = require('nodemailer')

const app = express()
const PORT = process.env.MAILER_PORT || 5050

app.use(cors())
app.use(express.json({ limit: '1mb' }))


function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = smtpConfig

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Missing SMTP config: please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS')
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE || '').toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

app.post('/api/send-shares', async (req, res) => {
  try {
    const { recipients, fromEmail, username } = req.body || {}
    // recipients: [{ email, id, shareHex, publicKeyY }]

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ status: 'error', message: 'recipients array is required' })
    }

    // Basic validation
    for (const r of recipients) {
      if (!r || !r.email || !r.shareHex) {
        return res.status(400).json({ status: 'error', message: 'Each recipient needs email and shareHex' })
      }
    }

    const transporter = createTransporter()
    const mailFrom = process.env.MAIL_FROM || fromEmail || process.env.SMTP_USER

    const results = []
    for (const r of recipients) {
      const subject = `Social Recovery Share${username ? ` for ${username}` : ''} (ID #${r.id || '?'})`
      const text = `Hello,

You have been designated as a trusted contact for social recovery.

Share ID: ${r.id ?? ''}
Secret Share (keep confidential):
${r.shareHex}

Public Commitment (Y):
${r.publicKeyY || 'N/A'}

Instructions:
- Keep this share private. Do not forward or post it.
- When recovery is needed, you'll be asked to verify possession without revealing it.

If you were not expecting this, you can ignore and delete this email.
`

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

      // Send each email individually
      /* eslint-disable no-await-in-loop */
      const info = await transporter.sendMail({
        from: mailFrom,
        to: r.email,
        subject,
        text,
        html,
      })
      results.push({ email: r.email, messageId: info.messageId })
    }

    res.json({ status: 'success', sent: results.length, results })
  } catch (err) {
    console.error('Mailer error:', err)
    res.status(500).json({ status: 'error', message: err.message || 'Send failed' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Mailer server listening on http://localhost:${PORT}`)
})
