import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (2MB max)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: 2MB, received: ${(file.size / (1024 * 1024)).toFixed(2)}MB` },
        { status: 413 }
      );
    }

    // Validate file type by extension or MIME type
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isValidExtension = validExtensions.includes(ext);
    const isValidMimeType = file.type.startsWith('image/') || file.type === '';
    
    if (!isValidExtension && !isValidMimeType) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (PNG, JPG, WebP, GIF) are allowed' },
        { status: 400 }
      );
    }

    // Create filename with tenant prefix
    const timestamp = Date.now();
    const filename = `${tenantId}/${type}/${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("products")
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("products")
      .getPublicUrl(filename);

    return NextResponse.json({
      success: true,
      filename: uploadData.path,
      url: publicUrl.publicUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: errorMessage,
        details: "Logo upload failed. Check that tenant-uploads bucket exists in Supabase Storage and is public."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    // Try to get fileUrl from query params first (safer for DELETE)
    const url = new URL(request.url);
    let fileUrl = url.searchParams.get("fileUrl");

    // If not in query params, try to parse from body
    if (!fileUrl) {
      try {
        const body = await request.json();
        fileUrl = body?.fileUrl;
      } catch (parseError) {
        // Body parsing failed, that's ok - we'll error if fileUrl still missing
      }
    }

    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json({ 
        error: "No file URL provided or invalid format",
      }, { status: 400 });
    }

    // Extract file path from URL
    let filePath: string = "";
    
    try {
      const urlObj = new URL(fileUrl);
      const pathname = urlObj.pathname;
      
      // Extract path after /public/
      if (pathname.includes('/public/')) {
        const publicIndex = pathname.indexOf('/public/');
        filePath = pathname.substring(publicIndex + 8); // 8 = length of '/public/'
      } else {
        return NextResponse.json({ error: "Invalid URL format: missing /public/" }, { status: 400 });
      }
    } catch (urlError) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Delete file from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from("products")
      .remove([filePath]);

    if (deleteError) {
      return NextResponse.json({ 
        success: false,
        message: "Delete failed",
        error: deleteError?.message,
        filePath,
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "File deleted successfully",
      filePath,
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      success: false
    }, { status: 500 });
  }
}
