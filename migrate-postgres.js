/**
 * PostgreSQL migration to update "Hög" priority to "Kritisk"
 * This connects to the remote PostgreSQL database on your VPS
 */

const { Client } = require('pg');
require('dotenv').config();

async function migratePostgreSQL() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log(`🗄️  Connecting to PostgreSQL database: ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}`);
    await client.connect();
    console.log('✅ Connected successfully!');

    // Check if issues table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'issues'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Issues table not found in database');
      await client.end();
      return;
    }

    // Check current data
    const countResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM issues 
      WHERE priority = 'Hög'
    `);
    const countBefore = parseInt(countResult.rows[0].count);
    console.log(`📋 Found ${countBefore} issues with "Hög" priority`);

    if (countBefore === 0) {
      console.log('✅ No issues to migrate. All done!');
      await client.end();
      return;
    }

    // Show which issues will be updated
    const issuesToUpdate = await client.query(`
      SELECT id, title, priority 
      FROM issues 
      WHERE priority = 'Hög' 
      ORDER BY id 
      LIMIT 10
    `);
    
    console.log('\n🔄 Sample issues to be updated:');
    issuesToUpdate.rows.forEach(issue => {
      console.log(`   - Issue ${issue.id}: "${issue.title}" (${issue.priority} → Kritisk)`);
    });
    
    if (countBefore > 10) {
      console.log(`   ... and ${countBefore - 10} more issues`);
    }

    console.log('\n⚠️  This will update ALL issues with "Hög" priority to "Kritisk" priority.');
    console.log('⚠️  This action cannot be undone easily.');
    
    // For safety, let's do a dry run first
    console.log('\n🔍 Performing dry run (no changes will be made)...');
    
    // Show the SQL that would be executed
    console.log('SQL to be executed: UPDATE issues SET priority = \'Kritisk\' WHERE priority = \'Hög\';');

    // Now do the actual update
    console.log('\n🚀 Executing migration...');
    const updateResult = await client.query(`
      UPDATE issues 
      SET priority = 'Kritisk' 
      WHERE priority = 'Hög'
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} issues`);

    // Verify the migration
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM issues 
      WHERE priority = 'Hög'
    `);
    const countAfter = parseInt(verifyResult.rows[0].count);
    
    const kritiskCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM issues 
      WHERE priority = 'Kritisk'
    `);
    const kritiskTotal = parseInt(kritiskCount.rows[0].count);

    console.log('\n🔍 Migration verification:');
    console.log(`   - Remaining issues with "Hög" priority: ${countAfter}`);
    console.log(`   - Total issues with "Kritisk" priority: ${kritiskTotal}`);

    if (countAfter === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('✅ You can now restart your Strapi backend and the Issues page should work.');
    } else {
      console.log(`\n❌ Migration incomplete: ${countAfter} issues still have "Hög" priority`);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n🔍 Cannot connect to database. Possible issues:');
      console.error('   1. VPS is down or unreachable');
      console.error('   2. Database credentials are incorrect');
      console.error('   3. Firewall blocking connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🔍 Connection refused. Check:');
      console.error('   1. Database port is correct');
      console.error('   2. PostgreSQL service is running');
    }
    
    process.exit(1);
    
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
migratePostgreSQL();
