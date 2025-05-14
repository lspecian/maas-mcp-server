#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const nodeModulesPath = path.join(process.cwd(), 'node_modules');

// List of required dependencies
const dependencies = [
  'zod',
  '@modelcontextprotocol/sdk',
  'dotenv',
  'oauth',
  'typescript',
  'jest',
  'ts-jest',
  'nodemon'
];

let allDepsInstalled = true;

console.log('Checking dependencies...');
console.log('------------------------');

dependencies.forEach(dep => {
  const depPath = dep.includes('/') 
    ? path.join(nodeModulesPath, ...dep.split('/'))
    : path.join(nodeModulesPath, dep);
  
  const exists = fs.existsSync(depPath);
  console.log(`${exists ? '✅' : '❌'} ${dep}`);
  
  if (!exists) {
    allDepsInstalled = false;
  }
});

console.log('------------------------');
if (allDepsInstalled) {
  console.log('✅ All dependencies are installed!');
  process.exit(0);
} else {
  console.log('❌ Some dependencies are missing!');
  process.exit(1);
}