import { useAuth } from '@clerk/react'
import { useEffect, useRef, useState } from 'react'
import { OnboardingForm } from '../components/OnboardingForm'
import { MatchReportForm } from '../components/MatchReportForm'
import { PendingMatchReport } from '../components/PendingMatchReport'
import { MenuBar } from '../components/MenuBar'
import './styles/HomePage.css'

type Rank = 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond'

type rankedpoolUser = {
  _id: string
  clerkId: string
  email: string
  username: string
  rank: Rank
  elo: number
  profilePicture: string
}

type UserResponse = {
  needsOnboarding: boolean;
  user?: rankedpoolUser;
  error?: string;
}

type CreateUserResponse = {
  newUser?: rankedpoolUser;
  existingUser?: rankedpoolUser;
  error?: string;
}

type PendingMatchReportData = {
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
}

type PendingMatchReportResponse = {
  matchReport: PendingMatchReportData | null;
  error?: string;
}

type RankChangeAnimation = {
  id: number
  direction: 'up' | 'down'
  previousRank: Rank
  newRank: Rank
}

const rankOrder: Rank[] = ['iron', 'bronze', 'silver', 'gold', 'diamond'];

const formatRank = (rank: Rank) => rank.toUpperCase();

const getRankChangeDirection = (previousRank: Rank, newRank: Rank) => {
  const previousRankValue = rankOrder.indexOf(previousRank);
  const newRankValue = rankOrder.indexOf(newRank);

  if (newRankValue > previousRankValue) {
    return 'up';
  }

  if (newRankValue < previousRankValue) {
    return 'down';
  }

  return null;
}

