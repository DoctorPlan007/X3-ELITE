import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  try {
    const { prompt, history } = await req.json();
    
    const chat = model.startChat({ 
        history: history || [],
        generationConfig: { maxOutputTokens: 2000 }
    });
    
    const result = await chat.sendMessageStream(prompt);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          controller.enqueue(encoder.encode(chunk.text()));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 
        "Content-Type": "text/event-stream",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Error en el núcleo: " + error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
