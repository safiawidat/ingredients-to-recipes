import { useState, type FormEvent } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  type Location,
} from 'react-router-dom';

import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';

interface LoginLocationState {
  from?: Location;
  message?: string;
}

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LoginLocationState | null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(state?.from?.pathname ?? '/', { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Unable to log in. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <BrandMark />
          <span className="auth-brand-text">
            Ingredients to Recipes
            <small>Cook with what you already have</small>
          </span>
        </div>

        <h1>Log in</h1>
        <p className="auth-subtitle">
          Sign in to match recipes against the ingredients you have.
        </p>
        {state?.message && <p role="status">{state.message}</p>}
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>

        <p>
          Need an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </main>
  );
};
