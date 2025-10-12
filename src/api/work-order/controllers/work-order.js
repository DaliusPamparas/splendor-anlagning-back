'use strict';

/**
 * work-order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::work-order.work-order', ({ strapi }) => ({
  /**
   * Update work order status
   */
  async updateStatus(ctx) {
    try {
      const { id } = ctx.params;
      const { status, completedAt } = ctx.request.body;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!status) {
        return ctx.badRequest('Status is required');
      }

      const updateData = { status };

      // If status is completed, set completedAt
      if (status === 'completed' && !completedAt) {
        updateData.completedAt = new Date();
      } else if (completedAt) {
        updateData.completedAt = completedAt;
      }

      const workOrder = await strapi.entityService.update('api::work-order.work-order', id, {
        data: updateData,
        populate: ['machine', 'issue', 'assigned_to', 'created_by']
      });

      ctx.send({ 
        data: workOrder,
        message: 'Status uppdaterad'
      });

    } catch (error) {
      console.error('Error updating work order status:', error);
      ctx.internalServerError('Failed to update status', { error: error.message });
    }
  },

  /**
   * Add note to work order
   */
  async addNote(ctx) {
    try {
      const { id } = ctx.params;
      const { note } = ctx.request.body;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!note || !note.trim()) {
        return ctx.badRequest('Note content is required');
      }

      // Get current work order
      const workOrder = await strapi.entityService.findOne('api::work-order.work-order', id);

      if (!workOrder) {
        return ctx.notFound('Work order not found');
      }

      // Add new note to notes array
      const notes = workOrder.notes || [];
      const newNote = {
        id: Date.now().toString(),
        content: note,
        author: user.username || user.email,
        authorId: user.id,
        createdAt: new Date().toISOString()
      };
      notes.push(newNote);

      // Update work order with new notes
      const updatedWorkOrder = await strapi.entityService.update('api::work-order.work-order', id, {
        data: { notes },
        populate: ['machine', 'issue', 'assigned_to', 'created_by']
      });

      ctx.send({ 
        data: updatedWorkOrder,
        message: 'Anteckning tillagd'
      });

    } catch (error) {
      console.error('Error adding note:', error);
      ctx.internalServerError('Failed to add note', { error: error.message });
    }
  },

  /**
   * Approve work order (for managers)
   */
  async approve(ctx) {
    try {
      const { id } = ctx.params;
      const user = ctx.state.user;

      // Handle master token requests
      if (!user && ctx.headers.authorization) {
        ctx.state.user = { 
          id: 'master-token',
          role: { type: 'manager' }
        };
      }

      const currentUser = ctx.state.user;

      if (!currentUser || currentUser.role?.type !== 'manager') {
        return ctx.forbidden('Only managers can approve work orders');
      }

      const workOrder = await strapi.entityService.update('api::work-order.work-order', id, {
        data: {
          requiresApproval: false,
          approvedBy: currentUser.username || currentUser.email || currentUser.id,
          approvedAt: new Date(),
          status: 'assigned'
        },
        populate: ['machine', 'issue', 'assigned_to', 'created_by']
      });

      ctx.send({ 
        data: workOrder,
        message: 'Arbetsorder godkänd'
      });

    } catch (error) {
      console.error('Error approving work order:', error);
      ctx.internalServerError('Failed to approve work order', { error: error.message });
    }
  },

  /**
   * Update actual hours worked
   */
  async updateHours(ctx) {
    try {
      const { id } = ctx.params;
      const { actualHours } = ctx.request.body;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (actualHours === undefined || actualHours === null) {
        return ctx.badRequest('actualHours is required');
      }

      const workOrder = await strapi.entityService.findOne('api::work-order.work-order', id);

      if (!workOrder) {
        return ctx.notFound('Work order not found');
      }

      // Calculate labor cost based on mechanic hourly rate
      const laborCost = actualHours * (workOrder.mechanicHourlyRate || 500);

      // Calculate total cost (labor + parts)
      const partsCost = Array.isArray(workOrder.parts) 
        ? workOrder.parts.reduce((sum, part) => sum + (part.quantity * part.unitCost || 0), 0)
        : 0;
      const totalCost = laborCost + partsCost;

      const updatedWorkOrder = await strapi.entityService.update('api::work-order.work-order', id, {
        data: {
          actualHours,
          laborCost,
          totalCost
        },
        populate: ['machine', 'issue', 'assigned_to', 'created_by']
      });

      ctx.send({ 
        data: updatedWorkOrder,
        message: 'Timmar uppdaterade'
      });

    } catch (error) {
      console.error('Error updating hours:', error);
      ctx.internalServerError('Failed to update hours', { error: error.message });
    }
  },

  /**
   * Add parts to work order
   */
  async addParts(ctx) {
    try {
      const { id } = ctx.params;
      const { parts } = ctx.request.body;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!Array.isArray(parts)) {
        return ctx.badRequest('Parts must be an array');
      }

      const workOrder = await strapi.entityService.findOne('api::work-order.work-order', id);

      if (!workOrder) {
        return ctx.notFound('Work order not found');
      }

      // Merge with existing parts
      const existingParts = workOrder.parts || [];
      const updatedParts = [...existingParts, ...parts];

      // Recalculate total cost
      const partsCost = updatedParts.reduce((sum, part) => sum + (part.quantity * part.unitCost || 0), 0);
      const totalCost = workOrder.laborCost + partsCost;

      const updatedWorkOrder = await strapi.entityService.update('api::work-order.work-order', id, {
        data: {
          parts: updatedParts,
          totalCost
        },
        populate: ['machine', 'issue', 'assigned_to', 'created_by']
      });

      ctx.send({ 
        data: updatedWorkOrder,
        message: 'Delar tillagda'
      });

    } catch (error) {
      console.error('Error adding parts:', error);
      ctx.internalServerError('Failed to add parts', { error: error.message });
    }
  }
}));

