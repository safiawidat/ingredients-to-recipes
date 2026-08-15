import { useAuth } from '../hooks/useAuth';

export const HomePage = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <section className="page-panel home-page">
      <h1>Welcome, {user.name}</h1>
      <p>Find a recipe or choose an area from the navigation.</p>
    </section>
  );
};
