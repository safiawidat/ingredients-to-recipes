import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '../../lib/api';
import { importRecipes } from '../../services/recipe-import-api';
import type {
  RecipeImportErrorDetails,
  RecipeImportRequest,
  RecipeImportSummary,
} from '../../types/recipe-import';

const MAX_FILE_SIZE_BYTES = 1024 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getImportErrorDetails = (
  value: unknown,
): RecipeImportErrorDetails | null => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.recordErrors) ||
    typeof value.totalErrors !== 'number' ||
    typeof value.errorsTruncated !== 'boolean'
  ) {
    return null;
  }

  const recordErrors = value.recordErrors.filter(
    (entry): entry is RecipeImportErrorDetails['recordErrors'][number] =>
      isRecord(entry) &&
      (typeof entry.recordIndex === 'number' || entry.recordIndex === null) &&
      (typeof entry.recipeName === 'string' || entry.recipeName === null) &&
      typeof entry.path === 'string' &&
      typeof entry.code === 'string' &&
      typeof entry.message === 'string',
  );
  const unknownIngredients = Array.isArray(value.unknownIngredients)
    ? value.unknownIngredients.filter(
        (entry): entry is string => typeof entry === 'string',
      )
    : undefined;

  return {
    recordErrors,
    totalErrors: value.totalErrors,
    errorsTruncated: value.errorsTruncated,
    ...(unknownIngredients !== undefined ? { unknownIngredients } : {}),
    ...(typeof value.totalUnknownIngredients === 'number'
      ? { totalUnknownIngredients: value.totalUnknownIngredients }
      : {}),
    ...(typeof value.unknownIngredientsTruncated === 'boolean'
      ? { unknownIngredientsTruncated: value.unknownIngredientsTruncated }
      : {}),
  };
};

const duplicateReasonLabel = (reason: string): string =>
  reason === 'DUPLICATE_IN_PAYLOAD'
    ? 'duplicate in this file'
    : 'already exists';

export const AdminRecipeImportPage = () => {
  const submissionPendingRef = useRef(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] =
    useState<RecipeImportErrorDetails | null>(null);
  const [summary, setSummary] = useState<RecipeImportSummary | null>(null);

  const isOversized =
    selectedFile !== null && selectedFile.size > MAX_FILE_SIZE_BYTES;
  const isPending = isParsing || isSubmitting;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSummary(null);
    setErrorDetails(null);

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage('The selected file exceeds the 1 MiB size limit.');
    } else {
      setErrorMessage(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || isOversized || submissionPendingRef.current) {
      return;
    }

    submissionPendingRef.current = true;
    setSummary(null);
    setErrorMessage(null);
    setErrorDetails(null);
    setIsParsing(true);

    try {
      const text = await selectedFile.text();
      let parsedValue: unknown;

      try {
        parsedValue = JSON.parse(text) as unknown;
      } catch {
        setErrorMessage('The selected file does not contain valid JSON.');
        return;
      }

      setIsParsing(false);
      setIsSubmitting(true);
      const response = await importRecipes(parsedValue as RecipeImportRequest);
      setSummary(response.data);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        setErrorDetails(getImportErrorDetails(error.details));
      } else {
        setErrorMessage('Unable to import recipes. Please try again.');
      }
    } finally {
      setIsParsing(false);
      setIsSubmitting(false);
      submissionPendingRef.current = false;
    }
  };

  return (
    <section className="page-panel admin-recipe-import-page">
      <div className="page-heading">
        <div>
          <h1>Import Recipes</h1>
          <p>
            Select a controlled JSON file. The backend validates every recipe
            before writing the nonduplicate recipes atomically.
          </p>
        </div>
        <Link to="/admin/recipes">Back to Admin recipes</Link>
      </div>

      <div className="recipe-import-panel">
        <div className="form-field">
          <label htmlFor="recipe-import-file">Recipe JSON file</label>
          <input
            id="recipe-import-file"
            type="file"
            accept=".json,application/json"
            disabled={isPending}
            onChange={handleFileChange}
          />
        </div>

        {selectedFile && (
          <p className="recipe-import-file" role="status">
            Selected: <strong>{selectedFile.name}</strong> ({selectedFile.size}{' '}
            bytes)
          </p>
        )}

        <p className="form-help">
          Maximum 500 recipes and 1 MiB per file. Unknown ingredients reject
          the entire import; duplicate recipe names are skipped.
        </p>

        <button
          className="primary-button recipe-import-button"
          type="button"
          disabled={!selectedFile || isOversized || isPending}
          onClick={() => void handleImport()}
        >
          {isParsing
            ? 'Parsing file...'
            : isSubmitting
              ? 'Importing recipes...'
              : 'Import Recipes'}
        </button>
      </div>

      {isParsing && <p role="status">Reading and parsing JSON...</p>}
      {isSubmitting && <p role="status">Importing recipes...</p>}

      {errorMessage && (
        <div className="form-message form-message-error" role="alert">
          <p>{errorMessage}</p>
          {errorDetails && errorDetails.recordErrors.length > 0 && (
            <ul className="recipe-import-error-list">
              {errorDetails.recordErrors.map((error, index) => (
                <li key={`${error.recordIndex}-${error.path}-${index}`}>
                  {error.recordIndex !== null && (
                    <strong>Record index {error.recordIndex}: </strong>
                  )}
                  {error.recipeName && <span>{error.recipeName} — </span>}
                  {error.path && <span>{error.path}: </span>}
                  {error.message}
                </li>
              ))}
            </ul>
          )}
          {errorDetails?.unknownIngredients &&
            errorDetails.unknownIngredients.length > 0 && (
              <p>
                Unknown ingredients:{' '}
                {errorDetails.unknownIngredients.join(', ')}
              </p>
            )}
          {errorDetails?.errorsTruncated && (
            <p>
              Showing the first {errorDetails.recordErrors.length} of{' '}
              {errorDetails.totalErrors} errors.
            </p>
          )}
        </div>
      )}

      {summary && (
        <section className="recipe-import-result" role="status">
          <h2>Import complete</h2>
          <dl className="recipe-import-summary">
            <div>
              <dt>Received</dt>
              <dd>{summary.received}</dd>
            </div>
            <div>
              <dt>Imported</dt>
              <dd>{summary.imported}</dd>
            </div>
            <div>
              <dt>Skipped duplicates</dt>
              <dd>{summary.skippedDuplicates}</dd>
            </div>
          </dl>

          {summary.duplicates.length > 0 && (
            <>
              <h3>Skipped recipes</h3>
              <ul className="recipe-import-duplicate-list">
                {summary.duplicates.map((duplicate) => (
                  <li key={`${duplicate.recordIndex}-${duplicate.name}`}>
                    <strong>Record index {duplicate.recordIndex}:</strong>{' '}
                    {duplicate.name} — {duplicateReasonLabel(duplicate.reason)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </section>
  );
};
