#!/usr/bin/env node

/**
 * API Documentation Validation Script
 * 
 * This script validates the OpenAPI documentation against the actual API implementation
 * by testing all documented endpoints and verifying their behavior matches the documentation.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const OPENAPI_PATH = path.join(__dirname, '../docs/openapi.yaml');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class APIValidator {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    this.authToken = null;
    this.csrfToken = null;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async loadOpenAPISpec() {
    try {
      const yamlContent = fs.readFileSync(OPENAPI_PATH, 'utf8');
      return yaml.parse(yamlContent);
    } catch (error) {
      throw new Error(`Failed to load OpenAPI spec: ${error.message}`);
    }
  }

  async setupAuthentication() {
    try {
      // Get CSRF token first
      const csrfResponse = await axios.get(`${API_BASE_URL}/api/v1/auth/csrf-token`);
      this.csrfToken = csrfResponse.data.csrfToken;
      
      // Create a test user and login
      const testUser = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'TestPassword123!'
      };

      // Register test user
      await axios.post(`${API_BASE_URL}/api/v1/auth/register`, testUser, {
        headers: {
          'X-CSRF-Token': this.csrfToken
        }
      });

      // Login to get auth token
      const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });

      if (loginResponse.data.data && loginResponse.data.data.tokens) {
        this.authToken = loginResponse.data.data.tokens.accessToken;
        this.log('✓ Authentication setup successful', 'green');
      }
    } catch (error) {
      this.log(`⚠ Authentication setup failed: ${error.message}`, 'yellow');
      this.log('Some protected endpoints will be skipped', 'yellow');
    }
  }

  async testEndpoint(path, method, spec) {
    this.results.total++;
    const testName = `${method.toUpperCase()} ${path}`;
    
    try {
      // Skip if endpoint requires auth but we don't have token
      const requiresAuth = spec.security && spec.security.some(s => s.bearerAuth);
      if (requiresAuth && !this.authToken) {
        this.log(`⏭ SKIP: ${testName} (requires auth)`, 'yellow');
        this.results.skipped++;
        return;
      }

      // Prepare request config
      const config = {
        method: method.toLowerCase(),
        url: `${API_BASE_URL}/api/v1${path}`,
        timeout: 10000,
        validateStatus: () => true // Don't throw on HTTP errors
      };

      // Add auth header if required
      if (requiresAuth && this.authToken) {
        config.headers = {
          'Authorization': `Bearer ${this.authToken}`
        };
      }

      // Add CSRF token for state-changing operations
      if (['post', 'put', 'delete', 'patch'].includes(method.toLowerCase()) && this.csrfToken) {
        config.headers = {
          ...config.headers,
          'X-CSRF-Token': this.csrfToken
        };
      }

      // Handle path parameters
      let testPath = path;
      if (path.includes('{')) {
        // Replace path parameters with test values
        testPath = path
          .replace(/{id}/g, '507f1f77bcf86cd799439011') // Valid ObjectId
          .replace(/{collectionId}/g, '507f1f77bcf86cd799439011')
          .replace(/{bookId}/g, '507f1f77bcf86cd799439011')
          .replace(/{token}/g, 'test-token')
          .replace(/{shareableLink}/g, 'test-link')
          .replace(/{category}/g, 'fiction')
          .replace(/{authorId}/g, 'test-author');
        
        config.url = `${API_BASE_URL}/api/v1${testPath}`;
      }

      // Add test data for POST/PUT requests
      if (['post', 'put'].includes(method.toLowerCase()) && spec.requestBody) {
        config.data = this.generateTestData(spec.requestBody);
        config.headers = {
          ...config.headers,
          'Content-Type': 'application/json'
        };
      }

      // Make the request
      const response = await axios(config);
      
      // Validate response
      const validation = this.validateResponse(response, spec.responses);
      
      if (validation.valid) {
        this.log(`✓ PASS: ${testName} (${response.status})`, 'green');
        this.results.passed++;
      } else {
        this.log(`✗ FAIL: ${testName} - ${validation.error}`, 'red');
        this.results.failed++;
        this.results.errors.push({
          endpoint: testName,
          error: validation.error,
          status: response.status,
          response: response.data
        });
      }

    } catch (error) {
      this.log(`✗ ERROR: ${testName} - ${error.message}`, 'red');
      this.results.failed++;
      this.results.errors.push({
        endpoint: testName,
        error: error.message
      });
    }
  }

  generateTestData(requestBody) {
    if (!requestBody.content || !requestBody.content['application/json']) {
      return {};
    }

    const schema = requestBody.content['application/json'].schema;
    return this.generateDataFromSchema(schema);
  }

  generateDataFromSchema(schema) {
    if (!schema || !schema.properties) {
      return {};
    }

    const data = {};
    
    for (const [key, prop] of Object.entries(schema.properties)) {
      switch (prop.type) {
        case 'string':
          if (prop.format === 'email') {
            data[key] = 'test@example.com';
          } else if (prop.format === 'password') {
            data[key] = 'TestPassword123!';
          } else {
            data[key] = prop.example || `test-${key}`;
          }
          break;
        case 'boolean':
          data[key] = prop.example !== undefined ? prop.example : true;
          break;
        case 'integer':
        case 'number':
          data[key] = prop.example || 1;
          break;
        case 'array':
          data[key] = [];
          break;
        case 'object':
          data[key] = this.generateDataFromSchema(prop);
          break;
        default:
          data[key] = prop.example || null;
      }
    }

    return data;
  }

  validateResponse(response, expectedResponses) {
    const status = response.status.toString();
    
    // Check if status code is documented
    if (!expectedResponses[status]) {
      return {
        valid: false,
        error: `Undocumented status code: ${status}`
      };
    }

    // For successful responses, validate basic structure
    if (status.startsWith('2')) {
      const data = response.data;
      
      // Check for success field in successful responses
      if (data && typeof data === 'object' && data.success === false) {
        return {
          valid: false,
          error: 'Response marked as unsuccessful despite 2xx status'
        };
      }
    }

    // For error responses, validate error structure
    if (status.startsWith('4') || status.startsWith('5')) {
      const data = response.data;
      
      if (data && typeof data === 'object') {
        // Check for standard error response structure
        if (data.success !== false) {
          return {
            valid: false,
            error: 'Error response missing success: false field'
          };
        }
      }
    }

    return { valid: true };
  }

  async testHealthEndpoint() {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      
      if (response.status === 200 && response.data.status === 'ok') {
        this.log('✓ Health endpoint working', 'green');
        return true;
      } else {
        this.log('✗ Health endpoint failed', 'red');
        return false;
      }
    } catch (error) {
      this.log(`✗ Health endpoint error: ${error.message}`, 'red');
      return false;
    }
  }

  async validateAllEndpoints() {
    this.log('🚀 Starting API Documentation Validation', 'bold');
    this.log('=' .repeat(50), 'blue');

    // Test health endpoint first
    const healthOk = await this.testHealthEndpoint();
    if (!healthOk) {
      this.log('❌ Server not responding, aborting validation', 'red');
      return;
    }

    // Load OpenAPI spec
    let spec;
    try {
      spec = await this.loadOpenAPISpec();
      this.log(`📋 Loaded OpenAPI spec with ${Object.keys(spec.paths).length} paths`, 'blue');
    } catch (error) {
      this.log(`❌ Failed to load OpenAPI spec: ${error.message}`, 'red');
      return;
    }

    // Setup authentication
    await this.setupAuthentication();

    // Test each endpoint
    this.log('\n🔍 Testing documented endpoints:', 'bold');
    this.log('-'.repeat(50), 'blue');

    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, methodSpec] of Object.entries(methods)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
          await this.testEndpoint(path, method, methodSpec);
        }
      }
    }

    // Test undocumented endpoints that exist in routes
    await this.testUndocumentedEndpoints();

    // Print results
    this.printResults();
  }

  async testUndocumentedEndpoints() {
    this.log('\n🔍 Testing for undocumented endpoints:', 'bold');
    this.log('-'.repeat(50), 'blue');

    // List of endpoints that exist in routes but might not be documented
    const potentialEndpoints = [
      { path: '/health', method: 'get', documented: false },
      { path: '/metrics', method: 'get', documented: false },
      { path: '/api/chefaodacasa/cache/stats', method: 'get', documented: false },
      { path: '/api/chefaodacasa/cache/reset', method: 'post', documented: false },
    ];

    for (const endpoint of potentialEndpoints) {
      try {
        const config = {
          method: endpoint.method,
          url: `${API_BASE_URL}${endpoint.path}`,
          timeout: 5000,
          validateStatus: () => true
        };

        // Add auth for protected endpoints
        if (endpoint.path.includes('metrics') || endpoint.path.includes('chefaodacasa')) {
          if (this.authToken) {
            config.headers = {
              'Authorization': `Bearer ${this.authToken}`
            };
          }
        }

        const response = await axios(config);
        
        if (response.status !== 404) {
          this.log(`⚠ UNDOCUMENTED: ${endpoint.method.toUpperCase()} ${endpoint.path} (${response.status})`, 'yellow');
        }
      } catch (error) {
        // Ignore errors for undocumented endpoint testing
      }
    }
  }

  printResults() {
    this.log('\n📊 Validation Results:', 'bold');
    this.log('=' .repeat(50), 'blue');
    
    this.log(`Total endpoints tested: ${this.results.total}`, 'blue');
    this.log(`✓ Passed: ${this.results.passed}`, 'green');
    this.log(`✗ Failed: ${this.results.failed}`, 'red');
    this.log(`⏭ Skipped: ${this.results.skipped}`, 'yellow');
    
    const successRate = this.results.total > 0 
      ? ((this.results.passed / (this.results.total - this.results.skipped)) * 100).toFixed(1)
      : 0;
    
    this.log(`\n📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');

    if (this.results.errors.length > 0) {
      this.log('\n❌ Detailed Errors:', 'bold');
      this.log('-'.repeat(50), 'red');
      
      this.results.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error.endpoint}`, 'red');
        this.log(`   Error: ${error.error}`, 'red');
        if (error.status) {
          this.log(`   Status: ${error.status}`, 'red');
        }
        this.log('');
      });
    }

    // Summary
    if (this.results.failed === 0) {
      this.log('🎉 All tests passed! Documentation is accurate.', 'green');
    } else {
      this.log('⚠ Some tests failed. Please review the documentation.', 'yellow');
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new APIValidator();
  validator.validateAllEndpoints().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export default APIValidator;