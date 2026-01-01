# Clarity Razor 🗡️

**Transform messy input into structured Clarity Tiles using AI**

Clarity Razor is a production-ready web application that leverages advanced AI to convert unstructured user input into beautifully formatted, actionable Clarity Tiles. Built with Next.js 14, TypeScript, and enterprise-grade security features.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.7-2D3748)

## 🌟 Features

### Core Functionality
- **AI-Powered Tile Generation**: Transform messy input into structured Clarity Tiles using Abacus AI
- **Multiple Processing Modes**: Razor, Backcast, Drill, Connection Hunt, and DeepAgent Task Spec
- **Universal File Upload**: Support for PDFs, images, text files, code, CAD files, and more
- **Smart File Processing**: PDFs are parsed and analyzed, images are visually processed
- **Tile Vault**: Search, filter, and manage your historical tiles with tags
- **Export Functionality**: Export tiles as Markdown or JSON
- **Session Timer**: Track focused work sessions with the "Single Next Action" timer

### Enterprise Security (Phase 1-4 Complete)
- ✅ **Ephemeral Mode**: Auto-delete files after processing
- ✅ **Client-Side Encryption**: AES-256-GCM encryption with PBKDF2 key derivation
- ✅ **Configurable Retention**: 1 hour, 24 hours, 7 days, or never expire
- ✅ **File Integrity**: SHA-256 hashing for verification
- ✅ **GDPR Compliance**: Full audit logs, data export, and right to erasure
- ✅ **Automatic Cleanup**: Background job for expired file management

### Technical Highlights
- **Modern Stack**: Next.js 14 App Router, React 18, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with secure session management
- **Cloud Storage**: AWS S3 with presigned URLs for direct uploads
- **Real-time UI**: Framer Motion animations, Tailwind CSS
- **Type Safety**: End-to-end TypeScript with strict mode

## 🏗️ Architecture

```
clarity-razor/
├── nextjs_space/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # NextAuth endpoints
│   │   │   ├── generate-tile/ # AI tile generation
│   │   │   ├── upload/       # File upload endpoints
│   │   │   ├── cleanup/      # Expired file cleanup
│   │   │   └── user/         # GDPR compliance APIs
│   │   ├── dashboard/        # Main application UI
│   │   ├── login/            # Authentication pages
│   │   └── signup/
│   ├── components/           # React components
│   │   ├── clarity-tile.tsx  # Tile display component
│   │   ├── file-uploader.tsx # Upload with security features
│   │   ├── tile-vault.tsx    # Tile history management
│   │   └── session-timer.tsx # Focus timer
│   ├── lib/
│   │   ├── auth-options.ts   # NextAuth configuration
│   │   ├── aws-config.ts     # S3 client setup
│   │   ├── s3.ts             # S3 operations
│   │   ├── crypto-utils.ts   # Client-side encryption
│   │   ├── db.ts             # Prisma client
│   │   └── types.ts          # TypeScript definitions
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── public/               # Static assets
├── README.md
├── SECURITY.md
├── API_DOCS.md
└── .env.example
```

### Database Schema

**Users**
- Authentication and profile data
- Linked to tiles and files

**Tiles**
- Structured clarity tiles with metadata
- Contains: objective, constraints, context, tasks, risks, metrics, etc.
- Searchable by tags and content

**Files**
- Cloud storage references (S3)
- Encryption metadata and file hashes
- Retention policies and access tracking

**FileAuditLog**
- Complete audit trail of all file operations
- IP address and user agent tracking
- GDPR compliance support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- PostgreSQL 14+
- AWS S3 bucket (or compatible storage)
- Abacus AI API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ssdajoker/Clarity-Razor.git
cd clarity-razor/nextjs_space
```

2. **Install dependencies**
```bash
yarn install
```

3. **Set up environment variables**
```bash
cp ../.env.example .env
# Edit .env with your configuration
```

4. **Set up the database**
```bash
# Create PostgreSQL database
creatdb clarity_razor

# Run Prisma migrations
yarn prisma generate
yarn prisma db push

# (Optional) Seed with test user
yarn prisma db seed
```

5. **Configure AWS S3**
- Create an S3 bucket
- Set up IAM user with appropriate permissions
- Configure bucket policy for public/private access patterns
- Add credentials to `.env`

6. **Run the development server**
```bash
yarn dev
```

Visit `http://localhost:3000` to see your application.

### Default Test Credentials

After seeding the database:
- **Email**: `john@doe.com`
- **Password**: `johndoe123`

## 📖 Usage

### Creating a Clarity Tile

1. **Log in** to your account
2. **Enter your objective** - What are you trying to achieve?
3. **Add constraints** - Time, budget, resources, non-negotiables
4. **Provide context** - Dump any relevant information, links, thoughts
5. **Select a mode**:
   - **Razor**: Quick clarity extraction
   - **Backcast**: Work backwards from the goal
   - **Drill**: Deep dive analysis
   - **Connection Hunt**: Find hidden relationships
   - **DeepAgent Task Spec**: Generate detailed task specifications
6. **Upload files** (optional) - PDFs, images, documents for AI analysis
7. **Configure security**:
   - Enable ephemeral mode for auto-deletion
   - Set retention period
   - Encrypt sensitive files
