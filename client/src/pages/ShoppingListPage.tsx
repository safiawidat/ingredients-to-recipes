import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';

import type {
  ShoppingListItem,
  ShoppingListRouteState,
} from '../types/shopping-list';

const MAX_MANUAL_ITEM_LENGTH = 100;

interface PageMessage {
  role: 'alert' | 'status';
  text: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

const getNameKey = (value: string): string =>
  normalizeName(value).toLowerCase();

const parseRouteState = (state: unknown): ShoppingListRouteState | null => {
  if (!isRecord(state) || !Array.isArray(state.items) || !isRecord(state.recipe)) {
    return null;
  }

  if (
    !isNonEmptyString(state.recipe.id) ||
    !isNonEmptyString(state.recipe.name)
  ) {
    return null;
  }

  const seenIds = new Set<string>();
  const items: ShoppingListItem[] = [];

  for (const item of state.items) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.name) ||
      seenIds.has(item.id)
    ) {
      continue;
    }

    seenIds.add(item.id);
    items.push({ id: item.id, name: item.name.trim() });
  }

  if (items.length === 0) {
    return null;
  }

  return {
    items,
    recipe: {
      id: state.recipe.id,
      name: state.recipe.name.trim(),
    },
  };
};

export const ShoppingListPage = () => {
  const location = useLocation();
  const [routeState] = useState(() => parseRouteState(location.state));
  const [items, setItems] = useState<ShoppingListItem[]>(
    () => routeState?.items ?? [],
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [manualInput, setManualInput] = useState('');
  const [message, setMessage] = useState<PageMessage | null>(null);

  const toggleChecked = (itemId: string) => {
    setCheckedIds((current) => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  };

  const removeItem = (item: ShoppingListItem) => {
    setItems((current) => current.filter(({ id }) => id !== item.id));
    setCheckedIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
    setMessage({ role: 'status', text: `Removed ${item.name}.` });
  };

  const addManualItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = normalizeName(manualInput);

    if (name.length === 0) {
      setMessage({ role: 'alert', text: 'Enter an item to add.' });
      return;
    }

    if (name.length > MAX_MANUAL_ITEM_LENGTH) {
      setMessage({
        role: 'alert',
        text: `Items must be ${MAX_MANUAL_ITEM_LENGTH} characters or fewer.`,
      });
      return;
    }

    const nameKey = getNameKey(name);

    if (items.some((item) => getNameKey(item.name) === nameKey)) {
      setMessage({ role: 'alert', text: `${name} is already on the list.` });
      return;
    }

    setItems((current) => [
      ...current,
      { id: `manual:${nameKey}`, name },
    ]);
    setManualInput('');
    setMessage({ role: 'status', text: `Added ${name}.` });
  };

  return (
    <section className="page-panel shopping-list-page">
      <Link className="back-link" to="/recommendations">
        Back to Recommendations
      </Link>

      <div className="page-heading">
        <div>
          <h1>Shopping list</h1>
          {routeState && (
            <p>
              Shopping list for{' '}
              <Link
                to={`/recipes/${encodeURIComponent(routeState.recipe.id)}`}
              >
                {routeState.recipe.name}
              </Link>
            </p>
          )}
        </div>
      </div>

      {!routeState && items.length === 0 && (
        <p className="state-panel" role="status">
          Create a shopping list from a recommendation with missing
          ingredients.
        </p>
      )}

      {routeState && items.length === 0 && (
        <p className="state-panel" role="status">
          Your shopping list is empty.
        </p>
      )}

      {items.length > 0 && (
        <ul className="shopping-list" aria-label="Shopping list items">
          {items.map((item) => {
            const isChecked = checkedIds.has(item.id);

            return (
              <li
                className={isChecked ? 'shopping-list-item checked' : 'shopping-list-item'}
                key={item.id}
              >
                <label className="shopping-list-check">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleChecked(item.id)}
                  />
                  <span>{item.name}</span>
                </label>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => removeItem(item)}
                >
                  Remove {item.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form className="shopping-list-add-form" onSubmit={addManualItem}>
        <div className="form-field">
          <label htmlFor="manual-shopping-item">Add an item</label>
          <input
            id="manual-shopping-item"
            onChange={(event) => setManualInput(event.target.value)}
            value={manualInput}
          />
        </div>
        <button className="primary-button" type="submit">
          Add
        </button>
      </form>

      {message && <p role={message.role}>{message.text}</p>}
    </section>
  );
};
