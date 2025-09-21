'use strict';

/**
 * Custom migration controller to update "Hög" priority to "Kritisk"
 * This endpoint can be called via REST API to perform the migration
 * 
 * Usage: POST /api/issues/migrate-priority
 */

module.exports = {
  async migratePriority(ctx) {
    try {
      console.log('🔄 Starting priority migration...');
      
      // Find all issues with "Hög" priority
      const issuesWithHoegPriority = await strapi.entityService.findMany('api::issue.issue', {
        filters: {
          priority: 'Hög'
        },
        populate: {
          machine: true,
          created_by: true,
          assigned_to: true
        }
      });

      console.log(`📋 Found ${issuesWithHoegPriority.length} issues with "Hög" priority`);

      if (issuesWithHoegPriority.length === 0) {
        ctx.body = {
          success: true,
          message: 'No issues to migrate',
          updated: 0,
          issues: []
        };
        return;
      }

      // Update each issue to use "Kritisk" instead of "Hög"
      let updatedCount = 0;
      const updatedIssues = [];
      
      for (const issue of issuesWithHoegPriority) {
        try {
          const updatedIssue = await strapi.entityService.update('api::issue.issue', issue.id, {
            data: {
              priority: 'Kritisk'
            }
          });
          updatedCount++;
          updatedIssues.push({
            id: issue.id,
            title: issue.title,
            oldPriority: 'Hög',
            newPriority: 'Kritisk'
          });
          console.log(`   ✓ Updated issue ${issue.id}: "${issue.title}"`);
        } catch (error) {
          console.error(`   ❌ Failed to update issue ${issue.id}:`, error.message);
        }
      }

      // Verify the migration
      const remainingHoegIssues = await strapi.entityService.findMany('api::issue.issue', {
        filters: {
          priority: 'Hög'
        }
      });

      const success = remainingHoegIssues.length === 0;
      
      ctx.body = {
        success,
        message: success 
          ? `Migration completed successfully! Updated ${updatedCount} issues.`
          : `Migration partially completed. ${remainingHoegIssues.length} issues still have "Hög" priority.`,
        totalFound: issuesWithHoegPriority.length,
        updated: updatedCount,
        remaining: remainingHoegIssues.length,
        updatedIssues
      };

    } catch (error) {
      console.error('💥 Migration failed:', error);
      ctx.throw(500, `Migration failed: ${error.message}`);
    }
  }
};
