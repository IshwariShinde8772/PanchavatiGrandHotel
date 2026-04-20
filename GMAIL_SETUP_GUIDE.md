# Gmail SMTP Configuration Guide

## The Error: 534-5.7.9 Please log in with your web browser

This error occurs when trying to use Gmail's SMTP with your regular account password. Google doesn't allow third-party applications to authenticate with your regular password.

**Solution: Use Gmail App Password**

### Steps to Generate Gmail App Password

1. **Enable 2-Step Verification** (required for App Passwords)
   - Go to [Google Account](https://myaccount.google.com)
   - Click "Security" in left menu
   - Enable "2-Step Verification" if not already enabled

2. **Generate App Password**
   - Go to [Google Account > App passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Windows Computer" (or your device type)
   - Google will generate a 16-character unique password
   - Copy this password (it will only show once)

3. **Update your `.env` file** in the server directory:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   EMAIL_FROM=noreply@panchavatgrand.in
   ```

   **Important:** Use the 16-character App Password, NOT your Gmail password

4. **Restart the Server**
   ```bash
   npm restart
   ```

### Verification

The server will now:

- Automatically verify email connection on startup
- Show ✅ "Email service is ready" if successful
- Show ❌ with error details if configuration is wrong

### If You See Error Messages:

- "Invalid login" → Your credentials are wrong, check app password again
- "Could not connect" → Check SMTP_HOST and SMTP_PORT settings
- "Connection timeout" → May need to update firewall settings

## Staff Password Changes

### What Changed:

1. **Admin now controls staff passwords**
   - When creating new staff, leave password blank to auto-generate a secure password
   - Or provide your own password (min 8 chars, with uppercase, lowercase, and numbers)

2. **Password is shown to admin after creation**
   - Admin can copy the password to share securely with staff
   - Password is also sent via email to the staff member

3. **Staff must change password after first login**
   - This ensures only staff knows their actual password

### Secure Password Example (Auto-generated):

- Format: 10 characters
- Contains: Uppercase, Lowercase, Numbers, Special characters (@#$%)
- Example: `K9@mP2xL$q`
