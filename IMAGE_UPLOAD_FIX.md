# Image Upload Fix Guide

## Problem

Images uploaded in the "Manage Rooms" admin panel were not being displayed after upload or after saving the room.

## Root Causes Fixed

1. **File path issues** on Windows with Japanese directory names
2. **Missing error handling** in image upload validation
3. **CORS headers** not being set for uploaded image files
4. **No loading/error states** for image preview
5. **Silent failures** in image loading without feedback

## What Was Changed

### Backend Changes

#### 1. [server/src/routes/upload.js](server/src/routes/upload.js) - Improved upload handling

- Added automatic directory creation
- Improved file naming (using `room-` prefix)
- Added better error handling for multer errors
- Added error middleware for file size and format validation
- Added logging for upload debugging

#### 2. [server/src/controllers/upload/uploadController.js](server/src/controllers/upload/uploadController.js) - Better response

- Added detailed logging of uploaded files
- Added file size and MIME type in response
- Added try-catch for error handling
- Added console logs for debugging (✅ for success, ❌ for errors)

#### 3. [server/src/app.js](server/src/app.js) - CORS and caching headers

- Added CORS headers to `/uploads` route
- Added cache headers for uploaded images (24-hour cache)
- Ensures images can be accessed from frontend

### Frontend Changes

#### 1. [client/src/pages/admin/ManageRooms.jsx](client/src/pages/admin/ManageRooms.jsx) - Enhanced upload & preview

**Improved handleImageUpload:**

- Added console logging for each upload step
- Better error handling per file
- Handles partial failures (some files upload, others fail)
- Shows upload error details

**New ImagePreview Component:**

- Shows loading spinner while image loads
- Displays error state if image fails to load
- Logs successful image loads
- Shows remove button on hover
- Better visual feedback

## How to Test

### Step 1: Start the servers

```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm run dev
```

### Step 2: Upload a room image

1. Go to Admin → Manage Rooms
2. Click "Add New Room"
3. Fill in basic details (name, price, capacity, description)
4. Click "Upload Files" in Room Images section
5. Select an image (JPG, PNG, or WebP)

### Step 3: Verify upload

- ✅ Image preview appears in grid (may show loading spinner briefly)
- ✅ Console shows "✅ Image loaded" message
- ✅ Success toast notification appears
- ✅ Room number, name appear on upload row

### Step 4: Save and verify persistence

1. Click "Finalize & Save" to create the room
2. The modal closes
3. Go to admin/rooms page
4. Click "Edit" on the new room
5. ✅ Image should be visible in the preview grid

## Debugging

### If images don't load:

**Check browser console (F12 → Console tab):**

- Look for "✅ Image loaded" or "❌ Image failed to load" logs
- If "❌ failed", the image file wasn't saved correctly

**Check server logs:**

- Look for "✅ Image uploaded" with the URL
- Example: `✅ Image uploaded: room-1712592345678-123456789.jpg`

**Check file system:**

- Images should be in: `server/uploads/`
- File naming: `room-[timestamp]-[random].jpg`

**Common issues:**

| Symptom               | Cause                 | Fix                                  |
| --------------------- | --------------------- | ------------------------------------ |
| "Upload failed" toast | File too large (>5MB) | Use smaller image                    |
| "Invalid file type"   | Not JPG, PNG, or WebP | Convert image format                 |
| Image won't load      | Server not running    | Start `npm run dev` in server folder |
| Blank preview         | CORS issue            | Clear browser cache & hard refresh   |
| "No file uploaded"    | File input cleared    | Try uploading again                  |

## Technical Details

### Image Storage

- **Location:** `server/uploads/` (relative to server root)
- **File naming:** `room-[timestamp]-[randomnumber].jpg`
- **Max size:** 5MB
- **Formats:** JPG, PNG, WebP

### URL Format

- **Pattern:** `http://localhost:5000/uploads/room-xxx.jpg`
- **Used as:** Direct image source in `<img src={url} />`
- **No API middleware:** Served directly as static files

### Upload Workflow

```
1. User selects image file
2. Frontend sends POST /api/upload/image
3. Multer saves to server/uploads/
4. Upload controller generates full URL
5. URL returned to frontend
6. Image displayed in preview
7. URL stored in form.images array
8. On save, images array sent to /admin/rooms
9. Images array stored in room.images JSON field
```

## Performance Notes

- Images are cached for 24 hours by browser
- Multiple images can be uploaded in one action
- Each file is uploaded sequentially (not parallel)
- File size validated on both client and server
