import express, { type Express, type RequestHandler } from 'express';
import { fileURLToPath } from 'node:url';

const defaultClientDistPath = fileURLToPath(
  new URL('../../../client/dist/', import.meta.url),
);

export interface StaticClientOptions {
  nodeEnv: 'development' | 'test' | 'production';
  clientDistPath?: string;
}

export const registerStaticClient = (
  app: Express,
  options: StaticClientOptions,
): void => {
  if (options.nodeEnv !== 'production') {
    return;
  }

  const clientDistPath = options.clientDistPath ?? defaultClientDistPath;
  app.use(express.static(clientDistPath));

  const serveIndex: RequestHandler = (_request, response, next) => {
    response.sendFile('index.html', { root: clientDistPath }, (error) => {
      if (error) {
        next(error);
      }
    });
  };

  app.get('/{*splat}', serveIndex);
};
