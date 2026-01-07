# Domain Setup Guide for BookPath

This guide will help you configure your Namecheap domain to work with your BookPath application.

## Prerequisites

- A Namecheap domain
- Deployed application (frontend + backend)
- Access to Namecheap domain management

## Step 1: Deploy Your Application

### Option A: Deploy to Vercel (Frontend) + Railway (Backend)

#### Frontend (Vercel)
1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy frontend:**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Configure environment variables in Vercel:**
   - `REACT_APP_API_BASE_URL`: Your backend URL
   - `REACT_APP_FRONTEND_URL`: Your frontend URL

#### Backend (Railway)
1. **Deploy to Railway:**
   ```bash
   cd backend
   railway login
   railway init
   railway up
   ```

2. **Configure environment variables in Railway:**
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Your JWT secret
   - `REDIS_URL`: Your Redis connection string
   - `CORS_ORIGIN`: Your frontend domain

### Option B: Deploy to a VPS

1. **Set up a VPS** (DigitalOcean, AWS, etc.)
2. **Install Node.js, MongoDB, Redis**
3. **Deploy your application**
4. **Set up Nginx as reverse proxy**

## Step 2: Configure DNS Records in Namecheap

### For Cloud Platforms (Vercel, Netlify, etc.)

1. **Log into Namecheap** and go to your domain management
2. **Navigate to "Domain List"** → Click "Manage" on your domain
3. **Go to "Advanced DNS"** tab
4. **Add these records:**

```
Type: A
Host: @
Value: [Your hosting provider's IP]
TTL: Automatic

Type: CNAME
Host: www
Value: [Your hosting provider's domain]
TTL: Automatic
```

### For VPS/Server

```
Type: A
Host: @
Value: [Your server's IP address]
TTL: Automatic

Type: A
Host: www
Value: [Your server's IP address]
TTL: Automatic
```

## Step 3: Environment Configuration

### Frontend Environment Variables

Create `.env.production` in your frontend directory:

```env
REACT_APP_API_BASE_URL=https://api.yourdomain.com/api
REACT_APP_FRONTEND_URL=https://yourdomain.com
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

### Backend Environment Variables

Create `.env.production` in your backend directory:

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_URL=your_redis_connection_string
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

## Step 4: SSL Certificate Setup

### For Cloud Platforms
Most cloud platforms (Vercel, Netlify, Railway) provide SSL certificates automatically.

### For VPS
1. **Install Certbot:**
   ```bash
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Get SSL certificate:**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

## Step 5: Update Application Configuration

### Update CORS Settings

In your backend `server.js`:

```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### Update Frontend Configuration

The domain configuration is already set up in `frontend/src/config/domain.ts`.

## Step 6: Test Your Setup

1. **Test DNS propagation:**
   ```bash
   nslookup yourdomain.com
   ```

2. **Test SSL certificate:**
   - Visit `https://yourdomain.com`
   - Check for the padlock icon

3. **Test API endpoints:**
   - Frontend should load correctly
   - API calls should work without CORS errors

## Common Issues and Solutions

### Issue: CORS Errors
**Solution:** Ensure your backend CORS configuration includes your frontend domain.

### Issue: SSL Certificate Not Working
**Solution:** 
- Wait for DNS propagation (up to 48 hours)
- Check if your hosting provider supports SSL
- Verify DNS records are correct

### Issue: Domain Not Loading
**Solution:**
- Check DNS propagation: `nslookup yourdomain.com`
- Verify DNS records in Namecheap
- Check if your hosting provider is working

## Monitoring and Maintenance

1. **Set up monitoring** for your application
2. **Regular backups** of your database
3. **Monitor SSL certificate** expiration
4. **Keep dependencies** updated

## Support

If you encounter issues:
1. Check the logs in your hosting platform
2. Verify DNS records are correct
3. Test with a simple HTML file first
4. Contact your hosting provider's support

## Example Configuration

### For domain: `bookpath.com`

**DNS Records:**
```
Type: A
Host: @
Value: 76.76.19.19
TTL: Automatic

Type: CNAME
Host: www
Value: bookpath.com
TTL: Automatic
```

**Environment Variables:**
```env
# Frontend
REACT_APP_API_BASE_URL=https://api.bookpath.com/api
REACT_APP_FRONTEND_URL=https://bookpath.com

# Backend
CORS_ORIGIN=https://bookpath.com
FRONTEND_URL=https://bookpath.com
```

This setup will give you a fully functional domain for your BookPath application! 