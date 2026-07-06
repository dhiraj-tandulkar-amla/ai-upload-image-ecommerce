import OpenAI from "openai";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const IMAGE_SELECT = `
  id, name, sku, brand, category, color, size, price, rating,
  CASE
    WHEN image IS NOT NULL AND image LIKE 'http%' AND LENGTH(image) > 15 THEN image
    WHEN attributes->>'image_url' IS NOT NULL AND attributes->>'image_url' LIKE 'http%' THEN attributes->>'image_url'
    ELSE '/placeholder.svg'
  END AS image
`;

/**
 * Calls the AI with the refined keyword-generation prompt.
 * Returns a plain-text 2–4 word search keyword (e.g. "Nike Running Shoes").
 * If an NLP command is provided (e.g. "make it blue"), it is appended as a refinement instruction.
 */
async function generateSearchKeyword(
  base64Image: string,
  mimeType: string,
  nlpCommand?: string
): Promise<string> {
  const basePrompt = `
You are an expert product recognition AI.

Analyze the uploaded product image and generate ONE optimized search keyword.

Rules:
- Keep the keyword concise, consistent, and search-friendly (ideally 2 to 4 words).
- Avoid descriptive adjectives or fluff (e.g. do NOT add "high pressure", "plunger", "heavy duty", "original") unless they are part of the official brand or product name.
- If the exact brand and model number/series are clearly visible, include them (e.g., "CAT Pumps 2537").
- If the exact model/series is NOT clearly visible, keep the keyword generic (e.g., "CAT Pumps" or "Giant Pumps Parts").
- Do not guess or assume details that are not visible.
- Return only the search keyword on a single line. Do not return JSON or explanations.

Examples:
CAT Pumps 2537
Nike Shoes
Giant Pumps Plug
AR North America Valve
`.trim();

  const userText = nlpCommand
    ? `${basePrompt}\n\nAdditional user instruction: "${nlpCommand}" — incorporate this into the keyword if relevant.`
    : basePrompt;

  // Primary: Azure OpenAI responses API
  const response = await (client as any).responses.create({
    model: "gpt-4.1",
    max_output_tokens: 20, // keyword is only a few words
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text" as const,
            text: userText,
          },
          {
            type: "input_image" as const,
            image_url: `data:${mimeType};base64,${base64Image}`,
            detail: "auto" as const,
          },
        ],
      },
    ],
  });

  return response.output_text.trim();
}

/**
 * Searches the products table using the keyword.
 * Splits into words and ANDs them across name, brand, category, color.
 * Falls back to OR-matching all words if the AND query returns nothing.
 */
async function searchProducts(keyword: string, limit = 4) {
  const words = keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return [];

  const andConditions = words.map((word, i) => {
    return `(LOWER(name) LIKE $${i + 1} OR LOWER(brand) LIKE $${i + 1} OR LOWER(category) LIKE $${i + 1} OR LOWER(color) LIKE $${i + 1} OR LOWER(sku) LIKE $${i + 1})`;
  });
  const params = words.map((w) => `%${w}%`);

  const andSql = `SELECT ${IMAGE_SELECT} FROM products WHERE ${andConditions.join(" AND ")} LIMIT ${limit}`;
  const andRes = await query(andSql, params);

  if (andRes.rows.length > 0) return andRes.rows;

  // Fallback: OR — return anything matching at least one word
  const orConditions = words.map((_, i) => {
    return `(LOWER(name) LIKE $${i + 1} OR LOWER(brand) LIKE $${i + 1} OR LOWER(category) LIKE $${i + 1} OR LOWER(color) LIKE $${i + 1} OR LOWER(sku) LIKE $${i + 1})`;
  });
  const orSql = `SELECT ${IMAGE_SELECT} FROM products WHERE ${orConditions.join(" OR ")} LIMIT ${limit}`;
  const orRes = await query(orSql, params);

  return orRes.rows;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let base64Image = "";
    let mimeType = "image/jpeg";
    let nlpCommand = "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      base64Image = body.image || "";
      mimeType = body.mimeType || "image/jpeg";
      nlpCommand = body.nlpCommand || "";
    } else {
      const formData = await request.formData();
      const image = formData.get("image") as File;
      nlpCommand = (formData.get("nlpCommand") as string) || "";

      if (!image) {
        return NextResponse.json({ error: "Image missing" }, { status: 400 });
      }

      mimeType = image.type || "image/jpeg";
      const bytes = await image.arrayBuffer();
      base64Image = Buffer.from(bytes).toString("base64");
    }

    if (!base64Image) {
      return NextResponse.json({ error: "Image data missing" }, { status: 400 });
    }

    // Step 1: Get keyword from AI
    const keyword = await generateSearchKeyword(base64Image, mimeType, nlpCommand);
    console.log("AI Search keyword:", keyword);

    // Step 2: Search DB with the keyword
    const products = await searchProducts(keyword);

    return NextResponse.json({
      isBundle: false,
      bundleName: "",
      products,
      extractedCriteria: [{ searchText: keyword, name: keyword }],
      imageMime: mimeType,
      imageBase64: base64Image,
    });
  } catch (error: any) {
    console.error("AI Search Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze image with AI" },
      { status: 500 }
    );
  }
}
