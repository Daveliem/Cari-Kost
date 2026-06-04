import mysql from 'mysql2/promise';

const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || '3306');
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'kos_search';

async function createDatabaseIfMissing() {
  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await connection.end();
}

async function createTables(pool: mysql.Pool) {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'landlord',
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS listings (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price INT NOT NULL,
      location VARCHAR(255) NOT NULL,
      latitude DOUBLE,
      longitude DOUBLE,
      room_type VARCHAR(100),
      amenities TEXT,
      images TEXT,
      contact VARCHAR(255) NOT NULL,
      user_id INT UNSIGNED,
      PRIMARY KEY (id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS reviews (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      listing_id INT UNSIGNED,
      rating INT NOT NULL,
      comment TEXT,
      user_id INT UNSIGNED,
      reviewer_name VARCHAR(255),
      reviewer_email VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS favorites (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      listing_id INT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_user_listing (user_id, listing_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      action VARCHAR(255) NOT NULL,
      object_type VARCHAR(255) NOT NULL,
      object_id INT,
      user_id INT UNSIGNED,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  ];

  for (const s of stmts) {
    await pool.execute(s);
  }
}

async function ensureColumn(pool: mysql.Pool, table: string, column: string, alterSql: string) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (!Array.isArray(rows) || rows.length === 0) {
    await pool.execute(alterSql);
  }
}

const poolPromise = (async () => {
  await createDatabaseIfMissing();

  const pool = mysql.createPool({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  await createTables(pool);
  await ensureColumn(pool, 'reviews', 'reviewer_name', 'ALTER TABLE reviews ADD COLUMN reviewer_name VARCHAR(255)');
  await ensureColumn(pool, 'reviews', 'reviewer_email', 'ALTER TABLE reviews ADD COLUMN reviewer_email VARCHAR(255)');
  await ensureColumn(pool, 'reviews', 'user_id', 'ALTER TABLE reviews ADD COLUMN user_id INT UNSIGNED');
  await ensureColumn(pool, 'listings', 'images', 'ALTER TABLE listings ADD COLUMN images TEXT');

  return pool;
})();

async function getPool() {
  return poolPromise;
}

function prepare(sql: string) {
  return {
    async get(...params: any[]) {
      const pool = await getPool();
      const [rows] = await pool.execute(sql, params);
      if (!Array.isArray(rows)) {
        return undefined;
      }
      return (rows as any)[0];
    },

    async all(...params: any[]) {
      const pool = await getPool();
      const [rows] = await pool.execute(sql, params);
      if (!Array.isArray(rows)) {
        return [];
      }
      return rows as any[];
    },

    async run(...params: any[]) {
      const pool = await getPool();
      const [result] = await pool.execute(sql, params);
      const info = result as mysql.ResultSetHeader;
      return {
        lastInsertRowid: info.insertId ?? 0,
        changes: info.affectedRows ?? 0,
      };
    },
  };
}

export default {
  prepare,
};
