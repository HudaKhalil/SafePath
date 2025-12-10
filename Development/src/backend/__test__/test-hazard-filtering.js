/**
 * Test Hazard Date Filtering
 * Tests if hazards with end_date in the past are properly filtered
 * Run: node test-hazard-filtering.js
 */

require('dotenv').config();
const tomtomService = require('./lib/tomtomHazardsService');

async function testHazardFiltering() {
  console.log('🧪 Testing Hazard Date Filtering\n');
  
  // Test location (London)
  const lat = 51.5074;
  const lon = -0.1278;
  const radius = 5000;
  
  console.log(`📍 Testing location: London (${lat}, ${lon})`);
  console.log(`📏 Radius: ${radius}m\n`);
  
  // Check API Key
  if (!process.env.TOMTOM_API_KEY || process.env.TOMTOM_API_KEY === 'your-tomtom-api-key-here') {
    console.log('❌ TomTom API key not configured');
    console.log('💡 Please add your TomTom API key to .env file\n');
    return;
  }
  
  try {
    // Fetch TomTom hazards
    console.log('🚦 Fetching TomTom traffic incidents...\n');
    const incidents = await tomtomService.getTomTomHazards(lat, lon, radius);
    
    console.log(`✅ Found ${incidents.length} total TomTom incidents\n`);
    
    if (incidents.length === 0) {
      console.log('ℹ️  No incidents in this area right now');
      console.log('💡 Try a busier location or time of day\n');
      return;
    }
    
    // Current date/time
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    console.log(`⏰ Current date/time: ${now.toISOString()}`);
    console.log(`📅 One month ago: ${oneMonthAgo.toISOString()}\n`);
    
    // Analyze incidents by date status
    let endedCount = 0;
    let activeCount = 0;
    let oldCount = 0;
    let recentCount = 0;
    
    const endedIncidents = [];
    const oldIncidents = [];
    const activeIncidents = [];
    
    incidents.forEach(incident => {
      const hasEndDate = incident.end_date && incident.end_date !== null;
      const endDate = hasEndDate ? new Date(incident.end_date) : null;
      const reportDate = new Date(incident.reported_at || incident.start_date);
      
      // Check if ended
      if (hasEndDate && endDate < now) {
        endedCount++;
        endedIncidents.push({
          id: incident.id,
          type: incident.type,
          severity: incident.severity,
          endDate: incident.end_date,
          description: incident.description.substring(0, 60) + '...'
        });
      } else {
        activeCount++;
        activeIncidents.push(incident);
      }
      
      // Check if old (>1 month)
      if (reportDate < oneMonthAgo) {
        oldCount++;
        oldIncidents.push({
          id: incident.id,
          type: incident.type,
          severity: incident.severity,
          reportedAt: incident.reported_at,
          description: incident.description.substring(0, 60) + '...'
        });
      } else {
        recentCount++;
      }
    });
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 FILTERING ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`Total incidents fetched: ${incidents.length}`);
    console.log(`├─ ✅ Active (no end_date or future end_date): ${activeCount}`);
    console.log(`└─ ❌ Ended (end_date in past): ${endedCount}\n`);
    
    console.log(`Age analysis:`);
    console.log(`├─ 🆕 Recent (< 1 month old): ${recentCount}`);
    console.log(`└─ ⏳ Old (> 1 month old): ${oldCount}\n`);
    
    // Show ended incidents (should be filtered by frontend)
    if (endedCount > 0) {
      console.log('❌ ENDED INCIDENTS (should NOT be displayed):');
      console.log('───────────────────────────────────────────────────────────');
      endedIncidents.forEach((inc, i) => {
        console.log(`${i + 1}. ${inc.type.toUpperCase()} (${inc.severity})`);
        console.log(`   End date: ${inc.endDate}`);
        console.log(`   ${inc.description}`);
        console.log('');
      });
    }
    
    // Show old incidents (should be filtered by frontend)
    if (oldCount > 0) {
      console.log('⏳ OLD INCIDENTS (> 1 month, should NOT be displayed):');
      console.log('───────────────────────────────────────────────────────────');
      oldIncidents.slice(0, 5).forEach((inc, i) => {
        console.log(`${i + 1}. ${inc.type.toUpperCase()} (${inc.severity})`);
        console.log(`   Reported: ${inc.reportedAt}`);
        console.log(`   ${inc.description}`);
        console.log('');
      });
      if (oldCount > 5) {
        console.log(`   ... and ${oldCount - 5} more old incidents\n`);
      }
    }
    
    // Show what SHOULD be displayed
    console.log('✅ ACTIVE & RECENT INCIDENTS (should BE displayed):');
    console.log('───────────────────────────────────────────────────────────');
    
    const displayable = activeIncidents.filter(inc => {
      const reportDate = new Date(inc.reported_at || inc.start_date);
      return reportDate >= oneMonthAgo;
    });
    
    console.log(`${displayable.length} incidents should appear on the map:\n`);
    
    displayable.slice(0, 5).forEach((inc, i) => {
      const reportDate = new Date(inc.reported_at || inc.start_date);
      const age = Math.floor((now - reportDate) / (1000 * 60 * 60 * 24)); // days
      
      console.log(`${i + 1}. ${inc.type.toUpperCase()} (${inc.severity})`);
      console.log(`   Location: ${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}`);
      console.log(`   Distance: ${Math.round(inc.distance)}m`);
      console.log(`   Age: ${age} day(s) old`);
      if (inc.end_date) {
        console.log(`   Ends: ${inc.end_date}`);
      } else {
        console.log(`   Ends: Not specified (ongoing)`);
      }
      console.log(`   ${inc.description.substring(0, 70)}...`);
      console.log('');
    });
    
    if (displayable.length > 5) {
      console.log(`   ... and ${displayable.length - 5} more displayable incidents\n`);
    }
    
    // Test results
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎯 EXPECTED FRONTEND BEHAVIOR');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`Frontend should display: ${displayable.length} hazards`);
    console.log(`Frontend should filter out: ${endedCount} ended + ${oldCount} old = ${endedCount + oldCount} hazards\n`);
    
    if (endedCount > 0 || oldCount > 0) {
      console.log('✅ FILTERING IS WORKING if these numbers match what you see on the map!');
      console.log('❌ FILTERING IS BROKEN if you see more hazards than expected!\n');
    } else {
      console.log('✅ All incidents are active and recent - no filtering needed!');
      console.log('ℹ️  All fetched hazards should appear on your map.\n');
    }
    
    // Instructions
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📝 HOW TO VERIFY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('1. Open your app at http://localhost:3000');
    console.log('2. Check the "Nearby Hazards" section on the homepage');
    console.log('3. Look at the TomTom hazard count (orange icon)');
    console.log(`4. You should see approximately ${displayable.length} TomTom hazards`);
    console.log(`5. You should NOT see any of the ${endedCount + oldCount} filtered hazards listed above\n`);
    
    console.log('💡 TIP: Check browser console for:');
    console.log('   "📍 Community hazards: X, TomTom hazards: Y"\n');
    
  } catch (error) {
    console.error('❌ Error testing hazards:', error.message);
    console.error('\nFull error:', error);
  }
}

testHazardFiltering().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
