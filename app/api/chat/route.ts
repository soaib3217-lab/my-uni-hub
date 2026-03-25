import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize on the server
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json();
    
   const model = genAI.getGenerativeModel(
  { model: "gemini-3.1-flash-lite-preview" },
  { apiVersion: "v1beta" } 
);
    
    // Construct the prompt with context (if available)
    let prompt = message;
    if (context) {
       prompt = `I am asking about a document titled "${context}". Please answer my question based on general knowledge about this topic. Question: ${message}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}