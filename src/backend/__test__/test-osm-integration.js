/**
 * Test script for OSM Hazards Integration
 * Run with: node test-osm-integration.js
 */

const osmHazardsService = require('./lib/osmHazardsService');

async function testOSMIntegration() {
  console.log('🧪 Testing OSM Hazards Integration\n');

  // Test Location 1: Dublin 18 - Sandyford
  console.log('📍 Test 1: Dublin 18 - Sandyford (Your Location)');
  console.log('   Coordinates: 53.2764, -6.2186');
  try {
    const sandyfordHazards = await osmHazardsService.getOSMHazards(53.2764, -6.2186, 3000);
    console.log(`   ✅ Found ${sandyfordHazards.length} OSM hazards`);
    if (sandyfordHazards.length > 0) {
      console.log('   \n   📋 Hazards near you in Sandyford:');
      sandyfordHazards.slice(0, 5).forEach((h, i) => {
        console.log(`   ${i + 1}. ${h.description}`);
        console.log(`      Type: ${h.type}, Severity: ${h.severity}`);
        console.log(`      Location: ${h.latitude}, ${h.longitude}`);
        console.log('');
      });
    } else {
      console.log('   ℹ️  No construction/closures found in this area');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test Location 2: Stillorgan (nearby)
  console.log('📍 Test 2: Stillorgan (nearby)');
  console.log('   Coordinates: 53.2896, -6.1998');
  try {
    const stillorganHazards = await osmHazardsService.getOSMHazards(53.2896, -6.1998, 2000);
    console.log(`   ✅ Found ${stillorganHazards.length} OSM hazards`);
    if (stillorganHazards.length > 0) {
      console.log('   Sample:', stillorganHazards[0].description);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test Location 3: Dundrum (nearby)
  console.log('📍 Test 3: Dundrum (nearby)');
  console.log('   Coordinates: 53.2924, -6.2444');
  try {
    const dundrumHazards = await osmHazardsService.getOSMHazards(53.2924, -6.2444, 2000);
    console.log(`   ✅ Found ${dundrumHazards.length} OSM hazards`);
    if (dundrumHazards.length > 0) {
      console.log('   Sample hazard:');
      console.log('   -', dundrumHazards[0].description);
      console.log('   -', 'Type:', dundrumHazards[0].type);
      console.log('   -', 'Severity:', dundrumHazards[0].severity);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test merging functionality
  console.log('📊 Test 4: Merge Functionality');
  const communityHazards = [
    {
      id: 1,
      source: 'community',
      latitude: 51.5074,
      longitude: -0.1278,
      type: 'pothole',
      description: 'Test community hazard'
    }
  ];
  
  const osmHazards = [
    {
      id: 'osm-test-1',
      source: 'osm',
      latitude: 51.5074,
      longitude: -0.1278,
      type: 'construction',
      description: 'Test OSM hazard (duplicate - same location)'
    },
    {
      id: 'osm-test-2',
      source: 'osm',
      latitude: 51.5084,
      longitude: -0.1288,
      type: 'construction',
      description: 'Test OSM hazard (different location)'
    }
  ];

  const merged = osmHazardsService.mergeHazards(communityHazards, osmHazards);
  console.log(`   Community: ${communityHazards.length}`);
  console.log(`   OSM: ${osmHazards.length}`);
  console.log(`   Merged (after deduplication): ${merged.length}`);
  console.log(`   ✅ Deduplication working: ${merged.length === 2 ? 'YES' : 'NO'}`);

  console.log('\n✨ Testing complete!\n');
}

// Run tests
testOSMIntegration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
