/**
 * Migration script to update existing issues with "Hög" priority to "Kritisk"
 * Run this once after updating the schema to remove "Hög" priority
 * 
 * Usage: npm run strapi migrate-priority-data.js
 */

const Strapi = require('@strapi/strapi');

async function migratePriorityData() {
  let strapi;
  
  try {
    console.log('🚀 Starting Strapi...');
    strapi = Strapi();
    await strapi.load();
    await strapi.start();

    console.log('📊 Checking for issues with "Hög" priority...');
    
    // Find all issues with "Hög" priority
    const issuesWithHoegPriority = await strapi.entityService.findMany('api::issue.issue', {
      filters: {
        priority: 'Hög'
      },
      populate: '*'
    });

    console.log(`📋 Found ${issuesWithHoegPriority.length} issues with "Hög" priority`);

    if (issuesWithHoegPriority.length === 0) {
      console.log('✅ No issues to migrate. All done!');
      return;
    }

    console.log('🔄 Migrating issues from "Hög" to "Kritisk" priority...');

    // Update each issue to use "Kritisk" instead of "Hög"
    let updatedCount = 0;
    for (const issue of issuesWithHoegPriority) {
      try {
        await strapi.entityService.update('api::issue.issue', issue.id, {
          data: {
            priority: 'Kritisk'
          }
        });
        updatedCount++;
        console.log(`   ✓ Updated issue ${issue.id}: "${issue.title}"`);
      } catch (error) {
        console.error(`   ❌ Failed to update issue ${issue.id}:`, error.message);
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`   - Total issues found: ${issuesWithHoegPriority.length}`);
    console.log(`   - Successfully updated: ${updatedCount}`);
    console.log(`   - Failed: ${issuesWithHoegPriority.length - updatedCount}`);

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const remainingHoegIssues = await strapi.entityService.findMany('api::issue.issue', {
      filters: {
        priority: 'Hög'
      }
    });

    if (remainingHoegIssues.length === 0) {
      console.log('✅ Migration verified: No issues with "Hög" priority remain');
    } else {
      console.log(`❌ Migration incomplete: ${remainingHoegIssues.length} issues still have "Hög" priority`);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    if (strapi) {
      console.log('🛑 Shutting down Strapi...');
      await strapi.stop();
    }
    process.exit(0);
  }
}

// Run the migration
migratePriorityData();
