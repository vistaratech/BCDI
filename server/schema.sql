-- BCDI Real Estate Database Schema for Neon PostgreSQL

-- Layouts table
CREATE TABLE IF NOT EXISTS layouts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Untitled Layout',
    state TEXT DEFAULT 'Tamil Nadu',
    district TEXT DEFAULT 'Erode',
    area TEXT DEFAULT 'Vijayamangalam',
    canvas_json JSONB DEFAULT '{"width":1600,"height":1000,"viewBox":"0 0 1600 1000"}'::jsonb,
    background_image_json JSONB DEFAULT '{"href":null,"opacity":0.35,"x":0,"y":0,"width":1600,"height":1000}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plots table (belongs to a layout)
CREATE TABLE IF NOT EXISTS plots (
    layout_id TEXT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    area DOUBLE PRECISION DEFAULT 0,
    price DOUBLE PRECISION DEFAULT 0,
    owner TEXT,
    notes TEXT DEFAULT '',
    points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    label_offset_json JSONB DEFAULT '{"x":0,"y":0}'::jsonb,
    classification TEXT DEFAULT 'plot',
    category TEXT DEFAULT 'general',
    is_building BOOLEAN DEFAULT FALSE,
    is_common BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (layout_id, id)
);

-- Roads table (belongs to a layout)
CREATE TABLE IF NOT EXISTS roads (
    layout_id TEXT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    name TEXT DEFAULT '',
    points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    text_path TEXT,
    style_json JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (layout_id, id)
);

-- Hatches table (belongs to a layout)
CREATE TABLE IF NOT EXISTS hatches (
    layout_id TEXT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    style_json JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (layout_id, id)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    layout_id TEXT NOT NULL,
    layout_name TEXT DEFAULT '',
    plot_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT DEFAULT '',
    amount_paid DOUBLE PRECISION DEFAULT 0,
    booking_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    url TEXT NOT NULL,
    duration TEXT DEFAULT '0:00',
    tag TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (single row)
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    booking_advance DOUBLE PRECISION DEFAULT 50000,
    support_phone TEXT DEFAULT '+91 98765 43210',
    support_email TEXT DEFAULT 'support@bcdidevelopers.in',
    office_address TEXT DEFAULT 'BCDI Plaza, Highway Road, Vijayamangalam, Erode, Tamil Nadu - 638056',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_plots_layout ON plots(layout_id);
CREATE INDEX IF NOT EXISTS idx_plots_status ON plots(status);
CREATE INDEX IF NOT EXISTS idx_roads_layout ON roads(layout_id);
CREATE INDEX IF NOT EXISTS idx_hatches_layout ON hatches(layout_id);
CREATE INDEX IF NOT EXISTS idx_bookings_layout ON bookings(layout_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(customer_phone);
