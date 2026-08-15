import { useEffect, useState } from 'react';

import { ApiError } from '../../lib/api';
import {
  createIngredientAlias,
  deleteIngredientAlias,
  listIngredientAliases,
  updateIngredientAlias,
} from '../../services/ingredient-alias-api';
import { listCanonicalIngredients } from '../../services/ingredient-api';
import type {
  CanonicalIngredientReference,
  IngredientAlias,
} from '../../types/ingredient';

type AliasAction = 'create' | 'edit' | 'remove';

const sortAliases = (aliases: IngredientAlias[]): IngredientAlias[] =>
  [...aliases].sort((first, second) =>
    first.alias.localeCompare(second.alias),
  );

const getAliasActionError = (
  error: unknown,
  action: AliasAction,
): string => {
  if (error instanceof ApiError) {
    if (error.code === 'ALIAS_ALREADY_EXISTS') {
      return 'An alias with this name already exists.';
    }

    if (error.code === 'INGREDIENT_NOT_FOUND') {
      return 'The selected canonical ingredient no longer exists. Reload and choose another ingredient.';
    }

    if (error.code === 'ALIAS_NOT_FOUND') {
      return 'This alias no longer exists. Reload the page to see current aliases.';
    }

    if (error.status === 400) {
      return 'The alias details were rejected. Review the fields and try again.';
    }
  }

  if (action === 'remove') {
    return 'Unable to remove this alias. Please try again.';
  }

  return `Unable to ${action} the alias. Please try again.`;
};

