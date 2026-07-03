import OpenAI from "openai";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const systemPrompt = `
You are an expert product recognition and commerce AI.
Analyze the uploaded product image and the user's NLP command (if provided) to extract search criteria.

Determine if the image represents a SINGLE product or a BUNDLE of multiple products (e.g. a combo set, a matching outfit, multiple items shown together).

If a user NLP command is provided (e.g., "make it blue", "only show Adidas", "add a cap", "size 10"), incorporate it:
- If they ask to change the color/brand/category, modify the search criteria for the product(s) accordingly.
- If they ask to add another item, treat the request as a bundle containing the original product and the new item.

You MUST respond with a valid JSON object ONLY. Do not include any explanations, markdown code blocks, or extra text.

JSON Schema:
{
  "isBundle": boolean,
  "bundleName": string, // Name of the bundle/combo if isBundle is true, otherwise empty
  "products": [
    {
      "searchText": string, // Detailed query to search in database, e.g. "Nike Red Running Shoe"
      "name": string, // Product name
      "category": string, // Category (e.g., shoe, tshirt, watch, hoodie, pants, cap)
      "color": string, // Color
      "brand": string, // Brand
      "size": string // Size if visible or requested, otherwise "N/A"
    }
  ]
}
`;

function cleanJSON(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

async function callOpenAI(base64Image: string, mimeType: string, nlpCommand?: string): Promise<string> {
  const model = "gpt-4.1";

  const userPrompt = nlpCommand
    ? `Original image is uploaded. The user has provided this NLP refinement command: "${nlpCommand}". Apply this command to refine, filter, or expand search results.`
    : `Please analyze this product image and output the structured JSON matching the system instructions.`;

  try {
    // Try custom responses API (Gemini/OpenAI assistant compatibility wrapper)
    if ((client as any).responses && typeof (client as any).responses.create === "function") {
      const response = await (client as any).responses.create({
        model: model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text" as const,
                text: `${systemPrompt}\n\n${userPrompt}`,
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
  } catch (e) {
    console.warn("Custom responses.create failed, falling back to chat.completions.create:", e);
  }

  // Fallback to standard chat completions
  const chatResponse = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userPrompt,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  return chatResponse.choices[0].message.content || "{}";
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
      const buffer = Buffer.from(bytes);
      base64Image = buffer.toString("base64");
    }

    if (!base64Image) {
      return NextResponse.json({ error: "Image data missing" }, { status: 400 });
    }

    // Call OpenAI GPT model
    const aiResponseText = await callOpenAI(base64Image, mimeType, nlpCommand);
    const cleanedText = cleanJSON(aiResponseText);
    const aiResult = JSON.parse(cleanedText);

    // Look up products in Supabase
    let matchedProducts: any[] = [];
    const isBundle = !!aiResult.isBundle;
    const bundleName = aiResult.bundleName || "";
    const extractedCriteria = aiResult.products || [];

    for (const p of extractedCriteria) {
      const searchWords = (p.searchText || p.name || "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      let sql = "SELECT * FROM products";
      let params: any[] = [];

      if (searchWords.length > 0) {
        const conditions: string[] = [];
        searchWords.forEach((word: string, index: number) => {
          params.push(`%${word}%`);
          conditions.push(`(
            LOWER(name) LIKE $${index + 1} OR 
            LOWER(brand) LIKE $${index + 1} OR 
            LOWER(category) LIKE $${index + 1} OR 
            LOWER(color) LIKE $${index + 1} OR
            LOWER(attributes::text) LIKE $${index + 1}
          )`);
        });
        sql += " WHERE " + conditions.join(" AND ");
      }

      // If it's a bundle, get the best match. Otherwise get up to 4 matches
      sql += isBundle ? " LIMIT 1" : " LIMIT 4";

      const dbRes = await query(sql, params);
      if (dbRes.rows.length > 0) {
        matchedProducts.push(...dbRes.rows);
      }
    }

    // Ensure we only return unique products in case search results overlap
    const uniqueMap = new Map();
    matchedProducts.forEach((item: any) => uniqueMap.set(item.id, item));
    const uniqueProducts = Array.from(uniqueMap.values()).slice(0, 4); // Limit to 4 products in popup

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
