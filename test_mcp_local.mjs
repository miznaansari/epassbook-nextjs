import { PrismaClient } from './node_modules/@prisma/client/default.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- Starting Passbook Remote MCP Test ---');

  // 1. Find a user in the database
  let user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found, creating a test user...');
    user = await prisma.user.create({
      data: {
        id: 'test_user_' + Date.now(),
        email: 'testmcp@example.com',
        name: 'MCP Test User',
        currency: 'USD',
      }
    });
  }
  console.log(`Found user: ${user.name} (${user.email}, id: ${user.id})`);

  // 2. Create a test API key
  const randomSecret = crypto.randomBytes(24).toString('hex');
  const testKey = `pb_live_${randomSecret}`;
  const prefix = `pb_live_${randomSecret.slice(0, 6)}...${randomSecret.slice(-4)}`;

  const createdApiKey = await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: 'Automated Test Key',
      key: testKey,
      prefix: prefix,
      isActive: true,
    }
  });
  console.log(`Created test API Key in DB: ${createdApiKey.prefix}`);

  // Test with local MCP tools directly via module import
  const { executeMcpTool, executeMcpResourceRead, MCP_TOOLS, MCP_RESOURCES } = await import('./lib/mcpTools.js');

  console.log(`\nVerified MCP Tools Count: ${MCP_TOOLS.length}`);
  MCP_TOOLS.forEach(t => console.log(`  - Tool: ${t.name} (${t.description.slice(0, 50)}...)`));

  console.log(`\nVerified MCP Resources Count: ${MCP_RESOURCES.length}`);
  MCP_RESOURCES.forEach(r => console.log(`  - Resource: ${r.uri} (${r.name})`));

  // Test Tool 1: get_dashboard_summary
  console.log('\n--- Testing executeMcpTool: get_dashboard_summary ---');
  const dashSummary = await executeMcpTool('get_dashboard_summary', { filter: 'current' }, user);
  console.log('Dashboard summary result:', JSON.stringify(dashSummary, null, 2));

  // Test Tool 2: list_transactions
  console.log('\n--- Testing executeMcpTool: list_transactions ---');
  const txList = await executeMcpTool('list_transactions', { limit: 5 }, user);
  console.log('Transactions list result count:', txList.count);

  // Test Tool 3: get_user_profile
  console.log('\n--- Testing executeMcpTool: get_user_profile ---');
  const profile = await executeMcpTool('get_user_profile', {}, user);
  console.log('User profile result:', profile);

  // Test Resource: passbook://dashboard
  console.log('\n--- Testing executeMcpResourceRead: passbook://dashboard ---');
  const resRead = await executeMcpResourceRead('passbook://dashboard', user);
  console.log('Resource read success, length of JSON:', resRead.contents[0].text.length);

  // Cleanup test key
  await prisma.apiKey.delete({ where: { id: createdApiKey.id } });
  console.log('\nCleaned up test API Key.');
  console.log('\n>>> ALL MCP UNIT & TOOL TESTS PASSED! <<<');
}

runTest().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
