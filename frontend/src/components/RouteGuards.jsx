import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'

export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner page />
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return children
}

export function RequireAdmin({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner page />
  if (!user) return <Navigate to="/login?next=/admin" replace />
  if (!user.is_admin) return <Navigate to="/" replace />
  return children
}
