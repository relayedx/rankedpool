//import { useState } from 'react'
import { SignIn, SignUp } from '@clerk/react'
import { LandingPage } from './pages/LandingPage'
import { Routes, Route } from 'react-router-dom'
 
function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login/*" element={<SignIn routing="path" path="/login"/>} />
      <Route path="/signup/*" element={<SignUp routing="path" path="/signup" />} />

    </Routes>
    </>
  )
}

export default App