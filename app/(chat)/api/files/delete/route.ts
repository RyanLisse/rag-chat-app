import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request schema
const DeleteRequestSchema = z.object({
  fileId: z.string(),
  vectorStoreId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = DeleteRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map((e) => e.message).join(", ") },
        { status: 400 },
      );
    }

    const { fileId, vectorStoreId } = validation.data;

    // Get vector store ID from request or environment
    const storeId = vectorStoreId || process.env.OPENAI_VECTORSTORE_ID;

    if (!storeId) {
      return NextResponse.json(
        { error: "Vector store not configured" },
        { status: 400 },
      );
    }

    try {
      // Delete from vector store first using del method (OpenAI API v5.8.2)
      await (openai.vectorStores.files as any).del(storeId, fileId);
    } catch (error) {
      console.log("File might not be in vector store:", error);
    }

    try {
      // Then delete the file itself using delete method
      await openai.files.delete(fileId);
    } catch (error) {
      console.log("File might already be deleted:", error);
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
