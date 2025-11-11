import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return NextResponse.json(
        { error: "Transcription service is not configured. Please set OPENAI_API_KEY." },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["audio/webm", "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];
    const fileType = file.type || "audio/webm";
    
    if (!validTypes.some(type => fileType.includes(type.split("/")[1]))) {
      console.warn(`Unsupported file type: ${fileType}, attempting transcription anyway`);
    }

    // Use OpenAI Whisper API for transcription
    // Whisper-1 supports: mp3, mp4, mpeg, mpga, m4a, wav, and webm
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en", // Optional: specify language for better accuracy
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: unknown) {
    console.error("Transcription error:", error);

    // Type-safe error handling
    const err = error as { message?: string; error?: { message?: string }; status?: number };

    // Provide more detailed error messages
    let errorMessage = "Transcription failed";
    if (err?.message) {
      errorMessage = err.message;
    } else if (err?.error?.message) {
      errorMessage = err.error.message;
    }

    // Handle specific OpenAI API errors
    if (err?.status === 401) {
      errorMessage = "Invalid OpenAI API key";
    } else if (err?.status === 429) {
      errorMessage = "Rate limit exceeded. Please try again later.";
    } else if (err?.status === 413) {
      errorMessage = "Audio file is too large. Please record a shorter message.";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: err?.status || 500 },
    );
  }
}
