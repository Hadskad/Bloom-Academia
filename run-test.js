/**
 * Simple Test Runner for Streaming Implementation
 *
 * This script will:
 * 1. Wait for dev server to be ready
 * 2. Create a test user if needed
 * 3. Test the streaming endpoint
 */

const TEST_CONFIG = {
  endpoint: 'http://localhost:3000/api/teach/multi-ai-stream',
  createUserEndpoint: 'http://localhost:3000/api/users/create',
  startSessionEndpoint: 'http://localhost:3000/api/sessions/start',
  lessonsEndpoint: 'http://localhost:3000/api/lessons',
  testMessage: 'What is a fraction?'
};

async function waitForServer(maxAttempts = 30) {
  console.log('⏳ Waiting for dev server to start...');

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (response.ok) {
        console.log('✅ Server is ready!\n');
        return true;
      }
    } catch (e) {
      // Server not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    process.stdout.write(`   Attempt ${i + 1}/${maxAttempts}...\r`);
  }

  console.log('\n❌ Server failed to start');
  return false;
}

async function createTestUser() {
  console.log('👤 Creating test user...');

  try {
    const response = await fetch(TEST_CONFIG.createUserEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        age: 10,
        grade: 5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create user');
    }

    console.log(`✅ User created: ${data.userId}\n`);
    return data.userId;
  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
    throw error;
  }
}

async function getLesson() {
  console.log('📚 Fetching lessons...');

  try {
    const response = await fetch(TEST_CONFIG.lessonsEndpoint);
    const data = await response.json();

    if (!response.ok || !data.lessons || data.lessons.length === 0) {
      throw new Error('No lessons found');
    }

    // Find "Introduction to Fractions" or use first lesson
    const lesson = data.lessons.find(l => l.title.includes('Fraction')) || data.lessons[0];

    console.log(`✅ Using lesson: ${lesson.title}\n`);
    return lesson.id;
  } catch (error) {
    console.error('❌ Failed to fetch lessons:', error.message);
    throw error;
  }
}

async function startSession(userId, lessonId) {
  console.log('🎓 Starting session...');

  try {
    const response = await fetch(TEST_CONFIG.startSessionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, lessonId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to start session');
    }

    console.log(`✅ Session started: ${data.sessionId}\n`);
    return data.sessionId;
  } catch (error) {
    console.error('❌ Failed to start session:', error.message);
    throw error;
  }
}

async function testStreamingEndpoint(userId, sessionId, lessonId) {
  console.log('🧪 Testing Streaming Endpoint');
  console.log('════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    console.log('📤 Sending request to streaming endpoint...');
    console.log(`   Message: "${TEST_CONFIG.testMessage}"`);
    console.log(`   User: ${userId.slice(0, 8)}...`);
    console.log(`   Session: ${sessionId.slice(0, 8)}...`);
    console.log(`   Lesson: ${lessonId.slice(0, 8)}...\n`);

    const response = await fetch(TEST_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        sessionId,
        lessonId,
        userMessage: TEST_CONFIG.testMessage
      })
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.details || 'Request failed');
    }

    const data = await response.json();

    console.log('✅ Response received!\n');
    console.log('⏱️  Performance:');
    console.log(`   Total latency: ${latency}ms`);
    console.log(`   Target: <2000ms`);
    console.log(`   ${latency < 2000 ? '✅ PASS' : '⚠️  SLOW'}\n`);

    console.log('📊 Response Structure:');
    console.log(`   success: ${data.success}`);
    console.log(`   agentName: ${data.teacherResponse?.agentName}`);
    console.log(`   hasAudioText: ${!!data.teacherResponse?.audioText}`);
    console.log(`   hasDisplayText: ${!!data.teacherResponse?.displayText}`);
    console.log(`   hasSVG: ${!!data.teacherResponse?.svg}`);
    console.log(`   hasAudio: ${!!data.teacherResponse?.audioBase64}`);
    console.log(`   lessonComplete: ${data.lessonComplete}`);
    console.log(`   routingReason: ${data.routing?.reason}\n`);

    console.log('📝 Response Preview (first 200 chars):');
    console.log(`   ${data.teacherResponse?.displayText?.substring(0, 200)}...\n`);

    if (data.teacherResponse?.svg) {
      console.log('🎨 SVG Generated:');
      console.log(`   ${data.teacherResponse.svg.substring(0, 80)}...\n`);
    }

    // Validation checks
    console.log('✓ Validation Checks:');
    const checks = [
      { name: 'Response is successful', pass: data.success === true },
      { name: 'Has teacher response', pass: !!data.teacherResponse },
      { name: 'Has audio text', pass: !!data.teacherResponse?.audioText },
      { name: 'Has display text', pass: !!data.teacherResponse?.displayText },
      { name: 'Has audio base64', pass: !!data.teacherResponse?.audioBase64 },
      { name: 'Has agent name', pass: !!data.teacherResponse?.agentName },
      { name: 'Has routing info', pass: !!data.routing },
      { name: 'Audio is clean (no SVG)', pass: !data.teacherResponse?.audioText?.includes('<svg') },
      { name: 'Latency < 2500ms', pass: latency < 2500 }
    ];

    checks.forEach(check => {
      console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);

    console.log('\n════════════════════════════════════════');
    console.log(`${allPassed ? '✅ ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
    console.log('════════════════════════════════════════\n');

    if (allPassed) {
      console.log('🎉 Streaming implementation is working correctly!\n');
      console.log('Next steps:');
      console.log('  1. Test in browser at http://localhost:3000');
      console.log('  2. Try different questions and agents');
      console.log('  3. Monitor server logs for [Streaming] messages');
      console.log('  4. Check DevTools Network tab for latency\n');
    } else {
      console.log('⚠️  Some checks failed. Review the output above.\n');
    }

    return allPassed;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('  - Check server logs for errors');
    console.log('  - Verify GEMINI_API_KEY is set in .env.local');
    console.log('  - Ensure database is accessible');
    console.log('  - Try testing non-streaming endpoint first\n');

    return false;
  }
}

async function main() {
  console.log('\n🚀 Streaming Implementation Test Runner\n');

  try {
    // Step 1: Wait for server
    const serverReady = await waitForServer();
    if (!serverReady) {
      console.error('Cannot proceed without server');
      process.exit(1);
    }

    // Step 2: Create test user
    const userId = await createTestUser();

    // Step 3: Get lesson
    const lessonId = await getLesson();

    // Step 4: Start session
    const sessionId = await startSession(userId, lessonId);

    // Step 5: Test streaming endpoint
    const success = await testStreamingEndpoint(userId, sessionId, lessonId);

    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the test
main();
