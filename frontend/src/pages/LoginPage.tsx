import { SignIn } from '@clerk/react'
import './styles/LoginPage.css'

export function LoginPage() {
  return (
    <>
      <div className="login-page">
        <SignIn 
        routing="path" 
        path="/login"
        appearance={{
          elements: {
            card: 'clerk-card',
          },
        }}
        />
      </div>
    </>
  )
}