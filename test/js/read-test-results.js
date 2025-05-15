/**
 * Script to read and display the test results from the list-machines-test-results.json file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the test results file
const TEST_RESULTS_FILE = path.resolve(__dirname, '../results/list-machines-test-results.json');

try {
  // Read the test results file
  const testResults = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf8'));
  
  // Display the test results
  console.log('Test Results:');
  console.log(JSON.stringify(testResults, null, 2));
  
  // Extract and display the machines
  if (testResults.lastResponse && 
      testResults.lastResponse.result && 
      testResults.lastResponse.result.content && 
      testResults.lastResponse.result.content.length > 0) {
    
    // Parse the machines from the content text
    const machinesData = JSON.parse(testResults.lastResponse.result.content[0].text);
    
    console.log('\nMachines:');
    console.log(JSON.stringify(machinesData.machines, null, 2));
    
    console.log(`\nTotal machines: ${machinesData.machines.length}`);
  } else {
    console.log('No machine data found in the test results');
  }
} catch (err) {
  console.error(`Error reading test results: ${err.message}`);
}