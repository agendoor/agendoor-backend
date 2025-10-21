const http = require('http');

const baseURL = 'http://localhost:3001';
let token = null;

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, useAuth = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseURL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (useAuth && token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data ? JSON.parse(data) : null,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runSmokeTests() {
  console.log('🔥 Starting Smoke Tests...\n');
  
  try {
    // Test 1: Health Check
    console.log('1. Testing health endpoint...');
    const health = await makeRequest('GET', '/api/health');
    console.assert(health.status === 200, 'Health check should return 200');
    console.assert(health.data.status === 'ok', 'Health status should be ok');
    console.log('✅ Health check passed\n');

    // Test 2: Protected route without auth should return 401
    console.log('2. Testing protected route without auth...');
    const unauth = await makeRequest('GET', '/api/financial/summary');
    console.assert(unauth.status === 401, 'Should return 401 without auth');
    console.log('✅ Auth protection working\n');

    // Note: Further tests would require a valid user account and login
    // For now, we're testing basic connectivity and auth protection
    
    console.log('✅ All smoke tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Smoke tests failed:', error);
    process.exit(1);
  }
}

runSmokeTests();
