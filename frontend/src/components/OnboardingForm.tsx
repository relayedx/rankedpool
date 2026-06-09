import { useState } from 'react'
import './styles/OnboardingForm.css'

type OnboardingFormProps = {
  onSubmitUsername: (username: string) => Promise<void>
}

export function OnboardingForm({ onSubmitUsername }: OnboardingFormProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError('Username is required');
      return
    }

    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters');
      return
    }

    try {
      setSubmitting(true);
      setError('');

      await onSubmitUsername(trimmedUsername);
    } catch (error) {
      setError('Something went wrong. Please try again.');
      console.log(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <h2>Create your RankedPool username</h2>

        <p>
          Choose the username other players will see on profiles,
          leaderboards, and match history.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username:</label>

          <input
            id="username"
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {error && <span className="onboarding-error">{error}</span>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}