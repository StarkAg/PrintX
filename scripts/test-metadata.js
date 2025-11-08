#!/usr/bin/env node

/**
 * Test script for /api/metadata endpoint
 * 
 * Usage:
 *   node scripts/test-metadata.js
 * 
 * Tests:
 *   1. OPTIONS preflight request
 *   2. POST request with valid metadata
 *   3. POST request with file bytes (should be rejected)
 *   4. POST request with oversized metadata (should be rejected)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testMetadataAPI() {
  console.log(`Testing metadata API at ${BASE_URL}/api/metadata\n`);

  // Test 1: OPTIONS preflight
  console.log('Test 1: OPTIONS preflight request...');
  try {
    const optionsResponse = await fetch(`${BASE_URL}/api/metadata`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    console.log(`Status: ${optionsResponse.status}`);
    console.log('Headers:');
    console.log(`  Access-Control-Allow-Origin: ${optionsResponse.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`  Access-Control-Allow-Methods: ${optionsResponse.headers.get('Access-Control-Allow-Methods')}`);
    console.log(`  Access-Control-Allow-Headers: ${optionsResponse.headers.get('Access-Control-Allow-Headers')}`);
    console.log(`  Access-Control-Max-Age: ${optionsResponse.headers.get('Access-Control-Max-Age')}`);
    console.log(optionsResponse.status === 200 ? '✅ PASSED\n' : '❌ FAILED\n');
  } catch (error) {
    console.error('❌ FAILED:', error.message, '\n');
  }

  // Test 2: POST with valid metadata
  console.log('Test 2: POST with valid metadata...');
  try {
    const validMetadata = {
      orderId: 'PX-1234567890-abcd',
      total: 100.50,
      vpa: 'test@bank',
      filesMeta: [
        {
          name: 'test.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          options: {
            format: 'A4',
            color: 'B&W',
            paperGSM: '40gsm',
          },
        },
      ],
    };

    const postResponse = await fetch(`${BASE_URL}/api/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
      },
      body: JSON.stringify(validMetadata),
    });

    console.log(`Status: ${postResponse.status}`);
    const responseData = await postResponse.json();
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log(postResponse.status === 200 && responseData.ok === true ? '✅ PASSED\n' : '❌ FAILED\n');
  } catch (error) {
    console.error('❌ FAILED:', error.message, '\n');
  }

  // Test 3: POST with file bytes (should be rejected)
  console.log('Test 3: POST with file bytes (should be rejected)...');
  try {
    const metadataWithFiles = {
      orderId: 'PX-1234567890-efgh',
      total: 100.50,
      vpa: 'test@bank',
      filesMeta: [
        {
          name: 'test.pdf',
          size: 1024,
          mimeType: 'application/pdf',
        },
      ],
      files: [
        {
          name: 'test.pdf',
          data: 'a'.repeat(2000), // Simulate base64 file data
          mimeType: 'application/pdf',
          size: 1024,
        },
      ],
    };

    const postResponse = await fetch(`${BASE_URL}/api/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
      },
      body: JSON.stringify(metadataWithFiles),
    });

    console.log(`Status: ${postResponse.status}`);
    const responseData = await postResponse.json();
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log(postResponse.status === 400 && responseData.error === 'File bytes detected' ? '✅ PASSED\n' : '❌ FAILED\n');
  } catch (error) {
    console.error('❌ FAILED:', error.message, '\n');
  }

  // Test 4: POST with oversized metadata (should be rejected)
  console.log('Test 4: POST with oversized metadata (should be rejected)...');
  try {
    const oversizedMetadata = {
      orderId: 'PX-1234567890-ijkl',
      total: 100.50,
      vpa: 'test@bank',
      filesMeta: Array(10000).fill(null).map((_, i) => ({
        name: `test${i}.pdf`,
        size: 1024,
        mimeType: 'application/pdf',
      })),
    };

    const postResponse = await fetch(`${BASE_URL}/api/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
      },
      body: JSON.stringify(oversizedMetadata),
    });

    console.log(`Status: ${postResponse.status}`);
    const responseData = await postResponse.json();
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log(postResponse.status === 413 ? '✅ PASSED\n' : '❌ FAILED\n');
  } catch (error) {
    console.error('❌ FAILED:', error.message, '\n');
  }

  console.log('All tests completed!');
}

// Run tests
testMetadataAPI().catch(console.error);

