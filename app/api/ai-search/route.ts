import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function generateSearchKeyword(file: File): Promise<string>;
export async function generateSearchKeyword(
  imageBase64: string,
  mimeType?: string,
): Promise<string>;
export async function generateSearchKeyword(
  fileOrBase64: File | string,
  mimeType: string = "image/jpeg",
): Promise<string> {
  if (typeof fileOrBase64 === "string") {
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text" as const,
              text: `
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
            `,
            },
            {
              type: "input_image" as const,
              image_url: `data:${mimeType};base64,${fileOrBase64}`,
              detail: "auto" as const,
            },
          ],
        },
      ],
    });

    return response.output_text.trim();
  } else {
    const file = fileOrBase64;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const base64 = buffer.toString("base64");

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text" as const,
              text: `
Analyze this product image and generate ONE optimized search keyword.

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
            `,
            },
            {
              type: "input_image" as const,
              image_url: `data:${file.type};base64,${base64}`,
              detail: "auto" as const,
            },
          ],
        },
      ],
    });

    return response.output_text.trim();
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "Image missing" }, { status: 400 });
    }

    const keyword = await generateSearchKeyword(image);
    return NextResponse.json({ keyword });
  } catch (error: any) {
    console.error("AI Search Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate search keyword" },
      { status: 500 },
    );
  }
}
