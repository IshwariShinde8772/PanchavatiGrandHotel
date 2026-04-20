# Social Login Setup Guide

## Google OAuth Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select existing one
3. **Enable Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)
5. **Copy credentials** and add to `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

## Testing

1. **Restart your server** after adding environment variables
2. **Go to login page** and click "Continue with Google"
3. **Complete OAuth flow** - you'll be redirected back to your app
4. **Check server logs** for any OAuth-related errors

## Notes

- **Development**: Use `http://localhost:5000` URLs
- **Production**: Update redirect URIs to your production domain
- **Session Management**: OAuth uses sessions, ensure your session secret is secure
