import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

// wraps a protected page: no token, no page
export default function RequireAuth({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}
