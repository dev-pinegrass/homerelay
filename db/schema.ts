import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const handoffs = sqliteTable(
  'handoffs',
  {
    id: text('id').primaryKey(),
    sandbox: text('sandbox').notNull(),
    version: integer('version').notNull(),
    payload: text('payload').notNull(),
    updated: text('updated').notNull(),
  },
  (t) => [index('handoffs_sandbox_updated').on(t.sandbox, t.updated)],
);
