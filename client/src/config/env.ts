const developmentApiBaseUrl = 'http://localhost:3000/api/v1';
const productionApiBaseUrl = '/api/v1';

export const resolveApiBaseUrl = (
  configuredBaseUrl: string | undefined,
  isProduction: boolean,
): string => {
  const normalizedBaseUrl = configuredBaseUrl?.trim().replace(/\/+$/, '');

  if (normalizedBaseUrl) {
    return normalizedBaseUrl;
  }

  return isProduction ? productionApiBaseUrl : developmentApiBaseUrl;
};

export const env = {
  apiBaseUrl: resolveApiBaseUrl(
    import.meta.env.VITE_API_BASE_URL,
    import.meta.env.PROD,
  ),
};
