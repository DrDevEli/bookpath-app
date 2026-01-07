#!/bin/bash

# BookPath API Keys Setup Script
# This script helps you configure Google Books and Booklooker API keys

set -e

echo "🔑 BookPath API Keys Setup"
echo "=========================="
echo ""

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating .env file from template..."
    cp backend/env.example backend/.env
    echo "✅ .env file created"
    echo ""
fi

echo "📋 API Keys Configuration"
echo "========================="
echo ""

# Google Books API
echo "🔍 Google Books API Setup:"
echo "1. Go to: https://console.cloud.google.com/"
echo "2. Create a new project or select existing one"
echo "3. Enable Google Books API:"
echo "   - Go to 'APIs & Services' → 'Library'"
echo "   - Search for 'Google Books API'"
echo "   - Click 'Enable'"
echo "4. Create API Key:"
echo "   - Go to 'APIs & Services' → 'Credentials'"
echo "   - Click 'Create Credentials' → 'API Key'"
echo "   - Copy the API key"
echo ""

read -p "Enter your Google Books API key (or press Enter to skip): " GOOGLE_API_KEY

if [ ! -z "$GOOGLE_API_KEY" ]; then
    # Update .env file with Google API key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/GOOGLE_BOOKS_API_KEY=.*/GOOGLE_BOOKS_API_KEY=$GOOGLE_API_KEY/" backend/.env
    else
        # Linux
        sed -i "s/GOOGLE_BOOKS_API_KEY=.*/GOOGLE_BOOKS_API_KEY=$GOOGLE_API_KEY/" backend/.env
    fi
    echo "✅ Google Books API key configured"
else
    echo "⏭️  Skipping Google Books API key"
fi

echo ""

# Booklooker API
echo "📚 Booklooker API Setup:"
echo "1. Go to: https://www.booklooker.de/"
echo "2. Register for API access:"
echo "   - Contact their support for API access"
echo "   - Or check their developer documentation"
echo "   - Get your API key"
echo ""

read -p "Enter your Booklooker API key (or press Enter to skip): " BOOKLOOKER_API_KEY

if [ ! -z "$BOOKLOOKER_API_KEY" ]; then
    # Update .env file with Booklooker API key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/BOOKLOOKER_API_KEY=.*/BOOKLOOKER_API_KEY=$BOOKLOOKER_API_KEY/" backend/.env
    else
        # Linux
        sed -i "s/BOOKLOOKER_API_KEY=.*/BOOKLOOKER_API_KEY=$BOOKLOOKER_API_KEY/" backend/.env
    fi
    echo "✅ Booklooker API key configured"
else
    echo "⏭️  Skipping Booklooker API key"
fi

echo ""

# Amazon Associates (Optional)
echo "🛒 Amazon Associates Setup (Optional):"
echo "1. Go to: https://affiliate-program.amazon.com/"
echo "2. Sign up for Amazon Associates"
echo "3. Get your affiliate tag"
echo ""

read -p "Enter your Amazon Associates tag (or press Enter to skip): " AMAZON_TAG

if [ ! -z "$AMAZON_TAG" ]; then
    # Update .env file with Amazon Associates tag
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/AMAZON_ASSOCIATES_TAG=.*/AMAZON_ASSOCIATES_TAG=$AMAZON_TAG/" backend/.env
    else
        # Linux
        sed -i "s/AMAZON_ASSOCIATES_TAG=.*/AMAZON_ASSOCIATES_TAG=$AMAZON_TAG/" backend/.env
    fi
    echo "✅ Amazon Associates tag configured"
else
    echo "⏭️  Skipping Amazon Associates tag"
fi

echo ""

# Test configuration
echo "🧪 Testing API Configuration"
echo "============================"

# Check if API keys are set
GOOGLE_KEY_SET=$(grep "GOOGLE_BOOKS_API_KEY=" backend/.env | cut -d'=' -f2)
BOOKLOOKER_KEY_SET=$(grep "BOOKLOOKER_API_KEY=" backend/.env | cut -d'=' -f2)

echo "Google Books API: $([ "$GOOGLE_KEY_SET" != "your_google_books_api_key_here" ] && echo "✅ Configured" || echo "❌ Not configured")"
echo "Booklooker API: $([ "$BOOKLOOKER_KEY_SET" != "your_booklooker_api_key_here" ] && echo "✅ Configured" || echo "❌ Not configured")"

echo ""

# Instructions for testing
echo "🚀 Next Steps:"
echo "=============="
echo ""
echo "1. Restart your development server:"
echo "   npm run dev"
echo ""
echo "2. Test the APIs by searching for books in your application"
echo ""
echo "3. Check the server logs for API responses"
echo ""
echo "4. If you see errors, verify your API keys are correct"
echo ""

echo "✅ API configuration complete!"
echo ""
echo "📚 For more information, see:"
echo "   - Google Books API: https://developers.google.com/books/docs/v1/using"
echo "   - Booklooker API: Contact their support"
echo "   - Amazon Associates: https://affiliate-program.amazon.com/" 