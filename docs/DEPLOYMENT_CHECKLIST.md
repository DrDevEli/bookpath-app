# 🚀 BookPath Quick Deployment Checklist

**Quick reference for deploying BookPath to production**

---

## 📋 Pre-Deployment

- [ ] Code committed and pushed to GitHub
- [ ] All dependencies installed (`npm install`)
- [ ] Build succeeds (`npm run build` in frontend)
- [ ] No linting errors
- [ ] Environment variables documented

---

## 🗄️ Database Setup

### MongoDB Atlas
- [ ] Account created at https://www.mongodb.com/atlas
- [ ] Free M0 cluster created
- [ ] Database user created (username + password saved)
- [ ] Network access: Allow from anywhere (0.0.0.0/0)
- [ ] Connection string obtained and tested

### Redis Cloud
- [ ] Account created at https://redis.com/try-free/
- [ ] Free database created
- [ ] Connection URL obtained (or host/port/password)

---

## 🔧 Backend (Railway)

### Setup
- [ ] Railway account created
- [ ] New project created from GitHub repo
- [ ] Service added with root directory: `backend`
- [ ] Start command: `npm start`

### Environment Variables
```env
NODE_ENV=production
PORT=3001
TRUST_PROXY=true
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
SESSION_SECRET=<32+ chars>
CORS_ORIGIN=https://bookpath.eu,https://www.bookpath.eu
FRONTEND_URL=https://bookpath.eu
GOOGLE_BOOKS_API_KEY=... (optional)
AMAZON_ASSOCIATES_TAG=... (optional)
```

- [ ] All environment variables set in Railway
- [ ] Custom domain: `api.bookpath.eu` configured
- [ ] DNS CNAME record added: `api` → Railway domain
- [ ] Deployment successful
- [ ] Health check: `https://api.bookpath.eu/health` returns OK

---

## 🎨 Frontend (Vercel)

### Setup
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Root directory: `frontend`
- [ ] Build command: `npm run build`
- [ ] Output directory: `build`

### Environment Variables
```env
REACT_APP_API_BASE_URL=https://api.bookpath.eu/api
REACT_APP_BACKEND_URL=https://api.bookpath.eu
REACT_APP_FRONTEND_URL=https://bookpath.eu
NODE_ENV=production
```

- [ ] All environment variables set in Vercel
- [ ] Custom domains: `bookpath.eu` and `www.bookpath.eu` added
- [ ] DNS A record: `@` → Vercel IP
- [ ] DNS CNAME record: `www` → `cname.vercel-dns.com`
- [ ] Deployment successful
- [ ] Frontend loads at `https://bookpath.eu`

---

## ✅ Verification

### Backend
- [ ] Health endpoint: `curl https://api.bookpath.eu/health`
- [ ] API docs: `https://api.bookpath.eu/api-docs`
- [ ] Search endpoint works
- [ ] Database connected (check health response)
- [ ] Redis connected (check health response)

### Frontend
- [ ] Homepage loads
- [ ] No console errors
- [ ] API calls succeed
- [ ] User registration works
- [ ] User login works
- [ ] Book search works
- [ ] Collections work

### SSL
- [ ] Both domains show valid SSL certificates
- [ ] HTTPS redirects working
- [ ] No mixed content warnings

---

## 🔍 Quick Test Commands

```bash
# Backend health
curl https://api.bookpath.eu/health

# Backend search
curl "https://api.bookpath.eu/api/books/search?title=harry+potter"

# Frontend
curl https://bookpath.eu

# DNS check
nslookup api.bookpath.eu
nslookup bookpath.eu
```

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Backend won't start | Check env vars, MongoDB URI format |
| Database connection failed | Check MongoDB IP whitelist (0.0.0.0/0) |
| Redis connection failed | Verify REDIS_URL format |
| CORS errors | Check CORS_ORIGIN includes frontend domain |
| Frontend API errors | Verify REACT_APP_API_BASE_URL |
| SSL not working | Wait for DNS propagation (5-60 min) |

---

## 📞 Support Resources

- Full Blueprint: `docs/DEPLOYMENT_BLUEPRINT.md`
- Railway Docs: https://docs.railway.app/
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com/

---

**Quick Deploy Time:** ~30-60 minutes  
**DNS Propagation:** 5-60 minutes
