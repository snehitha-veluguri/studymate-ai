
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processDocument } from "@/lib/ai/process-document";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();

  let filePath: string | null = null;
  let materialId: string | null = null;

  try {
    // 1. Verify the logged-in student.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    // 2. Read uploaded form data.
    const formData = await request.formData();

    const file = formData.get("file");
    const title = formData.get("title");
    const materialType = formData.get("materialType");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Please select a PDF file." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, message: "Only PDF files are supported." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "PDF size must not exceed 10 MB." },
        { status: 400 }
      );
    }

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Please provide a document title." },
        { status: 400 }
      );
    }

    // 3. Create a unique file path for this student.
    const safeFileName = file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    filePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`;

    // 4. Upload the PDF to private Supabase Storage.
    const { error: uploadError } = await supabase.storage
      .from("study-materials")
      .upload(filePath, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `File upload failed: ${uploadError.message}`
      );
    }

    // 5. Create the material record in Supabase.
    const { data: material, error: materialError } =
      await supabase
        .from("materials")
        .insert({
          user_id: user.id,
          title: title.trim(),
          file_name: file.name,
          file_type: file.type,
          storage_path: filePath,
          material_type:
            typeof materialType === "string"
              ? materialType
              : "notes",
          status: "processing",
        })
        .select("id")
        .single();

    if (materialError || !material) {
      // Remove the uploaded file if database insertion fails.
      await supabase.storage
        .from("study-materials")
        .remove([filePath]);

      throw new Error(
        `Could not create material: ${
          materialError?.message ?? "Unknown error"
        }`
      );
    }

    materialId = material.id;

    // 6. Extract PDF text, create chunks,
    // generate Gemini embeddings and save them.
    try {
      const result = await processDocument({
        file,
        materialId: material.id,
      });

      // 7. Mark the material as completed.
      const { error: updateError } = await supabase
        .from("materials")
        .update({ status: "completed" })
        .eq("id", material.id)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          `Status update failed: ${updateError.message}`
        );
      }

      // 8. Return successful response.
      return NextResponse.json({
        ...result,
        materialId: material.id,
        fileName: file.name,
      });
    } catch (processingError) {
      // Mark the material as failed if processing fails.
      await supabase
        .from("materials")
        .update({ status: "failed" })
        .eq("id", material.id)
        .eq("user_id", user.id);

      throw processingError;
    }
  } catch (error) {
    console.error("Document upload failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Document upload failed.",
        materialId,
      },
      { status: 500 }
    );
  }
}
