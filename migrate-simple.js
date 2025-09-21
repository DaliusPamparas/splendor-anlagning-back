/**
 * Simple SQLite migration to update "Hög" priority to "Kritisk"
 * This script works directly with the SQLite database file
 */

const path = require('path');
const Database = require('better-sqlite3');

async function migrateDatabase() {
  try {
    // Default SQLite database path for Strapi development
    const dbPath = path.join(__dirname, '.tmp', 'data.db');
    console.log(`🗄️  Connecting to SQLite database: ${dbPath}`);
    
    const db = Database(dbPath);
    
    // Check if issues table exists
    const tablesResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='issues'").get();
    if (!tablesResult) {
      console.log('❌ Issues table not found. Make sure Strapi has been run at least once.');
      db.close();
      return;
    }
    
    // Check current data
    const countBefore = db.prepare("SELECT COUNT(*) as count FROM issues WHERE priority = 'Hög'").get();
    console.log(`📋 Found ${countBefore.count} issues with "Hög" priority`);
    
    if (countBefore.count === 0) {
      console.log('✅ No issues to migrate. All done!');
      db.close();
      return;
    }
    
    // Show which issues will be updated
    const issuesToUpdate = db.prepare("SELECT id, title, priority FROM issues WHERE priority = 'Hög'").all();
    console.log('\n🔄 Issues to be updated:');
    issuesToUpdate.forEach(issue => {
      console.log(`   - Issue ${issue.id}: "${issue.title}" (${issue.priority} → Kritisk)`);
    });
    
    // Update the priority
    const updateResult = db.prepare("UPDATE issues SET priority = 'Kritisk' WHERE priority = 'Hög'").run();
    console.log(`\n✅ Updated ${updateResult.changes} issues`);
    
    // Verify the migration
    const countAfter = db.prepare("SELECT COUNT(*) as count FROM issues WHERE priority = 'Hög'").get();
    const countKritisk = db.prepare("SELECT COUNT(*) as count FROM issues WHERE priority = 'Kritisk'").get();
    
    console.log('\n🔍 Migration verification:');
    console.log(`   - Remaining issues with "Hög" priority: ${countAfter.count}`);
    console.log(`   - Total issues with "Kritisk" priority: ${countKritisk.count}`);
    
    if (countAfter.count === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('   You can now restart your Strapi backend.');
    } else {
      console.log(`\n❌ Migration incomplete: ${countAfter.count} issues still have "Hög" priority`);
    }
    
    db.close();
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    
    if (error.code === 'ENOENT') {
      console.error('\n🔍 Database file not found. Possible solutions:');
      console.error('   1. Make sure Strapi has been run at least once');
      console.error('   2. Check if database is in a different location');
      console.error('   3. Try running "npm run develop" first to create the database');
    }
    
    process.exit(1);
  }
}

// Run the migration
migrateDatabase();
