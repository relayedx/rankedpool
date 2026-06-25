import './styles/PendingMatchReport.css'

type Rank = 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond';

type MatchReport = {
  newMatchReport: {
    _id: string;
    sender: {
      _id: string
      username: string,
      profilePicture: string,
      rank: Rank,
      elo: number
    },
    receiver: string;
    winner: string;
    loser: string;
    status: 'pending';
    gameType: '8-ball' | '9-ball' | '10-ball';
  } | null;
  handleAccept: (matchReportId: string) => Promise<void>;
  handleDecline: (matchReportId: string) => Promise<void>;
};

export function PendingMatchReport({ newMatchReport, handleAccept, handleDecline }: MatchReport) {
  const { username, profilePicture } = newMatchReport.sender;
  const matchReportId = newMatchReport._id;
  const winner = newMatchReport.winner === newMatchReport.sender._id ? username : 'You';
  const loser = newMatchReport.loser === newMatchReport.sender._id ? username : 'You';

  return (
    <>
      <div className="pending-match-report-overlay">
        <div className="pending-match-report-card">
          <h2 className="pending-match-report-title">Incoming Match Report!</h2>
          <label>From:</label>
          <p className="sender-username">{username}</p>
          <div className="sender-info-container">
            <img className="sender-profile-picture" src={profilePicture} alt= "match report sender profile picture"/>
          </div>
          <label>Winner:</label>
          <p className="winner-username">{winner}</p>
          <label>Loser:</label>
          <p>{loser}</p>
          <div className="button-container">
            <button className="accept-button" onClick={() => handleAccept(matchReportId)}>accept</button>
            <button className="decline-button" onClick={() => handleDecline(matchReportId)}>decline</button>
          </div>
        </div>
      </div>
    </>
  )
}