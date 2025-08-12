# Design Document

## Overview

This design outlines the systematic approach to review and update the BookPath API documentation. The current OpenAPI specification in `backend/docs/openapi.yaml` needs to be updated to accurately reflect all implemented endpoints, their parameters, responses, and authentication requirements.

## Architecture

The documentation update will follow a comprehensive audit approach:

1. **Endpoint Discovery**: Systematically identify all implemented endpoints from route files
2. **Implementation Analysis**: Examine controllers to understand actual request/response formats
3. **Schema Validation**: Cross-reference with database models for accurate data structures
4. **Documentation Update**: Update the OpenAPI specification with complete and accurate information

## Components and Interfaces

### Current Documentation Structure
- **OpenAPI Specification**: `backend/docs/openapi.yaml` - Main API documentation
- **Swagger UI**: Served at `/api-docs` endpoint for interactive documentation
- **Route Files**: Source of truth for actual endpoint implementations

### Endpoint Categories to Review

#### 1. Authentication Endpoints (`/api/v1/auth`)
**Missing from Documentation:**
- `GET /auth/csrf-token` - CSRF token generation
- `GET /auth/google` - Google OAuth initiation
- `GET /auth/google/callback` - Google OAuth callback
- `POST /auth/2fa/setup` - Two-factor authentication setup
- `POST /auth/2fa/verify` - Two-factor authentication verification
- `POST /auth/2fa/login` - Two-factor authentication login
- `POST /auth/2fa/disable` - Disable two-factor authentication
- `POST /auth/forgot-password` - Alternative password reset endpoint
- `GET /auth/validate-reset-token/:token` - Reset token validation
- `POST /auth/resend-verification` - Resend verification email (protected)
- `POST /auth/resend-verification-public` - Resend verification email (public)
- `POST /auth/refresh` - Alternative token refresh endpoint
- `POST /auth/logout/all` - Logout from all sessions

#### 2. User Management Endpoints (`/api/v1/users`)
**Missing from Documentation:**
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `PUT /users/password` - Change password
- `GET /users/preferences` - Get user preferences
- `PUT /users/preferences` - Update user preferences

#### 3. Collection Management Endpoints (`/api/v1/collections`)
**Missing from Documentation:**
- `POST /collections/:collectionId/books` - Add book to collection
- `PUT /collections/:collectionId/books/:bookId` - Update book in collection
- `DELETE /collections/:collectionId/books/:bookId` - Remove book from collection
- `GET /collections/shared/:shareableLink` - Get public shared collection

#### 4. System Endpoints
**Missing from Documentation:**
- `GET /health` - System health check
- `GET /metrics` - Prometheus metrics (admin only)
- `GET /api/chefaodacasa/cache/stats` - Cache statistics
- `POST /api/chefaodacasa/cache/reset` - Reset cache statistics

## Data Models

### Enhanced Schema Definitions Needed

#### User Profile Schema
```yaml
UserProfile:
  type: object
  properties:
    id: { type: string }
    username: { type: string }
    email: { type: string, format: email }
    role: { type: string, enum: [user, admin] }
    emailVerified: { type: boolean }
    twoFactorEnabled: { type: boolean }
    subscriptionTier: { type: string, enum: [free, pro] }
    preferences: { $ref: '#/components/schemas/UserPreferences' }
    createdAt: { type: string, format: date-time }
    updatedAt: { type: string, format: date-time }
```

#### User Preferences Schema
```yaml
UserPreferences:
  type: object
  properties:
    theme: { type: string, enum: [light, dark, auto] }
    language: { type: string, default: en }
    emailNotifications:
      type: object
      properties:
        marketing: { type: boolean }
        productUpdates: { type: boolean }
        securityAlerts: { type: boolean }
        collectionShares: { type: boolean }
```

#### Health Check Response Schema
```yaml
HealthCheckResponse:
  type: object
  properties:
    status: { type: string, enum: [ok, error] }
    timestamp: { type: string, format: date-time }
    mongodb: { type: string, enum: [connected, disconnected] }
    redis: { type: string, enum: [connected, disconnected] }
    environment: { type: string }
    uptime: { type: number }
```

#### Two-Factor Authentication Schemas
```yaml
TwoFactorSetupResponse:
  type: object
  properties:
    success: { type: boolean }
    qrCode: { type: string }
    secret: { type: string }
    backupCodes: 
      type: array
      items: { type: string }

TwoFactorVerifyRequest:
  type: object
  required: [token]
  properties:
    token: { type: string, minLength: 6, maxLength: 6 }
```

## Error Handling

### Standardized Error Response Format
All endpoints should return consistent error responses:

```yaml
ErrorResponse:
  type: object
  properties:
    success: { type: boolean, example: false }
    message: { type: string }
    error: { type: string }
    details: 
      type: object
      additionalProperties: true
    timestamp: { type: string, format: date-time }
```

### HTTP Status Code Standards
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `402` - Payment Required (subscription required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

## Testing Strategy

### Documentation Validation
1. **Schema Validation**: Ensure all request/response schemas match actual implementation
2. **Endpoint Testing**: Verify all documented endpoints are accessible and functional
3. **Authentication Testing**: Confirm authentication requirements are correctly specified
4. **Response Format Testing**: Validate actual API responses match documented schemas

### Implementation Verification
1. **Route Mapping**: Cross-reference all route definitions with documentation
2. **Controller Analysis**: Examine controller implementations for accurate parameter and response documentation
3. **Middleware Review**: Document authentication and validation middleware requirements
4. **Model Alignment**: Ensure database model schemas align with API response schemas

## Security Considerations

### Authentication Documentation
- Clearly mark public vs. protected endpoints
- Document required authentication headers
- Specify JWT token format and expiration
- Include OAuth flow documentation
- Document two-factor authentication requirements

### Rate Limiting Documentation
- Document rate limits for each endpoint category
- Specify rate limit headers returned
- Include rate limit exceeded error responses

### CORS and Security Headers
- Document allowed origins and methods
- Specify required security headers
- Include CSRF token requirements where applicable

## Migration Strategy

### Phase 1: Audit and Discovery
1. Systematically review all route files
2. Identify missing endpoints in current documentation
3. Analyze controller implementations for accurate schemas
4. Document authentication and authorization requirements

### Phase 2: Schema Updates
1. Update existing endpoint documentation with accurate schemas
2. Add missing endpoint definitions
3. Enhance error response documentation
4. Update security scheme definitions

### Phase 3: Validation and Testing
1. Validate updated documentation against actual API
2. Test all documented endpoints for accuracy
3. Verify authentication flows work as documented
4. Ensure response schemas match actual responses

### Phase 4: Enhancement and Maintenance
1. Add comprehensive examples for all endpoints
2. Include detailed parameter descriptions
3. Document business logic and validation rules
4. Establish process for keeping documentation current