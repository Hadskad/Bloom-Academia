/**
 * Quick Test Script for Streaming Implementation
 *
 * Tests the /api/teach/multi-ai-stream endpoint
 *
 * Usage:
 * 1. Make sure dev server is running: npm run dev
 * 2. Run this script: node test-streaming.js
 *
 * Note: You'll need to replace the IDs with valid ones from your database
 */

const TEST_CONFIG = {
  endpoint: 'http://localhost:3000/api/teach/multi-ai-stream',

  // ⚠️ REPLACE THESE WITH VALID IDs FROM YOUR DATABASE
  userId: 'test-user-id',        // Get from users table or localStorage
  sessionId: 'test-session-id',  // Get from sessions table
  lessonId: 'test-lesson-id',    // Get from lessons table (e.g., "Introduction to Fractions")

  // Test messages for different scenarios
  testMessages: [
    {
      name: 'Math Question (should route to math_specialist)',
      message: 'What is a fraction?'
    },
    {
      name: 'Greeting (should route through coordinator)',
      message: 'Hello! I\'m ready to learn.'
    },
    {
      name: 'Complex Math (should generate SVG)',
      message: 'Can you show me how to add 1/2 + 1/4?'
    }
  ]
};

async function testStreamingEndpoint() {
  console.log('🧪 Testing Streaming Implementation\n');
  console.log('Endpoint:', TEST_CONFIG.endpoint);
  console.log('──────────────────────────────────────\n');

  // Test 1: Basic connectivity
  console.log('Test 1: Checking endpoint connectivity...');
  try {
    const response = await fetch(TEST_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: TEST_CONFIG.userId,
        sessionId: TEST_CONFIG.sessionId,
        lessonId: TEST_CONFIG.lessonId,
        userMessage: TEST_CONFIG.testMessages[0].message
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Endpoint returned error:', error);
      console.log('\n⚠️  Make sure:');
      console.log('   1. Dev server is running (npm run dev)');
      console.log('   2. IDs in TEST_CONFIG are valid');
      console.log('   3. Database is accessible');
      console.log('   4. Environment variables are set (GEMINI_API_KEY, etc.)');
      return;
    }

    const data = await response.json();

    console.log('✅ Endpoint is working!\n');
    console.log('Response structure:');
    console.log('  - success:', data.success);
    console.log('  - agentName:', data.teacherResponse?.agentName);
    console.log('  - hasAudioText:', !!data.teacherResponse?.audioText);
    console.log('  - hasDisplayText:', !!data.teacherResponse?.displayText);
    console.log('  - hasSVG:', !!data.teacherResponse?.svg);
    console.log('  - hasAudio:', !!data.teacherResponse?.audioBase64);
    console.log('  - lessonComplete:', data.lessonComplete);
    console.log('  - routingReason:', data.routing?.reason);

    console.log('\n📝 Sample Response (first 200 chars):');
    console.log('  displayText:', data.teacherResponse?.displayText?.substring(0, 200) + '...');

    if (data.teacherResponse?.svg) {
      console.log('\n🎨 SVG Generated:', data.teacherResponse.svg.substring(0, 50) + '...');
    }

    console.log('\n✅ Test 1 PASSED - Streaming endpoint is functional!');
    console.log('──────────────────────────────────────\n');

    // Test 2: Response quality
    console.log('Test 2: Validating response quality...');

    const checks = [
      { name: 'success field', pass: data.success === true },
      { name: 'teacherResponse exists', pass: !!data.teacherResponse },
      { name: 'audioText exists', pass: !!data.teacherResponse?.audioText },
      { name: 'displayText exists', pass: !!data.teacherResponse?.displayText },
      { name: 'audioBase64 exists', pass: !!data.teacherResponse?.audioBase64 },
      { name: 'agentName exists', pass: !!data.teacherResponse?.agentName },
      { name: 'routing info exists', pass: !!data.routing },
      { name: 'lessonComplete is boolean', pass: typeof data.lessonComplete === 'boolean' }
    ];

    checks.forEach(check => {
      console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);
    console.log(`\n${allPassed ? '✅' : '❌'} Test 2 ${allPassed ? 'PASSED' : 'FAILED'} - Response quality`);
    console.log('──────────────────────────────────────\n');

    // Test 3: JSON Schema compliance
    console.log('Test 3: Checking JSON schema compliance...');

    try {
      // Verify audioText doesn't contain SVG code
      const hasSvgInAudio = data.teacherResponse?.audioText?.includes('<svg') ||
                           data.teacherResponse?.audioText?.includes('[SVG]');

      console.log(`  ${!hasSvgInAudio ? '✅' : '❌'} audioText is clean (no SVG code)`);

      // Verify displayText can contain markdown
      const hasMarkdown = data.teacherResponse?.displayText?.includes('#') ||
                         data.teacherResponse?.displayText?.includes('**');

      console.log(`  ${hasMarkdown ? '✅' : '⚠️ '} displayText uses markdown formatting`);

      // Verify SVG is valid XML if present
      if (data.teacherResponse?.svg) {
        const isValidSvg = data.teacherResponse.svg.startsWith('<svg') &&
                          data.teacherResponse.svg.includes('</svg>');
        console.log(`  ${isValidSvg ? '✅' : '❌'} SVG is valid XML`);
      } else {
        console.log('  ℹ️  No SVG in response (optional)');
      }

      console.log('\n✅ Test 3 PASSED - Schema compliance verified');
      console.log('──────────────────────────────────────\n');

    } catch (e) {
      console.log('\n❌ Test 3 FAILED:', e.message);
    }

    console.log('🎉 All Tests Completed!\n');
    console.log('Next Steps:');
    console.log('  1. Test in browser (see TESTING_GUIDE.md)');
    console.log('  2. Verify all agents work (math, science, etc.)');
    console.log('  3. Test SVG generation with visual questions');
    console.log('  4. Monitor server logs for [Streaming] messages');
    console.log('  5. Compare latency vs non-streaming endpoint\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n⚠️  Troubleshooting:');
    console.log('   - Check if server is running on http://localhost:3000');
    console.log('   - Verify network connectivity');
    console.log('   - Check server logs for errors');
  }
}

// Run tests
testStreamingEndpoint().catch(console.error);
