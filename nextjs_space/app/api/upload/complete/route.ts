import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// POST /api/upload/complete
// Record uploaded file in database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      cloud_storage_path,
      fileName,
      originalName,
      fileSize,
      mimeType,
      isPublic = false,
      tileId = null,
    } = body;

    if (!cloud_storage_path || !fileName || !originalName || !mimeType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const file = await prisma.file.create({
      data: {
        userId: user.id,
        tileId,
        fileName,
        originalName,
        fileSize: parseInt(fileSize) || 0,
        mimeType,
        cloud_storage_path,
        isPublic,
      },
    });

    return NextResponse.json({ file });
  } catch (error) {
    console.error("Error completing upload:", error);
    return NextResponse.json(
      { error: "Failed to complete upload" },
      { status: 500 }
    );
  }
}
