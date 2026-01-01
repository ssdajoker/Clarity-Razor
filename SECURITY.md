# Security Documentation

## Overview

Clarity Razor implements enterprise-grade security features across four phases, providing comprehensive protection for user data and files.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Phase 1: Ephemeral Mode](#phase-1-ephemeral-mode)
3. [Phase 2: Automatic Expiry](#phase-2-automatic-expiry)
4. [Phase 3: Client-Side Encryption](#phase-3-client-side-encryption)
5. [Phase 4: GDPR Compliance](#phase-4-gdpr-compliance)
6. [Authentication & Authorization](#authentication--authorization)
7. [API Security](#api-security)
8. [Best Practices](#best-practices)
9. [Threat Model](#threat-model)
10. [Reporting Security Issues](#reporting-security-issues)

---

## Security Architecture

```
┌────────────────────────────────┐
│         User Browser             │
│                                  │
│  ┌────────────────────────┐  │
│  │ Client-Side Encryption │  │
│  │ (AES-256-GCM + PBKDF2) │  │
│  └────────────────────────┘  │
│           │                      │
└───────────├───────────────────┘
             │ HTTPS
             │
┌────────────├───────────────────┐
│            │                    │
│   ┌────────┴────────┐           │
│   │ Next.js Server  │           │
│   │ (Auth + APIs)   │           │
│   └────────┬────────┘           │
│            │                    │
│   ┌────────┼────────┐           │
│   │         │         │           │
│   │    PostgreSQL   │           │
│   │  (Audit Logs)  │           │
│   │                 │           │
│   └─────────────────┘           │
│                                  │
└───────────────┬───────────────┘
               │ Presigned URLs
               │
      ┌────────┴────────┐
      │     AWS S3      │
      │ (Encrypted at  │
      │  Rest Storage) │
      └─────────────────┘
```

---

## Phase 1: Ephemeral Mode

### Overview
Ephemeral mode provides temporary file storage that is automatically deleted after tile generation.

### How It Works

1. User checks "Delete after processing" when uploading files
2. File is uploaded to S3 with `deleteAfterUse: true` flag
3. After tile generation completes, files are immediately:
   - Deleted from S3 storage
   - Removed from database records
   - Logged in audit trail

### Use Cases

- **Highly Sensitive Documents**: Financial statements, contracts, medical records
- **Temporary Analysis**: One-time data processing
- **Compliance Requirements**: Data minimization policies
- **Zero-Retention Scenarios**: Competitive intelligence, confidential research

### Implementation

**Frontend (file-uploader.tsx)**:
```typescript
const [deleteAfterUse, setDeleteAfterUse] = useState(false);

// Passed to upload API
const fileMetadata = {
  deleteAfterUse: deleteAfterUse,
  // ... other metadata
};
```

**Backend (generate-tile API)**:
```typescript
if (file.deleteAfterUse) {
  await deleteFile(file.cloud_storage_path);
  await prisma.file.delete({ where: { id: file.id } });
  await prisma.fileAuditLog.create({
    data: {
      fileId: file.id,
      userId: session.user.id,
      action: 'DELETE',
      metadata: { reason: 'ephemeral_mode' },
    },
  });
}
```

### Security Guarantees

✅ Files never persist beyond processing  
✅ Zero storage footprint after tile generation  
✅ Audit trail maintained even after deletion  
✅ No recovery possible after deletion  

---

## Phase 2: Automatic Expiry

### Overview
Configurable retention periods with automatic cleanup of expired files.

### Retention Periods

| Period | Use Case | Expiry |
|--------|----------|--------|
| **1 Hour** | Ultra-sensitive temporary files | 60 minutes |
| **24 Hours** | Daily working files | 1 day |
| **7 Days** (Default) | Standard files | 1 week |
| **Never** | Archive/reference files | No expiry |

### Cleanup Job

**Endpoint**: `POST /api/cleanup`

**Authorization**: Requires `CLEANUP_API_KEY` in Authorization header

**Functionality**:
- Identifies files with `expiresAt < current_time`
- Deletes from S3 and database
- Creates audit log entries
- Returns statistics

**Scheduling**: Run via cron job (recommended: daily at 2 AM)

```bash
# Cron example
0 2 * * * curl -X POST https://your-domain.com/api/cleanup \
  -H "Authorization: Bearer YOUR_CLEANUP_API_KEY"
```

### Response Format

```json
{
  "success": true,
  "stats": {
    "filesProcessed": 42,
    "filesDeleted": 38,
    "filesFailed": 4,
    "bytesFreed": 15728640
  }
}
```

### Database Schema

```prisma
model File {
  // ...
  expiresAt DateTime?
  // ...
}
```

---

## Phase 3: Client-Side Encryption

### Overview
End-to-end encryption with AES-256-GCM, ensuring files are encrypted before leaving the user's browser.

### Cryptographic Specifications

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: 16 bytes (randomly generated)
- **IV**: 12 bytes (randomly generated)
- **Hash Algorithm**: SHA-256 for file integrity

### Encryption Flow

```
1. User selects file and enters password
   ↓
2. Browser generates random salt (16 bytes)
   ↓
3. PBKDF2 derives encryption key from password
   (100,000 iterations, SHA-256)
   ↓
4. File is encrypted with AES-256-GCM
   (random 12-byte IV)
   ↓
5. Encrypted blob + metadata uploaded to S3
   ↓
6. Database stores: encrypted=true, salt, IV, fileHash
   ↓
7. Server decrypts during processing (requires password)
   ↓
8. Processed tile returned to user
```

### Implementation

**Client-Side (crypto-utils.ts)**:

```typescript
export async function encryptFile(
  file: File,
  password: string
): Promise<EncryptedFileData> {
  const fileBuffer = await file.arrayBuffer();
  
  // Generate salt and derive key
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  
  // Generate IV and encrypt
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBuffer
  );
  
  // Calculate file hash for integrity
  const fileHash = await hashFile(fileBuffer);
  
  return {
    encryptedBlob: new Blob([encryptedData]),
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    fileHash,
  };
}
```

**Server-Side Decryption (generate-tile API)**:

```typescript
if (file.encrypted && encryptionPassword) {
  const decryptedBuffer = await decryptFileBuffer(
    fileBuffer,
    encryptionPassword,
    file.encryptionKey // Contains salt + IV
  );
  // Process decrypted content
}
```

### File Integrity Verification

- SHA-256 hash computed before encryption
- Stored in database for verification
- Checked after decryption to ensure no corruption

### Security Properties

✅ **Zero-Knowledge**: Server never sees encryption passwords  
✅ **At-Rest Protection**: Files encrypted in S3  
✅ **Integrity Verification**: SHA-256 hashing prevents tampering  
✅ **Forward Secrecy**: Unique IV per file  
⚠️ **LLM Processing**: Decrypted server-side during AI processing  

---

## Phase 4: GDPR Compliance

### Overview
Full compliance with GDPR Articles 15 (Right to Access) and 17 (Right to Erasure).

### Audit Logging (Article 30)

**FileAuditLog Model**:
```prisma
model FileAuditLog {
  id        String   @id @default(cuid())
  fileId    String
  userId    String
  action    String   // UPLOAD, ACCESS, DELETE
  metadata  Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
}
```

**Logged Actions**:
- 📤 **UPLOAD**: File uploaded, with size and type
- 👁️ **ACCESS**: File accessed/downloaded, with purpose
- 🗑️ **DELETE**: File deleted, with reason (manual/expired/ephemeral)

### Data Export (Article 15)

**Endpoint**: `GET /api/user/data-export`

**Returns**: Complete user data package in JSON format

**Includes**:
- User profile information
- All tiles with metadata
- File references (not file contents)
- Complete audit log history
- Account creation and last login dates

**Example Response**:
```json
{
  "exportedAt": "2025-12-31T23:30:00Z",
  "user": {
    "id": "user_abc123",
    "email": "john@doe.com",
    "name": "John Doe",
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "tiles": [
    {
      "id": "tile_xyz789",
      "objective": "Launch product",
      "createdAt": "2025-12-15T10:30:00Z",
      "tags": ["product", "launch"]
    }
  ],
  "files": [
    {
      "id": "file_def456",
      "fileName": "requirements.pdf",
      "uploadedAt": "2025-12-15T10:25:00Z",
      "encrypted": true,
      "deleted": false
    }
  ],
  "auditLogs": [
    {
      "action": "UPLOAD",
      "timestamp": "2025-12-15T10:25:00Z",
      "details": "File uploaded"
    }
  ]
}
```

### Right to Erasure (Article 17)

**Endpoint**: `POST /api/user/bulk-delete`

**Request Body**:
```json
{
  "deleteFiles": true,
  "deleteTiles": true,
  "deleteAccount": false,  // Optional
  "confirmation": "DELETE_MY_DATA"
}
```

**Process**:
1. Verify user authentication
2. Validate confirmation string
3. Delete all user files from S3
4. Delete database records (tiles, files, audit logs)
5. Optionally delete user account
6. Return deletion summary

**Response**:
```json
{
  "success": true,
  "deletedFiles": 15,
  "deletedTiles": 23,
  "accountDeleted": false
}
```

### Data Retention Policy

| Data Type | Default Retention | Notes |
|-----------|------------------|-------|
| **Tiles** | Indefinite | User can delete anytime |
| **Files** | 7 days (configurable) | Auto-cleanup available |
| **Audit Logs** | 90 days | Compliance requirement |
| **User Accounts** | Until deleted | GDPR Article 17 |

---

## Authentication & Authorization

### NextAuth.js Implementation

**Session Management**:
- JWT-based sessions
- Secure httpOnly cookies
- CSRF protection enabled
- Session expiry: 30 days

**Password Security**:
- Bcrypt hashing (10 rounds)
- No plaintext password storage
- Password reset via email (if configured)

**Protected Routes**:
```typescript
// Middleware protection
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/api/tiles/:path*"]
};
```

**API Route Protection**:
```typescript
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## API Security

### Rate Limiting

⚠️ **TODO**: Implement rate limiting for production

**Recommended**:
- 10 requests/minute for tile generation
- 100 requests/minute for file uploads
- 1000 requests/minute for read operations

### Input Validation

- All API inputs validated with TypeScript types
- File size limits enforced (5GB single-part, 5TB multipart)
- File type validation based on MIME type
- SQL injection protection via Prisma parameterized queries

### CORS Configuration

```typescript
// Restricted to same-origin by default
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL,
  'Access-Control-Allow-Methods': 'GET, POST, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

---

## Best Practices

### For Users

1. ✅ **Use ephemeral mode** for highly sensitive files
2. ✅ **Enable encryption** for confidential documents
3. ✅ **Set appropriate retention periods** based on data sensitivity
4. ✅ **Use strong passwords** for encrypted files (12+ characters)
5. ✅ **Regular data exports** for backup purposes
6. ✅ **Review audit logs** periodically

### For Administrators

1. ✅ **Rotate NEXTAUTH_SECRET** annually
2. ✅ **Monitor cleanup job** success rates
3. ✅ **Set up S3 lifecycle policies** for orphaned files
4. ✅ **Enable database encryption at rest**
5. ✅ **Regular security audits** of access patterns
6. ✅ **Keep dependencies updated** (Dependabot recommended)

### For Developers

1. ✅ **Never log passwords** or encryption keys
2. ✅ **Use environment variables** for all secrets
3. ✅ **Validate all user inputs** server-side
4. ✅ **Implement proper error handling** (avoid info leaks)
5. ✅ **Follow principle of least privilege** for API access
6. ✅ **Audit log all sensitive operations**

---

## Threat Model

### Protected Against

✅ **Data Breaches**: Files encrypted at rest  
✅ **Unauthorized Access**: Authentication required  
✅ **Man-in-the-Middle**: HTTPS enforced  
✅ **Data Retention**: Automatic expiry and cleanup  
✅ **Account Takeover**: Secure session management  
✅ **SQL Injection**: Parameterized queries via Prisma  
✅ **CSRF**: NextAuth.js CSRF protection  

### Not Protected Against

⚠️ **LLM Data Exposure**: Files decrypted server-side for processing  
⚠️ **Compromised Admin Account**: Full access to all data  
⚠️ **Database Compromise**: Encrypted files still in S3, but metadata exposed  
⚠️ **Forgotten Encryption Password**: No recovery mechanism  
⚠️ **S3 Bucket Misconfiguration**: Public exposure if bucket policy incorrect  

---

## Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead:
1. Email security concerns to: [security@clarity-razor.com]
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. Allow 90 days for patching before public disclosure

**Bug Bounty**: Not currently available

---

## Security Checklist

### Pre-Deployment

- [ ] All environment variables set securely
- [ ] NEXTAUTH_SECRET generated with strong entropy
- [ ] CLEANUP_API_KEY configured
- [ ] S3 bucket policy reviewed and tested
- [ ] Database connection uses SSL
- [ ] HTTPS/TLS certificates configured
- [ ] CORS policies restrictive
- [ ] Error messages don't leak sensitive info

### Post-Deployment

- [ ] Automated cleanup job scheduled
- [ ] Monitoring and alerting configured
- [ ] Regular database backups enabled
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Dependency scanning enabled (Dependabot)
- [ ] Penetration testing completed
- [ ] Incident response plan documented

---

## Compliance Matrix

| Requirement | Feature | Status |
|-------------|---------|--------|
| **GDPR Article 15** | Data export API | ✅ Complete |
| **GDPR Article 17** | Right to erasure | ✅ Complete |
| **GDPR Article 30** | Audit logging | ✅ Complete |
| **GDPR Article 32** | Encryption at rest | ✅ Complete |
| **GDPR Article 32** | Access controls | ✅ Complete |
| **HIPAA** | Not certified | ❌ N/A |
| **SOC 2** | Not certified | ❌ N/A |

---

**Last Updated**: December 31, 2025  
**Version**: 1.0  
**Maintained By**: Clarity Razor Security Team
