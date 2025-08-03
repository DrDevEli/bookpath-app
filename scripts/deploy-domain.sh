#!/bin/bash

# BookPath Domain Deployment Script
# This script helps you deploy your BookPath application with domain configuration

set -e

echo "🚀 BookPath Domain Deployment Script"
echo "====================================="

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your domain name"
    echo "Usage: ./scripts/deploy-domain.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1
FRONTEND_URL="https://$DOMAIN"
BACKEND_URL="https://api.$DOMAIN"

echo "📋 Domain Configuration:"
echo "   Domain: $DOMAIN"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend: $BACKEND_URL"
echo ""

# Create production environment files
echo "📝 Creating production environment files..."

# Frontend .env.production
cat > frontend/.env.production << EOF
REACT_APP_API_BASE_URL=$BACKEND_URL/api
REACT_APP_FRONTEND_URL=$FRONTEND_URL
REACT_APP_BACKEND_URL=$BACKEND_URL
EOF

# Backend .env.production
cat > backend/.env.production << EOF
NODE_ENV=production
PORT=3001
CORS_ORIGIN=$FRONTEND_URL
FRONTEND_URL=$FRONTEND_URL
EOF

echo "✅ Environment files created"
echo ""

# Update domain configuration
echo "🔧 Updating domain configuration..."

# Update frontend domain config
sed -i.bak "s|'https://yourdomain.com'|'$FRONTEND_URL'|g" frontend/src/config/domain.ts
sed -i.bak "s|'https://api.yourdomain.com'|'$BACKEND_URL'|g" frontend/src/config/domain.ts

echo "✅ Domain configuration updated"
echo ""

# Generate DNS records
echo "📋 DNS Records for Namecheap:"
echo "=============================="
echo ""
echo "For Cloud Platforms (Vercel, Netlify, etc.):"
echo "Type: A"
echo "Host: @"
echo "Value: [Your hosting provider's IP]"
echo "TTL: Automatic"
echo ""
echo "Type: CNAME"
echo "Host: www"
echo "Value: [Your hosting provider's domain]"
echo "TTL: Automatic"
echo ""
echo "For VPS/Server:"
echo "Type: A"
echo "Host: @"
echo "Value: [Your server's IP address]"
echo "TTL: Automatic"
echo ""
echo "Type: A"
echo "Host: www"
echo "Value: [Your server's IP address]"
echo "TTL: Automatic"
echo ""

# Deployment instructions
echo "🚀 Deployment Instructions:"
echo "=========================="
echo ""
echo "1. Deploy Frontend (Vercel):"
echo "   cd frontend"
echo "   vercel --prod"
echo ""
echo "2. Deploy Backend (Railway):"
echo "   cd backend"
echo "   railway login"
echo "   railway init"
echo "   railway up"
echo ""
echo "3. Configure DNS records in Namecheap (see above)"
echo ""
echo "4. Set environment variables in your hosting platform:"
echo "   Frontend:"
echo "   - REACT_APP_API_BASE_URL=$BACKEND_URL/api"
echo "   - REACT_APP_FRONTEND_URL=$FRONTEND_URL"
echo ""
echo "   Backend:"
echo "   - CORS_ORIGIN=$FRONTEND_URL"
echo "   - FRONTEND_URL=$FRONTEND_URL"
echo "   - MONGODB_URI=your_mongodb_connection_string"
echo "   - JWT_SECRET=your_jwt_secret"
echo "   - REDIS_URL=your_redis_connection_string"
echo ""

echo "✅ Setup complete! Follow the instructions above to deploy your application."
echo ""
echo "📚 For detailed instructions, see: docs/DOMAIN_SETUP.md" 