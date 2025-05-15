const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

// Log database connection details (without password)
console.log('Database connection config:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    passwordProvided: process.env.DB_PASSWORD
});

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'bulk_insert',
    passwordProvided: 'Root@123'
});

module.exports = pool;