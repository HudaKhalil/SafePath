/**
 * Test route calculation for specific Dublin coordinates
 * South County Business Park area
 */

const routeCalculator = require('./lib/routeCalculator');

async function testDublinRoute() {
  console.log('🧪 Testing Dublin Route with Hazards\n');
  
  // South County Business Park area coordinates
  // These should have hazards between them according to user
  const fromLat = 53.2764;  // Sandyford area
  const fromLon = -6.2186;
  const toLat = 53.2924;    // Dundrum area  
  const toLon = -6.2444;
  
  console.log('📍 Test Route: Sandyford to Dundrum');
  console.log(`   From: [${fromLat}, ${fromLon}]`);
  console.log(`   To:   [${toLat}, ${toLon}]`);
  console.log('   Mode: walking\n');
  
  try {
    // Test with default preferences (no time specified, will auto-detect)
    const result = await routeCalculator.calculateRoutes(
      fromLat,
      fromLon,
      toLat,
      toLon,
      'walking',
      null  // Use default preferences
    );
    
    if (result.success) {
      console.log('\n✅ Route calculation successful!\n');
      
      console.log('📊 FASTEST Route:');
      console.log(`   Distance: ${result.fastest.distance} km`);
      console.log(`   Time: ${result.fastest.time} minutes`);
      console.log(`   Safety Score: ${result.fastest.safetyScore.toFixed(3)} (0=safe, 1=danger)`);
      console.log(`   Safety Rating: ${result.fastest.safetyRating.toFixed(2)}/10`);
      
      console.log('\n📊 SAFEST Route:');
      console.log(`   Distance: ${result.safest.distance} km`);
      console.log(`   Time: ${result.safest.time} minutes`);
      console.log(`   Safety Score: ${result.safest.safetyScore.toFixed(3)} (0=safe, 1=danger)`);
      console.log(`   Safety Rating: ${result.safest.safetyRating.toFixed(2)}/10`);
      console.log(`   Same as fastest: ${result.safest.sameAsFastest ? 'YES ❌' : 'NO ✅'}`);
      console.log(`   Route type: ${result.safest.routeType}`);
      
      // Calculate differences
      const distanceDiff = result.safest.distance - result.fastest.distance;
      const timeDiff = result.safest.time - result.fastest.time;
      const safetyImprovement = ((result.fastest.safetyScore - result.safest.safetyScore) / result.fastest.safetyScore * 100);
      
      console.log('\n📈 Comparison:');
      console.log(`   Distance difference: ${distanceDiff >= 0 ? '+' : ''}${distanceDiff.toFixed(2)} km (${(distanceDiff/result.fastest.distance*100).toFixed(1)}%)`);
      console.log(`   Time difference: ${timeDiff >= 0 ? '+' : ''}${timeDiff.toFixed(1)} min`);
      console.log(`   Safety improvement: ${safetyImprovement.toFixed(1)}%`);
      
      if (result.safest.sameAsFastest) {
        console.log('\n⚠️  WARNING: Safest and fastest routes are IDENTICAL!');
        console.log('   This suggests:');
        console.log('   1. No dangerous segments detected above threshold (0.20)');
        console.log('   2. OSRM found no alternative routes');
        console.log('   3. Generated waypoint routes were not safer or too long');
      } else {
        console.log('\n✅ SUCCESS: Routes are different, safer alternative found!');
      }
      
    } else {
      console.log('❌ Route calculation failed:', result.error || result.message);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  process.exit(0);
}

testDublinRoute();
