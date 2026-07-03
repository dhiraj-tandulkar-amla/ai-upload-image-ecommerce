import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

/** Strip heavy fields before sending to AI — attributes can contain 200+ variation ASINs */
function slim(product: any) {
  return {
    name: product.name,
    brand: product.brand,
    category: product.category,
    color: product.color,
    size: product.size,
    price: product.price,
    rating: product.rating,
    description: product.description
      ? String(product.description).slice(0, 200)
      : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const { products, message, history = [] } = await request.json().catch(() => ({}));

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "No products provided." }, { status: 400 });
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const slimProducts = products.map(slim);

    const systemPrompt =
      `You are a product comparison assistant. Only discuss the products below. ` +
      `Refuse off-topic questions politely. Be concise, use bullet points. Prices in ₹.\n\n` +
      `Products:\n${JSON.stringify(slimProducts)}`;

    // Keep only last 4 messages (2 exchanges) to save tokens
    const trimmedHistory = history.slice(-4);

    const messages = [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
      { role: "user", content: message },
    ];

    try {
      if ((client as any).responses?.create) {
        const response = await (client as any).responses.create({
          model: "gpt-4.1",
          max_output_tokens: 350,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text" as const,
                  text: `${systemPrompt}\n\nUser: ${message}`,
                },
              ],
            },
          ],
        });
        return NextResponse.json({ reply: response.output_text.trim() });
      }
    } catch (e) {
      console.warn("responses.create failed, falling back:", e);
    }

    const chatResponse = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: messages as any,
      max_tokens: 350,
    });

    return NextResponse.json({
      reply: chatResponse.choices[0].message.content || "",
    });
  } catch (error: any) {
    console.error("Compare Chat Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat request" },
      { status: 500 }
    );
  }
}
