# 🔥 Firebase Storage Configuration

## Problem
When trying to upload entity logos, you may encounter a CORS error:
```
Access to XMLHttpRequest has been blocked by CORS policy
```

This happens because Firebase Storage requires security rules to be configured.

## Solution: Deploy Storage Rules

### Option 1: Using Firebase Console (Recommended for first-time setup)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **numia-cf**
3. In the left sidebar, click **Storage**
4. If Storage is not enabled:
   - Click **Get Started**
   - Choose your location (e.g., us-central1)
   - Click **Done**
5. Click on the **Rules** tab
6. Replace the existing rules with the content from `storage.rules` file
7. Click **Publish**

### Option 2: Using Firebase CLI

If you have Firebase CLI installed:

```bash
# Make sure you're in the project directory
cd C:\Users\emili\Documents\claude\apps\numiashad

# Login to Firebase (if not already logged in)
firebase login

# Initialize Firebase Storage (if not already initialized)
firebase init storage

# Deploy the storage rules
firebase deploy --only storage
```

### Option 3: Quick Fix (Development Only - NOT RECOMMENDED for Production)

If you just want to test quickly and you're in development:

1. Go to Firebase Console → Storage → Rules
2. Paste this temporary rule (allows all authenticated users to upload):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ **WARNING**: This is insecure and should only be used for testing. Use the proper rules from `storage.rules` for production.

## Verify Setup

After deploying the rules:

1. Refresh your browser
2. Try uploading a logo to an entity
3. You should see the upload complete successfully
4. The logo should appear in the entity card

## What the Rules Do

The `storage.rules` file allows:
- ✅ Authenticated users to read entity logos
- ✅ Users to upload/update/delete only their own entity logos
- ✅ Only image files under 2MB
- ❌ All other access is denied

## Troubleshooting

### Still getting CORS errors?
- Clear your browser cache
- Wait 1-2 minutes for rules to propagate
- Check that you're logged in (Firebase Auth)

### "Storage bucket not found"?
- Make sure Storage is enabled in Firebase Console
- Verify the `VITE_FIREBASE_STORAGE_BUCKET` in `.env` is correct

### Rules not deploying?
- Make sure `firebase.json` includes storage configuration
- Check that you have the right permissions on the Firebase project
