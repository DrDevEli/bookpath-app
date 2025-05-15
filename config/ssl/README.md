# SSL/TLS Certificate Management

## 📜 Local Development Certificates

### 1. Generate Self-Signed Certificates
```bash
# Run from config/ssl/ directory
openssl req -x509 -newkey rsa:4096 \
  -keyout localhost.key \
  -out localhost.crt \
  -days 30 \
  -nodes \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

### 2. Trust Certificate (MacOS)
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain localhost.crt
```

## ☁️ Production Certificates

### Automated (Recommended)
```bash
# Using certbot (Let's Encrypt)
sudo certbot certonly --standalone \
  -d yourdomain.com \
  --non-interactive \
  --agree-tos \
  -m your@email.com
```

### Manual Process
1. **CSR Generation**:
   ```bash
   openssl req -newkey rsa:4096 -nodes \
     -keyout server.key \
     -out server.csr
   ```
2. Submit `server.csr` to your CA (e.g., DigiCert, GoDaddy)

## 🔐 Security Best Practices
- [ ] Rotate certificates every 90 days
- [ ] Use OCSP stapling (`ssl_stapling on` in Nginx)
- [ ] Enable TLS 1.2+ only
- [ ] Monitor expiry with:
  ```bash
  openssl x509 -enddate -noout -in certificate.crt
  ```

## ⚠️ Important Notes
- Never commit `.key` files to Git
- Store production keys in:
  - AWS Secrets Manager
  - HashiCorp Vault
  - Kubernetes Secrets

## 🔄 Renewal Automation (Production)
```bash
# Sample cron job (runs monthly)
0 0 1 * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

> **Warning**  
> Self-signed certs are for development only. Production requires CA-signed certificates.
