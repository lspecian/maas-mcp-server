/**
 * Test script for MAAS API connection
 */
import fetch from 'node-fetch';
import OAuth from 'oauth-1.0a';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Get MAAS API credentials from environment variables
const MAAS_API_URL = process.env.MAAS_API_URL;
const MAAS_API_KEY = process.env.MAAS_API_KEY;

// Validate environment variables
if (!MAAS_API_URL || !MAAS_API_KEY) {
  console.error('Error: MAAS_API_URL and MAAS_API_KEY environment variables must be set');
  process.exit(1);
}

console.log(`MAAS API URL: ${MAAS_API_URL}`);
console.log(`API Key: ${MAAS_API_KEY ? '********' : 'Not set'}`);

// Extract API key parts
const [consumerKey, token, secret] = MAAS_API_KEY.split(':');

// Test MAAS API connection
async function testMaasApi() {
  try {
    // Create OAuth 1.0a instance
    const oauth = OAuth({
      consumer: { key: consumerKey, secret: '' },
      signature_method: 'PLAINTEXT',
      hash_function(base_string, key) {
        return key; // PLAINTEXT signature just returns the key
      }
    });
    
    // First test the version endpoint
    const versionUrl = new URL(`${MAAS_API_URL}/api/2.0/version/`);
    const versionApiUrl = versionUrl.toString();
    
    console.log(`Making request to MAAS API version endpoint: ${versionApiUrl}`);
    
    // Prepare the request data for OAuth signing
    const versionRequestData = {
      url: versionApiUrl,
      method: 'GET'
    };
    
    // Get authorization header
    const versionAuthData = oauth.authorize(versionRequestData, {
      key: token,
      secret: secret
    });
    
    // Convert OAuth data to header
    const versionAuthHeader = oauth.toHeader(versionAuthData);
    
    console.log(`Using OAuth header for version: ${JSON.stringify(versionAuthHeader)}`);
    
    // Make the request
    const versionResponse = await fetch(versionApiUrl, {
      method: 'GET',
      headers: {
        ...versionAuthHeader,
        'Accept': 'application/json'
      }
    });
    
    // Log response status
    console.log(`MAAS API version response status: ${versionResponse.status} ${versionResponse.statusText}`);
    
    // Get response text
    const versionResponseText = await versionResponse.text();
    
    if (!versionResponse.ok) {
      throw new Error(`MAAS API error: ${versionResponse.status} ${versionResponse.statusText} - ${versionResponseText}`);
    }
    
    // Parse JSON response
    try {
      const versionData = JSON.parse(versionResponseText);
      console.log('MAAS API version response:', JSON.stringify(versionData, null, 2));
    } catch (e) {
      throw new Error(`Failed to parse MAAS API response as JSON: ${e.message}`);
    }
    
    // Now test the machines endpoint
    console.log('\n--- Testing machines endpoint ---\n');
    
    // Try a different approach for machines endpoint
    // Instead of adding op=list as a query parameter, let's try a POST request with op=list in the body
    const machinesUrl = new URL(`${MAAS_API_URL}/api/2.0/machines/`);
    const machinesApiUrl = machinesUrl.toString();
    
    console.log(`Making POST request to MAAS API machines endpoint: ${machinesApiUrl}`);
    
    // Prepare the request data for OAuth signing
    const machinesRequestData = {
      url: machinesApiUrl,
      method: 'POST',
      data: {
        op: 'list'
      }
    };
    
    // Get authorization header
    const machinesAuthData = oauth.authorize(machinesRequestData, {
      key: token,
      secret: secret
    });
    
    // Convert OAuth data to header
    const machinesAuthHeader = oauth.toHeader(machinesAuthData);
    
    console.log(`Using OAuth header for machines: ${JSON.stringify(machinesAuthHeader)}`);
    
    // Make the request
    const machinesResponse = await fetch(machinesApiUrl, {
      method: 'POST',
      headers: {
        ...machinesAuthHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'op=list'
    });
    
    // Log response status
    console.log(`MAAS API machines response status: ${machinesResponse.status} ${machinesResponse.statusText}`);
    
    // Get response text
    const machinesResponseText = await machinesResponse.text();
    
    if (!machinesResponse.ok) {
      throw new Error(`MAAS API error: ${machinesResponse.status} ${machinesResponse.statusText} - ${machinesResponseText}`);
    }
    
    // Parse JSON response
    try {
      const machinesData = JSON.parse(machinesResponseText);
      console.log(`Successfully retrieved ${machinesData.length} machines`);
      
      // Print first machine if available
      if (machinesData.length > 0) {
        console.log('First machine:', JSON.stringify(machinesData[0], null, 2));
      }
    } catch (e) {
      throw new Error(`Failed to parse MAAS API response as JSON: ${e.message}`);
    }
  } catch (error) {
    console.error('Error calling MAAS API:', error);
  }
}

// Run the test
testMaasApi();