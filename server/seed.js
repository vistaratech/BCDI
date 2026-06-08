/**
 * seed.js — Initialize the Neon PostgreSQL database schema
 * Run once: node seed.js
 */
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function seed() {
    console.log('🌱 Seeding BCDI database schema...');
    
    try {
        const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        await pool.query(schemaSQL);
        console.log('✅ Schema created successfully!');
        
        // Verify tables
        const result = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        console.log('📋 Tables created:');
        result.rows.forEach(row => console.log(`   - ${row.table_name}`));
        
    } catch (err) {
        console.error('❌ Seed error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('🔒 Database connection closed.');
    }
}

seed();
