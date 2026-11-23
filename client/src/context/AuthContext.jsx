import { createContext, useContext } from 'react'

// AuthContext exposes the active session throughout the React component tree.
export const AuthContext = createContext({
  user: null,
  loading: true,
  connectionError: '',
  logoutError: '',
  authenticate: async () => {},
  logout: async () => {},
  retrySession: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}
