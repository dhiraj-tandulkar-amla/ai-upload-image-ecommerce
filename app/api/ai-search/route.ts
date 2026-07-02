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
- Include brand if identifiable.
- Include product name.
- Include model or series if visible.
- Include variant/color/storage if useful.
- Do not guess information that is not visible.
- Return only the search keyword.
- Do not return JSON.
- Do not add explanations.

Examples:
Apple iPhone 15 Pro Blue 256GB
Samsung Galaxy S24 Ultra Titanium Black
Nike Air Max 270 Black Running Shoes
Sony WH-1000XM5 Wireless Headphones
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
Analyze this product image.

Return ONLY the best search keyword.

Rules:
- Include brand if visible.
- Include product name.
- Include model if visible.
- Include variant/color/storage if useful.
- Do not explain.
- Return only one line.
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
