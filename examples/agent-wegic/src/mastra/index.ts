import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { PgVector } from '@mastra/pg';

import { wegicAgent } from './agents/index';

const pgVector = new PgVector('postgresql://postgres:postgres@localhost:5439/postgres');

export const mastra = new Mastra({
  agents: { wegicAgent },
  vectors: { pgVector },
  logger: createLogger({ name: 'Wegic', level: 'info' }),
});
