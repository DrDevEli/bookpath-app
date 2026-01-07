# Railway Deployment Fix Guide for BookPath

This guide will help you fix the MongoDB and Redis connection issues on Railway and get your app fully running at bookpath.eu.

## 🎯 **Overview of the Problem**

When deploying to Railway, your backend needs:
1. **MongoDB Atlas** (cloud database) instead of local MongoDB
2. **Redis Cloud** (cloud Redis) instead of local Redis
3. **Proper environment variables** configured in Railway
4. **CORS settings** updated for your domain

## 📋 **Step 1: Set Up MongoDB Atlas**

### 1.1 Create MongoDB Atlas Account
1. **Go to**: https://www.mongodb.com/atlas
2. **Sign up** for a free account
3. **Create a new project** called "BookPath"

### 1.2 Create Database Cluster
1. **Click "Build a Database"**
2. **Choose "FREE" tier** (M0)
3. **Select your preferred region** (closest to your users)
4. **Click "Create"**

### 1.3 Configure Database Access
1. **Go to "Database Access"** in the left sidebar
2. **Click "Add New Database User"**
3. **Choose "Password" authentication**
4. **Create a username and password** (save these!)
5. **Select "Read and write to any database"**
6. **Click "Add User"**

### 1.4 Configure Network Access
1. **Go to "Network Access"** in the left sidebar
2. **Click "Add IP Address"**
3. **Click "Allow Access from Anywhere"** (for Railway)
4. **Click "Confirm"**

### 1.5 Get Connection String
1. **Go to "Database"** in the left sidebar
2. **Click "Connect"** on your cluster
3. **Choose "Connect your application"**
4. **Copy the connection string**
5. **Replace `<password>` with your actual password**

**Example connection string:**
```
mongodb+srv://bookpath_user:your_password@cluster0.xxxxx.mongodb.net/bookpath?retryWrites=true&w=majority
```

## 📋 **Step 2: Set Up Redis Cloud**

### 2.1 Create Redis Cloud Account
1. **Go to**: https://redis.com/try-free/
2. **Sign up** for a free account
3. **Create a new subscription**

### 2.2 Create Database
1. **Click "Create Database"**
2. **Choose "FREE" tier**
3. **Select your region** (same as MongoDB)
4. **Click "Create Database"**

### 2.3 Get Connection Details
1. **Click on your database**
2. **Go to "Configuration"**
3. **Copy the endpoint and port**
4. **Note the password**

**Example Redis URL:**
```
redis://default:your_password@redis-xxxxx.c123.us-east-1-1.ec2.cloud.redislabs.com:12345
```

## 📋 **Step 3: Configure Railway Environment Variables**

### 3.1 Access Railway Dashboard
1. **Go to**: https://railway.app/
2. **Select your BookPath project**
3. **Go to your backend service**

### 3.2 Add Environment Variables
Click "Variables" tab and add these variables:

```env
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
CORS_ORIGIN=https://bookpath.eu
FRONTEND_URL=https://bookpath.eu

# API Keys (if you have them)
GOOGLE_BOOKS_API_KEY=your_google_books_api_key
BOOKLOOKER_API_KEY=your_booklooker_api_key
AMAZON_ASSOCIATES_TAG=your_amazon_tag

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
EMAIL_FROM=noreply@bookpath.eu

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## 📋 **Step 4: Update Backend CORS Settings**

### 4.1 Check Current CORS Configuration
Look at your `backend/server.js` file. It should have CORS configured like this:

```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 4.2 Update for Production
Make sure your CORS settings allow your domain:

```javascript
const corsOptions = {
  origin: [
    'https://bookpath.eu',
    'https://www.bookpath.eu',
    process.env.CORS_ORIGIN || 'http://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

## 📋 **Step 5: Configure Frontend Environment**

### 5.1 Update Vercel Environment Variables
1. **Go to your Vercel dashboard**
2. **Select your BookPath project**
3. **Go to "Settings" → "Environment Variables"**
4. **Add these variables:**

```env
REACT_APP_API_BASE_URL=https://your-railway-backend-url.railway.app/api
REACT_APP_FRONTEND_URL=https://bookpath.eu
REACT_APP_BACKEND_URL=https://your-railway-backend-url.railway.app
```

### 5.2 Get Your Railway Backend URL
1. **Go to Railway dashboard**
2. **Click on your backend service**
3. **Copy the generated URL** (e.g., `https://bookpath-backend-production.up.railway.app`)

