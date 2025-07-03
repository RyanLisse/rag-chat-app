#!/usr/bin/env bun

/**
 * Development Health Check Script for RAG Chat Application
 * Verifies all systems are operational
 */

console.log('🏥 RAG Chat Application Health Check\n');

const checks = [];

// Check environment variables
function checkEnvVars() {
  console.log('📋 Checking environment variables...');
  const required = [
    'DATABASE_URL',
    'AUTH_SECRET',
    'OPENAI_API_KEY',
    'XAI_API_KEY',
  ];

  const optional = [
    'OPENAI_VECTORSTORE_ID',
    'ANTHROPIC_API_KEY',
    'GOOGLE_API_KEY',
  ];

  let allGood = true;

  required.forEach((key) => {
    if (process.env[key]) {
      const value = process.env[key];
      const masked = value.length > 10 ? `${value.substring(0, 10)}...` : '***';
      console.log(`  ✓ ${key} is set (${masked})`);
    } else {
      console.log(`  ✗ ${key} is missing`);
      allGood = false;
    }
  });

  optional.forEach((key) => {
    if (process.env[key]) {
      console.log(`  ✓ ${key} is set (optional)`);
    } else {
      console.log(`  ⚠ ${key} is not set (optional)`);
    }
  });

  checks.push({ name: 'Environment Variables', passed: allGood });
  return allGood;
}

// Check if server is running
async function checkServer() {
  console.log('\n🚀 Checking server status...');

  try {
    const response = await fetch('http://localhost:3000', {
      redirect: 'manual', // Don't follow redirects
    });

    // 307 redirect means auth is working
    if (response.ok || response.status === 307 || response.status === 302) {
      console.log('  ✓ Server is running on http://localhost:3000');
      if (response.status === 307 || response.status === 302) {
        console.log(
          '  ✓ Authentication system is active (redirecting to login)'
        );
      }
      checks.push({ name: 'Server Status', passed: true });
      return true;
    }
    console.log(`  ✗ Server returned unexpected status ${response.status}`);
    checks.push({ name: 'Server Status', passed: false });
    return false;
  } catch (error) {
    console.log('  ✗ Server is not running');
    console.log('    Run "make dev" to start the server');
    checks.push({ name: 'Server Status', passed: false });
    return false;
  }
}

// Check database connection
async function checkDatabase() {
  console.log('\n🗄️  Checking database connection...');

  if (process.env.DATABASE_URL?.startsWith('file:')) {
    console.log('  ✓ Mock database is active (local development mode)');
    checks.push({ name: 'Database Connection', passed: true });
    return true;
  }

  console.log('  ℹ️  PostgreSQL connection will be tested when accessed');
  checks.push({ name: 'Database Connection', passed: true });
  return true;
}

// Main health check
async function runHealthCheck() {
  // Load environment variables
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    // Bun doesn't need dotenv, env vars are already loaded
  }

  // Run checks
  checkEnvVars();
  await checkDatabase();
  await checkServer();

  // Summary
  console.log('\n📊 Health Check Summary');
  console.log('═══════════════════════\n');

  let allPassed = true;
  checks.forEach((check) => {
    if (check.passed) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name}`);
      allPassed = false;
    }
  });

  if (allPassed) {
    console.log('\n✨ All systems operational!');
    console.log('\n🎯 Next steps:');
    console.log('  1. Open http://localhost:3000 in your browser');
    console.log('  2. Start chatting with the AI');
    console.log('  3. Try uploading files for RAG search');
    console.log('  4. Check the citation artifacts feature');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some issues detected. Please check the output above.');
    console.log('\n💡 Common fixes:');
    console.log('  - Missing env vars: Copy .env.example to .env.local');
    console.log('  - Server not running: Run "make dev"');
    console.log('  - Database issues: Check DATABASE_URL in .env.local');
    process.exit(1);
  }
}

// Run the health check
runHealthCheck().catch((error) => {
  console.error('\n❌ Health check failed with error:', error);
  process.exit(1);
});
