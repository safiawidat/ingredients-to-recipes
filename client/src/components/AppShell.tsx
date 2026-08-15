import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { BrandMark } from './BrandMark';

const getNavLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  isActive ? 'app-nav-link app-nav-link-active' : 'app-nav-link';

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

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
            <BrandMark />
            <span className="app-brand-text">
              Ingredients to Recipes
              <small>Recipe recommender</small>
            </span>
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
                <span className="app-nav-divider" aria-hidden="true" />
                <NavLink className={getNavLinkClassName} end to="/admin">
                  Admin
                </NavLink>
                <NavLink className={getNavLinkClassName} to="/admin/recipes">
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
              <span className="app-user-avatar" aria-hidden="true">
                {getInitials(user.name)}
              </span>
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

      <footer className="app-footer">
        <div className="app-footer-inner">
          <p>
            <strong>Ingredients to Recipes</strong>
          </p>
          <p>Cook with what you already have.</p>
        </div>
      </footer>
    </div>
  );
};
