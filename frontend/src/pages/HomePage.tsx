import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { OnboardingForm } from '../components/OnboardingForm';

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
      const response = await fetch(`${API_URL}/user/onboarding`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer${token}`,
        },
        body: JSON.stringify({
          username: username,
        }),
      });

      const data = await response.json();

      if(!response.ok) {
        console.log(data.error);
      }

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

        setNeedsOnboarding(needsOnboarding);
        setUser(user);

      } catch (error) {
          console.log(error);
      } finally {
          setLoading(false);  
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return (
      <>
        <p>Loading...</p>
      </>``
    )
  } 

  if (needsOnboarding) {
    return (
      <>
        <OnboardingForm onSubmitUsername={handleCreateUser}/>
      </>
    )
  }
}