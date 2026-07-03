import OpenAI from "openai";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// Compact system prompt — avoid verbose explanations, just the schema
const systemPrompt =
  `You are a product recognition AI. Analyze the image and output ONLY valid JSON (no markdown, no text).\n` +
  `Schema: {"isBundle":bool,"bundleName":string,"products":[{"searchText":string,"name":string,"category":string,"color":string,"brand":string,"size":string}]}\n` +
  `Rules: isBundle=true if multiple distinct products shown. searchText = best DB search query. size="N/A" if unknown.`;

function cleanJSON(text: string): string {
  let s = text.trim();
  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  return s.trim();
}

async function callOpenAI(
  base64Image: string,
  mimeType: string,
  nlpCommand?: string
): Promise<string> {
  const userPrompt = nlpCommand
    ? `Refine based on: "${nlpCommand}"`
    : `Analyze this product image.`;

  try {
    if ((client as any).responses?.create) {
      const response = await (client as any).responses.create({
        model: "gpt-4.1",
        max_output_tokens: 200,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text" as const, text: `${systemPrompt}\n\n${userPrompt}` },
              {
                type: "input_image" as const,
                image_url: `data:${mimeType};base64,${base64Image}`,
                detail: "low" as const,   // low detail = fewer vision tokens
              },
            ],
          },
        ],
      });
      return response.output_text.trim();
    }
  } catch (e) {
    console.warn("responses.create failed, falling back:", e);
  }

  const chatResponse = await client.chat.completions.create({
    model: "gpt-4.1",
    max_tokens: 200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: "low",   // low detail = fewer vision tokens
            },
          },
        ],
      },
    ],
  });

  return chatResponse.choices[0].message.content || "{}";
}

const IMAGE_SELECT = `
  id, name, sku, brand, category, color, size, price, rating,
  CASE
    WHEN image IS NOT NULL AND image LIKE 'http%' AND LENGTH(image) > 15 THEN image
    WHEN attributes->>'image_url' IS NOT NULL AND attributes->>'image_url' LIKE 'http%' THEN attributes->>'image_url'
    ELSE '/placeholder.svg'
  END AS image
`;

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

    const aiResponseText = await callOpenAI(base64Image, mimeType, nlpCommand);
    const aiResult = JSON.parse(cleanJSON(aiResponseText));

    const isBundle = !!aiResult.isBundle;
    const bundleName = aiResult.bundleName || "";
    const extractedCriteria: any[] = aiResult.products || [];

    let matchedProducts: any[] = [];

    for (const p of extractedCriteria) {
      const searchWords = (p.searchText || p.name || "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      let sql = `SELECT ${IMAGE_SELECT} FROM products`;
      const params: any[] = [];

      if (searchWords.length > 0) {
        const conditions = searchWords.map((word: string, i: number) => {
          params.push(`%${word}%`);
          return `(LOWER(name) LIKE $${i + 1} OR LOWER(brand) LIKE $${i + 1} OR LOWER(category) LIKE $${i + 1} OR LOWER(color) LIKE $${i + 1})`;
        });
        sql += " WHERE " + conditions.join(" AND ");
      }

      sql += isBundle ? " LIMIT 1" : " LIMIT 4";

      const dbRes = await query(sql, params);
      if (dbRes.rows.length > 0) matchedProducts.push(...dbRes.rows);
    }

    const uniqueMap = new Map();
    matchedProducts.forEach((item: any) => uniqueMap.set(item.id, item));
    const uniqueProducts = Array.from(uniqueMap.values()).slice(0, 4);

    return NextResponse.json({
      isBundle,
      bundleName,
      products: uniqueProducts,
      extractedCriteria,
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
