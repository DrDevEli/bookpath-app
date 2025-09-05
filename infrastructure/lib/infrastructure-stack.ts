import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rum from 'aws-cdk-lib/aws-rum';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class BookPathStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for RDS and Lambda
    const vpc = new ec2.Vpc(this, 'BookPathVPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Security Group for RDS
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'BookPathDBSecurityGroup', {
      vpc,
      description: 'Security group for BookPath RDS instance',
      allowAllOutbound: false,
    });

    // Allow Lambda to connect to RDS
    dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Allow Lambda to connect to RDS'
    );

    // RDS Database (PostgreSQL)
    const database = new rds.DatabaseInstance(this, 'BookPathDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_3,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      databaseName: 'bookpath',
      credentials: rds.Credentials.fromGeneratedSecret('bookpath_admin'),
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false, // Set to true for production
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Set to RETAIN for production
    });

    // S3 Bucket for book covers and user uploads
    const bookAssetsBucket = new s3.Bucket(this, 'BookPathAssetsBucket', {
      bucketName: `bookpath-assets-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Set to RETAIN for production
      autoDeleteObjects: true, // Set to false for production
    });

    // S3 Bucket for frontend hosting (simple version)
    const frontendBucket = new s3.Bucket(this, 'BookPathFrontendBucket', {
      bucketName: `bookpath-frontend-${this.account}-${this.region}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA fallback
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Set to RETAIN for production
      autoDeleteObjects: true, // Set to false for production
    });

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'BookPathUserPool', {
      userPoolName: 'BookPathUsers',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Set to RETAIN for production
    });

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'BookPathUserPoolClient', {
      userPool,
      userPoolClientName: 'BookPathWebClient',
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3000/callback',
          'https://yourdomain.com/callback', // Update with your domain
        ],
        logoutUrls: [
          'http://localhost:3000/logout',
          'https://yourdomain.com/logout', // Update with your domain
        ],
      },
    });

    // Lambda Layer for common dependencies
    const commonLayer = new lambda.LayerVersion(this, 'BookPathCommonLayer', {
      code: lambda.Code.fromAsset('lambda-layer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Common dependencies for BookPath Lambda functions',
    });

    // Lambda function for user management
    const userManagementFunction = new lambda.Function(this, 'UserManagementFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'user-management.handler',
      code: lambda.Code.fromAsset('lambda-functions/user-management'),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        DATABASE_SECRET_ARN: database.secret?.secretArn || '',
        S3_BUCKET_NAME: bookAssetsBucket.bucketName,
      },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      layers: [commonLayer],
    });

    // Lambda function for book operations
    const bookOperationsFunction = new lambda.Function(this, 'BookOperationsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'book-operations.handler',
      code: lambda.Code.fromAsset('lambda-functions/book-operations'),
      environment: {
        DATABASE_SECRET_ARN: database.secret?.secretArn || '',
        S3_BUCKET_NAME: bookAssetsBucket.bucketName,
      },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      layers: [commonLayer],
    });

    // Grant permissions to Lambda functions
    database.grantConnect(userManagementFunction);
    database.grantConnect(bookOperationsFunction);
    bookAssetsBucket.grantReadWrite(userManagementFunction);
    bookAssetsBucket.grantReadWrite(bookOperationsFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, 'BookPathAPI', {
      restApiName: 'BookPath API',
      description: 'API for BookPath application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // API Gateway Authorizer using Cognito
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'BookPathAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // API Resources and Methods
    const users = api.root.addResource('users');
    const books = api.root.addResource('books');
    const collections = api.root.addResource('collections');

    // User endpoints
    users.addMethod('POST', new apigateway.LambdaIntegration(userManagementFunction));
    users.addMethod('GET', new apigateway.LambdaIntegration(userManagementFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Book endpoints
    books.addMethod('GET', new apigateway.LambdaIntegration(bookOperationsFunction));
    books.addMethod('POST', new apigateway.LambdaIntegration(bookOperationsFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Collection endpoints
    collections.addMethod('GET', new apigateway.LambdaIntegration(bookOperationsFunction));
    collections.addMethod('POST', new apigateway.LambdaIntegration(bookOperationsFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // CloudWatch RUM AppMonitor (Identity Pool can be created separately)
    const rumMonitor = new rum.CfnAppMonitor(this, 'BookPathRumMonitor', {
      name: 'bookpath-web',
      domain: 'bookpath.eu',
      appMonitorConfiguration: {
        allowCookies: true,
        enableXRay: false,
        sessionSampleRate: 1,
        telemetries: ['errors', 'http', 'performance'],
      },
      cwLogEnabled: false,
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS Database Endpoint',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: bookAssetsBucket.bucketName,
      description: 'S3 Bucket for Book Assets',
    });

    new cdk.CfnOutput(this, 'RumMonitorName', {
      value: rumMonitor.name,
      description: 'CloudWatch RUM AppMonitor name',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 Bucket for Frontend Hosting',
    });

    new cdk.CfnOutput(this, 'FrontendWebsiteUrl', {
      value: frontendBucket.bucketWebsiteUrl,
      description: 'Frontend Website URL (HTTP only - use CloudFront for HTTPS)',
    });
  }
}
