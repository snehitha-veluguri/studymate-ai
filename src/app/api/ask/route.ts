
import { NextResponse } from "next/server";
import { generateGroundedAnswer } from "@/lib/ai/answer-generation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = body.question;

    if (typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid question.",
        },
        { status: 400 }
      );
    }

    if (question.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message: "Question must not exceed 2000 characters.",
        },
        { status: 400 }
      );
    }

    // Generate an answer grounded in uploaded study materials.
    const result = await generateGroundedAnswer(question.trim());

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("StudyMate AI question failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to answer your question.";

    const status = message.includes("log in") ? 401 : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status }
    );
  }
}
