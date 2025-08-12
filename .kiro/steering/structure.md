# BookPath Project Structure

## Root Level Organization
```
bookpath-app/
├── backend/          # Node.js API server
├── frontend/         # React TypeScript app
├── shared/           # Shared types and constants
├── docs/             # Project documentation
├── scripts/          # Deployment and setup scripts
├── config/           # Global configuration
└── logs/             # Application logs
```

## Backend Structure (`backend/`)
```
backend/
├── src/
│   ├── config/       # Configuration files (database, passport, logger, redis)
│   ├── controllers/  # Route handlers and business logic
│   ├── middleware/   # Express middleware (auth, validation, security)
│   ├── models/       # Mongoose schemas and models
│   ├── routes/       # Express route definitions
│   ├── services/     # External API integrations and business services
│   ├── shared/       # Shared backend utilities
│   └── utils/        # Helper functions and utilities
├── tests/            # Test files
├── docs/             # API documentation (OpenAPI)
├── data/             # Seed data and fixtures
├── logs/             # Application logs
└── scripts/          # Backend-specific scripts
```

## Frontend Structure (`frontend/`)
```
frontend/
├── src/
│   ├── components/   # Reusable React components
│   │   ├── ui/       # Base UI components (shadcn/ui)
│   │   └── layout/   # Layout components
│   ├── pages/        # Page components (route handlers)
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility libraries
│   ├── config/       # Frontend configuration
│   └── types/        # TypeScript type definitions
├── public/           # Static assets
└── build/            # Production build output
```

## Shared Structure (`shared/`)
```
shared/
├── types/            # TypeScript interfaces and types
├── constants/        # Shared constants and enums
└── utils/            # Cross-platform utilities
```

## Key File Conventions

### Backend Files
- **Controllers**: Handle HTTP requests, delegate to services
- **Services**: Business logic and external API calls
- **Models**: Database schemas with validation
- **Middleware**: Reusable request processing logic
- **Routes**: API endpoint definitions with validation
- **Utils**: Helper functions and utilities

### Frontend Files
- **Pages**: Top-level route components
- **Components**: Reusable UI components
- **Hooks**: Custom React hooks for state and effects
- **Types**: TypeScript definitions for API responses

### Configuration Files
- **Environment**: `.env` files for configuration
- **Database**: Connection and schema configuration
- **Authentication**: Passport strategies and JWT config
- **Logging**: Winston logger configuration
- **Security**: Helmet, CORS, and rate limiting setup

## Naming Conventions
- **Files**: camelCase for JavaScript/TypeScript files
- **Components**: PascalCase for React components
- **Routes**: kebab-case for API endpoints
- **Database**: camelCase for fields, PascalCase for models
- **Constants**: UPPER_SNAKE_CASE for constants

## Import/Export Patterns
- **ES Modules**: Use import/export syntax throughout
- **Default Exports**: For single-purpose modules
- **Named Exports**: For utilities and multiple exports
- **Index Files**: For clean imports from directories

## API Structure
- **Versioned**: `/api/v1/` prefix for all endpoints
- **RESTful**: Standard HTTP methods and status codes
- **Grouped**: Routes organized by resource (auth, books, users, etc.)
- **Documented**: OpenAPI specification in `backend/docs/`

## Testing Organization
- **Backend**: Tests in `backend/tests/` directory
- **Frontend**: Tests co-located with components
- **Integration**: API endpoint testing with Supertest
- **Unit**: Component and utility function testing