import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(request: Request) {
  try {
    const { products, message, history = [] } = await request.json().catch(() => ({}));

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "No products provided for comparison chat." }, { status: 400 });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // AI comparison constraint system prompt
    const systemPrompt = `
You are a highly helpful and concise product comparison AI assistant.
You are analyzing a set of products selected for comparison by the user.

Products in comparison:
${JSON.stringify(products, null, 2)}

Your task:
1. Answer the user's questions, analyze, and compare the selected products.
2. Compare them based on price, rating, brand, color, category, description, and custom attributes.
3. Help the user decide which is best for their needs.

CRITICAL CONSTRAINTS (RESTRICTIONS):
- You MUST only discuss the products listed above. If the user asks about unrelated topics, products, general coding, translation, math, or other general knowledge, politely refuse to answer. Say: "I am locked to comparing the selected products in this comparison session. Please ask me questions about the products currently compared."
- Refuse to perform tasks not related to these products.
- Keep your answers clean, structured, and easy to read using markdown bullets.
- Reference prices in Indian Rupees (₹).
`;

    const model = "gpt-4.1";
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10), // Limit history to last 10 messages for context
      { role: "user", content: message },
    ];

    try {
      if ((client as any).responses && typeof (client as any).responses.create === "function") {
        const response = await (client as any).responses.create({
          model: model,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text" as const,
                  text: `${systemPrompt}\n\nUser Question: ${message}`,
                },
              ],
            },
          ],
        });
        return NextResponse.json({ reply: response.output_text.trim() });
      }
    } catch (e) {
      console.warn("responses.create failed, falling back to chat completions:", e);
    }

    // Fallback to standard chat completions
    const chatResponse = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: messages as any,
    });

    return NextResponse.json({
      reply: chatResponse.choices[0].message.content || "",
    });
  } catch (error: any) {
    console.error("Compare Chat Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process chat request" }, { status: 500 });
  }
}
