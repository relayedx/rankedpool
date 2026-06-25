import { useState } from 'react';
import './styles/MatchReportForm.css'

type MatchReportResponse = {
  newMatchReport: {
    _id: string;
    sender: string;
    receiver: string;
    winner: string;
    loser: string;
    status: string;
    gameType: string;
  };
};

type matchReportFormProps = {
  onSubmitMatchReport: (username: string, didWin: boolean, gameType: string) => Promise<MatchReportResponse>;
  onClose: () => void;
}

export function MatchReportForm({ onSubmitMatchReport, onClose}: matchReportFormProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [didWin, setDidWin] = useState<boolean | null>(null);
  const [gameType, setGameType] = useState('');
  const [success, setSuccess] = useState<boolean | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Username is required');
      return
    }

    const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_]{0,19}$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setError('Username must only contain characters: "a-z", "0-9", & "_"');
      return
    }

    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters');
      return
    }

    if (gameType === '') {
      setError('must select game type');
      return
    }

    if (didWin === null) {
      setError('must select result as win or loss');
      return
    }

    try {
      setSubmitting(true);
      setError('');

      const data = await onSubmitMatchReport(trimmedUsername, didWin, gameType);
      const { newMatchReport } = data;
      if (newMatchReport) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      setError('Something went wrong, try again later...');
      console.log(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="matchReport-overlay">
        <button className={`close-button ${error !== '' ? 'onError': ''}`} onClick={onClose}>
          x
        </button>
        <div className="matchReport-card">
          <h2 className="match-report-title">
            Create a Match Report
          </h2>

          <p>
            Enter the opponents username and fill out the match results.
            This will be sent to the opponent for them to review and accept/decline.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor='username'>Opponent Username:</label>

            <input 
              id="username"
              type="text"
              placeholder="Enter opponent username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label htmlFor='game-type'>Game Type:</label>
            <div className="game-types">
              <button type="button" className={`game-type-button ${gameType === '8-ball' ? 'selected' : ''}`}
                onClick={() => setGameType('8-ball')}> 
                <img src="/images/8-ball-game-type.png" alt="8 ball image"/>
              </button>
              <button type="button" className={`game-type-button ${gameType === '9-ball' ? 'selected' : ''}`}
                onClick={() => setGameType('9-ball')}>
                <img src="/images/9-ball-game-type.png" alt="9 ball image"/>
              </button>
              <button type="button" className={`game-type-button ${gameType === '10-ball' ? 'selected' : ''}`}
                onClick={() => setGameType('10-ball')}>
                <img src="/images/10-ball-game-type.png" alt="10 ball image"/>
              </button>
            </div>

            <label htmlFor='match-result'>Match Result:</label>
            <div className="match-result">
              <button type="button" className={`won-button match-result-button ${didWin === true ? 'selected' : ''}`}
              onClick={() => setDidWin(true)}>
                Won
              </button>

              <button type="button" className={`loss-button match-result-button ${didWin === false ? 'selected' : ''}`}
              onClick={() => setDidWin(false)}>
                Lost
              </button>
            </div>

            <button className="confirm-button" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Send Match Report'}
            </button>

            {error && <span className="match-report-error">
            {error}
            </span>}

            {success && (
              <span className="match-report-success">
                Match report sent successfully.
              </span>
            )}
          </form>
        </div>
      </div>
    </>
  )
}