const { default: Strapi } = require('@strapi/strapi');

/**
 * Migration script to update Issue status and priority values
 * From Swedish to English and correct casing
 */

const STATUS_MAPPING = {
  'Öppen': 'reported',
  'Pågående': 'in_progress',
  'Löst': 'completed',
  'Loest': 'completed',
  'Open': 'reported',
  'In Progress': 'in_progress',
  'Solved': 'completed',
  'reported': 'reported',
  'assessed': 'assessed',
  'pending_approval': 'pending_approval',
  'approved': 'approved',
  'in_progress': 'in_progress',
  'completed': 'completed',
  'closed': 'closed',
  'rejected': 'rejected',
  'cancelled': 'cancelled'
};

const PRIORITY_MAPPING = {
  'Low': 'low',
  'Medium': 'medium',
  'High': 'high',
  'Critical': 'critical',
  'Låg': 'low',
  'Medel': 'medium',
  'Hög': 'high',
  'Kritisk': 'critical',
  'low': 'low',
  'medium': 'medium',
  'high': 'high',
  'critical': 'critical'
};

async function migrateIssueData() {
  const strapi = await Strapi().load();

  try {
    console.log('🚀 Starting Issue data migration...\n');

    // Get all issues directly from database
    const knex = strapi.db.connection;
    const issues = await knex('issues').select('*');

    console.log(`📊 Found ${issues.length} issues to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const issue of issues) {
      try {
        const updates = {};
        let needsUpdate = false;

        // Check and map status
        if (issue.status) {
          const newStatus = STATUS_MAPPING[issue.status];
          if (newStatus && newStatus !== issue.status) {
            updates.status = newStatus;
            needsUpdate = true;
            console.log(`  📝 Issue ${issue.id}: "${issue.status}" → "${newStatus}"`);
          } else if (!newStatus) {
            console.log(`  ⚠️  Issue ${issue.id}: Unknown status "${issue.status}", setting to "reported"`);
            updates.status = 'reported';
            needsUpdate = true;
          }
        } else {
          updates.status = 'reported';
          needsUpdate = true;
          console.log(`  ⚠️  Issue ${issue.id}: No status, setting to "reported"`);
        }

        // Check and map priority
        if (issue.priority) {
          const newPriority = PRIORITY_MAPPING[issue.priority];
          if (newPriority && newPriority !== issue.priority) {
            updates.priority = newPriority;
            needsUpdate = true;
            console.log(`  📝 Issue ${issue.id}: Priority "${issue.priority}" → "${newPriority}"`);
          } else if (!newPriority) {
            console.log(`  ⚠️  Issue ${issue.id}: Unknown priority "${issue.priority}", setting to "medium"`);
            updates.priority = 'medium';
            needsUpdate = true;
          }
        } else {
          updates.priority = 'medium';
          needsUpdate = true;
          console.log(`  ⚠️  Issue ${issue.id}: No priority, setting to "medium"`);
        }

        // Perform update if needed
        if (needsUpdate) {
          await knex('issues')
            .where({ id: issue.id })
            .update({
              ...updates,
              updated_at: new Date()
            });
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error updating issue ${issue.id}:`, error.message);
        errors.push({ issueId: issue.id, error: error.message });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed!');
    console.log('='.repeat(60));
    console.log(`📊 Total issues: ${issues.length}`);
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped (already correct): ${skippedCount}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(({ issueId, error }) => {
        console.log(`  - Issue ${issueId}: ${error}`);
      });
    }

    console.log('\n✨ Done! You can now restart your frontend.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await strapi.destroy();
  }
}

// Run migration
migrateIssueData()
  .then(() => {
    console.log('👋 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

