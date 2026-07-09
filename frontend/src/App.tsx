//import { useState } from 'react'
import { LandingPage } from './pages/LandingPage'
import { Routes, Route } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { SignUpPage } from './pages/SignUpPage'
import { HomePage } from './pages/HomePage'
import { MatchesPage } from './pages/MatchesPage'
import { FriendsPage } from './pages/FriendsPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
 
function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login/*" element={<LoginPage />} />
        <Route path="/signup/*" element={<SignUpPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </>
  )
}

export default App
