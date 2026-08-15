import { useAuth } from '../hooks/useAuth';

export const HomePage = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <section className="page-panel home-page">
      <div className="home-hero">
        <div className="home-hero-copy">
          <p className="home-hero-eyebrow">Ingredients to Recipes</p>
          <h1>Welcome, {user.name}</h1>
          <p className="home-hero-lead">
            Find a recipe or choose an area from the navigation.
          </p>
        </div>

        <div className="home-hero-art" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none" focusable="false">
            <circle cx="100" cy="104" r="74" fill="currentColor" opacity="0.07" />
            <circle
              cx="100"
              cy="104"
              r="74"
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeWidth="2"
            />
            <path
              d="M40 100h120a60 60 0 0 1-120 0Z"
              fill="currentColor"
              opacity="0.16"
            />
            <path
              d="M34 100h132"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M40 100a60 60 0 0 0 120 0"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <circle cx="78" cy="123" r="11" fill="currentColor" opacity="0.34" />
            <circle cx="108" cy="133" r="8" fill="currentColor" opacity="0.5" />
            <circle cx="129" cy="119" r="10" fill="currentColor" opacity="0.26" />
            <path
              d="M100 80c0-10 8-14 8-24s-8-14-8-14"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M74 82c0-8 6-11 6-19"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              opacity="0.35"
            />
            <path
              d="M126 82c0-8 6-11 6-19"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              opacity="0.35"
            />
            <path
              d="M164 44c-15 0-26 10-26 24 14 0 26-9 26-24Z"
              fill="currentColor"
              opacity="0.28"
            />
          </svg>
        </div>
      </div>
    </section>
  );
};
