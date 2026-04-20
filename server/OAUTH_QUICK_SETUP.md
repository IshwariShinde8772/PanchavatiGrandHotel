# 🚀 Quick Google OAuth Setup

## 📱 Google OAuth Setup

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account
3. Click "Create Project" or select existing project

### Step 2: Enable Google+ API

1. In the left sidebar, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and enable it

### Step 3: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Name it "Hotel App" or similar
5. **Authorized redirect URIs** - Add:
   - `http://localhost:5000/api/auth/google/callback` (for development)
   - `https://yourdomain.com/api/auth/google/callback` (for production)
6. Click "Create"

### Step 4: Copy Credentials

You'll get:

- **Client ID**: A long string ending in `.googleusercontent.com`
- **Client Secret**: Another long string

### Step 5: Update .env

Replace in your `.env` file:

```
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

---

## 🧪 Testing

1. **Restart your server**: `npm run dev` (in server folder)
2. **Go to login page**: http://localhost:5173/login
3. **Click "Continue with Google"**
4. **Complete OAuth flow** - you should be logged in!

---

## 🔧 Troubleshooting

### Google Issues:

- Make sure redirect URI matches exactly
- Check that Google+ API is enabled
- Verify Client ID and Secret are correct

### Common Errors:

- "Invalid client": Check Client ID
- "Redirect URI mismatch": Check redirect URIs in console
- "Invalid scope": Make sure APIs are enabled

---

## 📝 Quick Test Commands

Test Google OAuth setup:

```bash
curl "http://localhost:5000/api/auth/google"
# Should redirect to Google (if credentials are set)
```

---

## 🎯 Next Steps

1. **Test locally first** with development redirect URIs
2. **Add production URIs** when deploying

Need help? Check the server logs for detailed error messages!
