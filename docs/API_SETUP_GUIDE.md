# API Setup Guide for BookPath

This guide will help you configure Google Books API and Booklooker API for your BookPath application.

## 🚀 Quick Start

Run the automated setup script:
```bash
./scripts/setup-api-keys.sh
```

## 📋 Prerequisites

- Google Cloud account (for Google Books API)
- Booklooker account (for Booklooker API)
- Access to your BookPath project

## 🔍 Google Books API Setup

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select an existing one
3. **Note your Project ID** (you'll need this later)

### Step 2: Enable Google Books API

1. **Navigate to APIs & Services**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Books API"
   - Click on "Google Books API"
   - Click "Enable"

### Step 3: Create API Key

1. **Go to Credentials**:
   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

### Step 4: Secure Your API Key (Recommended)

1. **Restrict the API Key**:
   - Click on the API key you just created
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domain(s): `yourdomain.com/*`
   - Under "API restrictions", select "Restrict key"
   - Select "Google Books API" from the list
   - Click "Save"

### Step 5: Test Google Books API

You can test your API key with this curl command:
```bash
curl "https://www.googleapis.com/books/v1/volumes?q=harry+potter&key=YOUR_API_KEY"
```

## 📚 Booklooker API Setup

### Step 1: Register for API Access

1. **Go to Booklooker**: https://www.booklooker.de/
2. **Contact their support** for API access
3. **Provide your use case** and request API credentials
4. **Wait for approval** and API key

### Alternative: Check Documentation

1. **Look for developer documentation** on their website
2. **Check if they have a public API** or partner program
3. **Follow their registration process**

### Step 2: Test Booklooker API

Once you have your API key, test it with:
```bash
curl "https://api.booklooker.de/search?q=harry+potter&key=YOUR_API_KEY"
```

## 🛒 Amazon Associates Setup (Optional)

### Step 1: Sign Up for Amazon Associates

1. **Go to Amazon Associates**: https://affiliate-program.amazon.com/
2. **Create an account** and complete the registration
3. **Get your affiliate tag** from your dashboard

### Step 2: Configure Affiliate Links

The affiliate tag will be used to generate Amazon purchase links for books.

## 🔧 Manual Configuration

If you prefer to configure manually instead of using the script:

### Step 1: Create Environment File

```bash
cp backend/env.example backend/.env
```

### Step 2: Edit Environment Variables

Edit `backend/.env` and update these lines:

```env
# Google Books API
GOOGLE_BOOKS_API_KEY=your_actual_google_books_api_key

# Booklooker API
BOOKLOOKER_API_KEY=your_actual_booklooker_api_key

# Amazon Associates (Optional)
AMAZON_ASSOCIATES_TAG=your_amazon_associates_tag
```

## 🧪 Testing Your Configuration

### Step 1: Restart Your Server

```bash
npm run dev
```

### Step 2: Test API Integration

1. **Search for books** in your application
2. **Check server logs** for API responses
3. **Look for these log messages**:
   - "Google Books search completed successfully"
   - "Booklooker search completed successfully"

### Step 3: Verify Results

You should see:
- ✅ No "API key not configured" warnings
- ✅ Successful API responses in logs
- ✅ More search results from multiple sources

## 🚨 Troubleshooting

### Google Books API Issues

| Issue | Solution |
|-------|----------|
| "API key not configured" | Check GOOGLE_BOOKS_API_KEY in .env |
| "Invalid API key" | Verify your API key is correct |
| "Quota exceeded" | Check your Google Cloud quotas |
| "403 Forbidden" | Ensure Google Books API is enabled |

### Booklooker API Issues

| Issue | Solution |
|-------|----------|
| "API key not configured" | Check BOOKLOOKER_API_KEY in .env |
| "401 Unauthorized" | Verify your API key is correct |
| "Rate limit exceeded" | Wait and try again later |
| "Cannot connect" | Check if their API is available |

### General Issues

| Issue | Solution |
|-------|----------|
| Environment variables not loading | Restart your server |
| API calls failing | Check your internet connection |
| No search results | Verify API keys are working |

## 📊 API Limits and Quotas

### Google Books API
- **Free tier**: 1,000 requests per day
- **Paid tier**: $5 per 1,000 requests
- **Rate limit**: 1,000 requests per 100 seconds per user

### Booklooker API
- **Contact Booklooker** for specific limits
- **May have daily/monthly quotas**
- **Rate limiting may apply**

## 🔒 Security Best Practices

### API Key Security
1. **Never commit API keys** to version control
2. **Use environment variables** for all API keys
3. **Restrict API keys** to specific domains/IPs
4. **Rotate API keys** regularly

### Production Deployment
1. **Use different API keys** for production
2. **Set up monitoring** for API usage
3. **Implement rate limiting** in your application
4. **Monitor for unusual activity**

## 📚 Additional Resources

### Google Books API
- [Official Documentation](https://developers.google.com/books/docs/v1/using)
- [API Reference](https://developers.google.com/books/docs/v1/reference)
- [Quotas and Pricing](https://developers.google.com/books/docs/v1/using#quota)

### Booklooker
- [Official Website](https://www.booklooker.de/)
- [Contact Support](https://www.booklooker.de/contact)

### Amazon Associates
- [Official Program](https://affiliate-program.amazon.com/)
- [Getting Started Guide](https://affiliate-program.amazon.com/help/getting-started)

## 🆘 Support

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Verify your API keys** are correct
3. **Test API endpoints** directly with curl
4. **Check server logs** for detailed error messages
5. **Contact the respective API providers** for support

## 🎯 Next Steps

After configuring your APIs:

1. **Test your application** thoroughly
2. **Monitor API usage** and costs
3. **Set up alerts** for quota limits
4. **Consider implementing caching** to reduce API calls
5. **Plan for production deployment**

---

**Remember**: Keep your API keys secure and never share them publicly! 