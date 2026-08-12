import { Route, Routes } from 'react-router-dom';

import './App.css';
import { AdminRoute } from './components/AdminRoute';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { RecipesPage } from './pages/RecipesPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { RecommendationHistoryPage } from './pages/RecommendationHistoryPage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminRecipeCreatePage } from './pages/admin/AdminRecipeCreatePage';
import { AdminRecipeEditPage } from './pages/admin/AdminRecipeEditPage';
import { AdminRecipeImportPage } from './pages/admin/AdminRecipeImportPage';
import { AdminRecipesPage } from './pages/admin/AdminRecipesPage';
import { IngredientAliasesPage } from './pages/admin/IngredientAliasesPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/history" element={<RecommendationHistoryPage />} />
          <Route path="/shopping-list" element={<ShoppingListPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/recipes" element={<AdminRecipesPage />} />
            <Route
              path="/admin/recipes/new"
              element={<AdminRecipeCreatePage />}
            />
            <Route
              path="/admin/recipes/:id/edit"
              element={<AdminRecipeEditPage />}
            />
            <Route
              path="/admin/recipes/import"
              element={<AdminRecipeImportPage />}
            />
            <Route
              path="/admin/ingredient-aliases"
              element={<IngredientAliasesPage />}
            />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
