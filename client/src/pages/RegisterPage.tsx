import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setFormError('Name must be between 2 and 100 characters.');
      return;
    }

    if (password.length < 8 || password.length > 72) {
      setFormError('Password must be between 8 and 72 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ name: trimmedName, email, password });
      navigate('/login', {
        replace: true,
        state: { message: 'Registration successful. You can now log in.' },
      });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Unable to register. Please try again.',
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

        <h1>Register</h1>
        <p className="auth-subtitle">
          Create an account to save favorites and revisit past searches.
        </p>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <label htmlFor="register-name">Name</label>
        <input
          id="register-name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <label htmlFor="register-confirm-password">Confirm password</label>
        <input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <p>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
};
