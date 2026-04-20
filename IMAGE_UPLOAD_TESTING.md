# JPEG/JPG Image Upload - Testing & Verification

## Quick Verification (2 minutes)

### Step 1: Check Server is Running

```
Terminal: Should show "Server running on port 5000"
If not: cd server; npm run dev
```

### Step 2: Test Upload JPEG

```
1. Open browser: http://localhost:5173 (or your frontend URL)
2. Login as admin
3. Go to: Rooms → Manage Rooms → Create New Room
4. Click "Add Image" button
5. Select any JPEG/JPG file
6. Expected: Image uploads and shows in preview
```

### Step 3: Verify in Console

```
Open browser DevTools (F12) → Console tab
Look for: ✅ Upload successful: http://localhost:5000/uploads/room-...jpg
```

---

## Detailed Test Cases

### Test Case 1: Single JPEG Upload ✅

**Setup**: Prepare one JPEG file (< 5MB)

**Steps**:

1. Click "Add Image"
2. Select JPEG file
3. Wait for upload

**Expected Results**:

- ✅ Browser toast: "1 image uploaded successfully"
- ✅ Image preview appears below button
- ✅ Console shows: `📤 Uploading: filename.jpg (XXX.XXkB, Type: image/jpeg)`
- ✅ Console shows: `✅ Upload successful: http://localhost:5000/uploads/room-...jpg`
- ✅ Server logs: `✅ Image uploaded successfully`

**Success**: Image appears in preview with URL

---

### Test Case 2: Multiple Formats Upload ✅

**Setup**: Prepare JPEG, PNG, WebP files (all < 5MB)

**Steps**:

1. Click "Add Image"
2. Select all 3 files at once
3. Wait for upload

**Expected Results**:

- ✅ Browser toast: "3 images uploaded successfully"
- ✅ All 3 images appear in preview
- ✅ Server logs each upload
- ✅ Each gets unique URL

**Success**: All formats work

---

### Test Case 3: File Size Limit ❌

**Setup**: Prepare file > 5MB

**Steps**:

1. Click "Add Image"
2. Select file > 5MB
3. Try to upload

**Expected Results**:

- ✅ Browser toast: "Invalid files: filename.mov (too large - max 5MB)"
- ✅ File NOT sent to server
- ✅ Server logs: (no upload attempt)

**Success**: File rejected immediately

---

### Test Case 4: Wrong File Type ❌

**Setup**: Prepare PDF, Word, Excel file

**Steps**:

1. Click "Add Image"
2. Select PDF or Word file
3. Try to upload

**Expected Results**:

- ✅ Browser toast: "Invalid files: document.pdf (invalid format - use JPEG/PNG/WebP)"
- ✅ File NOT sent to server
- ✅ Server logs: (no upload attempt)

**Success**: File rejected immediately

---

### Test Case 5: Mixed Success/Failure ✅

**Setup**: Prepare 4 files: image.jpg, image.png, document.pdf, large-video.mov

**Steps**:

1. Click "Add Image"
2. Select all 4 files
3. Observe upload

**Expected Results**:

- ✅ Browser toast: "✅ 2 images uploaded successfully"
- ✅ Browser toast: "⚠️ Failed to upload: document.pdf (invalid format - use JPEG/PNG/WebP) | large-video.mov (too large - max 5MB)"
- ✅ Only image.jpg and image.png appear in preview
- ✅ Both invalid files rejected on client side
- ✅ Server logs: only 2 uploads

**Success**: Valid files uploaded, invalid files rejected

---

### Test Case 6: Create Room with Uploaded Images ✅

**Setup**: Upload 2-3 images

**Steps**:

1. Upload images (see Test Case 1)
2. Fill in room details:
   - Room Number: 101
   - Name: Deluxe Room
   - Category: Premium
   - Base Price: 5000
   - Capacity: 2
   - Description: Beautiful room
3. Click "Create Room"
4. Go to room list
5. Click on created room
6. View details

**Expected Results**:

- ✅ Room created successfully
- ✅ Images appear in room detail page
- ✅ Images display correctly (no broken image icons)
- ✅ Images load from `/uploads/` path

**Success**: Full workflow complete

---

## Console Output Reference

### When Upload Works ✅

**Browser Console**:

```
📤 Uploading: room.jpg (245.50KB, Type: image/jpeg)
✅ Upload successful: http://localhost:5000/uploads/room-1713206400000-456789.jpg
✅ 1 image uploaded successfully
```

**Server Console**:

```
✅ File validation passed: room.jpg (MIME: image/jpeg)
✅ Image uploaded successfully
   Filename: room-1713206400000-456789.jpg
   Size: 245.50KB
   MIME: image/jpeg
   URL: http://localhost:5000/uploads/room-1713206400000-456789.jpg
POST /api/upload/image 200 12.45ms - 256
```

### When Client Validation Rejects ❌

**Browser Console**:

```
Invalid files: document.pdf (invalid format - use JPEG/PNG/WebP)
```

**Server Console**:

```
(No entry - file never sent to server)
```

---

## Troubleshooting

### Issue: "Upload failed. Please try again."

**Quick Diagnosis**:

1. Open DevTools (F12) → Console tab
2. Look for detailed error message
3. Check server console for error logs

**Common Causes**:

- [ ] File MIME type corrupted
- [ ] File extension doesn't match content
- [ ] Server permission issue
- [ ] Disk space full

**Fix**:

- Try a different file
- Convert image using image editor
- Check `server/uploads/` permissions
- Check disk space

---

### Issue: "Image URL works but shows broken in preview"

**Cause**: CORS headers not set

**Fix**:

1. Check `server/src/app.js` has:
   ```javascript
   app.use(
     "/uploads",
     (req, res, next) => {
       res.header("Access-Control-Allow-Origin", env.clientUrl);
       next();
     },
     express.static(uploadsDir),
   );
   ```
2. Verify `CLIENT_URL` in .env matches your frontend

---

### Issue: Multiple uploads fail but one file works

**Cause**: One of the files is invalid

**Fix**:

1. Look at error message (shows which files failed)
2. Remove invalid file from selection
3. Upload valid files only

---

## Performance Check

### Expected Upload Times

| File Size | Expected Time | Notes      |
| --------- | ------------- | ---------- |
| 100KB     | < 500ms       | Instant    |
| 500KB     | < 1s          | Very fast  |
| 1MB       | 1-2s          | Good       |
| 3MB       | 2-4s          | Acceptable |
| 5MB       | 4-6s          | Max size   |

If uploads are slow:

- Check internet speed (localhost should be instant)
- Check server CPU/memory usage
- Check disk I/O performance

---

## Regression Testing

After image upload fix, verify other features still work:

- [ ] Room list loads correctly
- [ ] Room detail page displays
- [ ] Admin login works
- [ ] Create new room (without images) works
- [ ] Edit room works
- [ ] Delete room works
- [ ] Search rooms works
- [ ] Customer booking flow works

---

## Sign-Off Checklist

- [ ] JPEG files upload successfully
- [ ] JPG files upload successfully
- [ ] PNG files upload successfully
- [ ] WebP files upload successfully
- [ ] Files > 5MB are rejected
- [ ] Wrong file formats are rejected
- [ ] Multiple files can be uploaded at once
- [ ] Uploaded images appear in preview
- [ ] Uploaded images display in room details
- [ ] Console shows no errors
- [ ] Server logs show successful uploads
- [ ] Room can be created with uploaded images
- [ ] Previous features still work

---

## Summary

Once all tests pass, you can confidently say:
✅ **Image uploads are fully fixed and working!**
