/**
 * Test Time-of-Day Routing Adjustments
 * Run: node test-time-routing.js
 */

const routeCalculator = require('./lib/routeCalculator');

async function testTimeOfDayRouting() {
  console.log('🧪 Testing Time-of-Day Routing Adjustments\n');
  
  // Test coordinates: London (Westminster to Tower Bridge)
  const fromLat = 51.5007;
  const fromLon = -0.1246;
  const toLat = 51.5055;
  const toLon = -0.0754;
  
  console.log('📍 Test Route: Westminster to Tower Bridge');
  console.log('   From: [51.5007, -0.1246]');
  console.log('   To:   [51.5055, -0.0754]');
  console.log('   Mode: walking\n');
  
  // Test different times of day
  const timeContexts = ['day', 'night', 'morning-rush', 'evening-rush'];
  
  for (const timeOfDay of timeContexts) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`⏰ Testing: ${timeOfDay.toUpperCase()}`);
    console.log('='.repeat(60));
    
    try {
      const result = await routeCalculator.calculateRoutes(
        fromLat,
        fromLon,
        toLat,
        toLon,
        'walking',
        null, // Use default preferences
        timeOfDay
      );
      
      if (result.success) {
        console.log('\n✅ Route calculation successful!');
        console.log('\n📊 Fastest Route:');
        console.log(`   Distance: ${result.fastest.distance} km`);
        console.log(`   Time: ${result.fastest.time} minutes`);
        console.log(`   Safety Score: ${result.fastest.safetyScore.toFixed(3)} (0=safe, 1=danger)`);
        console.log(`   Safety Rating: ${result.fastest.safetyRating.toFixed(2)}/10`);
        console.log(`   Adjusted Weights:`, result.fastest.factorWeights);
        
        console.log('\n📊 Safest Route:');
        console.log(`   Distance: ${result.safest.distance} km`);
        console.log(`   Time: ${result.safest.time} minutes`);
        console.log(`   Safety Score: ${result.safest.safetyScore.toFixed(3)} (0=safe, 1=danger)`);
        console.log(`   Safety Rating: ${result.safest.safetyRating.toFixed(2)}/10`);
        console.log(`   Same as fastest: ${result.safest.sameAsFastest ? 'Yes' : 'No'}`);
        
        // Calculate improvement
        const improvement = ((result.fastest.safetyScore - result.safest.safetyScore) / result.fastest.safetyScore * 100);
        console.log(`\n🛡️ Safety Improvement: ${improvement.toFixed(1)}%`);
        
        // Show weight adjustments
        console.log('\n⚖️ Weight Adjustments for', timeOfDay.toUpperCase() + ':');
        const weights = result.fastest.factorWeights;
        console.log(`   Crime:     ${(weights.crime * 100).toFixed(1)}%`);
        console.log(`   Collision: ${(weights.collision * 100).toFixed(1)}%`);
        console.log(`   Lighting:  ${(weights.lighting * 100).toFixed(1)}%`);
        console.log(`   Hazard:    ${(weights.hazard * 100).toFixed(1)}%`);
        
      } else {
        console.log('❌ Route calculation failed:', result.error || result.message);
      }
      
    } catch (error) {
      console.error('❌ Error during test:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Time-of-Day Routing Test Complete!');
  console.log('='.repeat(60));
  console.log('\n📝 Key Observations:');
  console.log('   1. NIGHT: Should have highest lighting weight');
  console.log('   2. RUSH HOURS: Should have highest collision/hazard weights');
  console.log('   3. DAY: Should have lowest lighting weight');
  console.log('   4. All weights should sum to 100%');
}

// Run tests
testTimeOfDayRouting().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
