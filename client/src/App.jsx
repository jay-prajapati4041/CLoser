import { useCallback, useEffect, useState } from 'react'
import { AuthContext } from './context/AuthContext.jsx'
import { authService } from './services/authService.js'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'

// App coordinates session loading and chooses the signed-in or signed-out view.
export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState('')
  const [logoutError, setLogoutError] = useState('')

  const loadSession = useCallback(async () => {
    setLoading(true)
    setConnectionError('')
    try {
      const result = await authService.getSession()
      setUser(result.user)
    } catch (error) {
      setUser(null)
      if (error.status !== 401) setConnectionError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  async function handleAuthenticate(mode, credentials) {
    const result = await authService.authenticate(mode, credentials)
    setUser(result.user)
  }

  async function handleLogout() {
    setLogoutError('')
    try {
      await authService.logout()
      setUser(null)
    } catch (error) {
      setLogoutError(error.message)
    }
  }

  const contextValue = {
    user,
    loading,
    connectionError,
    logoutError,
    authenticate: handleAuthenticate,
    logout: handleLogout,
    retrySession: loadSession,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} logoutError={logoutError} />
      ) : (
        <Login
          onAuthenticated={handleAuthenticate}
          loading={loading}
          connectionError={connectionError}
          onRetry={loadSession}
        />
      )}
    </AuthContext.Provider>
  )
}
