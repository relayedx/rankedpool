import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { OnboardingForm } from '../components/OnboardingForm'
import { MenuBar } from '../components/MenuBar'
import { Link } from 'react-router-dom'
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

      setUser(data.user);
      setNeedsOnboarding(false);

    } catch (error) {
      console.log(error);
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

        const data = await response.json()
        const { needsOnboarding, user } = data

        console.log(needsOnboarding);
        console.log(user);
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

    fetchUser()
  }, [needsOnboarding])

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
  } else {
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
            <button className="report-match">Report Match</button>
          </div>
          <MenuBar />
        </div>
      </>
    )
  }
}