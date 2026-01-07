#!/bin/bash

# BookPath Database Setup Script
# This script installs and configures MongoDB and Redis for development

set -e

echo "🚀 Setting up BookPath databases..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Homebrew is installed
check_homebrew() {
    if ! command -v brew &> /dev/null; then
        print_error "Homebrew is not installed. Please install it first:"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    print_success "Homebrew is installed"
}

# Install MongoDB
install_mongodb() {
    print_status "Installing MongoDB..."
    
    # Add MongoDB tap
    brew tap mongodb/brew
    
    # Install MongoDB Community Edition
    if brew install mongodb-community; then
        print_success "MongoDB installed successfully"
    else
        print_error "Failed to install MongoDB"
        exit 1
    fi
    
    # Start MongoDB service
    print_status "Starting MongoDB service..."
    brew services start mongodb-community
    
    # Wait for MongoDB to start
    sleep 3
    
    # Test MongoDB connection
    if mongosh --eval "db.runCommand('ping')" &> /dev/null; then
        print_success "MongoDB is running and accessible"
    else
        print_warning "MongoDB might not be ready yet. Please wait a moment and try again."
    fi
}

# Install Redis
install_redis() {
    print_status "Installing Redis..."
    
    if brew install redis; then
        print_success "Redis installed successfully"
    else
        print_error "Failed to install Redis"
        exit 1
    fi
    
    # Start Redis service
    print_status "Starting Redis service..."
    brew services start redis
    
    # Wait for Redis to start
    sleep 2
    
    # Test Redis connection
    if redis-cli ping &> /dev/null; then
        print_success "Redis is running and accessible"
    else
        print_warning "Redis might not be ready yet. Please wait a moment and try again."
    fi
}

# Create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)
    
    # Create .env file in backend directory
    cat > backend/.env << EOF
# BookPath Backend Environment Variables
# Generated on $(date)

# ===== DATABASE CONFIGURATION =====
MONGODB_URI=mongodb://localhost:27017/bookpath
REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_USERNAME=
REDIS_DB=0
REDIS_TLS_ENABLED=false
REDIS_CONNECT_TIMEOUT=5000
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# ===== SERVER CONFIGURATION =====
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# ===== SECURITY =====
SESSION_SECRET=${SESSION_SECRET}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# ===== EMAIL CONFIGURATION =====
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# ===== EXTERNAL APIs =====
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
OPENAI_API_KEY=your-openai-api-key

# ===== LOGGING =====
LOG_LEVEL=info
LOG_FILE=logs/app.log

# ===== CACHE CONFIGURATION =====
CACHE_TTL=3600
CACHE_MAX_SIZE=1000
EOF

    print_success "Environment file created at backend/.env"
    print_warning "Please update the API keys and email configuration in backend/.env"
}

# Install VS Code extensions
install_vscode_extensions() {
    print_status "Installing recommended VS Code extensions..."
    
    # MongoDB extension
    code --install-extension mongodb.mongodb-vscode
    
    # Redis extension
    code --install-extension cweijan.vscode-redis-client
    
    # Other useful extensions
    code --install-extension ms-vscode.vscode-typescript-next
    code --install-extension bradlc.vscode-tailwindcss
    code --install-extension esbenp.prettier-vscode
    code --install-extension dbaeumer.vscode-eslint
    
    print_success "VS Code extensions installed"
}

# Test database connections
test_connections() {
    print_status "Testing database connections..."
    
    # Test MongoDB
    if mongosh --eval "use bookpath; db.createCollection('test'); db.test.insertOne({test: true}); db.test.deleteOne({test: true}); db.dropDatabase();" &> /dev/null; then
        print_success "MongoDB connection test passed"
    else
        print_error "MongoDB connection test failed"
        exit 1
    fi
    
    # Test Redis
    if redis-cli set test "hello" && redis-cli get test | grep -q "hello" && redis-cli del test &> /dev/null; then
        print_success "Redis connection test passed"
    else
        print_error "Redis connection test failed"
        exit 1
    fi
}

# Main execution
main() {
    echo "📚 BookPath Database Setup"
    echo "=========================="
    echo ""
    
    # Check prerequisites
    check_homebrew
    
    # Install databases
    install_mongodb
    install_redis
    
    # Create environment file
    create_env_file
    
    # Install VS Code extensions
    install_vscode_extensions
    
    # Test connections
    test_connections
    
    echo ""
    echo "🎉 Database setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update API keys in backend/.env"
    echo "2. Run 'npm run install:all' to install dependencies"
    echo "3. Run 'npm run dev' to start the development servers"
    echo ""
    echo "📖 For more information, see docs/DATABASE_SETUP.md"
}

# Run main function
main "$@" 