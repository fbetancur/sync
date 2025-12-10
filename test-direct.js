#!/usr/bin/env node

console.log('🧪 TEST DIRECTO');
console.log('Args:', process.argv.slice(2));

try {
  const result = await import('./tools/scripts/generate-component-fixed.js');
  console.log('✅ Import exitoso');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}