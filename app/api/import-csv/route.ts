import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Robust parser to handle quotes, commas, and escapes in CSVs
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let entry = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        entry += '"';
        i++; // skip next double quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(entry.trim());
      entry = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(entry.trim());
      if (row.length > 0 && (row.length > 1 || row[0] !== "")) {
        lines.push(row);
      }
      row = [];
      entry = "";
    } else {
      entry += char;
    }
  }

  if (row.length > 0 || entry !== "") {
    row.push(entry.trim());
    if (row.length > 0 && (row.length > 1 || row[0] !== "")) {
      lines.push(row);
    }
  }

  return lines;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No CSV file uploaded." }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json(
        { error: "CSV must contain a header row and at least one data row." },
        { status: 400 }
      );
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    // Heuristics mapping to support Shopify, standard ecommerce, and ad-hoc CSVs
    const getColumnIndex = (possibleNames: string[]) => {
      return headers.findIndex((h) => possibleNames.some((pName) => h === pName || h.includes(pName)));
    };

    const nameIndex = getColumnIndex(["title", "name", "product name", "product_name", "heading"]);
    // 'asin' is a reliable unique ID in Amazon exports; try exact sku match first
    const skuIndex = (() => {
      const exact = headers.findIndex((h) => ["sku", "product sku", "product_sku", "asin", "barcode", "id"].includes(h));
      return exact !== -1 ? exact : getColumnIndex(["sku", "product sku", "product_sku", "barcode"]);
    })();
    // EXACT match only for image — "includes" causes false positives e.g. "images_count".includes("img") = true
    const imageIndex = (() => {
      const exactNames = ["image_url", "product_image_url", "image url", "product image url", "variant_image_url", "variant image url", "img_url", "image", "img"];
      return headers.findIndex((h) => exactNames.includes(h));
    })();
    const brandIndex = getColumnIndex(["vendor", "brand", "manufacturer", "brand name", "brand_name"]);
    // 'categories' (plural, Amazon) + 'category' variants
    const categoryIndex = (() => {
      const exact = headers.findIndex((h) => ["categories", "category", "product category", "product_category", "type", "type_name", "category name", "category_name"].includes(h));
      return exact !== -1 ? exact : getColumnIndex(["category", "product category", "product_category", "type_name", "category name", "category_name"]);
    })();
    // 'final_price' before 'initial_price' — use includes only as fallback
    const priceIndex = (() => {
      const exact = headers.findIndex((h) => ["final_price", "price", "retail_price", "retail price"].includes(h));
      return exact !== -1 ? exact : getColumnIndex(["cost", "compare-at price", "cost per item"]);
    })();
    const ratingIndex = getColumnIndex(["rating", "stars", "rating value"]);
    const descriptionIndex = getColumnIndex(["description", "body", "body (html)", "body_html", "summary", "text"]);

    // Option columns for Shopify-like variants
    const opt1NameIndex = headers.indexOf("option1 name");
    const opt1ValIndex = headers.indexOf("option1 value");
    const opt2NameIndex = headers.indexOf("option2 name");
    const opt2ValIndex = headers.indexOf("option2 value");
    const opt3NameIndex = headers.indexOf("option3 name");
    const opt3ValIndex = headers.indexOf("option3 value");

    // Color and Size headers
    const colorIndex = getColumnIndex(["color (product.metafields.shopify.color-pattern)", "color", "colour"]);
    const sizeIndex = getColumnIndex(["size"]);

    // Helper to strip embedded quotes and return clean numeric string
    // Handles triple-quoted Amazon exports like """57.79"""
    const cleanNumeric = (val: string) => val.replace(/^"+|"+$/g, "").trim();

    let insertedCount = 0;
    let errors: string[] = [];

    // Keep track of the last parent product seen to propagate values to multi-row variant rows
    const lastParent = {
      name: "",
      brand: "Unknown",
      category: "General",
      description: "",
      image: "/placeholder.svg",
    };

    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;

      // Safe index value helper
      const getVal = (idx: number) => (idx !== -1 && idx < row.length ? row[idx].trim() : "");

      // 1. Map properties
      let name = getVal(nameIndex);
      let brand = getVal(brandIndex);
      let category = getVal(categoryIndex);
      let description = getVal(descriptionIndex);
      let image = getVal(imageIndex);
      let sku = getVal(skuIndex);

      // 2. Propagate parent data if this is a variant row (missing Title but has SKU or other details)
      if (name) {
        lastParent.name = name;
        lastParent.brand = brand || "Unknown";
        lastParent.category = category || "General";
        lastParent.description = description || "";
        lastParent.image = image || "/placeholder.svg";
      } else if (lastParent.name) {
        name = lastParent.name;
        if (!brand) brand = lastParent.brand;
        if (!category) category = lastParent.category;
        if (!description) description = lastParent.description;
        if (!image) image = lastParent.image;
      }

      // Check required fields
      if (!name) {
        errors.push(`Row ${r + 2}: Missing required field Name/Title.`);
        continue;
      }

      // 3. Extract Color dynamically from direct column or options
      let color = getVal(colorIndex);
      if (!color) {
        if (opt1NameIndex !== -1 && getVal(opt1NameIndex).toLowerCase() === "color") color = getVal(opt1ValIndex);
        else if (opt2NameIndex !== -1 && getVal(opt2NameIndex).toLowerCase() === "color") color = getVal(opt2ValIndex);
        else if (opt3NameIndex !== -1 && getVal(opt3NameIndex).toLowerCase() === "color") color = getVal(opt3ValIndex);
      }
      color = color || "N/A";

      // 4. Extract Size dynamically from direct column or options
      let size = getVal(sizeIndex);
      if (!size) {
        if (opt1NameIndex !== -1 && getVal(opt1NameIndex).toLowerCase() === "size") size = getVal(opt1ValIndex);
        else if (opt2NameIndex !== -1 && getVal(opt2NameIndex).toLowerCase() === "size") size = getVal(opt2ValIndex);
        else if (opt3NameIndex !== -1 && getVal(opt3NameIndex).toLowerCase() === "size") size = getVal(opt3ValIndex);
      }
      size = size || "N/A";

      // Generate dummy SKU if missing
      if (!sku) {
        // Fallback to barcode if present
        const barcodeIndex = headers.indexOf("barcode");
        if (barcodeIndex !== -1) sku = getVal(barcodeIndex);
      }
      if (!sku) {
        sku =
          name.toUpperCase().replace(/[^A-Z0-9]/g, "-") +
          "-" +
          Math.random().toString(36).substring(2, 6).toUpperCase();
      }

      // Format remaining values — cleanNumeric strips triple-quoted values like """57.79"""
      const price = parseFloat(cleanNumeric(getVal(priceIndex))) || 0.0;
      const rating = parseFloat(cleanNumeric(getVal(ratingIndex))) || 4.0;
      image = image || "/placeholder.svg";
      brand = brand || "Unknown";
      category = category || "General";
      description = description || "";

      // 5. Gather remaining columns as attributes in JSONB
      const attributes: Record<string, any> = {};
      headers.forEach((header, index) => {
        // Skip direct columns that were mapped
        const isMapped = [
          nameIndex,
          skuIndex,
          imageIndex,
          brandIndex,
          categoryIndex,
          priceIndex,
          ratingIndex,
          descriptionIndex,
          colorIndex,
          sizeIndex,
          opt1NameIndex,
          opt1ValIndex,
          opt2NameIndex,
          opt2ValIndex,
          opt3NameIndex,
          opt3ValIndex,
        ].includes(index);

        if (!isMapped && index < row.length) {
          const val = row[index].trim();
          if (val) {
            attributes[header] = val;
          }
        }
      });

      try {
        await query(
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
            description = EXCLUDED.description,
            attributes = EXCLUDED.attributes
        `,
          [name, sku, image, color, size, category, brand, price, rating, description, JSON.stringify(attributes)]
        );
        insertedCount++;
      } catch (err: any) {
        console.error(`CSV Import - Row ${r + 2} (${sku}) failed:`, err.message);
        errors.push(`Row ${r + 2} (${sku}): ${err.message}`);
      }
    }

    if (insertedCount === 0 && errors.length > 0) {
      console.error("CSV Import: 0 rows inserted. First error:", errors[0]);
    }

    return NextResponse.json({
      success: insertedCount > 0,
      totalRows: dataRows.length,
      insertedCount,
      errorCount: errors.length,
      errors: errors.slice(0, 100), // Cap returned errors
    });
  } catch (error: any) {
    console.error("CSV Import Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process CSV file" },
      { status: 500 }
    );
  }
}
