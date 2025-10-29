# Meeting Assistant — Dashboard

A stunning Next.js dashboard with glassmorphism design, authentication, and comprehensive meeting management features using mock data.

## ✨ Features

### 🔐 Authentication System
- **Mock authentication** with login/register pages
- **Protected routes** - only registered users can access dashboard
- **Session management** using localStorage
- Beautiful gradient form designs with validation

**Demo Credentials:**
- Email: `demo@example.com`
- Password: `demo123`

### 📊 Dashboard Features
- **Past Meetings**: View completed meetings with full transcripts, important messages, and action items
- **Upcoming Meetings**: See scheduled meetings with agenda, participants, location, and join buttons
- **Tasks Panel**: Manage action items with status badges and send notifications (Email/Slack/Push)
- **Analytics**: Task completion rates, productivity metrics, and meeting statistics
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile

### 🎨 Design System
- **Glassmorphism UI** with backdrop blur effects
- **Animated gradient background** that shifts colors
- **Smooth transitions** and micro-animations
- **Modern color palette** (purple, pink, blue gradients)
- **Custom scrollbars** and refined typography

## What is included

- **Next.js app** (pages + API routes)
- **Mock APIs**:
  - `/api/meetings` - Past and upcoming meetings data
  - `/api/auth` - Login/register authentication
  - `/api/notify` - Notification simulator
- **React Components**:
  - `Navbar` - Navigation with user profile
  - `MeetingList` - Past meetings list with glassmorphic cards
  - `MeetingDetail` - Detailed view with transcript and messages
  - `UpcomingMeetings` - Future meetings with agenda cards
  - `TasksPanel` - Action items with notification buttons
  - `AnalyticsPanel` - Stats cards with animations
- **Auth Context** - Authentication state management
- **Protected Routes** - Automatic login redirect

## 🚀 Run locally

1. From the `dashboard` folder install dependencies:

```pwsh
# Windows PowerShell
npm install
```

2. Start dev server:

```pwsh
npm run dev
```

3. Open http://localhost:3000 in your browser

4. You'll be redirected to `/login` - use demo credentials or register a new account

## 📁 Project Structure

```
dashboard/
├── components/
│   ├── Navbar.js              # Navigation bar with auth
│   ├── MeetingList.js         # Past meetings list
│   ├── MeetingDetail.js       # Meeting details view
│   ├── UpcomingMeetings.js    # Future meetings cards
│   ├── TasksPanel.js          # Tasks with notifications
│   └── AnalyticsPanel.js      # Analytics stats
├── context/
│   └── AuthContext.js         # Auth state provider
├── pages/
│   ├── _app.js                # App wrapper with AuthProvider
│   ├── index.js               # Main dashboard (protected)
│   ├── login.js               # Login page
│   ├── register.js            # Register page
│   └── api/
│       ├── meetings.js        # Meeting data API
│       ├── auth.js            # Auth API
│       └── notify.js          # Notification API
└── styles/
    └── global.css             # Global styles with animations
```

## 🎯 Key Features Details

### Upcoming Meetings
- Shows future scheduled meetings sorted by date
- Displays meeting agenda, participants, location
- Color-coded status badges
- "Join Meeting" button for quick access
- Responsive grid layout

### Authentication
- Mock user database (in production, use real DB)
- Email/password validation
- Token-based session (in production, use JWT)
- Automatic redirect for protected routes
- User profile in navbar

### Notifications
- Simulate Email, Slack, and Push notifications
- Visual feedback on send
- Mock API endpoint (wire to real services in production)

## 📝 Next steps

- **Database integration**: Replace mock data with PostgreSQL/MongoDB
- **Real authentication**: Implement JWT tokens, password hashing (bcrypt), OAuth
- **Real-time features**: Add WebSocket for live meeting updates
- **Calendar integration**: Sync with Google Calendar, Outlook
- **Notification services**: 
  - Email: Nodemailer + SMTP or SendGrid
  - Slack: Incoming webhooks or Slack API
  - Push: Web Push API (VAPID) or Firebase Cloud Messaging
- **Meeting recording**: Integrate with Zoom/Teams API for auto-transcription
- **AI features**: Extract action items, summarize transcripts with GPT
- **File uploads**: Add document sharing for meetings
- **Search & filters**: Advanced filtering by date, participants, status

## 🛠️ Tech Stack

- **Framework**: Next.js 14
- **UI Library**: React 18
- **Styling**: CSS-in-JS (styled-jsx) + CSS Variables
- **State Management**: React Context API
- **Routing**: Next.js file-based routing
- **API**: Next.js API routes

## 🎨 Design Credits

Modern glassmorphism design inspired by current UI trends with custom animations and gradients.

