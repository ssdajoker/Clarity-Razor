import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFile } from "@/lib/s3";

/**
 * POST /api/cleanup
 * Clean up expired files from database and S3
 * This should be called periodically (e.g., via cron job)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header for basic security
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CLEANUP_API_KEY || "your-secret-cleanup-key";
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    
    // Find all files that have expired
    const expiredFiles = await prisma.file.findMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });

    console.log(`Found ${expiredFiles.length} expired file(s) to delete`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const file of expiredFiles) {
      try {
        // Delete from S3
        await deleteFile(file.cloud_storage_path);
        
        // Create audit log
        await prisma.fileAuditLog.create({
          data: {
            fileId: file.id,
            userId: file.userId,
            action: "DELETE",
            metadata: { 
              reason: "automatic_expiry",
              expiresAt: file.expiresAt,
            },
            ipAddress: "system",
            userAgent: "cleanup-job",
          },
        });
        
        // Delete from database
        await prisma.file.delete({ where: { id: file.id } });
        
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting file ${file.id}:`, error);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed`,
      deleted: deletedCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cleanup
 * Get statistics about files pending cleanup
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    
    // Count expired files
    const expiredCount = await prisma.file.count({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });
    
    // Count files expiring soon (within 24 hours)
    const expiringSoonCount = await prisma.file.count({
      where: {
        expiresAt: {
          gt: now,
          lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    
    // Total files
    const totalFiles = await prisma.file.count();
    
    // Files set to never expire
    const neverExpire = await prisma.file.count({
      where: {
        expiresAt: null,
      },
    });

    return NextResponse.json({
      expired: expiredCount,
      expiringSoon: expiringSoonCount,
      total: totalFiles,
      neverExpire,
    });
  } catch (error) {
    console.error("Cleanup stats error:", error);
    return NextResponse.json(
      { error: "Failed to get cleanup stats" },
      { status: 500 }
    );
  }
}
