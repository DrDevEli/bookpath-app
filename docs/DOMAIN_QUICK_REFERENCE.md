# Domain Setup Quick Reference

## 🚀 Quick Start

1. **Run the deployment script:**
   ```bash
   ./scripts/deploy-domain.sh yourdomain.com
   ```

2. **Deploy your application:**
   - Frontend: `cd frontend && vercel --prod`
   - Backend: `cd backend && railway up`

3. **Configure DNS in Namecheap:**
   - Go to Domain List → Manage → Advanced DNS
   - Add the DNS records shown by the script

## 📋 DNS Records for Namecheap

### For Cloud Platforms (Vercel, Netlify, Railway)
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

## 🔧 Environment Variables

### Frontend (.env.production)
```env
REACT_APP_API_BASE_URL=https://api.yourdomain.com/api
REACT_APP_FRONTEND_URL=https://yourdomain.com
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

### Backend (.env.production)
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_URL=your_redis_connection_string
```

## 🧪 Testing Your Setup

1. **Test DNS propagation:**
   ```bash
   nslookup yourdomain.com
   ```

2. **Test SSL certificate:**
   - Visit `https://yourdomain.com`
   - Check for padlock icon

3. **Test API endpoints:**
   - Frontend should load correctly
   - No CORS errors in browser console

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Check CORS_ORIGIN in backend |
| SSL not working | Wait for DNS propagation (up to 48h) |
| Domain not loading | Verify DNS records in Namecheap |
| API calls failing | Check environment variables |

## 📞 Support

- **DNS Issues**: Contact Namecheap support
- **Deployment Issues**: Check hosting platform logs
- **Application Issues**: Check browser console and server logs

## 🔗 Useful Links

- [Namecheap DNS Management](https://ap.www.namecheap.com/Domains/DomainControlPanel)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Let's Encrypt SSL](https://letsencrypt.org/)

---

**Remember**: DNS changes can take up to 48 hours to propagate globally! 