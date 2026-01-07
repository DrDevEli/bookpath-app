# 🛠️ Development Guide

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- MongoDB 6+
- Redis 7+
- Git

### **Initial Setup**

```bash
# Clone the repository
git clone https://github.com/drdeveli/bookpath-app.git
cd bookpath-app

# Install dependencies
npm run install:all

# Set up databases
npm run setup:databases

# Start development servers
npm run dev
```

## 📁 **Project Structure**

```
bookpath-app/
├── 📁 frontend/          # React application
│   ├── 📁 public/        # Static assets
│   ├── 📁 src/           # Source code
│   │   ├── 📁 components/    # Reusable components
│   │   ├── 📁 pages/         # Page components
│   │   ├── 📁 hooks/         # Custom React hooks
│   │   ├── 📁 lib/           # Utility libraries
│   │   └── 📁 api/           # API integration
│   └── 📄 package.json
│
├── 📁 backend/           # Node.js API server
│   ├── 📁 src/           # Source code
│   │   ├── 📁 controllers/   # Route controllers
│   │   ├── 📁 models/        # Database models
│   │   ├── 📁 routes/        # API routes
│   │   ├── 📁 middleware/    # Custom middleware
│   │   ├── 📁 services/      # Business logic
│   │   └── 📁 config/        # Configuration
│   └── 📄 package.json
│
├── 📁 docs/              # Documentation
├── 📁 shared/            # Shared resources
├── 📁 scripts/           # Build & deployment scripts
└── 📁 config/            # Configuration files
```

## 🎯 **Development Workflow**

### **1. Starting Development Servers**

```bash
# Start both frontend and backend
npm run dev

# Start only frontend (port 3000)
npm run dev:frontend

# Start only backend (port 3001)
npm run dev:backend
```

### **2. Building for Production**

```bash
# Build both frontend and backend
npm run build

# Build only frontend
npm run build:frontend

# Build only backend
npm run build:backend
```

### **3. Testing**

```bash
# Run all tests
npm run test

# Run frontend tests only
npm run test:frontend

# Run backend tests only
npm run test:backend
```

### **4. Code Quality**

```bash
# Lint all code
npm run lint

# Format code
npm run format

# Type checking (frontend)
npm run type-check
```

## 🔧 **Configuration**

### **Environment Variables**

Create `.env` files in both `frontend/` and `backend/` directories:

#### **Backend (.env)**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/bookpath
REDIS_URL=redis://localhost:6379/0

# Server
PORT=3001
NODE_ENV=development

# Security
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# External APIs
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
OPENAI_API_KEY=your-openai-api-key
```

#### **Frontend (.env)**
```env
REACT_APP_API_BASE_URL=http://localhost:3001/api
REACT_APP_ENVIRONMENT=development
```

### **Database Setup**

```bash
# Install and configure MongoDB & Redis
npm run setup:databases

# Seed database with sample data
npm run db:seed
```

## 🧪 **Testing**

### **Frontend Testing**
- **Framework**: Jest + React Testing Library
- **Location**: `frontend/src/__tests__/`
- **Command**: `npm run test:frontend`

### **Backend Testing**
- **Framework**: Jest + Supertest
- **Location**: `backend/tests/`
- **Command**: `npm run test:backend`

### **API Testing**
```bash
# Test health endpoint
curl http://localhost:3001/health

# View API documentation
open http://localhost:3001/api-docs
```

## 📝 **Code Standards**

### **TypeScript**
- Strict mode enabled
- No `any` types allowed
- Proper interface definitions
- Generic types where appropriate

### **React Components**
- Functional components with hooks
- TypeScript interfaces for props
- Proper error boundaries
- Accessibility considerations

### **Backend Code**
- ES6+ syntax
- Async/await patterns
- Proper error handling
- Input validation
- Security middleware

### **File Naming**
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`)
- **Utilities**: camelCase (`api.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

## 🔍 **Debugging**

### **Frontend Debugging**
```bash
# Start with debugging enabled
npm run dev:frontend

# Use React DevTools browser extension
# Use browser developer tools
```

### **Backend Debugging**
```bash
# Start with debugging enabled
npm run dev:backend

# Use VS Code debugger
# Check logs in backend/logs/
```

### **Database Debugging**
```bash
# MongoDB shell
mongosh bookpath

# Redis CLI
redis-cli

# Monitor Redis
redis-cli monitor
```

## 🚀 **Deployment**

### **Development Deployment**
```bash
# Build for production
npm run build

# Start production servers
npm run start
```

### **Production Deployment**
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed production deployment instructions.

## 🐛 **Common Issues**

### **Port Conflicts**
```bash
# Check what's using port 3000
lsof -i :3000

# Check what's using port 3001
lsof -i :3001
```

### **Database Connection Issues**
```bash
# Check MongoDB status
brew services list | grep mongodb

# Check Redis status
brew services list | grep redis

# Restart services
brew services restart mongodb-community
brew services restart redis
```

### **Dependency Issues**
```bash
# Clean install
npm run clean
npm run install:all

# Clear cache
npm cache clean --force
```

## 📚 **Additional Resources**

- **[API Documentation](API.md)** - Complete API reference
- **[Database Setup](DATABASE_SETUP.md)** - Database configuration
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment
- **[Brand Guidelines](BRAND_GUIDELINES.md)** - Visual identity

## 🤝 **Contributing**

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Update documentation
6. Submit a pull request

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/drdeveli/bookpath-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/drdeveli/bookpath-app/discussions)
- **Documentation**: [docs/](docs/)

---

*Happy coding! 🚀* 