## 📋 **Step 6: Test the Connections**

### 6.1 Test MongoDB Connection
Add this to your backend to test MongoDB:

```javascript
// In your server.js or database.js
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });
```

### 6.2 Test Redis Connection
Add this to test Redis:

```javascript
// In your redis.js or server.js
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});

client.connect()
  .then(() => {
    console.log('✅ Connected to Redis Cloud');
  })
  .catch((error) => {
    console.error('❌ Redis connection error:', error);
  });
```

## 📋 **Step 7: Deploy and Test**

### 7.1 Deploy Backend to Railway
1. **Push your changes to GitHub**
2. **Railway will automatically deploy**
3. **Check the logs** for connection status

### 7.2 Deploy Frontend to Vercel
1. **Push your changes to GitHub**
2. **Vercel will automatically deploy**
3. **Check the deployment logs**

### 7.3 Test Your Application
1. **Visit**: https://bookpath.eu
2. **Test book search functionality**
3. **Test user registration/login**
4. **Check browser console** for errors

## 🚨 **Common Issues and Solutions**

### Issue 1: MongoDB Connection Failed
**Symptoms**: `MongoServerSelectionError: connect ECONNREFUSED`
**Solutions**:
- Check your MongoDB Atlas IP whitelist
- Verify connection string format
- Ensure database user has correct permissions

### Issue 2: Redis Connection Failed
**Symptoms**: `Redis connection error`
**Solutions**:
- Check Redis Cloud endpoint
- Verify password in connection string
- Ensure Redis database is active

### Issue 3: CORS Errors
**Symptoms**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
**Solutions**:
- Update CORS_ORIGIN in Railway
- Check frontend API_BASE_URL
- Verify domain configuration

### Issue 4: Environment Variables Not Loading
**Symptoms**: `undefined` values in logs
**Solutions**:
- Restart Railway deployment
- Check variable names (case-sensitive)
- Verify variable values

## 🔧 **Debugging Commands**

### Check Railway Logs
```bash
# In Railway dashboard, check the logs tab
# Look for connection messages
```

### Test API Endpoints
```bash
# Test your backend directly
curl https://your-railway-backend-url.railway.app/api/health
```

### Check Environment Variables
```bash
# Add this to your server.js temporarily
console.log('Environment variables:', {
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
  REDIS_URL: process.env.REDIS_URL ? 'Set' : 'Not set',
  CORS_ORIGIN: process.env.CORS_ORIGIN
});
```

## 📊 **Monitoring and Maintenance**

### 1. Set Up Monitoring
- **MongoDB Atlas**: Monitor database performance
- **Redis Cloud**: Monitor memory usage
- **Railway**: Monitor service logs
- **Vercel**: Monitor frontend performance

### 2. Regular Maintenance
- **Update dependencies** regularly
- **Monitor API usage** and costs
- **Backup database** periodically
- **Check logs** for errors

## 🎯 **Final Checklist**

- [ ] MongoDB Atlas cluster created and configured
- [ ] Redis Cloud database created and configured
- [ ] Railway environment variables set
- [ ] Vercel environment variables set
- [ ] CORS settings updated
- [ ] Backend deployed and running
- [ ] Frontend deployed and running
- [ ] Domain configured (bookpath.eu)
- [ ] All functionality tested
- [ ] Error monitoring set up

## 🆘 **Need Help?**

If you encounter issues:
1. **Check Railway logs** for specific error messages
2. **Verify environment variables** are correctly set
3. **Test connections** using the debugging commands
4. **Check MongoDB Atlas** and **Redis Cloud** dashboards
5. **Contact support** if needed

---

**Remember**: Keep your connection strings and API keys secure and never commit them to version control! 