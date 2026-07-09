import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { MenuBar } from '../components/MenuBar'
import './styles/LeaderboardPage.css'

type Rank = 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond';

type LeaderboardPlayer = {
  _id: string;
  username: string;
  rank: Rank;
  elo: number;
};

type UserResponse = {
  needsOnboarding: boolean;
  user?: LeaderboardPlayer;
  error?: string;
};

type LeaderboardResponse = {
  players?: LeaderboardPlayer[];
  error?: string;
};

const formatRank = (rank: Rank) => rank.toUpperCase();

export function LeaderboardPage() {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
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
          throw new Error('Create your profile before viewing the leaderboard');
        }

        setCurrentUserId(userData.user._id);

        const leaderboardResponse = await fetch(`${API_URL}/api/leaderboard`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const leaderboardData = await leaderboardResponse.json() as LeaderboardResponse;

        if (!leaderboardResponse.ok) {
          throw new Error(leaderboardData.error || 'Failed to get leaderboard');
        }

        setPlayers(leaderboardData.players ?? []);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load leaderboard');
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [API_URL, getToken]);

  if (loading) {
    return (
      <div className="leaderboard-page">
        <div className="leaderboard-state" role="status">
          Loading leaderboard...
        </div>
        <MenuBar />
      </div>
    )
  }

  if (error) {
    return (
      <div className="leaderboard-page">
        <div className="leaderboard-state leaderboard-state-error">
          {error}
        </div>
        <MenuBar />
      </div>
    )
  }

  return (
    <div className="leaderboard-page">
      <header className="leaderboard-header">
        <p className="leaderboard-kicker">rankedpool standings</p>
        <h1>Leaderboard</h1>
      </header>

      <main className="leaderboard-board" aria-labelledby="leaderboard-title">
        <div className="leaderboard-title-row">
          <h2 id="leaderboard-title">Players</h2>
          <span>{players.length} ranked</span>
        </div>

        {players.length === 0 ? (
          <div className="leaderboard-empty-state">
            No ranked players yet.
          </div>
        ) : (
          <div className="leaderboard-list">
            {players.map((player, index) => {
              const placement = index + 1;
              const isCurrentUser = player._id === currentUserId;
              const isPodiumPlayer = placement <= 3;

              return (
                <article
                  className={`leaderboard-row${isCurrentUser ? ' current-player' : ''}${isPodiumPlayer ? ' podium-player' : ''}`}
                  key={player._id}
                >
                  <img
                    className="leaderboard-rank-badge"
                    src={`/images/rankedpool-${player.rank}.png`}
                    alt={`${player.rank} rank`}
                  />
                  <div className="leaderboard-elo">
                    <span>{player.elo}</span>
                    <small>elo</small>
                  </div>
                  <div className="leaderboard-player">
                    <p>{player.username}</p>
                    <span>{formatRank(player.rank)}</span>
                  </div>
                  <span className="leaderboard-placement">#{placement}</span>
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
