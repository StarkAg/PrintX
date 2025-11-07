# Google Drive Integration Setup Guide

This guide will walk you through connecting Google Drive to your PrintX application.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Node.js project with `googleapis` package (already installed)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `PrintX` (or any name you prefer)
5. Click **"Create"**
6. Wait for the project to be created and select it

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, go to **"APIs & Services"** > **"Library"**
2. Search for **"Google Drive API"**
3. Click on **"Google Drive API"**
4. Click **"Enable"**
5. Wait for the API to be enabled

## Step 3: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"OAuth client ID"**
4. If prompted, configure the OAuth consent screen first:
   - Choose **"External"** (unless you have a Google Workspace)
   - Fill in the required fields:
     - App name: `PrintX`
     - User support email: Your email
     - Developer contact: Your email
   - Click **"Save and Continue"**
   - Add scopes: Click **"Add or Remove Scopes"**
     - Search and select: `https://www.googleapis.com/auth/drive.file`
     - Click **"Update"** then **"Save and Continue"**
   - Add test users (your email) if needed
   - Click **"Save and Continue"** and then **"Back to Dashboard"**

5. Back to creating OAuth client ID:
   - Application type: **"Web application"**
   - Name: `PrintX Web Client`
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://your-vercel-domain.vercel.app` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback` (for development)
     - `https://your-vercel-domain.vercel.app/api/auth/callback` (for production)
   - Click **"Create"**

6. **Copy the Client ID and Client Secret** - You'll need these for environment variables

## Step 4: Get Refresh Token

You need to generate a refresh token to authenticate your application.

### Option A: Using OAuth 2.0 Playground (Easier)

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check **"Use your own OAuth credentials"**
4. Enter your **Client ID** and **Client Secret** from Step 3
5. In the left panel, find **"Drive API v3"**
6. Select scope: `https://www.googleapis.com/auth/drive.file`
7. Click **"Authorize APIs"**
8. Sign in with your Google account
9. Click **"Allow"** to grant permissions
10. Click **"Exchange authorization code for tokens"**
11. **Copy the "Refresh token"** - Save this securely!

### Option B: Using a Node.js Script (Alternative)

Create a file `get-refresh-token.js`:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/api/auth/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Refresh Token:', token.refresh_token);
  });
});
```

Run: `node get-refresh-token.js`

## Step 5: Set Environment Variables

### For Local Development

1. Create a `.env.local` file in the project root:

```env
GDRIVE_CLIENT_ID=your_client_id_here
GDRIVE_CLIENT_SECRET=your_client_secret_here
GDRIVE_REFRESH_TOKEN=your_refresh_token_here
GDRIVE_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

2. Replace the placeholder values with your actual credentials

### For Vercel Production

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add each variable:
   - `GDRIVE_CLIENT_ID` = your_client_id
   - `GDRIVE_CLIENT_SECRET` = your_client_secret
   - `GDRIVE_REFRESH_TOKEN` = your_refresh_token
   - `GDRIVE_REDIRECT_URI` = your_production_url/api/auth/callback
4. Select environments: **Production**, **Preview**, **Development**
5. Click **"Save"**
6. Redeploy your application

## Step 6: Enable Google Drive Upload in Code

1. Open `lib/drive.ts`
2. Uncomment the Google Drive API implementation (lines 99-172)
3. Comment out or remove the placeholder return (lines 174-182)
4. Save the file

## Step 7: Test the Integration

1. Restart your development server: `npm run dev`
2. Upload a file through your PrintX application
3. Check the console logs for:
   - `✅ Google Drive upload successful` (success)
   - `❌ Google Drive QUOTA EXCEEDED` (quota issue)
   - `❌ Google Drive upload failed` (other errors)

## Troubleshooting

### "Invalid grant" error
- Your refresh token may have expired
- Generate a new refresh token using Step 4

### "Quota exceeded" error
- You've hit Google Drive API limits
- Check your quota in Google Cloud Console
- Consider upgrading to a paid plan or implementing rate limiting

### "Access denied" error
- Check that you've granted the correct scopes
- Ensure your OAuth consent screen is properly configured
- Verify your redirect URIs match exactly

### Files not appearing in Drive
- Check that the Drive API is enabled in your project
- Verify your credentials are correct
- Check the console logs for error messages

## Security Notes

⚠️ **Important Security Reminders:**

1. **Never commit `.env.local`** to git (already in `.gitignore`)
2. **Keep your Client Secret and Refresh Token secure**
3. **Rotate credentials if they're exposed**
4. **Use environment variables in production**
5. **Monitor API usage in Google Cloud Console**

## Quota Limits

- **Free Tier**: ~20,000 API calls per day
- **Per Request**: ~50 MB response size
- **Execution Time**: 6 minutes per invocation

Your app is configured to:
- Limit to 10 files per order
- Monitor quota errors
- Log all upload attempts

## Next Steps

1. Monitor your Google Drive API usage in the Cloud Console
2. Set up alerts for quota usage
3. Consider implementing file organization in Drive (folders per order)
4. Add error notifications for quota exceeded scenarios

## Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure the Drive API is enabled in your project
4. Check Google Cloud Console for quota/error information

