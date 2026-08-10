import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AdminDashboardPage } from './AdminDashboardPage';

describe('AdminDashboardPage', () => {
  it('links to the completed management areas', () => {
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', { name: 'Manage recipes' }),
    ).toHaveAttribute('href', '/admin/recipes');
    expect(
      screen.getByRole('link', { name: 'Manage ingredient aliases' }),
    ).toHaveAttribute('href', '/admin/ingredient-aliases');
  });
});
