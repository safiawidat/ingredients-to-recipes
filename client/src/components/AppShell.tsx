import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

const getNavLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  isActive ? 'app-nav-link app-nav-link-active' : 'app-nav-link';

export const AppShell = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

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

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink className="app-brand" to="/">
            Ingredients to Recipes
          </NavLink>

          <nav className="app-nav" aria-label="Primary navigation">
            <NavLink className={getNavLinkClassName} end to="/">
              Home
            </NavLink>
            <NavLink className={getNavLinkClassName} to="/recipes">
              Recipes
            </NavLink>
            <NavLink className={getNavLinkClassName} to="/recommendations">
              Recommendations
            </NavLink>
            <NavLink className={getNavLinkClassName} to="/favorites">
              Favorites
            </NavLink>
            <NavLink className={getNavLinkClassName} to="/history">
              History
            </NavLink>
            {isAdmin && (
              <>
                <NavLink className={getNavLinkClassName} end to="/admin">
                  Admin
                </NavLink>
                <NavLink
                  className={getNavLinkClassName}
                  to="/admin/recipes"
                >
                  Admin Recipes
                </NavLink>
                <NavLink
                  className={getNavLinkClassName}
                  to="/admin/ingredient-aliases"
                >
                  Ingredient Aliases
                </NavLink>
              </>
            )}
          </nav>

          <div className="app-user">
            <p>
              <span className="app-user-name">{user.name}</span>
              <span className="role-badge">{user.role}</span>
            </p>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        </div>
        {logoutError && (
          <p className="shell-error" role="alert">
            {logoutError}
          </p>
        )}
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};
