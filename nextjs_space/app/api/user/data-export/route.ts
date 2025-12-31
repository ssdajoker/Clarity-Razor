import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

/**
 * GET /api/user/data-export
 * Export all user data (GDPR compliance)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        tiles: true,
        files: {
          include: {
            auditLogs: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare export data
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      tiles: user.tiles.map((tile) => ({
        id: tile.id,
        mode: tile.mode,
        rawInput: tile.rawInput,
        tileJson: tile.tileJson,
        tags: tile.tags,
        createdAt: tile.createdAt,
        updatedAt: tile.updatedAt,
      })),
      files: user.files.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        originalName: file.originalName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        encrypted: file.encrypted,
        deleteAfterUse: file.deleteAfterUse,
        expiresAt: file.expiresAt,
        accessCount: file.accessCount,
        lastAccessedAt: file.lastAccessedAt,
        createdAt: file.createdAt,
        auditLogs: file.auditLogs.map((log) => ({
          action: log.action,
          metadata: log.metadata,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt,
        })),
      })),
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="falchion-forge-data-export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
