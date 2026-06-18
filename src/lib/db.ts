import { getDatabase } from '@netlify/database';

function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function prepare(sql: string) {
  const pgSql = convertPlaceholders(sql);

  return {
    async get(...params: any[]) {
      const database = getDatabase();
      const result = await database.pool.query(pgSql, params);
      return result.rows[0] ?? undefined;
    },

    async all(...params: any[]) {
      const database = getDatabase();
      const result = await database.pool.query(pgSql, params);
      return result.rows;
    },

    async run(...params: any[]) {
      const database = getDatabase();
      const isInsert = /^\s*INSERT/i.test(pgSql);
      const hasReturning = /RETURNING/i.test(pgSql);
      const querySql = isInsert && !hasReturning ? pgSql + ' RETURNING id' : pgSql;
      const result = await database.pool.query(querySql, params);
      return {
        lastInsertRowid: result.rows[0]?.id ?? 0,
        changes: result.rowCount ?? 0,
      };
    },
  };
}

export default {
  prepare,
};
