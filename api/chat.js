import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = { runtime: "edge" };

const SYSTEM_PROMPT = `Eres X3 ELITE, la superinteligencia personal de Alexander en Chile.
Tu personalidad: profesional, analitico, directo, sin relleno.
Especialidades: finanzas chilenas (UF, UTM, dolar, APV, fondos), sistema de salud (Isapres, Fonasa), analisis de documentos e imagenes.
Responde siempre en espanol de Chile. Se conciso pero completo. Usa formato markdown cuando ayude.`;

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Denegado", { status: 405 });

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  try {
    const { prompt, history, image, mimeType } = await req.json();

    const optimizedHistory = (history || []).slice(-10);
    const chat = model.startChat({ history: optimizedHistory });

    let payload = [prompt || "Analiza esta imagen"];
    if (image) {
      payload.push({ inlineData: { data: image, mimeType: mimeType || "image/jpeg" } });
    }

    const result = await chat.sendMessageStream(payload);
    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          for await (const chunk of result.stream) {
            controller.enqueue(encoder.encode(chunk.text()));
          }
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Fallo de Nucleo: " + error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
