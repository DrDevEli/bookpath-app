#!/bin/bash

# BookPath Production Setup Script
# This script helps you configure production environment variables

set -e

echo "🚀 BookPath Production Setup"
echo "============================"
echo ""

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your domain name"
    echo "Usage: ./scripts/setup-production.sh bookpath.eu"
    exit 1
fi

DOMAIN=$1
FRONTEND_URL="https://$DOMAIN"
BACKEND_URL="https://api.$DOMAIN"

echo "📋 Production Configuration:"
echo "   Domain: $DOMAIN"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend: $BACKEND_URL"
echo ""

echo "🔧 Railway Environment Variables"
echo "================================"
echo ""
echo "Add these variables to your Railway backend service:"
echo ""

cat << EOF
# Database Configuration
MONGODB_URI=mongodb+srv://bookpath_user:your_password@cluster0.xxxxx.mongodb.net/bookpath?retryWrites=true&w=majority

# Redis Configuration
REDIS_URL=redis://default:your_password@redis-xxxxx.c123.us-east-1-1.ec2.cloud.redislabs.com:12345

# Server Configuration
NODE_ENV=production
PORT=3001

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=$FRONTEND_URL
FRONTEND_URL=$FRONTEND_URL

# API Keys (if you have them)
GOOGLE_BOOKS_API_KEY=your_google_books_api_key
BOOKLOOKER_API_KEY=your_booklooker_api_key
AMAZON_ASSOCIATES_TAG=your_amazon_tag

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
EMAIL_FROM=noreply@$DOMAIN

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
EOF

echo ""
echo "🔧 Vercel Environment Variables"
echo "==============================="
echo ""
echo "Add these variables to your Vercel frontend project:"
echo ""

cat << EOF
REACT_APP_API_BASE_URL=https://your-railway-backend-url.railway.app/api
REACT_APP_FRONTEND_URL=$FRONTEND_URL
REACT_APP_BACKEND_URL=https://your-railway-backend-url.railway.app
EOF

echo ""
echo "📋 Setup Instructions"
echo "===================="
echo ""
echo "1. Set up MongoDB Atlas:"
echo "   - Go to https://www.mongodb.com/atlas"
echo "   - Create free cluster"
echo "   - Configure database user"
echo "   - Get connection string"
echo ""
echo "2. Set up Redis Cloud:"
echo "   - Go to https://redis.com/try-free/"
echo "   - Create free database"
echo "   - Get connection URL"
echo ""
echo "3. Configure Railway:"
echo "   - Go to https://railway.app/"
echo "   - Select your backend service"
echo "   - Go to Variables tab"
echo "   - Add the environment variables above"
echo ""
echo "4. Configure Vercel:"
echo "   - Go to your Vercel dashboard"
echo "   - Select your frontend project"
echo "   - Go to Settings → Environment Variables"
echo "   - Add the frontend variables above"
echo ""
echo "5. Update your Railway backend URL in Vercel variables"
echo ""
echo "6. Deploy and test:"
echo "   - Push changes to GitHub"
echo "   - Check Railway logs"
echo "   - Test at https://$DOMAIN"
echo ""

echo "✅ Setup instructions complete!"
echo ""
echo "📚 For detailed instructions, see: docs/RAILWAY_DEPLOYMENT_GUIDE.md" 