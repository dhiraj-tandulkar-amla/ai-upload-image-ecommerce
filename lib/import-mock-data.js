const fs = require("fs");
const { Pool } = require("pg");

async function importData() {
  try {
    console.log("Reading .env.local...");
    const env = fs.readFileSync(".env.local", "utf8");
    const match = env.match(/DATABASE_URL=(.+)/);
    if (!match) {
      throw new Error("Could not find DATABASE_URL in .env.local");
    }
    const dbUrl = match[1].trim();

    console.log("Connecting to Database...");
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });

    // 1. Initialize Tables (Setup DB)
    console.log("Initializing database tables if they do not exist...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        image TEXT,
        color TEXT,
        size TEXT,
        category TEXT,
        brand TEXT,
        price NUMERIC(10, 2) DEFAULT 0.00,
        rating NUMERIC(3, 2) DEFAULT 4.0,
        description TEXT,
        attributes JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        session_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_search 
      ON products (name, category, brand, color);
    `);

    // 2. Read products.json
    console.log("Reading products.json...");
    const productsJson = JSON.parse(fs.readFileSync("data/products.json", "utf8"));

    // 3. Insert each product
    console.log("Inserting products...");
    for (const p of productsJson) {
      const sku = p.name.toUpperCase().replace(/[^A-Z0-9]/g, "-");
      const image = p.image || "/placeholder.jpg";
      const color = p.color || "N/A";
      const size = "N/A";
      const category = p.category || "General";
      const brand = p.brand || "Unknown";
      const price = p.price || 0.0;
      const rating = p.rating || 4.0;
      const description = `Premium ${p.name} in ${color}. category: ${category}`;

      await pool.query(
        `
        INSERT INTO products (name, sku, image, color, size, category, brand, price, rating, description, attributes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (sku) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          image = EXCLUDED.image,
          color = EXCLUDED.color,
          size = EXCLUDED.size,
          category = EXCLUDED.category,
          brand = EXCLUDED.brand,
          price = EXCLUDED.price,
          rating = EXCLUDED.rating,
          description = EXCLUDED.description
      `,
        [p.name, sku, image, color, size, category, brand, price, rating, description, "{}"]
      );
      console.log(`Imported: ${p.name} (SKU: ${sku})`);
    }

    console.log("SUCCESS: All products imported successfully into Supabase!");
    await pool.end();
  } catch (error) {
    console.error("ERROR during import:", error);
  }
}

importData();
