In case you'd like to contribute (or just curious about the development):

# rankedpool

rankedpool is a casual-competitive pool ranking app for tracking real matches between players. Users can create an account, choose a username, report pool match results, confirm or decline incoming reports, and climb through ranked tiers using a lightweight Elo-style system.

The project is currently built as a split frontend/backend app:

- `frontend/`: React, Vite, TypeScript, Clerk, React Router
- `backend/`: Express, TypeScript, MongoDB, Mongoose, Clerk Express auth

## Project Status

This project is in MVP development.

Working core features:

- Landing page
- Clerk login and signup
- User onboarding with unique usernames
- User home/profile view
- Match reporting for 8-ball, 9-ball, and 10-ball
- Pending match confirmation flow
- Match history page
- Rank up / rank down feedback animation
- Mobile-first UI polish

Planned or incomplete:

- Friends tab
- WebSocket or real-time updates
- Production backend hosting
- More complete error states
- Tests
- Public contribution guidelines

## How It Works

1. A user signs in through Clerk.
2. If the user does not have a rankedpool profile yet, they create a username.
3. A player reports a match against another rankedpool username.
4. The opponent receives a pending match report.
5. The opponent accepts or declines the report.
6. Accepted reports create official match history records.
7. Elo and rank values update after accepted matches.

The app currently does not poll for new match reports. Users may need to refresh the page to see updates created by another player. Real-time updates are planned for a later WebSocket implementation.

## Ranking System

Ranks currently progress in this order:

```text
iron -> bronze -> silver -> gold -> diamond
```

Each user has an Elo value from `0` to `100` inside their current rank.

Current match scoring:

- Standard win: winner gains `20` Elo, loser loses `10` Elo.
- Lower-ranked player beats higher-ranked player: winner gains `30` Elo, loser loses `15` Elo.
- When a winner reaches `100` or more Elo, they rank up and reset to `0` Elo.
- When a loser drops below `0` Elo, they rank down and reset to `80` Elo in the lower rank.
- Iron is the lowest rank; users cannot demote below iron.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Clerk React SDK
- CSS organized by page/component stylesheet files

### Backend

- Node.js
- Express
- TypeScript
- MongoDB Atlas
- Mongoose
- Clerk Express SDK
- CORS
- dotenv

## Repository Structure

```text
rankedpool/
  backend/
    config/
      db.ts
    controllers/
      matchController.ts
      matchReportController.ts
      userController.ts
    models/
      match.ts
      matchReport.ts
      user.ts
    routes/
      matchReports.ts
      pages.ts
    server.ts
    package.json
    tsconfig.json

  frontend/
    public/
      images/
    src/
      components/
      pages/
      images/
      App.tsx
      main.tsx
    vercel.json
    package.json
    vite.config.ts
```

## Prerequisites

- Node.js
- npm
- MongoDB Atlas database
- Clerk application

The frontend and backend are seperate node projects, so install the dependicies witihin both folders.