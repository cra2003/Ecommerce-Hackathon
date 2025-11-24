-- PRODUCTS TABLE (UUID PRIMARY KEY)
CREATE TABLE IF NOT EXISTS products (
    product_id TEXT PRIMARY KEY,        -- UUID (string)
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    brand TEXT,
    description TEXT,

    category TEXT CHECK (category IN ('Running','Casual','Formal','Sports')),
    gender TEXT CHECK (gender IN ('Men','Women','Unisex','Kids')),
    target_audience TEXT CHECK (target_audience IN ('Professional Athletes','Casual Wearers','Kids')),

    upper_material TEXT CHECK (upper_material IN ('Leather','Canvas','Mesh','Synthetic')),
    sole_material TEXT CHECK (sole_material IN ('Rubber','EVA','Polyurethane')),
    closure_type TEXT CHECK (closure_type IN ('Lace-up','Velcro','Slip-on','Buckle')),
    toe_style TEXT CHECK (toe_style IN ('Round','Pointed','Square','Open')),
    heel_type TEXT CHECK (heel_type IN ('Flat','Low','Mid','High','Wedge')),

    heel_height_cm REAL,
    weight_grams INTEGER,

    width_options TEXT, -- JSON array: ["Narrow","Standard","Wide"]
    arch_support TEXT CHECK (arch_support IN ('Low','Medium','High','Neutral')),
    flexibility TEXT CHECK (flexibility IN ('Stiff','Moderate','Flexible')),
    cushioning_level TEXT CHECK (cushioning_level IN ('Minimal','Moderate','Maximum')),
    water_resistance TEXT CHECK (water_resistance IN ('None','Water-resistant','Waterproof')),

    features TEXT,              -- JSON array
    season TEXT CHECK (season IN ('Spring/Summer','Fall/Winter','All-Season')),
    pattern TEXT CHECK (pattern IN ('Solid','Striped','Printed','Textured')),

    color_family TEXT NOT NULL,
    available_sizes TEXT NOT NULL, -- JSON array

    care_instructions TEXT,
    warranty_period TEXT,
    manufacturer_name TEXT,
    manufacturer_country TEXT,

    primary_image_url TEXT NOT NULL,
    meta_title TEXT,

    is_active INTEGER CHECK (is_active IN (0,1)) DEFAULT 1,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
