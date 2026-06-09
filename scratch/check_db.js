const { Pool } = require('pg');
require('dotenv').config({ path: '../server/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        const bookingsRes = await pool.query('SELECT * FROM bookings');
        console.log(`--- Bookings Table (Total: ${bookingsRes.rowCount}) ---`);
        console.log(bookingsRes.rows);

        const layoutsRes = await pool.query('SELECT id, name FROM layouts');
        console.log(`\n--- Layouts Table (Total: ${layoutsRes.rowCount}) ---`);
        console.log(layoutsRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

main();
