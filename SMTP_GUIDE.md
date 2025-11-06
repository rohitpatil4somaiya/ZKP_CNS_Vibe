# 📧 Email Configuration Guide

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" → "2-Step Verification"
3. Follow the prompts to enable 2FA

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Click "Generate"
4. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 3: Update .env File
Edit `backend/.env` and replace these values:

```properties
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com          # ← Your Gmail address
SMTP_PASS=abcdefghijklmnop               # ← Your App Password (no spaces!)
```

**Example:**
```properties
SMTP_USER=john.doe@gmail.com
SMTP_PASS=abcdefghijklmnop
```

### Step 4: Restart Mailer Server
Stop the current server (Ctrl+C) and restart:
```powershell
cd backend
npm run start:mailer
```

**Expected output:**
```
Mailer server listening on http://localhost:5050
```
**No errors should appear!**

