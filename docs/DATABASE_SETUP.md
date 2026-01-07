# 🗄️ Database Setup Guide for BookPath

## 📋 Prerequisites

### VS Code Extensions
Make sure you have these extensions installed:
- **MongoDB for VS Code** (by MongoDB)
- **Redis** (by cweijan)

---

## 🍃 MongoDB Setup

### 1. Install MongoDB Locally

#### macOS (using Homebrew):
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

#### Windows:
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Install with default settings
3. MongoDB runs as a Windows service automatically

#### Linux (Ubuntu/Debian):
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. VS Code MongoDB Extension Setup

1. **Open VS Code MongoDB Panel**:
   - Click the MongoDB icon in the sidebar
   - Or press `Ctrl+Shift+P` and search "MongoDB: Connect"

2. **Add Connection**:
   ```
   Connection String: mongodb://localhost:27017
   Database Name: bookpath
   ```

3. **Test Connection**:
   - Right-click on the connection
   - Select "Test Connection"

### 3. Create Database and Collections

1. **Create Database**:
   - Right-click on your connection
   - Select "Create Database"
   - Name: `bookpath`

2. **Create Collections**:
   - Right-click on the `bookpath` database
   - Select "Create Collection"
   - Create these collections:
     - `users`
     - `books`
     - `collections`
     - `audit_logs`

---

## 🔴 Redis Setup

### 1. Install Redis Locally

#### macOS (using Homebrew):
```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Test Redis
redis-cli ping
# Should return: PONG
```

#### Windows:
1. Download Redis for Windows from [github.com/microsoftarchive/redis/releases](https://github.com/microsoftarchive/redis/releases)
2. Install Redis
3. Start Redis service

#### Linux (Ubuntu/Debian):
```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
# Should return: PONG
```

### 2. VS Code Redis Extension Setup

1. **Open VS Code Redis Panel**:
   - Click the Redis icon in the sidebar
   - Or press `Ctrl+Shift+P` and search "Redis: Connect"

2. **Add Connection**:
   ```
   Host: localhost
   Port: 6379
   Password: (leave empty for local)
   Database: 0
   ```

3. **Test Connection**:
   - Click "Test Connection"
   - Should show "Connected successfully"

### 3. Redis Configuration

1. **Set up Redis Keys**:
   ```bash
   # Test basic operations
   redis-cli
   
   # Set a test key
   SET test:bookpath "Hello BookPath!"
   
   # Get the key
   GET test:bookpath
   
   # List all keys
   KEYS *
   
   # Exit Redis CLI
   exit
   ```

---

## ⚙️ Environment Configuration

### 1. Create .env File

```bash
# Navigate to backend directory
cd server/booklensapp-backend

# Copy the example file
cp env.example .env
```

### 2. Configure .env File

Edit `server/booklensapp-backend/.env`:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/bookpath

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Security (Generate these with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=your-generated-session-secret
JWT_SECRET=your-generated-jwt-secret
JWT_REFRESH_SECRET=your-generated-refresh-secret
```

### 3. Generate Secure Secrets

```bash
# Generate secure secrets
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 Test Your Setup

### 1. Test MongoDB Connection

```bash
# Navigate to backend
cd server/booklensapp-backend

# Test MongoDB connection
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/bookpath')
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection failed:', err.message))
  .finally(() => process.exit());
"
```

### 2. Test Redis Connection

```bash
# Test Redis connection
node -e "
const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379/0');
redis.ping()
  .then(result => {
    console.log('✅ Redis connected successfully:', result);
    redis.disconnect();
  })
  .catch(err => console.error('❌ Redis connection failed:', err.message))
  .finally(() => process.exit());
"
```

### 3. Test Full Application

```bash
# Start the backend
cd server/booklensapp-backend
npm run dev

# In another terminal, test the health endpoint
curl http://localhost:3001/health
```

---

## 🔧 Troubleshooting

### MongoDB Issues

1. **Connection Refused**:
   ```bash
   # Check if MongoDB is running
   brew services list | grep mongodb
   
   # Start MongoDB if not running
   brew services start mongodb-community
   ```

2. **Permission Issues**:
   ```bash
   # Check MongoDB logs
   tail -f /usr/local/var/log/mongodb/mongo.log
   ```

### Redis Issues

1. **Connection Refused**:
   ```bash
   # Check if Redis is running
   brew services list | grep redis
   
   # Start Redis if not running
   brew services start redis
   ```

2. **Test Redis manually**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

---

## 📊 Monitoring

### VS Code Extensions Features

1. **MongoDB Extension**:
   - Browse collections
   - Execute queries
   - View documents
   - Monitor performance

2. **Redis Extension**:
   - Browse keys
   - Execute commands
   - Monitor memory usage
   - View key patterns

### Health Check Endpoints

Your BookPath API includes these monitoring endpoints:

- **Health Check**: `GET /health`
- **Cache Stats**: `GET /api/chefaodacasa/cache/stats`
- **Cache Reset**: `POST /api/chefaodacasa/cache/reset`

---

## 🚀 Next Steps

1. **Seed Database**: Run the seed script to populate with sample data
2. **Test API**: Use the Swagger docs at `http://localhost:3001/api-docs`
3. **Start Development**: Run both frontend and backend
4. **Monitor**: Use VS Code extensions to monitor database performance

---

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [VS Code MongoDB Extension](https://marketplace.visualstudio.com/items?itemName=mongodb.mongodb-vscode)
- [VS Code Redis Extension](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-redis-client) 