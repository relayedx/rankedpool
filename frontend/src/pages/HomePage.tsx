import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { OnboardingForm } from '../components/OnboardingForm'
import { MatchReportForm } from '../components/MatchReportForm'
import { PendingMatchReport } from '../components/PendingMatchReport'
import { MenuBar } from '../components/MenuBar'
import './styles/HomePage.css'

type rankedpoolUser = {
  _id: string
  clerkId: string
  email: string
  username: string
  rank: 'bronze' | 'iron' | 'silver' | 'gold' | 'diamond'
  elo: number
  profilePicture: string
}

export function HomePage() {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;
  const [loading, setLoading] = useState<boolean>(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [user, setUser] = useState<rankedpoolUser | null>(null);
  const [reportingMatch, setReportingMatch] = useState<boolean>(false);
  const [pendingMatchReport, setPendingMatchReport] = useState(null);
  const [renderUser, setRenderUser] = useState(0);
  
  // functions for api calls to backend
  const handleCreateUser = async (username: string) => {
    try {
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setUser(data.newUser);
      setNeedsOnboarding(false);

    } catch (error) {
      console.log(error);
    }
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
  
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to get user');
        }
        const { needsOnboarding, user } = data;
        setNeedsOnboarding(needsOnboarding);
        if (!needsOnboarding) {
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
  
        const data = await response.json();
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
      fetchPendingMatchReport(); 
    }, 5000)

    return () => clearInterval(interval);
  }, [renderUser])

  if (loading) {
    return (
      <>
        <p>Loading...</p>
      </>
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

  return (
    <>
      <div className="home-page">
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