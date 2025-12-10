const db = require('./config/database');

async function addTestHazards() {
  try {
    // Wait for database to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test location near Dublin (adjust to your test location)
    const testHazards = [
      {
        latitude: 53.2705,
        longitude: -6.2038,
        hazard_type: 'construction',
        severity: 'high',
        description: 'Road construction ahead',
        status: 'active',
        user_id: 21  // Your logged-in user ID
      },
      {
        latitude: 53.2710,
        longitude: -6.2045,
        hazard_type: 'accident',
        severity: 'critical',
        description: 'Traffic accident reported',
        status: 'active',
        user_id: 21
      },
      {
        latitude: 53.2700,
        longitude: -6.2030,
        hazard_type: 'poor_lighting',
        severity: 'medium',
        description: 'Street lights not working',
        status: 'active',
        user_id: 21
      }
    ];

    console.log('Adding test hazards...');
    
    for (const hazard of testHazards) {
      const query = `
        INSERT INTO hazards (
          location,
          latitude,
          longitude,
          hazard_type,
          severity,
          description,
          status,
          user_id,
          reported_at
        ) VALUES (
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $2, $1, $3, $4, $5, $6, $7, NOW()
        ) RETURNING id;
      `;
      
      const result = await db.query(query, [
        hazard.longitude,
        hazard.latitude,
        hazard.hazard_type,
        hazard.severity,
        hazard.description,
        hazard.status,
        hazard.user_id
      ]);
      
      console.log(`✅ Added hazard ${result.rows[0].id}: ${hazard.hazard_type} at [${hazard.latitude}, ${hazard.longitude}]`);
    }
    
    console.log('✅ All test hazards added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test hazards:', error);
    process.exit(1);
  }
}

addTestHazards();
