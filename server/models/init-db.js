const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT) || 3306,
    multipleStatements: true
  });

  try {
    console.log('Connected to MySQL server.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schema);
    console.log('Database schema created successfully.');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
    console.log('Connection closed.');
  }
}

initDatabase();
