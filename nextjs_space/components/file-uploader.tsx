"use client";

import { useCallback, useState } from "react";
import { Upload, X, File, FileText, Image, FileCode, FileArchive, Shield, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { UploadedFile } from "@/lib/types";
import { hashFile, encryptFile } from "@/lib/crypto-utils";

interface FileUploaderProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  onEncryptionPasswordChange?: (password: string) => void;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4" />;
  if (mimeType.startsWith("text/")) return <FileText className="h-4 w-4" />;
  if (mimeType.includes("pdf")) return <FileText className="h-4 w-4" />;
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("python") ||
    mimeType.includes("java") ||
    mimeType.includes("code")
  )
    return <FileCode className="h-4 w-4" />;
  if (mimeType.includes("zip") || mimeType.includes("archive"))
    return <FileArchive className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

export function FileUploader({
  onFilesUploaded,
  uploadedFiles,
  onRemoveFile,
  onEncryptionPasswordChange,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Security options
  const [deleteAfterUse, setDeleteAfterUse] = useState(false);
  const [encryptFiles, setEncryptFiles] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState("");
  const [retentionPeriod, setRetentionPeriod] = useState("7d"); // 1h, 24h, 7d, never
  
  // Notify parent when encryption password changes
  const handleEncryptionPasswordChange = (password: string) => {
    setEncryptionPassword(password);
    onEncryptionPasswordChange?.(password);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFiles = async (files: FileList) => {
    // Validate encryption settings
    if (encryptFiles && !encryptionPassword) {
      toast.error("Please enter an encryption password");
      return;
    }

    setUploading(true);
    const uploadedFilesList: UploadedFile[] = [];

    try {
      for (const file of Array.from(files)) {
        // Calculate file hash
        const fileHash = await hashFile(file);
        
        // Prepare file for upload (encrypt if needed)
        let fileToUpload: File | Blob = file;
        let encryptionMetadata: { salt?: string; iv?: string } = {};
        
        if (encryptFiles && encryptionPassword) {
          toast.info(`Encrypting ${file.name}...`);
          const { encryptedBlob, salt, iv } = await encryptFile(file, encryptionPassword);
          fileToUpload = encryptedBlob;
          encryptionMetadata = { salt, iv };
        }

        // Get presigned URL
        const presignedRes = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            isPublic: false,
          }),
        });

        if (!presignedRes.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadUrl, cloud_storage_path } = await presignedRes.json();

        // Upload to S3
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: fileToUpload,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file");
        }

        // Calculate expiry time based on retention period
        let expiresAt = null;
        if (retentionPeriod !== "never") {
          const now = new Date();
          if (retentionPeriod === "1h") {
            expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
          } else if (retentionPeriod === "24h") {
            expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          } else if (retentionPeriod === "7d") {
            expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          }
        }

        // Complete upload with security metadata
        const completeRes = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cloud_storage_path,
            fileName: file.name,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
            isPublic: false,
            fileHash,
            encrypted: encryptFiles,
            encryptionKey: encryptFiles ? JSON.stringify(encryptionMetadata) : null,
            deleteAfterUse,
            expiresAt: expiresAt?.toISOString(),
          }),
        });

        if (!completeRes.ok) {
          throw new Error("Failed to complete upload");
        }

        const { file: uploadedFile } = await completeRes.json();
        uploadedFilesList.push(uploadedFile);
      }

      onFilesUploaded(uploadedFilesList);
      
      const securityMsg = deleteAfterUse 
        ? " (will be deleted after processing)" 
        : encryptFiles 
        ? " (encrypted)" 
        : "";
      toast.success(`${uploadedFilesList.length} file(s) uploaded successfully${securityMsg}`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        uploadFiles(files);
      }
    },
    []
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Security Options */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-blue-700" />
          <h3 className="text-sm font-semibold text-blue-900">Security Options</h3>
        </div>
        
        <div className="space-y-3">
          {/* Delete After Use */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteAfterUse}
              onChange={(e) => setDeleteAfterUse(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">
                🔒 Delete after processing (Recommended)
              </div>
              <div className="text-xs text-gray-600">
                Files will be permanently deleted immediately after tile generation
              </div>
            </div>
          </label>

          {/* Retention Period */}
          {!deleteAfterUse && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Clock className="h-4 w-4" />
                Auto-delete after:
              </label>
              <select
                value={retentionPeriod}
                onChange={(e) => setRetentionPeriod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1h">1 hour</option>
                <option value="24h">24 hours</option>
                <option value="7d">7 days (default)</option>
                <option value="never">Never (keep permanently)</option>
              </select>
            </div>
          )}

          {/* Encryption */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={encryptFiles}
                onChange={(e) => setEncryptFiles(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  🔐 Encrypt files (Advanced)
                </div>
                <div className="text-xs text-gray-600">
                  Files will be encrypted with AES-256 before upload
                </div>
              </div>
            </label>
            
            {encryptFiles && (
              <input
                type="password"
                value={encryptionPassword}
                onChange={(e) => handleEncryptionPasswordChange(e.target.value)}
                placeholder="Enter encryption password"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
        </div>
      </Card>

      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          <Upload
            className={`mx-auto h-12 w-12 mb-4 ${
              isDragging ? "text-blue-500" : "text-gray-400"
            }`}
          />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Supports PDFs, text files, code, images, CAD files, and more
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
            disabled={uploading}
          />
          <label htmlFor="file-input">
            <Button disabled={uploading} asChild>
              <span>{uploading ? "Uploading..." : "Browse Files"}</span>
            </Button>
          </label>
        </div>
      </Card>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            Uploaded Files ({uploadedFiles.length})
          </h3>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="text-gray-500">{getFileIcon(file.mimeType)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.fileSize)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFile(file.id)}
                    className="ml-2 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