8. **Generate** - AI creates your Clarity Tile

### File Security Options

**Ephemeral Mode**: Files are deleted immediately after tile generation

**Retention Periods**:
- 1 hour - Ultra-sensitive data
- 24 hours - Daily working files
- 7 days (default) - Regular files
- Never - Archive important references

**Client-Side Encryption**: Files are encrypted in your browser before upload. You must provide the password during tile generation.

### Managing Tiles

- **Search**: Find tiles by content or tags
- **Filter**: By tags or creation date
- **Export**: Download as Markdown or JSON
- **Delete**: Remove tiles and associated files

## 🔒 Security Features

See [SECURITY.md](SECURITY.md) for comprehensive security documentation.

**Highlights**:
- End-to-end encryption option with AES-256-GCM
- File integrity verification with SHA-256 hashing
- Configurable data retention policies
- Complete audit logging for compliance
- GDPR-compliant data export and deletion
- Secure session management with NextAuth.js
- Protected API routes with authentication

## 🔌 API Documentation

See [API_DOCS.md](API_DOCS.md) for complete API reference.

**Key Endpoints**:
- `POST /api/generate-tile` - Generate Clarity Tile
- `POST /api/upload/presigned` - Get upload URL
- `POST /api/upload/complete` - Complete upload
- `GET /api/tiles` - List user tiles
- `POST /api/cleanup` - Run file cleanup job
- `GET /api/user/data-export` - Export user data (GDPR)
- `POST /api/user/bulk-delete` - Delete user data (GDPR)

## 🌐 Deployment

### Environment Variables

Ensure all required environment variables are set:

```bash
DATABASE_URL=          # PostgreSQL connection string
NEXTAUTH_URL=          # Your deployed URL
NEXTAUTH_SECRET=       # Generate with: openssl rand -base64 32
AWS_BUCKET_NAME=       # S3 bucket name
AWS_FOLDER_PREFIX=     # S3 folder prefix
AWS_REGION=            # AWS region
ABACUSAI_API_KEY=      # Abacus AI API key
CLEANUP_API_KEY=       # Secure key for cleanup endpoint
```

### Production Deployment

**Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd nextjs_space
vercel
```

**Docker**
```bash
# Build image
docker build -t clarity-razor .

# Run container
docker run -p 3000:3000 --env-file .env clarity-razor
```

**Manual Deployment**
```bash
cd nextjs_space
yarn build
yarn start
```

### Post-Deployment Setup

1. **Set up automated cleanup**: Schedule a cron job to call `/api/cleanup` daily
   ```bash
   # Example cron (runs at 2 AM daily)
   0 2 * * * curl -X POST https://your-domain.com/api/cleanup \
     -H "Authorization: Bearer YOUR_CLEANUP_API_KEY"
   ```

2. **Configure AWS S3 lifecycle policies**: Auto-delete orphaned files after 30 days

3. **Set up monitoring**: Track file storage usage and cleanup job success rates

4. **Enable database backups**: Regular PostgreSQL backups

## 🧪 Testing

```bash
# Type checking
yarn tsc --noEmit

# Build test
yarn build

# Run linter
yarn lint
```

## 🛠️ Development

### Code Structure

- **API Routes**: Follow REST conventions, use appropriate HTTP methods
- **Components**: Functional components with TypeScript props
- **Styling**: Tailwind CSS utility classes
- **State Management**: React hooks (useState, useEffect)
- **Data Fetching**: Native fetch with proper error handling

### Adding New Features

1. Create new API route in `app/api/`
2. Add corresponding database models in `prisma/schema.prisma`
3. Generate Prisma client: `yarn prisma generate`
4. Update types in `lib/types.ts`
5. Create UI components in `components/`
6. Test thoroughly before committing

## 📊 Performance

- **First Load JS**: ~87KB gzipped
- **API Response Time**: <500ms average
- **File Upload**: Direct to S3 (no server bottleneck)
- **Database Queries**: Optimized with Prisma indexes

## 🐛 Known Issues & Limitations

- **File Size Limits**: 
  - Single-part upload: Up to 5GB (recommended for files ≤100MB)
  - Multipart upload: Required for files >100MB (supports up to 5TB)
- **LLM Processing**: Even with encryption, file content is visible to Abacus AI during processing
- **Browser Compatibility**: Modern browsers only (Chrome 90+, Firefox 88+, Safari 14+)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Convention

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Abacus AI** - LLM API provider
- **Next.js Team** - Amazing React framework
- **Prisma** - Type-safe ORM
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library

## 📞 Support

For questions or support:
- Open an issue on GitHub
- Check existing issues and discussions
- Review the documentation

## 🗺️ Roadmap

- [ ] Multi-language support
- [ ] Voice input for objectives
- [ ] TTS narration for Clarity Tiles
- [ ] Animated avatar for tile presentation
- [ ] Real-time collaboration on tiles
- [ ] Mobile app (React Native)
- [ ] Slack/Discord integration
- [ ] API rate limiting and usage analytics
- [ ] Advanced tile visualization options
- [ ] Export to PDF with custom templates

---

**Built with ❤️ by the Clarity Razor team**

[GitHub](https://github.com/ssdajoker/Clarity-Razor) • [Documentation](API_DOCS.md) • [Security](SECURITY.md)
