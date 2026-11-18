
import { NextResponse } from "next/server";
import { extractPdfPages } from "@/lib/ai/pdf-extractor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Please upload a PDF file." },
        { status: 400 }
      );
    }

    const pages = await extractPdfPages(file);

    return NextResponse.json({
      success: true,
      pageCount: pages.length,
      pages: pages.map((page) => ({
        pageNumber: page.pageNumber,
        textPreview: page.text.slice(0, 300),
      })),
      message: "PDF text extracted successfully!",
    });
  } catch (error) {
    console.error("PDF extraction failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "PDF extraction failed.",
      },
      { status: 500 }
    );
  }
}
