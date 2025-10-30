# 🚇 ngrok Setup Guide for Meeting Assistant

## Why ngrok?

- **HTTPS**: Provides secure HTTPS connection required for WebRTC (audio/video)
- **Public Access**: Makes localhost accessible to anyone on the internet
- **No Firewall Issues**: Bypasses NAT and firewall restrictions

## Quick Setup (5 minutes)

### 1. Get ngrok Auth Token

1. Visit: https://ngrok.com/
2. Sign up (free account works)
3. Go to: https://dashboard.ngrok.com/get-started/your-authtoken
4. Copy your authtoken

### 2. Configure ngrok

```powershell
# Add your authtoken (replace with yours)
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### 3. Start Everything

**Option A: Manual (Two Terminals)**

Terminal 1 - Start Next.js:

```powershell
npm run dev
```

Terminal 2 - Start ngrok:

```powershell
ngrok http 3000
```

**Option B: Using PowerShell Script**

```powershell
.\start-with-ngrok.ps1
```

### 4. Get Your Public URL

After starting ngrok, you'll see output like:

```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
```

✅ **Copy the `https://abc123.ngrok-free.app` URL**

### 5. Share the Meeting Link

Share the ngrok URL with participants:

```
https://abc123.ngrok-free.app/meeting/meeting-1234/join
```

## Important Notes

### ⚠️ Environment Variables

Your `.env.local` file should work as-is because LiveKit URLs don't need to change. Only the frontend URL changes.

### 🔄 URL Changes on Restart

**Free Plan**: ngrok URL changes every time you restart

- Save the new URL each time
- Update any bookmarks

**Paid Plan ($8/month)**: Get a permanent subdomain

- URL stays the same: `https://yourname.ngrok.io`

### 🌐 Backend API

If your backend is also on localhost:8080, you have 2 options:

**Option 1: Use localhost from frontend**

- Keep `http://localhost:8080` in your code
- Works because frontend code runs in browser

**Option 2: Tunnel backend too**

```powershell
# Terminal 3
ngrok http 8080
```

Then update your frontend to use the backend ngrok URL.

## Troubleshooting

### Issue: "ngrok is not recognized"

```powershell
npm install -g ngrok
```

### Issue: "Authentication failed"

```powershell
ngrok config add-authtoken YOUR_TOKEN
```

### Issue: "Too many connections" (Free plan limit)

- Only 1 ngrok tunnel at a time on free plan
- Close other ngrok instances
- Or upgrade to paid plan

### Issue: Users can't access camera/mic

- Make sure they're using the HTTPS ngrok URL
- Check browser permissions
- Try incognito/private mode

### Issue: Meeting won't connect

1. Check LiveKit credentials in `.env.local`
2. Verify NEXT_PUBLIC_LIVEKIT_WS_URL is set
3. Check browser console for errors

## Testing Steps

1. Start dev server: `npm run dev`
2. Start ngrok: `ngrok http 3000`
3. Open ngrok URL in incognito: `https://xyz.ngrok-free.app`
4. Create a meeting
5. Copy join link
6. Open in another device/browser
7. Join meeting ✅

## Production Alternative

For production, instead of ngrok, consider:

- **Vercel**: Free hosting for Next.js (automatic HTTPS)
- **Netlify**: Free tier with custom domains
- **Railway/Render**: Backend + frontend hosting
- **AWS/Google Cloud**: Full control

## Cost Comparison

| Service | Free Tier             | Paid                                    |
| ------- | --------------------- | --------------------------------------- |
| ngrok   | Random URLs, 1 tunnel | $8/mo - Custom domain, multiple tunnels |
| Vercel  | Unlimited             | $20/mo - Team features                  |
| Railway | $5 credit             | Pay as you go                           |

## Next Steps After Setup

1. ✅ Verify HTTPS connection works
2. ✅ Test with another device
3. ✅ Check audio/video permissions
4. ✅ Test recording functionality
5. 📝 Share meeting links with team

## Quick Commands Reference

```powershell
# Start ngrok
ngrok http 3000

# Start with specific region
ngrok http 3000 --region us

# Start with custom configuration
ngrok start --all --config ngrok.yml

# Check ngrok status
ngrok status

# View web interface
# Open: http://localhost:4040
```

## Support

- ngrok Docs: https://ngrok.com/docs
- Dashboard: https://dashboard.ngrok.com
- Status: https://status.ngrok.com
