import { Link } from 'react-router-dom';

export const AdminDashboardPage = () => (
  <section className="page-panel admin-dashboard-page">
    <div className="page-heading">
      <div>
        <h1>Admin</h1>
        <p>Choose an area to manage recipes and ingredient aliases.</p>
      </div>
    </div>

    <div className="admin-dashboard-grid">
      <article className="admin-dashboard-card">
        <h2>Recipes</h2>
        <p>Create, edit, publish, or deactivate recipes.</p>
        <Link to="/admin/recipes">Manage recipes</Link>
      </article>

      <article className="admin-dashboard-card">
        <h2>Ingredient aliases</h2>
        <p>Map alternate ingredient names to canonical ingredients.</p>
        <Link to="/admin/ingredient-aliases">Manage ingredient aliases</Link>
      </article>
    </div>
  </section>
);
