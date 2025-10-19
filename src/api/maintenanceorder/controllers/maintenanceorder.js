'use strict';

/**
 * maintenance-order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::maintenanceorder.maintenanceorder', ({ strapi }) => ({
  /**
   * Mark maintenance order as completed
   */
  async complete(ctx) {
    const { id } = ctx.params;
    const { completedBy, completedAt, notes } = ctx.request.body;

    try {
      const maintenanceOrder = await strapi.entityService.findOne(
        'api::maintenanceorder.maintenanceorder',
        id,
        { populate: ['machine', 'template'] }
      );

      if (!maintenanceOrder) {
        return ctx.notFound('Maintenance order not found');
      }

      // Update maintenance order
      const updated = await strapi.entityService.update(
        'api::maintenanceorder.maintenanceorder',
        id,
        {
          data: {
            status: 'completed',
            completed_at: completedAt || new Date().toISOString(),
            completed_by: completedBy,
            last_performed_at: new Date().toISOString(),
            notes: [...(maintenanceOrder.notes || []), ...(notes || [])],
          },
        }
      );

      return ctx.send({ data: updated });
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Schedule maintenance order
   */
  async schedule(ctx) {
    const { id } = ctx.params;
    const { scheduledAt, assignedTo } = ctx.request.body;

    try {
      const updated = await strapi.entityService.update(
        'api::maintenanceorder.maintenanceorder',
        id,
        {
          data: {
            status: 'scheduled',
            scheduled_at: scheduledAt,
            assigned_to: assignedTo,
          },
        }
      );

      return ctx.send({ data: updated });
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Mark maintenance order as overdue
   */
  async checkOverdue(ctx) {
    try {
      const now = new Date();
      
      // Find all planned or scheduled orders that are past due
      const overdueOrders = await strapi.entityService.findMany(
        'api::maintenanceorder.maintenanceorder',
        {
          filters: {
            status: {
              $in: ['planned', 'scheduled'],
            },
            due_date: {
              $lt: now.toISOString(),
            },
          },
        }
      );

      // Update their status to overdue
      for (const order of overdueOrders) {
        await strapi.entityService.update(
          'api::maintenanceorder.maintenanceorder',
          order.id,
          {
            data: { status: 'overdue' },
          }
        );
      }

      return ctx.send({ 
        message: `${overdueOrders.length} maintenance orders marked as overdue`,
        count: overdueOrders.length 
      });
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Calculate priority score for a maintenance order
   */
  async calculatePriority(ctx) {
    const { id } = ctx.params;

    try {
      const order = await strapi.entityService.findOne(
        'api::maintenanceorder.maintenanceorder',
        id,
        { populate: ['machine'] }
      );

      if (!order) {
        return ctx.notFound('Maintenance order not found');
      }

      // Simple priority calculation
      let complianceUrgency = 5;
      let overdueFactor = 0;
      let machineCriticality = 5;
      let safetyImpact = 5;
      let seasonalFactor = 0;

      // Calculate overdue factor
      if (order.due_date) {
        const dueDate = new Date(order.due_date);
        const now = new Date();
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) {
          overdueFactor = Math.min(10, Math.abs(daysUntilDue) / 3);
        } else if (daysUntilDue <= 7) {
          complianceUrgency = 8;
        }
      }

      // Calculate final score
      const finalScore = (
        complianceUrgency * 0.3 +
        overdueFactor * 0.25 +
        machineCriticality * 0.25 +
        safetyImpact * 0.15 +
        seasonalFactor * 0.05
      );

      const priorityScore = {
        complianceUrgency,
        overdueFactor,
        machineCriticality,
        safetyImpact,
        seasonalFactor,
        finalScore: Math.round(finalScore * 10) / 10,
      };

      // Determine priority level
      let priority = 'medium';
      if (finalScore >= 8) priority = 'critical';
      else if (finalScore >= 6) priority = 'high';
      else if (finalScore < 4) priority = 'low';

      // Update the order
      const updated = await strapi.entityService.update(
        'api::maintenanceorder.maintenanceorder',
        id,
        {
          data: {
            priority_score: priorityScore,
            priority,
          },
        }
      );

      return ctx.send({ data: updated });
    } catch (error) {
      ctx.throw(500, error);
    }
  },
}));

