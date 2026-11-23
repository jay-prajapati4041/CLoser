import { authenticate, getCurrentUser, signOut } from './api.js'

// Auth service contains every frontend operation related to the user session.
export const authService = {
  getSession: getCurrentUser,
  authenticate,
  logout: signOut,
}
