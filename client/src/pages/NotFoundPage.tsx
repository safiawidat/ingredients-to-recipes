import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <main className="auth-page">
    <section className="auth-card">
      <h1>Page not found</h1>
      <Link to="/">Return home</Link>
    </section>
  </main>
);
