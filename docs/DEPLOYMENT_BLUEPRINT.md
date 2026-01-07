# 🚀 BookPath Deployment Blueprint

**Complete deployment guide for BookPath application to production**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Infrastructure Requirements](#infrastructure-requirements)
4. [Pre-Deployment Checklist](#pre-deployment-checklist)
5. [Step-by-Step Deployment](#step-by-step-deployment)
6. [Environment Variables](#environment-variables)
7. [Domain Configuration](#domain-configuration)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## 📖 Project Overview

**BookPath** is a full-stack book discovery platform with:
- **Backend**: Node.js/Express API with MongoDB and Redis
- **Frontend**: React/TypeScript SPA
- **Features**: Book search, collections, user authentication, affiliate links
- **APIs**: Google Books, Open Library, Amazon Associates

### Tech Stack

**Backend:**
- Node.js 18+
- Express.js
- MongoDB (Mongoose)
- Redis (ioredis)
- JWT Authentication
- Swagger/OpenAPI

**Frontend:**
- React 19
- TypeScript
- Tailwind CSS
- React Router
- Axios

---

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Backend      │
│   (Vercel)      │────────▶│   (Railway)     │
│  bookpath.eu    │  HTTPS  │  api.bookpath.eu│
└─────────────────┘         └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
            ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
            │   MongoDB    │ │    Redis    │ │   External  │
            │    Atlas     │ │    Cloud    │ │     APIs    │
            └─────────────┘ └─────────────┘ └─────────────┘
```

### Data Flow

1. **User Request** → Frontend (Vercel)
2. **API Call** → Backend (Railway)
3. **Database Query** → MongoDB Atlas
4. **Cache Check** → Redis Cloud
5. **External APIs** → Google Books, Open Library
6. **Response** → Frontend → User

---

## 🛠️ Infrastructure Requirements

### Required Services

1. **MongoDB Atlas** (Free tier: M0)
   - Database for users, books, collections
   - Connection string required

2. **Redis Cloud** (Free tier)
   - Caching and rate limiting
   - Connection URL required

3. **Railway** (Backend hosting)
   - Node.js runtime
   - Custom domain: `api.bookpath.eu`

4. **Vercel** (Frontend hosting)
   - React build
   - Custom domain: `bookpath.eu`

5. **Domain Provider** (e.g., Namecheap, Cloudflare)
   - Domain: `bookpath.eu`
   - DNS configuration

### Optional Services

- **Google Books API** (Free, optional key for higher limits)
- **Amazon Associates** (Affiliate program)
- **Email Service** (SMTP for verification emails)

---

## ✅ Pre-Deployment Checklist

### Code Readiness

- [ ] All dependencies installed (`npm install` in both frontend and backend)
- [ ] No linting errors (`npm run lint`)
- [ ] Tests passing (if applicable)
- [ ] Environment variables documented
- [ ] `.gitignore` properly configured
- [ ] No sensitive data in code
- [ ] Build scripts working (`npm run build`)

### Backend Readiness

- [ ] `server.js` configured correctly
- [ ] Database models complete
- [ ] API routes working
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Health check endpoint working (`/health`)

### Frontend Readiness

- [ ] Build succeeds (`npm run build`)
- [ ] API configuration correct
- [ ] Environment variables set
- [ ] Routes working
- [ ] Error boundaries implemented

---

## 🚀 Step-by-Step Deployment

### Phase 1: Database Setup

#### 1.1 MongoDB Atlas Setup

1. **Create Account**
   - Go to https://www.mongodb.com/atlas
   - Sign up for free account

2. **Create Cluster**
   - Click "Build a Database"
   - Choose **FREE (M0)** tier
   - Select region (closest to users)
   - Click "Create"

3. **Configure Database Access**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create username and password (save securely!)
   - Select "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" → Click "Connect"
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password
   - Replace `<dbname>` with `bookpath`

   **Example:**
   ```
   mongodb+srv://bookpath_user:your_password@cluster0.xxxxx.mongodb.net/bookpath?retryWrites=true&w=majority
   ```

#### 1.2 Redis Cloud Setup

1. **Create Account**
   - Go to https://redis.com/try-free/
   - Sign up for free account

2. **Create Database**
   - Click "Create Database"
   - Choose **FREE** tier
   - Select region (same as MongoDB)
   - Click "Create Database"

3. **Get Connection Details**
   - Click on your database
   - Go to "Configuration"
   - Copy the endpoint, port, and password

   **Example Redis URL:**
   ```
   redis://default:your_password@redis-xxxxx.c123.us-east-1-1.ec2.cloud.redislabs.com:12345
   ```

   Or use separate values:
   - Host: `redis-xxxxx.c123.us-east-1-1.ec2.cloud.redislabs.com`
   - Port: `12345`
   - Password: `your_password`

---

### Phase 2: Backend Deployment (Railway)

#### 2.1 Create Railway Project

1. **Sign Up/Login**
   - Go to https://railway.app/
   - Sign up or login

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account
   - Select `bookpath-app` repository
   - Choose the repository

3. **Add Backend Service**
   - Click "New Service"
   - Select "GitHub Repo"
   - Choose your repository
   - Set **Root Directory**: `backend`
   - Set **Start Command**: `npm start`
   - Railway will auto-detect Node.js

#### 2.2 Configure Environment Variables

Click on your backend service → "Variables" tab → Add:

```env
# Server Configuration
NODE_ENV=production
PORT=3001
TRUST_PROXY=true

# Database
MONGODB_URI=mongodb+srv://bookpath_user:your_password@cluster0.xxxxx.mongodb.net/bookpath?retryWrites=true&w=majority

# Redis
REDIS_URL=redis://default:your_password@redis-xxxxx.c123.us-east-1-1.ec2.cloud.redislabs.com:12345

# JWT Secrets (Generate strong random strings)
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars_long
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Session
SESSION_SECRET=your_super_secret_session_key_min_32_chars_long

# CORS & URLs
CORS_ORIGIN=https://bookpath.eu,https://www.bookpath.eu
FRONTEND_URL=https://bookpath.eu

# API Keys (Optional but recommended)
GOOGLE_BOOKS_API_KEY=your_google_books_api_key
AMAZON_ASSOCIATES_TAG=your_amazon_associates_tag
AMAZON_DOMAIN=amazon.de

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@bookpath.eu

# Logging
LOG_LEVEL=info
```

**Generate Secrets:**
```bash
# Generate secure random strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2.3 Configure Custom Domain

1. **Get Railway Domain**
   - Go to your service → "Settings" → "Networking"
   - Note the generated domain (e.g., `bookpath-backend-production.up.railway.app`)

2. **Add Custom Domain**
   - Click "Custom Domain"
   - Enter: `api.bookpath.eu`
   - Railway will provide DNS records

3. **Configure DNS** (at your domain provider)
   - Add CNAME record:
     - Name: `api`
     - Value: Railway-provided domain
   - Wait for DNS propagation (5-60 minutes)

#### 2.4 Deploy Backend

1. **Trigger Deployment**
   - Push to `main` branch (Railway auto-deploys)
   - Or click "Deploy" in Railway dashboard

2. **Monitor Deployment**
   - Check "Deployments" tab
   - View logs for errors
   - Verify health endpoint: `https://api.bookpath.eu/health`

---

### Phase 3: Frontend Deployment (Vercel)

#### 3.1 Create Vercel Project

1. **Sign Up/Login**
   - Go to https://vercel.com/
   - Sign up or login with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Import `bookpath-app` repository
   - Set **Root Directory**: `frontend`
   - Framework Preset: **Create React App**
   - Build Command: `npm run build`
   - Output Directory: `build`

#### 3.2 Configure Environment Variables

Go to Project Settings → Environment Variables → Add:

```env
# API Configuration
REACT_APP_API_BASE_URL=https://api.bookpath.eu/api
REACT_APP_BACKEND_URL=https://api.bookpath.eu
REACT_APP_FRONTEND_URL=https://bookpath.eu

# Environment
NODE_ENV=production

# Analytics (Optional)
REACT_APP_UMAMI_WEBSITE_ID=your_umami_id
REACT_APP_UMAMI_SCRIPT_URL=https://analytics.bookpath.eu/script.js
```

#### 3.3 Configure Custom Domain

1. **Add Domain**
   - Go to Project Settings → Domains
   - Add: `bookpath.eu` and `www.bookpath.eu`

2. **Configure DNS** (at your domain provider)
   - Add A record:
     - Name: `@`
     - Value: Vercel-provided IP (shown in dashboard)
   - Add CNAME record:
     - Name: `www`
     - Value: `cname.vercel-dns.com`
   - Wait for DNS propagation

#### 3.4 Deploy Frontend

1. **Deploy**
   - Push to `main` branch (Vercel auto-deploys)
   - Or click "Deploy" in Vercel dashboard

2. **Verify**
   - Check deployment logs
   - Visit `https://bookpath.eu`
   - Test API connection

---

### Phase 4: Domain Configuration

#### 4.1 DNS Records Summary

At your domain provider (e.g., Namecheap, Cloudflare), add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | Vercel IP | Auto |
| CNAME | www | cname.vercel-dns.com | Auto |
| CNAME | api | Railway domain | Auto |

#### 4.2 SSL Certificates

- **Vercel**: Automatic SSL (Let's Encrypt)
- **Railway**: Automatic SSL (Let's Encrypt)
- Both will provision certificates automatically after DNS propagation

#### 4.3 Verify Domains

1. **Frontend**: `https://bookpath.eu` should load
2. **Backend**: `https://api.bookpath.eu/health` should return JSON
3. **SSL**: Both should show valid certificates

---

## 🔐 Environment Variables

### Backend (Railway) - Complete List

```env
# === REQUIRED ===
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SESSION_SECRET=...

# === RECOMMENDED ===
PORT=3001
TRUST_PROXY=true
CORS_ORIGIN=https://bookpath.eu,https://www.bookpath.eu
FRONTEND_URL=https://bookpath.eu

# === OPTIONAL ===
GOOGLE_BOOKS_API_KEY=...
AMAZON_ASSOCIATES_TAG=...
AMAZON_DOMAIN=amazon.de
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=noreply@bookpath.eu
LOG_LEVEL=info
```

### Frontend (Vercel) - Complete List

```env
# === REQUIRED ===
REACT_APP_API_BASE_URL=https://api.bookpath.eu/api
REACT_APP_BACKEND_URL=https://api.bookpath.eu
REACT_APP_FRONTEND_URL=https://bookpath.eu
NODE_ENV=production

# === OPTIONAL ===
REACT_APP_UMAMI_WEBSITE_ID=...
REACT_APP_UMAMI_SCRIPT_URL=...
```

---

## ✅ Post-Deployment Verification

### 1. Health Checks

**Backend Health:**
```bash
curl https://api.bookpath.eu/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "mongodb": "connected",
  "redis": "connected",
  "environment": "production",
  "uptime": 123.45
}
```

**Frontend:**
- Visit `https://bookpath.eu`
- Should load without errors
- Check browser console for API connection

### 2. API Endpoints Test

```bash
# Test search endpoint
curl https://api.bookpath.eu/api/books/search?title=harry+potter

# Test health
curl https://api.bookpath.eu/health

# Test Swagger docs
curl https://api.bookpath.eu/api-docs
```

### 3. Frontend Functionality

- [ ] Homepage loads
- [ ] Book search works
- [ ] User registration works
- [ ] User login works
- [ ] Collections work
- [ ] No console errors

### 4. Database Verification

- [ ] Users can register
- [ ] Data persists in MongoDB
- [ ] Collections save correctly

### 5. Performance Checks

- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] No memory leaks
- [ ] Redis caching working

---

## 📊 Monitoring & Maintenance

### Monitoring Setup

1. **Railway Monitoring**
   - View logs in Railway dashboard
   - Set up alerts for errors
   - Monitor resource usage

2. **Vercel Analytics**
   - Enable Vercel Analytics
   - Monitor page views
   - Track performance metrics

3. **MongoDB Atlas Monitoring**
   - Monitor database performance
   - Set up alerts for high usage
   - Review slow queries

4. **Redis Cloud Monitoring**
   - Monitor memory usage
   - Track hit rates
   - Set up alerts

### Regular Maintenance

**Weekly:**
- [ ] Review error logs
- [ ] Check API usage
- [ ] Monitor database size
- [ ] Review security logs

**Monthly:**
- [ ] Update dependencies
- [ ] Review and optimize queries
- [ ] Backup database
- [ ] Review costs

**Quarterly:**
- [ ] Security audit
- [ ] Performance optimization
- [ ] Dependency updates
- [ ] Documentation updates

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Backend Not Starting

**Symptoms:** Railway deployment fails

**Solutions:**
- Check environment variables are set
- Verify `MONGODB_URI` format
- Check `REDIS_URL` format
- Review Railway logs for errors
- Ensure `package.json` has correct start script

#### 2. Database Connection Failed

**Symptoms:** `MongoServerSelectionError`

**Solutions:**
- Verify MongoDB Atlas IP whitelist (0.0.0.0/0)
- Check connection string format
- Verify database user permissions
- Check network access settings

#### 3. Redis Connection Failed

**Symptoms:** Redis errors in logs

**Solutions:**
- Verify `REDIS_URL` format
- Check Redis Cloud database is active
- Verify password is correct
- Check Redis endpoint is accessible

#### 4. CORS Errors

**Symptoms:** `Access to fetch blocked by CORS policy`

**Solutions:**
- Verify `CORS_ORIGIN` includes frontend domain
- Check `FRONTEND_URL` is correct
- Ensure frontend `REACT_APP_API_BASE_URL` is correct
- Clear browser cache

#### 5. Frontend API Calls Failing

**Symptoms:** 404 or connection errors

**Solutions:**
- Verify `REACT_APP_API_BASE_URL` is set
- Check backend is running
- Verify domain DNS is configured
- Check SSL certificates are valid

#### 6. Environment Variables Not Loading

**Symptoms:** `undefined` values

**Solutions:**
- Restart Railway/Vercel deployment
- Verify variable names (case-sensitive)
- Check variable values are correct
- Ensure no extra spaces in values

### Debug Commands

**Test Backend:**
```bash
curl https://api.bookpath.eu/health
curl https://api.bookpath.eu/api/books/search?title=test
```

**Test Frontend:**
```bash
curl https://bookpath.eu
```

**Check DNS:**
```bash
nslookup api.bookpath.eu
nslookup bookpath.eu
```

**Check SSL:**
```bash
openssl s_client -connect api.bookpath.eu:443
openssl s_client -connect bookpath.eu:443
```

---

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] All code committed and pushed
- [ ] Tests passing
- [ ] Environment variables documented
- [ ] `.gitignore` configured
- [ ] No sensitive data in code

### Database Setup
- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] Network access configured
- [ ] Connection string obtained
- [ ] Redis Cloud database created
- [ ] Redis connection URL obtained

### Backend Deployment
- [ ] Railway project created
- [ ] Environment variables set
- [ ] Custom domain configured
- [ ] DNS records added
- [ ] Deployment successful
- [ ] Health check passing

### Frontend Deployment
- [ ] Vercel project created
- [ ] Environment variables set
- [ ] Custom domain configured
- [ ] DNS records added
- [ ] Deployment successful
- [ ] Frontend loading correctly

### Post-Deployment
- [ ] Health checks passing
- [ ] API endpoints working
- [ ] Frontend functionality verified
- [ ] Database connections verified
- [ ] SSL certificates valid
- [ ] Monitoring set up

---

## 🎯 Next Steps After Deployment

1. **Set Up Monitoring**
   - Configure alerts
   - Set up error tracking
   - Monitor performance

2. **Optimize Performance**
   - Enable Redis caching
   - Optimize database queries
   - Implement CDN if needed

3. **Security Hardening**
   - Review security headers
   - Set up rate limiting
   - Implement WAF if needed

4. **Backup Strategy**
   - Set up MongoDB backups
   - Document recovery procedures
   - Test backup restoration

5. **Documentation**
   - Update API documentation
   - Document deployment process
   - Create runbooks

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Redis Cloud Documentation](https://docs.redis.com/)

---

## 🆘 Support

If you encounter issues:
1. Check logs in Railway/Vercel dashboards
2. Review this troubleshooting section
3. Verify environment variables
4. Test endpoints individually
5. Check DNS propagation status

---

**Last Updated:** 2024-01-01  
**Version:** 1.0.0
