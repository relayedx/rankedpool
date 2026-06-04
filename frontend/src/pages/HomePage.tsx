import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'

export function HomePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const fetchToken = async () => {
      if (!isLoaded || !isSignedIn) return

      const token = await getToken()
      setToken(token)
    }

    fetchToken()
  }, [getToken, isLoaded, isSignedIn])

  return (
    <>
      
    </>
  )
}