# Deployment Troubleshooting Guide

## 🚨 **Common Issues and Quick Fixes**

### Issue 1: MongoDB Connection Failed

**Error**: `MongoServerSelectionError: connect ECONNREFUSED`

**Quick Fix**:
1. **Check MongoDB Atlas**:
   - Go to MongoDB Atlas dashboard
   - Verify cluster is running
   - Check Network Access (should allow from anywhere)

2. **Verify Connection String**:
   ```bash
   # Test connection string format
   mongodb+srv://username:password@cluster.xxxxx.mongodb.net/bookpath?retryWrites=true&w=majority
   ```

3. **Check Railway Environment**:
   - Go to Railway dashboard
   - Verify MONGODB_URI is set correctly
   - Restart deployment

### Issue 2: Redis Connection Failed

**Error**: `Redis connection error` or `ECONNREFUSED`

**Quick Fix**:
1. **Check Redis Cloud**:
   - Go to Redis Cloud dashboard
   - Verify database is active
   - Check endpoint and password

2. **Test Redis URL**:
   ```bash
   # Format should be:
   redis://default:password@endpoint:port
   ```

3. **Update Railway Environment**:
   - Set REDIS_URL correctly
   - Restart deployment

### Issue 3: CORS Errors

**Error**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Quick Fix**:
1. **Update Railway CORS_ORIGIN**:
   ```env
   CORS_ORIGIN=https://bookpath.eu
   ```

2. **Check Frontend API URL**:
   ```env
   REACT_APP_API_BASE_URL=https://your-railway-backend-url.railway.app/api
   ```

3. **Verify Domain Configuration**:
   - Ensure bookpath.eu is configured in Vercel
   - Check DNS settings

### Issue 4: Environment Variables Not Loading

**Error**: `undefined` values in logs

**Quick Fix**:
1. **Check Variable Names** (case-sensitive):
   ```env
   MONGODB_URI=...
   REDIS_URL=...
   CORS_ORIGIN=...
   ```

2. **Restart Railway Deployment**:
   - Go to Railway dashboard
   - Click "Deploy" to restart

3. **Verify in Logs**:
   ```javascript
   // Add this to server.js temporarily
   console.log('Environment check:', {
     MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
     REDIS_URL: process.env.REDIS_URL ? 'Set' : 'Not set',
     CORS_ORIGIN: process.env.CORS_ORIGIN
   });
   ```

### Issue 5: Frontend Can't Connect to Backend

**Error**: `Failed to fetch` or network errors

**Quick Fix**:
1. **Check Railway Backend URL**:
   - Get the correct URL from Railway dashboard
   - Update Vercel environment variables

2. **Test Backend Directly**:
   ```bash
   curl https://your-railway-backend-url.railway.app/api/health
   ```

3. **Check Browser Console**:
   - Open browser dev tools
   - Look for network errors
   - Check CORS errors

## 🔧 **Debugging Commands**

### Test MongoDB Connection
```bash
# Add to your server.js
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));
```

### Test Redis Connection
```bash
# Add to your server.js
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });
client.connect()
  .then(() => console.log('✅ Redis connected'))
  .catch(err => console.error('❌ Redis error:', err));
```

### Test API Endpoints
```bash
# Test your backend health
curl https://your-railway-backend-url.railway.app/api/health

# Test book search
curl "https://your-railway-backend-url.railway.app/api/books/search?q=harry+potter"
```

## 📊 **Monitoring Checklist**

### Railway Logs
- [ ] Check for connection messages
- [ ] Look for error messages
- [ ] Verify environment variables loaded

### MongoDB Atlas
- [ ] Cluster is running
- [ ] Database user exists
- [ ] Network access configured
- [ ] Connection string correct

### Redis Cloud
- [ ] Database is active
- [ ] Endpoint is accessible
- [ ] Password is correct
- [ ] URL format is valid

### Vercel
- [ ] Environment variables set
- [ ] Domain configured
- [ ] Deployment successful
- [ ] No build errors

## 🆘 **Emergency Fixes**

### If Backend Won't Start
1. **Check Railway logs** for specific errors
2. **Verify all environment variables** are set
3. **Restart deployment** in Railway
4. **Check MongoDB/Redis** are accessible

### If Frontend Shows Errors
1. **Check browser console** for specific errors
2. **Verify API_BASE_URL** is correct
3. **Test backend directly** with curl
4. **Check CORS settings**

### If Database Connection Fails
1. **Test connection string** locally
2. **Check MongoDB Atlas** status
3. **Verify network access** settings
4. **Create new database user** if needed

## 📞 **Getting Help**

### 1. Check Logs First
- **Railway logs**: Most specific error messages
- **Browser console**: Frontend errors
- **MongoDB Atlas**: Database status

### 2. Test Each Component
- **Backend**: Test with curl
- **Database**: Test connection string
- **Frontend**: Test in browser

### 3. Common Solutions
- **Restart deployments** (Railway/Vercel)
- **Check environment variables** (case-sensitive)
- **Verify connection strings** (format)
- **Update CORS settings** (domain)

### 4. Contact Support
- **Railway**: For backend issues
- **Vercel**: For frontend issues
- **MongoDB Atlas**: For database issues
- **Redis Cloud**: For Redis issues

---

**Remember**: Most issues are related to environment variables or connection strings. Double-check these first! 