export const IngredientAliasesPage = () => {
  const [aliases, setAliases] = useState<IngredientAlias[]>([]);
  const [canonicalIngredients, setCanonicalIngredients] = useState<
    CanonicalIngredientReference[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [createAliasValue, setCreateAliasValue] = useState('');
  const [createIngredientId, setCreateIngredientId] = useState('');
  const [createValidation, setCreateValidation] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAliasValue, setEditAliasValue] = useState('');
  const [editIngredientId, setEditIngredientId] = useState('');
  const [editValidation, setEditValidation] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([
      listIngredientAliases(),
      listCanonicalIngredients(),
    ])
      .then(([aliasResponse, ingredientResponse]) => {
        if (!isMounted) {
          return;
        }

        setAliases(sortAliases(aliasResponse.data.aliases));
        setCanonicalIngredients(ingredientResponse.data.ingredients);
      })
      .catch(() => {
        if (isMounted) {
          setLoadError('Unable to load ingredient aliases. Please try again.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [retryKey]);

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError(null);
    setSuccessMessage(null);
    setRetryKey((current) => current + 1);
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreating || canonicalIngredients.length === 0) {
      return;
    }

    const alias = createAliasValue.trim().toLowerCase();
    const validation: string[] = [];
    if (!alias) {
      validation.push('Alias text is required.');
    }
    if (!createIngredientId) {
      validation.push('Select a canonical ingredient.');
    }

    setCreateValidation(validation);
    if (validation.length > 0) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setSuccessMessage(null);

    try {
      const response = await createIngredientAlias({
        alias,
        ingredientId: createIngredientId,
      });
      setAliases((current) =>
        sortAliases([...current, response.data.alias]),
      );
      setCreateAliasValue('');
      setCreateIngredientId('');
      setCreateValidation([]);
      setSuccessMessage(`Alias “${response.data.alias.alias}” created.`);
    } catch (error) {
      setCreateError(getAliasActionError(error, 'create'));
    } finally {
      setIsCreating(false);
    }
  };

  const beginEdit = (alias: IngredientAlias) => {
    setEditingId(alias.id);
    setEditAliasValue(alias.alias);
    setEditIngredientId(alias.ingredientId);
    setEditValidation([]);
    setEditError(null);
    setConfirmingId(null);
    setRemoveError(null);
    setSuccessMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValidation([]);
    setEditError(null);
  };

  const saveEdit = async (id: string) => {
    if (isSavingEdit || canonicalIngredients.length === 0) {
      return;
    }

    const alias = editAliasValue.trim().toLowerCase();
    const validation: string[] = [];
    if (!alias) {
      validation.push('Alias text is required.');
    }
    if (!editIngredientId) {
      validation.push('Select a canonical ingredient.');
    }

    setEditValidation(validation);
    if (validation.length > 0) {
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    setSuccessMessage(null);

    try {
      const response = await updateIngredientAlias(id, {
        alias,
        ingredientId: editIngredientId,
      });
      setAliases((current) =>
        sortAliases(
          current.map((item) =>
            item.id === id ? response.data.alias : item,
          ),
        ),
      );
      setEditingId(null);
      setEditValidation([]);
      setSuccessMessage(`Alias “${response.data.alias.alias}” updated.`);
    } catch (error) {
      setEditError(getAliasActionError(error, 'edit'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const beginRemove = (id: string) => {
    setConfirmingId(id);
    setRemoveError(null);
    setEditingId(null);
    setEditError(null);
    setSuccessMessage(null);
  };

  const cancelRemove = () => {
    setConfirmingId(null);
    setRemoveError(null);
  };

  const confirmRemove = async (alias: IngredientAlias) => {
    if (isRemoving) {
      return;
    }

    setIsRemoving(true);
    setRemoveError(null);
    setSuccessMessage(null);

    try {
      await deleteIngredientAlias(alias.id);
      setAliases((current) =>
        current.filter((item) => item.id !== alias.id),
      );
      setConfirmingId(null);
      setSuccessMessage(`Alias “${alias.alias}” removed.`);
    } catch (error) {
      setRemoveError(getAliasActionError(error, 'remove'));
    } finally {
      setIsRemoving(false);
    }
  };

  const hasCanonicalIngredients = canonicalIngredients.length > 0;

  return (
    <section className="page-panel ingredient-aliases-page">
      <div className="page-heading">
        <div>
          <h1>Ingredient Aliases</h1>
          <p>Map alternate ingredient names to canonical ingredients.</p>
        </div>
      </div>

      {isLoading && <p role="status">Loading ingredient aliases...</p>}

      {!isLoading && loadError && (
        <div className="state-panel" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={retryLoad}>
            Try again
          </button>
        </div>
      )}

      {!isLoading && !loadError && (
        <>
          {successMessage && (
            <p className="form-message form-message-success" role="status">
              {successMessage}
            </p>
          )}

          {!hasCanonicalIngredients && (
            <div className="state-panel alias-canonical-warning" role="status">
              <h2>No canonical ingredients available</h2>
              <p>
                Existing aliases can still be reviewed or removed, but aliases
                cannot be created or edited until canonical ingredients exist.
              </p>
            </div>
          )}

          <form
            className="alias-create-form"
            noValidate
            onSubmit={handleCreate}
          >
            <fieldset disabled={!hasCanonicalIngredients || isCreating}>
              <legend>Create alias</legend>
              <div className="alias-form-grid">
                <div className="form-field">
                  <label htmlFor="new-alias">Alias</label>
                  <input
                    id="new-alias"
                    value={createAliasValue}
                    aria-invalid={createValidation.includes(
                      'Alias text is required.',
                    )}
                    onChange={(event) =>
                      setCreateAliasValue(event.target.value)
                    }
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="new-alias-ingredient">
                    Canonical ingredient
                  </label>
                  <select
                    id="new-alias-ingredient"
                    value={createIngredientId}
                    aria-invalid={createValidation.includes(
                      'Select a canonical ingredient.',
                    )}
                    onChange={(event) =>
                      setCreateIngredientId(event.target.value)
                    }
                  >
                    <option value="">Select an ingredient</option>
                    {canonicalIngredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="primary-button" type="submit">
                  {isCreating ? 'Creating...' : 'Create alias'}
                </button>
              </div>
            </fieldset>

            {createValidation.length > 0 && (
              <ul className="form-message form-message-error" role="alert">
                {createValidation.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
            {createError && (
              <p className="form-message form-message-error" role="alert">
                {createError}
              </p>
            )}
          </form>

          <section className="alias-list-section" aria-labelledby="alias-list-heading">
            <h2 id="alias-list-heading">Existing aliases</h2>

            {aliases.length === 0 ? (
              <p className="state-panel" role="status">
                No ingredient aliases have been created.
              </p>
            ) : (
              <div className="alias-list">
                {aliases.map((alias) => {
                  const isEditing = editingId === alias.id;
                  const isConfirming = confirmingId === alias.id;

                  return (
                    <article
                      className="alias-card"
                      aria-labelledby={`alias-${alias.id}`}
                      key={alias.id}
                    >
                      {isEditing ? (
                        <div className="alias-edit-form">
                          <h3 id={`alias-${alias.id}`}>Edit {alias.alias}</h3>
                          <div className="alias-form-grid">
                            <div className="form-field">
                              <label htmlFor={`edit-alias-${alias.id}`}>
                                Alias
                              </label>
                              <input
                                id={`edit-alias-${alias.id}`}
                                value={editAliasValue}
                                aria-invalid={editValidation.includes(
                                  'Alias text is required.',
                                )}
                                onChange={(event) =>
                                  setEditAliasValue(event.target.value)
                                }
                              />
                            </div>
                            <div className="form-field">
                              <label htmlFor={`edit-ingredient-${alias.id}`}>
                                Canonical ingredient
                              </label>
                              <select
                                id={`edit-ingredient-${alias.id}`}
                                value={editIngredientId}
                                aria-invalid={editValidation.includes(
                                  'Select a canonical ingredient.',
                                )}
                                onChange={(event) =>
                                  setEditIngredientId(event.target.value)
                                }
                              >
                                <option value="">Select an ingredient</option>
                                {canonicalIngredients.map((ingredient) => (
                                  <option
                                    key={ingredient.id}
                                    value={ingredient.id}
                                  >
                                    {ingredient.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {editValidation.length > 0 && (
                            <ul
                              className="form-message form-message-error"
                              role="alert"
                            >
                              {editValidation.map((message) => (
                                <li key={message}>{message}</li>
                              ))}
                            </ul>
                          )}
                          {editError && (
                            <p
                              className="form-message form-message-error"
                              role="alert"
                            >
                              {editError}
                            </p>
                          )}
                          <div className="alias-actions">
                            <button
                              className="primary-button"
                              type="button"
                              disabled={isSavingEdit}
                              onClick={() => {
                                void saveEdit(alias.id);
                              }}
                            >
                              {isSavingEdit ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={isSavingEdit}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="alias-card-summary">
                            <div>
                              <h3 id={`alias-${alias.id}`}>{alias.alias}</h3>
                              <p>
                                Canonical ingredient:{' '}
                                <strong>{alias.ingredient.name}</strong>
                              </p>
                            </div>
                            <div className="alias-actions">
                              <button
                                className="secondary-button"
                                type="button"
                                disabled={!hasCanonicalIngredients}
                                onClick={() => beginEdit(alias)}
                              >
                                Edit
                              </button>
                              <button
                                className="secondary-button"
                                type="button"
                                disabled={isRemoving}
                                onClick={() => beginRemove(alias.id)}
                              >
                                Remove alias
                              </button>
                            </div>
                          </div>

                          {isConfirming && (
                            <div
                              className="confirmation-panel"
                              role="dialog"
                              aria-label={`Remove alias ${alias.alias}`}
                            >
                              <h4>Remove alias “{alias.alias}”?</h4>
                              <p>
                                This removes only the alias mapping. The
                                canonical ingredient “{alias.ingredient.name}”
                                will not be deleted.
                              </p>
                              {removeError && (
                                <p className="action-error" role="alert">
                                  {removeError}
                                </p>
                              )}
                              <div className="confirmation-actions">
                                <button
                                  type="button"
                                  disabled={isRemoving}
                                  onClick={cancelRemove}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={isRemoving}
                                  onClick={() => {
                                    void confirmRemove(alias);
                                  }}
                                >
                                  {isRemoving
                                    ? 'Removing...'
                                    : 'Confirm remove'}
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
};
