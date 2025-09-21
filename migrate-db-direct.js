/**
 * Direct database migration script to update "Hög" priority to "Kritisk"
 * This bypasses Strapi's validation and updates the database directly
 */

const path = require('path');

async function migrateDatabase() {
  // Import database configuration
  const databaseConfig = require('./config/database.js');
  
  let knex;
  
  try {
    // Create database connection
    const config = databaseConfig.connection;
    console.log('📊 Database config:', JSON.stringify(config, null, 2));
    
    // Use different database libraries based on client
    if (config.client === 'better-sqlite3') {
      // For SQLite
      const Database = require('better-sqlite3');
      const dbPath = path.resolve(__dirname, config.connection.filename);
      console.log(`🗄️  Connecting to SQLite database: ${dbPath}`);
      
      const db = Database(dbPath);
      
      // Check current data
      const countBefore = db.prepare("SELECT COUNT(*) as count FROM issues WHERE priority = 'Hög'").get();
      console.log(`📋 Found ${countBefore.count} issues with "Hög" priority`);
      
      if (countBefore.count === 0) {
        console.log('✅ No issues to migrate. All done!');
        db.close();
        return;
      }
      
      // Update the priority
      const updateResult = db.prepare("UPDATE issues SET priority = 'Kritisk' WHERE priority = 'Hög'").run();
      console.log(`🔄 Updated ${updateResult.changes} issues`);
      
      // Verify the migration
      const countAfter = db.prepare("SELECT COUNT(*) as count FROM issues WHERE priority = 'Hög'").get();
      console.log(`🔍 Remaining issues with "Hög" priority: ${countAfter.count}`);
      
      if (countAfter.count === 0) {
        console.log('✅ Migration completed successfully!');
      } else {
        console.log(`❌ Migration incomplete: ${countAfter.count} issues still have "Hög" priority`);
      }
      
      db.close();
      
    } else if (config.client === 'pg') {
      // For PostgreSQL
      const { Client } = require('pg');
      const client = new Client(config.connection);
      
      await client.connect();
      console.log('🗄️  Connected to PostgreSQL database');
      
      // Check current data
      const countResult = await client.query("SELECT COUNT(*) as count FROM issues WHERE priority = 'Hög'");
      const countBefore = parseInt(countResult.rows[0].count);
      console.log(`📋 Found ${countBefore} issues with "Hög" priority`);
      
      if (countBefore === 0) {
        console.log('✅ No issues to migrate. All done!');
        await client.end();
        return;
      }
      
      // Update the priority
      const updateResult = await client.query("UPDATE issues SET priority = 'Kritisk' WHERE priority = 'Hög'");
      console.log(`🔄 Updated ${updateResult.rowCount} issues`);
      
      // Verify the migration
      const verifyResult = await client.query("SELECT COUNT(*) as count FROM issues WHERE priority = 'Hög'");
      const countAfter = parseInt(verifyResult.rows[0].count);
      console.log(`🔍 Remaining issues with "Hög" priority: ${countAfter}`);
      
      if (countAfter === 0) {
        console.log('✅ Migration completed successfully!');
      } else {
        console.log(`❌ Migration incomplete: ${countAfter} issues still have "Hög" priority`);
      }
      
      await client.end();
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateDatabase();
