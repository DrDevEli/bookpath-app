#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BookPathStack } from '../lib/infrastructure-stack';

const app = new cdk.App();

// Create the BookPath infrastructure stack
new BookPathStack(app, 'BookPathStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT || '207206091328', 
    region: process.env.CDK_DEFAULT_REGION || 'eu-central-1' 
  },
  description: 'BookPath application infrastructure including Cognito, RDS, S3, Lambda, and API Gateway',
  tags: {
    Project: 'BookPath',
    Environment: 'development',
    Owner: 'bookpath-team'
  }
});