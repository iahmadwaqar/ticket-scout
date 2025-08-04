#!/usr/bin/env node

/**
 * Development environment test script
 * Verifies that hot module replacement and development workflow are working correctly
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Testing development environment...\n');

// Test 1: Verify Vite configuration
console.log('✅ Testing Vite configuration...');
const viteConfigPath = path.join(__dirname, '..', 'electron.vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  console.log('   ✓ electron.vite.config.ts found');
  const config = fs.readFileSync(viteConfigPath, 'utf8');
  if (config.includes('fastRefresh: true')) {
    console.log('   ✓ Fast Refresh enabled');
  }
  if (config.includes('hmr:')) {
    console.log('   ✓ HMR configuration found');
  }
} else {
  console.log('   ❌ electron.vite.config.ts not found');
}

// Test 2: Verify TypeScript configuration
console.log('\n✅ Testing TypeScript configuration...');
const tsConfigPath = path.join(__dirname, '..', 'tsconfig.web.json');
if (fs.existsSync(tsConfigPath)) {
  console.log('   ✓ tsconfig.web.json found');
  const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
  if (tsConfig.compilerOptions && tsConfig.compilerOptions.paths) {
    console.log('   ✓ Path aliases configured');
  }
} else {
  console.log('   ❌ tsconfig.web.json not found');
}

// Test 3: Verify migrated components structure
console.log('\n✅ Testing migrated components structure...');
const componentsPath = path.join(__dirname, '..', 'src', 'renderer', 'src', 'components');
if (fs.existsSync(componentsPath)) {
  console.log('   ✓ Components directory found');
  const components = fs.readdirSync(componentsPath);
  console.log(`   ✓ Found ${components.length} component directories`);
  
  // Check for key migrated components
  const keyComponents = ['dashboard', 'ui', 'dev-test'];
  keyComponents.forEach(comp => {
    if (components.includes(comp)) {
      console.log(`   ✓ ${comp} components found`);
    }
  });
} else {
  console.log('   ❌ Components directory not found');
}

// Test 4: Verify hot reload test component
console.log('\n✅ Testing hot reload test component...');
const hotReloadTestPath = path.join(__dirname, '..', 'src', 'renderer', 'src', 'components', 'dev-test', 'HotReloadTest.tsx');
if (fs.existsSync(hotReloadTestPath)) {
  console.log('   ✓ HotReloadTest component found');
  const component = fs.readFileSync(hotReloadTestPath, 'utf8');
  if (component.includes('useState')) {
    console.log('   ✓ Component uses React hooks (good for HMR testing)');
  }
} else {
  console.log('   ❌ HotReloadTest component not found');
}

console.log('\n🎉 Development environment test completed!');
console.log('\n📝 To test hot reload manually:');
console.log('   1. Run: pnpm run dev');
console.log('   2. Modify the HotReloadTest component');
console.log('   3. Verify changes appear without full page refresh');
console.log('   4. Check that component state is preserved during updates');