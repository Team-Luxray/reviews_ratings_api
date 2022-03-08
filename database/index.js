const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '',
  database: 'reviews_api'
});

module.exports = {
  async query(text, params) {
    const res = await pool.query(text, params)
    return res;
  }
}