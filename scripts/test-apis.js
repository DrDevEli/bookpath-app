#!/usr/bin/env node

/**
 * Test script for BookPath APIs
 * This script tests Google Books and Booklooker APIs
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const BOOKLOOKER_API_KEY = process.env.BOOKLOOKER_API_KEY;

console.log('🧪 BookPath API Test Script');
console.log('===========================\n');

// Test Google Books API
async function testGoogleBooksAPI() {
  console.log('🔍 Testing Google Books API...');
  
  if (!GOOGLE_BOOKS_API_KEY || GOOGLE_BOOKS_API_KEY === 'your_google_books_api_key_here') {
    console.log('❌ Google Books API key not configured');
    return false;
  }

  try {
    const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
      params: {
        q: 'harry potter',
        key: GOOGLE_BOOKS_API_KEY,
        maxResults: 5
      },
      timeout: 10000
    });

    if (response.data && response.data.items) {
      console.log('✅ Google Books API working correctly');
      console.log(`   Found ${response.data.items.length} results`);
      console.log(`   Total items: ${response.data.totalItems}`);
      return true;
    } else {
      console.log('❌ Google Books API returned invalid response');
      return false;
    }
  } catch (error) {
    console.log('❌ Google Books API test failed');
    console.log(`   Error: ${error.message}`);
    if (error.response?.status === 403) {
      console.log('   This might be due to an invalid API key or quota exceeded');
    }
    return false;
  }
}

// Test Booklooker API
async function testBooklookerAPI() {
  console.log('\n📚 Testing Booklooker API...');
  
  if (!BOOKLOOKER_API_KEY || BOOKLOOKER_API_KEY === 'your_booklooker_api_key_here') {
    console.log('❌ Booklooker API key not configured');
    return false;
  }

  try {
    const response = await axios.get('https://api.booklooker.de/search', {
      params: {
        q: 'harry potter',
        key: BOOKLOOKER_API_KEY,
        limit: 5
      },
      timeout: 10000
    });

    if (response.data && response.data.results) {
      console.log('✅ Booklooker API working correctly');
      console.log(`   Found ${response.data.results.length} results`);
      console.log(`   Total results: ${response.data.total_results || 'unknown'}`);
      return true;
    } else {
      console.log('❌ Booklooker API returned invalid response');
      return false;
    }
  } catch (error) {
    console.log('❌ Booklooker API test failed');
    console.log(`   Error: ${error.message}`);
    if (error.response?.status === 401) {
      console.log('   This might be due to an invalid API key');
    }
    return false;
  }
}

// Main test function
async function runTests() {
  const googleResult = await testGoogleBooksAPI();
  const booklookerResult = await testBooklookerAPI();

  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`Google Books API: ${googleResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Booklooker API: ${booklookerResult ? '✅ PASS' : '❌ FAIL'}`);

  if (googleResult && booklookerResult) {
    console.log('\n🎉 All APIs are working correctly!');
    console.log('Your BookPath application should now have access to multiple book sources.');
  } else {
    console.log('\n⚠️  Some APIs are not working.');
    console.log('Check your API keys and try again.');
    console.log('See docs/API_SETUP_GUIDE.md for troubleshooting.');
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Restart your development server: npm run dev');
  console.log('2. Test book search in your application');
  console.log('3. Check server logs for API responses');
}

// Run the tests
runTests().catch(console.error); 