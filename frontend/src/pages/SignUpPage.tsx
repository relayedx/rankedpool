import { SignUp } from '@clerk/react'
import './styles/SignUpPage.css'

export function SignUpPage() {
  return (
    <>
      <div className="signup-page">
        <SignUp 
        routing="path" 
        path="/signup" 
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