const { Pool } = require('pg');
require('dotenv').config();

// const pool = new Pool({
//   host: 'localhost',
//   port: 5432,
//   user: 'postgres',
//   password: '',
//   database: 'reviews_api'
// });

const pool = new Pool({
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 5432,
  user: process.env.USER || 'postgres',
  password: process.env.PASSWORD || '',
  database: process.env.DATABASE || 'reviews_api'
});

module.exports = {
  async query(text, params) {
    const start = Date.now()
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('executed query', { text, duration, rows: res.rowCount })
    return res
  }
}