export function HomePage() {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;
  const [loading, setLoading] = useState<boolean>(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [user, setUser] = useState<rankedpoolUser | null>(null);
  const [reportingMatch, setReportingMatch] = useState<boolean>(false);
  const [pendingMatchReport, setPendingMatchReport] = useState<PendingMatchReportData | null>(null);
  const [renderUser, setRenderUser] = useState(0);
  const [rankChangeAnimation, setRankChangeAnimation] = useState<RankChangeAnimation | null>(null);
  const previousUserRef = useRef<rankedpoolUser | null>(null);
  const rankAnimationId = useRef(0);
  
  // functions for api calls to backend
  const handleCreateUser = async (username: string) => {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/user/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: username,
      }),
    });

    const data = await response.json() as CreateUserResponse;
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create user');
    }

    const createdUser = data.newUser || data.existingUser;

    if (!createdUser) {
      throw new Error('Failed to load created user');
    }

    setUser(createdUser);
    previousUserRef.current = createdUser;
    setNeedsOnboarding(false);
  }

  const handleCreateMatchReport = async (username: string, didWin: boolean, gameType: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/match-report`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          didWin,
          gameType
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create match report');
      }

      return data;
      
    } catch (error) {
      console.log(error);
    }
  }

  const handleAccept = async (matchReportId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/match-report/${matchReportId}/accept`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept match results');
      }

      setPendingMatchReport(null);
      setRenderUser(prev => prev + 1);

    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  const handleDecline = async (matchReportId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/match-report/${matchReportId}/decline`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline match results');
      }

      setPendingMatchReport(null);
      setRenderUser(prev => prev + 1);

    } catch (error) {
      console.log(error);
      throw error
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // get session token from user
        const token = await getToken();
        // send req to backend api to obtain user data to display
        const response = await fetch(`${API_URL}/api/user`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        const data = await response.json() as UserResponse;
        if (!response.ok) {
          throw new Error(data.error || 'Failed to get user');
        }
        const { needsOnboarding, user } = data;
        setNeedsOnboarding(needsOnboarding);
        if (!needsOnboarding && user) {
          const previousUser = previousUserRef.current;

          if (previousUser && previousUser.rank !== user.rank) {
            const direction = getRankChangeDirection(previousUser.rank, user.rank);

            if (direction) {
              rankAnimationId.current += 1;
              setRankChangeAnimation({
                id: rankAnimationId.current,
                direction,
                previousRank: previousUser.rank,
                newRank: user.rank
              });
            }
          }

          previousUserRef.current = user;
          setUser(user);
        }
  
      } catch (error) {
          console.log(error);
      } finally {
          setLoading(false);  
      }
    }

    const fetchPendingMatchReport = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/api/match-report/pending`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        const data = await response.json() as PendingMatchReportResponse;
        if (!response.ok) {
          throw new Error(data.error || 'Failed to get pending match report');
        }
        const { matchReport } = data;
        setPendingMatchReport(matchReport);
      } catch (error) {
        console.log(error);
      }
    }

    
    fetchUser();
    fetchPendingMatchReport();
    const interval = setInterval(() => {
      fetchUser();
      fetchPendingMatchReport(); 
    }, 5000)

    return () => clearInterval(interval);
  }, [renderUser, API_URL, getToken])

  useEffect(() => {
    if (!rankChangeAnimation) {
      return;
    }

    const hideRankAnimation = window.setTimeout(() => {
      setRankChangeAnimation(null);
    }, 2600);

    return () => window.clearTimeout(hideRankAnimation);
  }, [rankChangeAnimation])

  if (loading) {
    return (
      <div className="home-page home-loading-page">
        <div
          className="home-loading-bar"
          role="progressbar"
          aria-label="Loading user data"
        >
          <div className="home-loading-fill"></div>
        </div>
      </div>
    )
  }

  if (needsOnboarding) {
    return (
      <>
        <OnboardingForm onSubmitUsername={handleCreateUser}/>
      </>
    )
  }

  if (reportingMatch) {
    return (
      <>
        <MatchReportForm onSubmitMatchReport={handleCreateMatchReport}
          onClose={() => setReportingMatch(false)}
        />
      </>
    )
  }

  if (pendingMatchReport !== null) {
    return (
      <>
        <PendingMatchReport 
          newMatchReport={pendingMatchReport}
          handleAccept={handleAccept}
          handleDecline={handleDecline}
        />
      </>
    )
  }

  if (!user) {
    return (
      <div className="home-page home-loading-page">
        <div
          className="home-loading-bar"
          role="progressbar"
          aria-label="Loading user data"
        >
          <div className="home-loading-fill"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="home-page">
        {rankChangeAnimation && (
          <div
            key={rankChangeAnimation.id}
            className={`rank-change-overlay rank-change-${rankChangeAnimation.direction}`}
            role="status"
            aria-live="polite"
          >
            <div className="rank-change-panel">
              <p className="rank-change-kicker">
                {rankChangeAnimation.direction === 'up' ? 'RANK UP' : 'RANK DOWN'}
              </p>
              <img
                className="rank-change-badge"
                src={`/images/rankedpool-${rankChangeAnimation.newRank}.png`}
                alt={`${rankChangeAnimation.newRank} rank`}
              />
              <h2 className="rank-change-title">{formatRank(rankChangeAnimation.newRank)}</h2>
              <p className="rank-change-path">
                {formatRank(rankChangeAnimation.previousRank)} &gt; {formatRank(rankChangeAnimation.newRank)}
              </p>
            </div>
          </div>
        )}
        <img className="user-profile-pic" src={user.profilePicture} />
        <h2 className="user-username">{user.username}</h2>
        <div className="container">
          <img className="user-rank-image" src={`/images/rankedpool-${user.rank}.png`} alt={`${user.rank} image`}/>
          <div className="elo-bar">
            <div className="elo-fill" style={{width: `${user.elo}%`}}></div>
          </div>
          <p className="elo-rating">{`${user.elo}`} / 100</p>
          <button className="report-match" onClick={() => setReportingMatch(true)}>Report Match</button>
        </div>
        <MenuBar />
      </div>
    </>
  )
}
