import { Link } from 'react-router-dom';

import { BrandMark } from '../components/BrandMark';

export const NotFoundPage = () => (
  <main className="auth-page">
    <section className="auth-card">
      <div className="auth-brand">
        <BrandMark />
        <span className="auth-brand-text">
          Ingredients to Recipes
          <small>Cook with what you already have</small>
        </span>
      </div>

      <h1>Page not found</h1>
      <p className="auth-subtitle">
        The page you were looking for does not exist or has moved.
      </p>
      <Link to="/">Return home</Link>
    </section>
  </main>
);
