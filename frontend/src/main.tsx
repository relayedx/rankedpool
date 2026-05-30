import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ClerkProvider } from '@clerk/react';
const CLERK_KEY = import.meta.env.VITE_CLERK_KEY;

if (!CLERK_KEY) {
  throw new Error("key not found");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_KEY}>
    <App />
    </ClerkProvider>
  </StrictMode>
)
