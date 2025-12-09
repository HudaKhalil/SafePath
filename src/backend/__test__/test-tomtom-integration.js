/**
 * Test TomTom Traffic Integration
 * Run: node test-tomtom-integration.js
 */

require('dotenv').config();
const tomtomService = require('./lib/tomtomHazardsService');

async function testTomTomIntegration() {
  console.log('🧪 Testing TomTom Traffic Integration\n');
  
  // Test 1: Check API Key
  console.log('1️⃣ Checking API Key...');
  if (!process.env.TOMTOM_API_KEY || process.env.TOMTOM_API_KEY === 'your-tomtom-api-key-here') {
    console.log('❌ TomTom API key not configured');
    console.log('💡 Please add your TomTom API key to .env file');
    console.log('   Get one free at: https://developer.tomtom.com/');
    return;
  }
  console.log('✅ API key found\n');

  // Test 2: Fetch incidents from London
  console.log('2️⃣ Fetching incidents from London (51.5074, -0.1278)...');
  try {
    const incidents = await tomtomService.getTomTomHazards(51.5074, -0.1278, 5000);
    console.log(`✅ Found ${incidents.length} traffic incidents\n`);
    
    if (incidents.length > 0) {
      console.log('📋 Sample incidents:');
      incidents.slice(0, 3).forEach((incident, i) => {
        console.log(`\n${i + 1}. ${incident.type.toUpperCase()}`);
        console.log(`   Severity: ${incident.severity}`);
        console.log(`   Location: ${incident.latitude}, ${incident.longitude}`);
        console.log(`   Distance: ${incident.distance}m`);
        console.log(`   Description: ${incident.description.substring(0, 80)}...`);
      });
    } else {
      console.log('ℹ️  No incidents in this area (might be a quiet time)');
      console.log('💡 Try a busier city or time of day');
    }
  } catch (error) {
    console.log('❌ Failed to fetch incidents');
    console.log('Error:', error.message);
    return;
  }

  // Test 3: Try New York
  console.log('\n3️⃣ Fetching incidents from New York (40.7128, -74.0060)...');
  try {
    const incidents = await tomtomService.getTomTomHazards(40.7128, -74.0060, 5000);
    console.log(`✅ Found ${incidents.length} traffic incidents`);
    
    // Count by type
    const byType = incidents.reduce((acc, inc) => {
      acc[inc.type] = (acc[inc.type] || 0) + 1;
      return acc;
    }, {});
    
    if (Object.keys(byType).length > 0) {
      console.log('\n📊 Breakdown by type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  console.log('\n✅ TomTom integration test complete!');
  console.log('\n📚 Next steps:');
  console.log('   1. Start backend: npm run dev');
  console.log('   2. Test endpoint: curl "http://localhost:5001/api/hazards/combined/51.5074/-0.1278?includeTomTom=true"');
  console.log('   3. Open frontend and check "Nearby Hazards" section');
}

testTomTomIntegration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
