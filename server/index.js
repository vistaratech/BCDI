/**
 * BCDI Real Estate — Express API Server
 * Connects to Neon PostgreSQL + Cloudinary
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer for file uploads (memory storage for Cloudinary streaming)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// --- Cloudinary Config ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ============================================================
//  HELPER: Assemble full database object from all tables
// ============================================================
async function getFullDatabase(client) {
    const db = client || pool;

    // Layouts
    const layoutRows = await db.query('SELECT * FROM layouts ORDER BY created_at');
    const layouts = [];

    for (const l of layoutRows.rows) {
        const plots = await db.query('SELECT * FROM plots WHERE layout_id = $1', [l.id]);
        const roads = await db.query('SELECT * FROM roads WHERE layout_id = $1', [l.id]);
        const hatches = await db.query('SELECT * FROM hatches WHERE layout_id = $1', [l.id]);

        layouts.push({
            id: l.id,
            name: l.name,
            state: l.state,
            district: l.district,
            area: l.area,
            canvas: l.canvas_json,
            backgroundImage: l.background_image_json,
            plots: plots.rows.map(p => ({
                id: p.id,
                status: p.status,
                area: p.area,
                price: p.price,
                owner: p.owner,
                notes: p.notes,
                points: p.points_json,
                labelOffset: p.label_offset_json,
                classification: p.classification,
                category: p.category,
                isBuilding: p.is_building,
                isCommon: p.is_common
            })),
            roads: roads.rows.map(r => ({
                id: r.id,
                name: r.name,
                points: r.points_json,
                textPath: r.text_path,
                style: r.style_json
            })),
            hatches: hatches.rows.map(h => ({
                id: h.id,
                points: h.points_json,
                style: h.style_json
            }))
        });
    }

    // Bookings
    const bookingRows = await db.query('SELECT * FROM bookings ORDER BY created_at DESC');
    const bookings = bookingRows.rows.map(b => ({
        id: b.id,
        layoutId: b.layout_id,
        layoutName: b.layout_name,
        plotId: b.plot_id,
        customerName: b.customer_name,
        customerPhone: b.customer_phone,
        customerEmail: b.customer_email,
        amountPaid: b.amount_paid,
        date: b.booking_date,
        status: b.status
    }));

    // Videos
    const videoRows = await db.query('SELECT * FROM videos ORDER BY sort_order, created_at');
    const videos = videoRows.rows.map(v => ({
        id: v.id,
        title: v.title,
        description: v.description,
        url: v.url,
        duration: v.duration,
        tag: v.tag
    }));

    // Settings
    const settingsRow = await db.query('SELECT * FROM settings WHERE id = 1');
    const s = settingsRow.rows[0] || {};
    const settings = {
        bookingAdvance: s.booking_advance ?? 50000,
        supportPhone: s.support_phone ?? '+91 98765 43210',
        supportEmail: s.support_email ?? 'support@bcdidevelopers.in',
        officeAddress: s.office_address ?? 'BCDI Plaza, Highway Road, Vijayamangalam, Erode, Tamil Nadu - 638056'
    };

    // Active layout ID (default to first)
    const activeLayoutId = layouts.length > 0 ? layouts[0].id : 'default';

    return { activeLayoutId, layouts, bookings, videos, settings };
}

// ============================================================
//  HELPER: Save full database object to all tables (transactional)
// ============================================================
async function saveFullDatabase(data) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // --- Clear existing data (Only layout structures) ---
        await client.query('DELETE FROM hatches');
        await client.query('DELETE FROM roads');
        await client.query('DELETE FROM plots');
        await client.query('DELETE FROM layouts');

        // --- Insert layouts + children ---
        for (const layout of (data.layouts || [])) {
            await client.query(
                `INSERT INTO layouts (id, name, state, district, area, canvas_json, background_image_json)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO UPDATE SET name=$2, state=$3, district=$4, area=$5, canvas_json=$6, background_image_json=$7, updated_at=NOW()`,
                [layout.id, layout.name, layout.state || '', layout.district || '', layout.area || '',
                 JSON.stringify(layout.canvas || {}), JSON.stringify(layout.backgroundImage || {})]
            );

            // Plots
            for (const plot of (layout.plots || [])) {
                await client.query(
                    `INSERT INTO plots (layout_id, id, status, area, price, owner, notes, points_json, label_offset_json, classification, category, is_building, is_common)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                    [layout.id, plot.id, plot.status || 'available', plot.area || 0, plot.price || 0,
                     plot.owner || null, plot.notes || '', JSON.stringify(plot.points || []),
                     JSON.stringify(plot.labelOffset || { x: 0, y: 0 }),
                     plot.classification || 'plot', plot.category || 'general',
                     plot.isBuilding || false, plot.isCommon || false]
                );
            }

            // Roads
            for (const road of (layout.roads || [])) {
                await client.query(
                    `INSERT INTO roads (layout_id, id, name, points_json, text_path, style_json)
                     VALUES ($1,$2,$3,$4,$5,$6)`,
                    [layout.id, road.id, road.name || '', JSON.stringify(road.points || []),
                     road.textPath || null, JSON.stringify(road.style || {})]
                );
            }

            // Hatches
            for (const hatch of (layout.hatches || [])) {
                await client.query(
                    `INSERT INTO hatches (layout_id, id, points_json, style_json)
                     VALUES ($1,$2,$3,$4)`,
                    [layout.id, hatch.id, JSON.stringify(hatch.points || []),
                     JSON.stringify(hatch.style || {})]
                );
            }
        }

        // --- Insert/Update bookings (Upsert style to prevent overwriting concurrent bookings) ---
        for (const b of (data.bookings || [])) {
            await client.query(
                `INSERT INTO bookings (id, layout_id, layout_name, plot_id, customer_name, customer_phone, customer_email, amount_paid, booking_date, status)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                 ON CONFLICT (id) DO UPDATE SET
                    layout_id = EXCLUDED.layout_id,
                    layout_name = EXCLUDED.layout_name,
                    plot_id = EXCLUDED.plot_id,
                    customer_name = EXCLUDED.customer_name,
                    customer_phone = EXCLUDED.customer_phone,
                    customer_email = EXCLUDED.customer_email,
                    amount_paid = EXCLUDED.amount_paid,
                    booking_date = EXCLUDED.booking_date,
                    status = EXCLUDED.status`,
                [b.id, b.layoutId, b.layoutName || '', b.plotId, b.customerName,
                 b.customerPhone, b.customerEmail || '', b.amountPaid || 0,
                 b.date || new Date().toISOString(), b.status || 'pending']
            );
        }

        // --- Insert/Update videos (Upsert style to prevent deletion of other videos) ---
        for (let i = 0; i < (data.videos || []).length; i++) {
            const v = data.videos[i];
            await client.query(
                `INSERT INTO videos (id, title, description, url, duration, tag, sort_order)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)
                 ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    url = EXCLUDED.url,
                    duration = EXCLUDED.duration,
                    tag = EXCLUDED.tag,
                    sort_order = EXCLUDED.sort_order`,
                [v.id, v.title, v.description || '', v.url, v.duration || '0:00', v.tag || '', i]
            );
        }

        // --- Upsert settings ---
        const s = data.settings || {};
        await client.query(
            `INSERT INTO settings (id, booking_advance, support_phone, support_email, office_address)
             VALUES (1, $1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET
                booking_advance=$1, support_phone=$2, support_email=$3, office_address=$4, updated_at=NOW()`,
            [s.bookingAdvance ?? 50000, s.supportPhone ?? '', s.supportEmail ?? '', s.officeAddress ?? '']
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// ============================================================
//  API ROUTES
// ============================================================

// --- Full Database ---
app.get('/api/database', async (req, res) => {
    try {
        const data = await getFullDatabase();
        res.json(data);
    } catch (err) {
        console.error('GET /api/database error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/database', async (req, res) => {
    try {
        await saveFullDatabase(req.body);
        res.json({ success: true });
    } catch (err) {
        console.error('PUT /api/database error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Layouts ---
app.get('/api/layouts', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, state, district, area FROM layouts ORDER BY created_at');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/layouts/:id', async (req, res) => {
    try {
        const layout = await pool.query('SELECT * FROM layouts WHERE id = $1', [req.params.id]);
        if (layout.rows.length === 0) return res.status(404).json({ error: 'Layout not found' });
        
        const plots = await pool.query('SELECT * FROM plots WHERE layout_id = $1', [req.params.id]);
        const roads = await pool.query('SELECT * FROM roads WHERE layout_id = $1', [req.params.id]);
        const hatches = await pool.query('SELECT * FROM hatches WHERE layout_id = $1', [req.params.id]);
        
        const l = layout.rows[0];
        res.json({
            id: l.id, name: l.name, state: l.state, district: l.district, area: l.area,
            canvas: l.canvas_json, backgroundImage: l.background_image_json,
            plots: plots.rows.map(p => ({
                id: p.id, status: p.status, area: p.area, price: p.price, owner: p.owner,
                notes: p.notes, points: p.points_json, labelOffset: p.label_offset_json,
                classification: p.classification, category: p.category,
                isBuilding: p.is_building, isCommon: p.is_common
            })),
            roads: roads.rows.map(r => ({
                id: r.id, name: r.name, points: r.points_json, textPath: r.text_path, style: r.style_json
            })),
            hatches: hatches.rows.map(h => ({
                id: h.id, points: h.points_json, style: h.style_json
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/layouts', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const layout = req.body;
        await client.query(
            `INSERT INTO layouts (id, name, state, district, area, canvas_json, background_image_json)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [layout.id, layout.name, layout.state || '', layout.district || '', layout.area || '',
             JSON.stringify(layout.canvas || {}), JSON.stringify(layout.backgroundImage || {})]
        );
        for (const plot of (layout.plots || [])) {
            await client.query(
                `INSERT INTO plots (layout_id, id, status, area, price, owner, notes, points_json, label_offset_json, classification, category, is_building, is_common)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [layout.id, plot.id, plot.status || 'available', plot.area || 0, plot.price || 0,
                 plot.owner || null, plot.notes || '', JSON.stringify(plot.points || []),
                 JSON.stringify(plot.labelOffset || {}), plot.classification || 'plot',
                 plot.category || 'general', plot.isBuilding || false, plot.isCommon || false]
            );
        }
        for (const road of (layout.roads || [])) {
            await client.query(
                `INSERT INTO roads (layout_id, id, name, points_json, text_path, style_json) VALUES ($1,$2,$3,$4,$5,$6)`,
                [layout.id, road.id, road.name || '', JSON.stringify(road.points || []),
                 road.textPath || null, JSON.stringify(road.style || {})]
            );
        }
        for (const hatch of (layout.hatches || [])) {
            await client.query(
                `INSERT INTO hatches (layout_id, id, points_json, style_json) VALUES ($1,$2,$3,$4)`,
                [layout.id, hatch.id, JSON.stringify(hatch.points || []), JSON.stringify(hatch.style || {})]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true, id: layout.id });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.put('/api/layouts/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const layout = req.body;
        const lid = req.params.id;

        await client.query(
            `UPDATE layouts SET name=$1, state=$2, district=$3, area=$4, canvas_json=$5, background_image_json=$6, updated_at=NOW() WHERE id=$7`,
            [layout.name, layout.state || '', layout.district || '', layout.area || '',
             JSON.stringify(layout.canvas || {}), JSON.stringify(layout.backgroundImage || {}), lid]
        );

        // Replace children
        await client.query('DELETE FROM plots WHERE layout_id=$1', [lid]);
        await client.query('DELETE FROM roads WHERE layout_id=$1', [lid]);
        await client.query('DELETE FROM hatches WHERE layout_id=$1', [lid]);

        for (const plot of (layout.plots || [])) {
            await client.query(
                `INSERT INTO plots (layout_id,id,status,area,price,owner,notes,points_json,label_offset_json,classification,category,is_building,is_common)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [lid, plot.id, plot.status || 'available', plot.area || 0, plot.price || 0,
                 plot.owner || null, plot.notes || '', JSON.stringify(plot.points || []),
                 JSON.stringify(plot.labelOffset || {}), plot.classification || 'plot',
                 plot.category || 'general', plot.isBuilding || false, plot.isCommon || false]
            );
        }
        for (const road of (layout.roads || [])) {
            await client.query(
                `INSERT INTO roads (layout_id,id,name,points_json,text_path,style_json) VALUES ($1,$2,$3,$4,$5,$6)`,
                [lid, road.id, road.name || '', JSON.stringify(road.points || []),
                 road.textPath || null, JSON.stringify(road.style || {})]
            );
        }
        for (const hatch of (layout.hatches || [])) {
            await client.query(
                `INSERT INTO hatches (layout_id,id,points_json,style_json) VALUES ($1,$2,$3,$4)`,
                [lid, hatch.id, JSON.stringify(hatch.points || []), JSON.stringify(hatch.style || {})]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.delete('/api/layouts/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM layouts WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Bookings ---
app.get('/api/bookings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
        res.json(result.rows.map(b => ({
            id: b.id, layoutId: b.layout_id, layoutName: b.layout_name, plotId: b.plot_id,
            customerName: b.customer_name, customerPhone: b.customer_phone,
            customerEmail: b.customer_email, amountPaid: b.amount_paid,
            date: b.booking_date, status: b.status
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const b = req.body;
        await pool.query(
            `INSERT INTO bookings (id,layout_id,layout_name,plot_id,customer_name,customer_phone,customer_email,amount_paid,booking_date,status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [b.id, b.layoutId, b.layoutName || '', b.plotId, b.customerName,
             b.customerPhone, b.customerEmail || '', b.amountPaid || 0,
             b.date || new Date().toISOString(), b.status || 'pending']
        );
        res.json({ success: true, id: b.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/bookings/:id', async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query('UPDATE bookings SET status=$1 WHERE id=$2', [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Videos ---
app.get('/api/videos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM videos ORDER BY sort_order, created_at');
        res.json(result.rows.map(v => ({
            id: v.id, title: v.title, description: v.description,
            url: v.url, duration: v.duration, tag: v.tag
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/videos', async (req, res) => {
    try {
        const v = req.body;
        const countResult = await pool.query('SELECT COUNT(*) FROM videos');
        const sortOrder = parseInt(countResult.rows[0].count);
        await pool.query(
            `INSERT INTO videos (id,title,description,url,duration,tag,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [v.id, v.title, v.description || '', v.url, v.duration || '0:00', v.tag || '', sortOrder]
        );
        res.json({ success: true, id: v.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/videos/:id', async (req, res) => {
    try {
        const v = req.body;
        await pool.query(
            `UPDATE videos SET title=$1, description=$2, url=$3, duration=$4, tag=$5 WHERE id=$6`,
            [v.title, v.description || '', v.url, v.duration || '0:00', v.tag || '', req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/videos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM videos WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Settings ---
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings WHERE id=1');
        const s = result.rows[0] || {};
        res.json({
            bookingAdvance: s.booking_advance ?? 50000,
            supportPhone: s.support_phone ?? '',
            supportEmail: s.support_email ?? '',
            officeAddress: s.office_address ?? ''
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/settings', async (req, res) => {
    try {
        const s = req.body;
        await pool.query(
            `INSERT INTO settings (id, booking_advance, support_phone, support_email, office_address)
             VALUES (1,$1,$2,$3,$4)
             ON CONFLICT (id) DO UPDATE SET booking_advance=$1, support_phone=$2, support_email=$3, office_address=$4, updated_at=NOW()`,
            [s.bookingAdvance ?? 50000, s.supportPhone ?? '', s.supportEmail ?? '', s.officeAddress ?? '']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Cloudinary Upload ---
app.post('/api/upload/image', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        
        const b64 = req.file.buffer.toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'bcdi/layouts',
            resource_type: 'image',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }]
        });
        
        res.json({ url: result.secure_url, publicId: result.public_id });
    } catch (err) {
        console.error('Image upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/upload/video', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        
        const b64 = req.file.buffer.toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'bcdi/videos',
            resource_type: 'video'
        });
        
        res.json({ url: result.secure_url, publicId: result.public_id, duration: result.duration });
    } catch (err) {
        console.error('Video upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Health check ---
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// --- Start Server ---
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 BCDI API Server running on http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
}

module.exports = app;
