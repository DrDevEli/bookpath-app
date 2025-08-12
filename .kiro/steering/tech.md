# BookPath Technology Stack

## Architecture
- **Monorepo Structure**: Frontend and backend in separate directories
- **API-First Design**: RESTful API with OpenAPI documentation
- **Microservices Ready**: Modular service architecture

## Backend Stack
- **Runtime**: Node.js 18+ with ES modules
- **Framework**: Express.js with middleware-based architecture
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis for session storage and API caching
- **Authentication**: Passport.js with JWT strategy
- **Validation**: Joi for request validation
- **Logging**: Winston with structured logging
- **Testing**: Jest with Supertest for API testing
- **Security**: Helmet, CORS, rate limiting, input sanitization

## Frontend Stack
- **Framework**: React 19+ with TypeScript
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios with custom API layer
- **Build Tool**: Create React App with CRACO
- **Testing**: React Testing Library with Jest

## Development Tools
- **Linting**: ESLint with flat config (backend), React app config (frontend)
- **Formatting**: Prettier for code formatting
- **Documentation**: OpenAPI/Swagger with Redoc
- **Process Management**: Concurrently for parallel dev servers
- **Environment**: dotenv for configuration management

## Common Commands

### Development
```bash
# Start both frontend and backend
npm run dev

# Start individual services
npm run dev:backend
npm run dev:frontend

# Install all dependencies
npm run install:all
```

### Testing
```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only  
npm run test:frontend
```

### Building
```bash
# Build for production
npm run build

# Build individual parts
npm run build:frontend
npm run build:backend
```

### Database & Seeding
```bash
# Setup databases
npm run setup:databases

# Seed initial data
npm run db:seed
```

### Documentation
```bash
# Generate API docs
cd backend && npm run docs:build

# Preview API docs
cd backend && npm run docs:preview

# Generate TypeScript types
cd backend && npm run docs:types
```

### Linting & Formatting
```bash
# Lint all code
npm run lint

# Format all code
npm run format

# Type checking (frontend)
npm run type-check
```

## Code Style Conventions
- **ES Modules**: Use import/export syntax
- **Async/Await**: Prefer over promises and callbacks
- **Error Handling**: Consistent error responses with proper HTTP codes
- **Logging**: Structured logging with context
- **Validation**: Server-side validation for all inputs
- **Security**: Authentication required for protected routes