# BookPath AWS Infrastructure

This directory contains the AWS CDK infrastructure code for the BookPath application. The infrastructure is designed to be production-ready and scalable.

## 🏗️ Infrastructure Components

### **Authentication & User Management**
- **Amazon Cognito User Pool**: Handles user registration, login, and authentication
- **Cognito User Pool Client**: Web client for authentication flows
- **OAuth Support**: Authorization code and implicit grant flows

### **Database**
- **Amazon RDS PostgreSQL**: Relational database for books, users, and collections
- **VPC Isolation**: Database runs in private subnets for security
- **Automated Backups**: 7-day backup retention
- **Connection Pooling**: Optimized for Lambda connections

### **File Storage**
- **Amazon S3**: Stores book covers, user uploads, and app assets
- **Versioning**: Track file changes and rollback if needed
- **Encryption**: Server-side encryption enabled
- **Access Control**: Private bucket with Lambda-only access

### **Serverless Backend**
- **AWS Lambda**: Serverless functions for API endpoints
- **Node.js 18.x**: Latest LTS runtime
- **VPC Access**: Lambda functions can access RDS securely
- **Environment Variables**: Secure configuration management

### **API Gateway**
- **REST API**: HTTP API for frontend communication
- **CORS Support**: Cross-origin requests enabled
- **Cognito Authorizer**: JWT token validation
- **Rate Limiting**: Built-in throttling

### **Networking**
- **VPC**: Isolated network environment
- **Public Subnets**: For load balancers and bastion hosts
- **Private Subnets**: For Lambda functions
- **Isolated Subnets**: For RDS database
- **NAT Gateway**: Internet access for private resources

## 🚀 Quick Start

### **Prerequisites**
- AWS CLI configured with appropriate permissions
- Node.js 18+ and npm
- AWS CDK CLI installed globally

### **1. Install Dependencies**
```bash
npm install
```

### **2. Build the Project**
```bash
npm run build
```

### **3. Bootstrap CDK (First Time Only)**
```bash
cdk bootstrap aws://207206091328/eu-central-1
```

### **4. Deploy the Infrastructure**
```bash
cdk deploy
```

### **5. View Outputs**
```bash
cdk deploy --outputs-file outputs.json
```

## 📊 Cost Estimation

### **Development Environment**
- **RDS t3.micro**: ~$15/month
- **Lambda**: ~$1/month (low usage)
- **S3**: ~$0.50/month
- **API Gateway**: ~$1/month
- **Cognito**: ~$0.50/month
- **VPC & NAT**: ~$20/month
- **Total**: ~$38/month

### **Production Environment**
- **RDS t3.small**: ~$30/month
- **Lambda**: ~$5-20/month (depending on usage)
- **S3**: ~$2-10/month (depending on storage)
- **API Gateway**: ~$5-15/month (depending on requests)
- **Cognito**: ~$1-5/month
- **VPC & NAT**: ~$40/month
- **Total**: ~$83-120/month

## 🔧 Configuration

### **Environment Variables**
The stack automatically configures:
- Database credentials (stored in Secrets Manager)
- Cognito User Pool and Client IDs
- S3 bucket names
- API Gateway URLs

### **Customization**
Edit `lib/infrastructure-stack.ts` to modify:
- Instance types and sizes
- Backup retention periods
- VPC CIDR ranges
- Lambda function configurations

## 🧪 Testing

### **Synthesize CloudFormation**
```bash
cdk synth
```

### **View Changes Before Deploy**
```bash
cdk diff
```

### **Run Tests**
```bash
npm test
```

## 🗄️ Database Setup

### **1. Connect to RDS**
After deployment, use the database endpoint from CDK outputs:
```bash
psql -h <database-endpoint> -U bookpath_admin -d bookpath
```

### **2. Run Schema**
```bash
psql -h <database-endpoint> -U bookpath_admin -d bookpath -f database-schema.sql
```

### **3. Verify Tables**
```sql
\dt
SELECT * FROM users LIMIT 5;
SELECT * FROM books LIMIT 5;
```

## 🔐 Security Features

- **VPC Isolation**: All resources run in private subnets
- **Security Groups**: Restrictive access rules
- **IAM Roles**: Least privilege access
- **Encryption**: Data encrypted at rest and in transit
- **Secrets Manager**: Secure credential storage

## 📈 Scaling

### **Automatic Scaling**
- **Lambda**: Scales automatically based on request volume
- **RDS**: Can be upgraded to larger instance types
- **S3**: Unlimited storage capacity

### **Manual Scaling**
```bash
# Upgrade RDS instance
cdk deploy --context rds-instance-class=t3.small

# Increase Lambda memory
cdk deploy --context lambda-memory-size=1024
```

## 🚨 Monitoring & Alerts

### **CloudWatch Metrics**
- Lambda function invocations and errors
- RDS connection count and performance
- API Gateway request count and latency
- S3 bucket usage and access patterns

### **Logs**
- Lambda function logs in CloudWatch
- RDS slow query logs
- API Gateway access logs

## 🧹 Cleanup

### **Destroy Infrastructure**
```bash
cdk destroy
```

**⚠️ Warning**: This will delete ALL resources including the database and S3 bucket contents.

### **Selective Cleanup**
```bash
# Remove specific resources
cdk destroy BookPathStack --exclude BookPathDatabase
```

## 📚 Next Steps

### **Frontend Integration**
1. Update your React app to use Cognito for authentication
2. Replace API calls with the new API Gateway endpoints
3. Update image uploads to use S3

### **Advanced Features**
1. Add CloudFront CDN for global content delivery
2. Implement ElastiCache for Redis caching
3. Add CloudWatch alarms and SNS notifications
4. Set up CI/CD pipeline with CodePipeline

### **Production Hardening**
1. Enable deletion protection on RDS
2. Set up cross-region backups
3. Implement WAF for API Gateway
4. Add CloudTrail for audit logging

## 🤝 Support

For issues or questions:
1. Check CloudWatch logs for errors
2. Verify IAM permissions
3. Review VPC security group rules
4. Check RDS parameter group settings

## 📝 License

MIT License - see LICENSE file for details.
