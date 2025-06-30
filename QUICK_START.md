# 🚀 RAG Chat App - Quick Start Guide

## Prerequisites
- [Bun](https://bun.sh/) installed (recommended) or Node.js 18+
- Git

## Quick Setup

### 1. Install Dependencies
```bash
make setup
# OR manually:
# bun install
# cp .env.local.example .env.local
```

### 2. Configure Environment
Edit `.env.local` with your API keys:
```bash
# Required for RAG functionality
OPENAI_API_KEY=your-openai-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here  
GOOGLE_API_KEY=your-google-key-here

# Optional - for vector store (create at OpenAI)
OPENAI_VECTORSTORE_ID=vs_your_vector_store_id

# App configuration  
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start Development Server
```bash
make dev
# OR manually:
# bun run dev
```

The app will be available at **http://localhost:3000**

## ✅ Working Features

- **Multi-Model Chat**: Switch between OpenAI, Anthropic, and Google models
- **File Upload**: Upload documents for RAG conversations  
- **Citation System**: Interactive citations with source highlighting
- **Responsive Design**: Works on desktop and mobile
- **OpenTelemetry**: Basic monitoring and logging
- **Mock Database**: Runs locally without PostgreSQL dependency
- **Guest Authentication**: Works without complex auth setup

## 🛠️ Available Commands

```bash
make help          # Show all available commands
make dev           # Start development server  
make test          # Run tests
make build         # Build for production
make lint          # Check code quality
make clean         # Clean up everything
```

## 🔧 Troubleshooting

### Port Already in Use
```bash
make kill-ports    # Kill processes on development ports
```

### Dependencies Issues
```bash
make clean         # Clean everything
make setup         # Reinstall dependencies
```

### Missing API Keys
- Make sure `.env.local` exists and contains your API keys
- Get OpenAI API key from: https://platform.openai.com/api-keys
- Get Anthropic API key from: https://console.anthropic.com/
- Get Google API key from: https://console.cloud.google.com/

## 🎯 Next Steps

1. **Configure Vector Store**: Create an OpenAI vector store for document upload
2. **Add Sentry**: Re-enable error tracking for production  
3. **Deploy**: Use Vercel, Railway, or Docker for deployment
4. **Customize**: Modify prompts, UI, and add new features

## 📚 Documentation

- [Development Setup](./docs/DEVELOPMENT_SETUP.md)
- [Architecture Overview](./IMPLEMENTATION_SUMMARY.md)
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)

---

**Status**: ✅ Working with basic OpenTelemetry monitoring  
**Last Updated**: June 2025