import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const formData = await request.formData();

  const image = formData.get("image") as File;

  if (!image) {
    return NextResponse.json({ error: "Image missing" }, { status: 400 });
  }

  const bytes = await image.arrayBuffer();

  const base64 = Buffer.from(bytes).toString("base64");

  const response = await client.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `
Analyze this product image.

Return ONLY valid JSON.

Schema:

{
  "category":"",
  "brand":"",
  "color":""
}

If something is not visible return null.
`,
          },
          {
            type: "input_image",
            image_url: `data:${image.type};base64,${base64}`,
          },
        ],
      },
    ],
  });

  return NextResponse.json(JSON.parse(response.output_text));
}
