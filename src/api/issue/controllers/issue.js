'use strict';

/**
 * issue controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::issue.issue', ({ strapi }) => ({
  /**
   * Reorder issues with manager/mechanic permissions
   */
  async reorder(ctx) {
    try {
      const { reorderedIssues } = ctx.request.body;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!reorderedIssues || !Array.isArray(reorderedIssues)) {
        return ctx.badRequest('reorderedIssues array is required');
      }

      const isManager = user.role?.type === 'manager';

      // Check if issues are currently manager-controlled
      const managerControlledIssues = await strapi.db.query('api::issue.issue').findMany({
        where: { manager_ordered: true },
        limit: 1
      });

      const isManagerControlled = managerControlledIssues.length > 0;

      // Permission check: only manager can reorder if manager-controlled
      if (isManagerControlled && !isManager) {
        return ctx.forbidden('Only managers can reorder when manager-controlled');
      }

      // Update sort orders for all issues
      const updatePromises = reorderedIssues.map((issueUpdate, index) => {
        const updateData = {
          sort_order: (index + 1) * 10, // Give space between orders
        };

        // If manager is reordering, mark all issues as manager-controlled
        if (isManager) {
          updateData.manager_ordered = true;
        }

        return strapi.entityService.update('api::issue.issue', issueUpdate.id, {
          data: updateData
        });
      });

      await Promise.all(updatePromises);

      // If manager reordered, mark ALL issues as manager-controlled (even ones not in this batch)
      if (isManager) {
        await strapi.db.query('api::issue.issue').updateMany({
          data: { manager_ordered: true }
        });
      }

      ctx.send({ 
        success: true, 
        managerControlled: isManager,
        message: isManager 
          ? 'Ordning uppdaterad - nu styrd av chef'
          : 'Ordning ändrad lokalt'
      });

    } catch (error) {
      ctx.internalServerError('Failed to reorder issues', { error: error.message });
    }
  },

  /**
   * Reset to default ordering (manager only)
   */
  async resetOrder(ctx) {
    try {
      const user = ctx.state.user;

      if (!user || user.role?.type !== 'manager') {
        return ctx.forbidden('Only managers can reset ordering');
      }

      // Reset all issues to default ordering
      await strapi.db.query('api::issue.issue').updateMany({
        data: { 
          sort_order: 0,
          manager_ordered: false 
        }
      });

      ctx.send({ 
        success: true,
        message: 'Ordning återställd till standard'
      });

    } catch (error) {
      ctx.internalServerError('Failed to reset ordering', { error: error.message });
    }
  }
})); 