import { useAuth } from '@clerk/react'
import { MenuBar } from '../components/MenuBar'
import { useState, useEffect } from 'react';
import './styles/MatchesPage.css'

type Rank = 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond';
type GameType = '8-ball' | '9-ball' | '10-ball';

type User = {
  _id: string;
  username: string;
  profilePicture: string;
  rank: Rank;
};

type Match = {
  _id: string;
  winner: User;
  loser: User;
  gameType: GameType;
  winnerEloBefore: number;
  winnerEloAfter: number;
  loserEloBefore: number;
  loserEloAfter: number;
  createdAt: string;
};

type UserResponse = {
  needsOnboarding: boolean;
  user?: User;
  error?: string;
};

type MatchesResponse = {
  matches?: Match[];
  error?: string;
};

const getProfilePictureSrc = (profilePicture: string) => {
  if (profilePicture.startsWith('http') || profilePicture.startsWith('/')) {
    return profilePicture;
  }

  return `/${profilePicture}`;
};

const formatUsername = (username: string) => `@${username}`;

const getEloDelta = (match: Match, didCurrentUserWin: boolean) => {
  const eloBefore = didCurrentUserWin ? match.winnerEloBefore : match.loserEloBefore;
  const eloAfter = didCurrentUserWin ? match.winnerEloAfter : match.loserEloAfter;
  const delta = eloAfter - eloBefore;

  if (delta === 0) {
    return '0 elo';
  }

  return `${delta > 0 ? '+' : ''}${delta} elo`;
};

const formatMatchDate = (createdAt: string) => {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(createdAt));
};

export function MatchesPage() {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;
  const [matches, setMatches] = useState<Match[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserAndMatches = async () => {
      try {
        setError('');
        const token = await getToken();

        const userResponse = await fetch(`${API_URL}/api/user`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const userData = await userResponse.json() as UserResponse;

        if (!userResponse.ok) {
          throw new Error(userData.error || 'Failed to get user');
        }

        if (userData.needsOnboarding || !userData.user) {
          throw new Error('Create your profile before viewing match history');
        }

        setUser(userData.user);

        const matchesResponse = await fetch(`${API_URL}/api/matches`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const matchesData = await matchesResponse.json() as MatchesResponse;

        if (!matchesResponse.ok) {
          throw new Error(matchesData.error || 'Failed to get matches');
        }

        setMatches(matchesData.matches ?? []);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load match history');
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndMatches();
  }, [API_URL, getToken]);

  if (loading) {
    return (
      <div className="matches-page">
        <div className="matches-state" role="status">
          Loading match history...
        </div>
        <MenuBar />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="matches-page">
        <div className="matches-state matches-state-error">
          {error || 'Failed to load match history'}
        </div>
        <MenuBar />
      </div>
    )
  }

  return (
    <div className="matches-page">
      <header className="matches-header">
        <img
          className="matches-profile-pic"
          src={getProfilePictureSrc(user.profilePicture)}
          alt={`${user.username} profile`}
        />
        <h1 className="matches-username">{user.username}</h1>
      </header>

      <main className="match-history" aria-labelledby="match-history-title">
        <h2 id="match-history-title">Match History</h2>

        {matches.length === 0 ? (
          <div className="matches-empty-state">
            No matches reported yet.
          </div>
        ) : (
          <div className="match-list">
            {matches.map((match) => {
              const didCurrentUserWin = user._id === match.winner._id;
              const opponent = didCurrentUserWin ? match.loser : match.winner;
              const resultLabel = didCurrentUserWin ? 'Win' : 'Loss';

              return (
                <article
                  key={match._id}
                  className={`match-row ${didCurrentUserWin ? 'match-row-win' : 'match-row-loss'}`}
                >
                  <div className="match-player">
                    <img
                      className="match-avatar"
                      src={getProfilePictureSrc(user.profilePicture)}
                      alt=""
                    />
                    <span className="match-game-type">{match.gameType}</span>
                  </div>

                  <p className="match-elo-change">{getEloDelta(match, didCurrentUserWin)}</p>
                  <p className="match-result">{resultLabel}</p>

                  <div className="match-opponent">
                    <span className="match-date">{formatMatchDate(match.createdAt)}</span>
                    <img
                      className="match-avatar match-opponent-avatar"
                      src={getProfilePictureSrc(opponent.profilePicture)}
                      alt={`${opponent.username} profile`}
                    />
                    <span className="match-opponent-name">{formatUsername(opponent.username)}</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <MenuBar />
    </div>
  )
}
