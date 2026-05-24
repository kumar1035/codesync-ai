const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:Anujkumar%401035@db.ldthtzpdbyciewdpmjhh.supabase.co:5432/postgres?sslmode=require';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  console.log('Connecting to Supabase...');
  const client = await pool.connect();
  console.log('Connected!');

  const sql = fs.readFileSync(path.join(__dirname, '../docker/postgres/init.sql'), 'utf8');

  console.log('Running schema init...');
  await client.query(sql);
  console.log('Schema initialized successfully!');

  // Verify tables exist
  const res = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('\nTables created:');
  res.rows.forEach(r => console.log(' -', r.table_name));

  client.release();
  await pool.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
