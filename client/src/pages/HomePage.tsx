import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

export const HomePage = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setLogoutError('Unable to log out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <main className="home-page">
      <h1>Welcome, {user.name}</h1>
      <p>Your role: {user.role}</p>
      {logoutError && (
        <p className="form-error" role="alert">
          {logoutError}
        </p>
      )}
      <button type="button" disabled={isLoggingOut} onClick={handleLogout}>
        {isLoggingOut ? 'Logging out…' : 'Log out'}
      </button>
    </main>
  );
};
