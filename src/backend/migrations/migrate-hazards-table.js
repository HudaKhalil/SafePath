const db = require('./config/database');

async function migrateHazardsTable() {
  try {
    // Wait for database to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔄 Starting hazards table migration...');
    
    // Check if columns already exist
    const checkColumns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hazards' 
      AND column_name IN ('priority_level', 'affects_traffic', 'weather_related')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('Existing columns:', existingColumns);
    
    // Add priority_level column if it doesn't exist
    if (!existingColumns.includes('priority_level')) {
      console.log('Adding priority_level column...');
      await db.query(`
        ALTER TABLE hazards 
        ADD COLUMN priority_level VARCHAR(20) DEFAULT 'normal'
      `);
      console.log('✅ Added priority_level column');
    } else {
      console.log('⏭️  priority_level column already exists');
    }
    
    // Add affects_traffic column if it doesn't exist
    if (!existingColumns.includes('affects_traffic')) {
      console.log('Adding affects_traffic column...');
      await db.query(`
        ALTER TABLE hazards 
        ADD COLUMN affects_traffic BOOLEAN DEFAULT false
      `);
      console.log('✅ Added affects_traffic column');
    } else {
      console.log('⏭️  affects_traffic column already exists');
    }
    
    // Add weather_related column if it doesn't exist
    if (!existingColumns.includes('weather_related')) {
      console.log('Adding weather_related column...');
      await db.query(`
        ALTER TABLE hazards 
        ADD COLUMN weather_related BOOLEAN DEFAULT false
      `);
      console.log('✅ Added weather_related column');
    } else {
      console.log('⏭️  weather_related column already exists');
    }
    
    // Update existing hazards with appropriate values based on severity
    console.log('Updating existing hazards with default values...');
    await db.query(`
      UPDATE hazards 
      SET 
        priority_level = CASE 
          WHEN severity = 'critical' THEN 'urgent'
          WHEN severity = 'high' THEN 'high'
          WHEN severity = 'medium' THEN 'normal'
          ELSE 'low'
        END,
        affects_traffic = CASE 
          WHEN hazard_type IN ('accident', 'construction', 'road_damage', 'flooding') THEN true
          ELSE false
        END,
        weather_related = CASE 
          WHEN hazard_type IN ('flooding', 'poor_lighting') THEN true
          ELSE false
        END
      WHERE priority_level IS NULL OR affects_traffic IS NULL OR weather_related IS NULL
    `);
    
    console.log('✅ Migration completed successfully!');
    
    // Show updated table structure
    const tableInfo = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'hazards'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Updated hazards table structure:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.column_default ? `[default: ${col.column_default}]` : ''}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateHazardsTable();
