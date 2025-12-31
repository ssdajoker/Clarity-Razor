import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { deleteFile } from "@/lib/s3";

/**
 * POST /api/user/bulk-delete
 * Delete all user data (right to be forgotten)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        files: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { confirmDelete, deleteAccount = false } = body;

    if (!confirmDelete) {
      return NextResponse.json(
        { error: "Confirmation required" },
        { status: 400 }
      );
    }

    let deletedFiles = 0;
    let deletedTiles = 0;

    // Delete all files from S3 and database
    for (const file of user.files) {
      try {
        await deleteFile(file.cloud_storage_path);
        deletedFiles++;
      } catch (error) {
        console.error(`Error deleting file ${file.id}:`, error);
      }
    }

    // Delete all user data from database
    // Prisma cascades will handle related records
    await prisma.file.deleteMany({
      where: { userId: user.id },
    });

    deletedTiles = await prisma.tile.deleteMany({
      where: { userId: user.id },
    }).then(res => res.count);

    // Optionally delete the user account
    if (deleteAccount) {
      await prisma.user.delete({
        where: { id: user.id },
      });
    }

    return NextResponse.json({
      success: true,
      message: deleteAccount 
        ? "All data and account deleted successfully" 
        : "All data deleted successfully",
      deletedFiles,
      deletedTiles,
      accountDeleted: deleteAccount,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete data" },
      { status: 500 }
    );
  }
}
