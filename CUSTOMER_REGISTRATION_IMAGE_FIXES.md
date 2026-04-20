# Customer Registration & Image Upload - Fixes Applied

## Issues Fixed

### Issue 1: Customer Registration Not Responding

**Problem**: When creating a new customer account, the server doesn't send a response back - request hangs/times out.

**Root Cause**: The `registerCustomer` function was missing error handling. If ANY error occurred (SMTP failure, database error, etc.), the server would crash without sending a response to the client.

**Solution Applied**:

- ✅ Wrapped entire function in try-catch block
- ✅ Email sending failures no longer crash registration (non-blocking)
- ✅ All errors now return proper HTTP status with error message
- ✅ Added detailed logging at each step

**New Behavior**:

```javascript
try {
  // Create account
  // If email fails, log warning but continue
  // Return success response
} catch (error) {
  // Return error response with details
  console.error("❌ Error in registerCustomer:", error.message);
  return res.status(500).json({
    success: false,
    error: error.message,
  });
}
```

---

### Issue 2: Image Not Saving

**Problem**: When uploading images, the file is not being saved to disk.

**Root Causes**:

1. Upload directory might not exist or not have write permissions
2. No verification that directory is writable before saving
3. Insufficient error handling in multer destination callback

**Solutions Applied**:

1. **Enhanced directory initialization**:
   - Verifies directory exists before upload attempt
   - Sets proper permissions (0o777 = readable/writable)
   - Adds accessSync check to confirm writeability
   - Logs status on startup

2. **Better destination callback handling**:
   - Destination function now has try-catch
   - Verifies directory writable before accepting file
   - Returns proper error if directory issue detected
   - Logs filename generation

3. **Improved file filter logging**:
   - Logs MIME type when filter check starts
   - Shows exactly what MIME type was received vs expected
   - Clearer error messages for validation failures

---

## Expected Server Logs

### Successful Registration:

```
✅ Customer created: John Doe (ID: 123)
📧 Welcome email sent to john@example.com
[Response sent with token]
```

### Successful Image Upload:

```
📥 File filter check: photo.jpg
   MIME Type: image/jpeg
✅ File validation passed: photo.jpg (MIME: image/jpeg)
📤 Generating filename for upload: room-1713206400000-456789.jpg
✅ Image uploaded successfully
   Filename: room-1713206400000-456789.jpg
   Size: 245.50KB
   MIME: image/jpeg
   URL: http://localhost:5000/uploads/room-1713206400000-456789.jpg
POST /api/upload/image 200 12.45ms
```

### Failed Registration:

```
❌ Error in registerCustomer: Customer already exists with this email
[Returns 500 error with message to frontend]
```

### Failed Image Upload (Permission Issue):

```
❌ Error with uploads directory: EACCES: permission denied, access
[Server logs on startup]
```

---

## Testing the Fixes

### Test 1: Register New Customer

**Steps**:

1. Open frontend at http://localhost:5173
2. Go to Register page
3. Enter:
   - Name: John Doe
   - Email: john@example.com
   - Password:12345678
4. Click Register

**Expected Success**:

```
✅ Browser: "Account created successfully" toast
✅ Server logs: "✅ Customer created: John Doe"
✅ Redirects to customer dashboard
✅ Shows user profile
```

**If Fails**:

- Check server console for error message
- Should now show detailed error instead of hanging

### Test 2: Register with Phone + OTP (Optional)

**Steps**:

1. Go to Register page (OTP mode)
2. Enter name and phone
3. Click "Send OTP"
4. Submit OTP
5. Account created

**Expected Success**:

```
✅ OTP sent
✅ Account created after OTP verification
```

### Test 3: Upload Room Image

**Steps**:

1. Login as admin
2. Go to Manage Rooms
3. Click Create Room
4. Select image file (JPEG/PNG/WebP)
5. Click "Add Image"

**Expected Success**:

```
✅ Server logs file validation
✅ Server logs filename generation
✅ Server logs upload success with URL
✅ Image appears in preview
✅ Image has valid URL
```

---

## Troubleshooting

### Registration Still Not Responding

**Cause**: Server not restarted after changes

**Fix**:

1. Kill server process (Ctrl+C in terminal)
2. Restart: `npm run dev` in server directory
3. Try registration again

### Images Still Not Saving

**Cause**: Uploads directory doesn't have write permissions

**Fix (Windows)**:

```powershell
# Check if directory exists
ls server/uploads

# If doesn't exist, server will create on startup
# If exists but no write access, delete and restart server
rm -r server/uploads
npm run dev  # Restart server - will auto-create directory
```

**Fix (Mac/Linux)**:

```bash
# Set permissions
chmod 777 server/uploads

# Or delete and restart
rm -rf server/uploads
npm run dev  # Restart server
```

---

## Configuration Checklist

- [ ] Server running with `npm run dev`
- [ ] No errors in server console on startup
- [ ] "✅ Uploads directory verified" message shown
- [ ] Try registering new customer → works with response
- [ ] Try uploading image → file appears in /uploads folder
- [ ] Uploaded image URL accessible in browser

---

## Files Modified

1. ✅ `server/src/controllers/auth/customerAuth.js`
   - Added try-catch to registerCustomer
   - Made email sending non-blocking
   - Added detailed logging and error responses

2. ✅ `server/src/routes/upload.js`
   - Enhanced directory initialization with verification
   - Added error handling to destination callback
   - Improved file filter logging

---

## Next Steps

1. Restart server: Kill and run `npm run dev` again
2. Test customer registration
3. Test image upload
4. Check console logs match expected output
5. If issues persist, share server logs

---

## Quick Verification

Open server console and run these commands to verify setup:

**Check uploads directory**:

```bash
# Windows PowerShell
ls server\uploads

# Mac/Linux
ls -la server/uploads
```

**Check Node.js file permissions**:

```bash
node -e "const fs = require('fs'); console.log(fs.statSync('server/uploads').mode)"
```

Both should work without errors.
