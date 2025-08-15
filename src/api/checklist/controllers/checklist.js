'use strict';

/**
 * checklist controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::checklist.checklist', ({ strapi }) => ({
  // Custom controller methods can be added here if needed
  
  async create(ctx) {
    // Add the authenticated user as the creator
    if (ctx.state.user) {
      ctx.request.body.data.created_by = ctx.state.user.id;
    }
    
    const response = await super.create(ctx);
    return response;
  },

  async update(ctx) {
    // Ensure only the creator or managers can update
    const { id } = ctx.params;
    const entity = await strapi.entityService.findOne('api::checklist.checklist', id, {
      populate: ['created_by']
    });

    if (!entity) {
      return ctx.notFound('Checklist not found');
    }

    // Check if user is the creator or a manager
    const isCreator = entity.created_by?.id === ctx.state.user.id;
    const isManager = ctx.state.user.role?.type === 'manager';

    if (!isCreator && !isManager) {
      return ctx.forbidden('You can only update your own checklists');
    }

    const response = await super.update(ctx);
    return response;
  },

  async delete(ctx) {
    // Ensure only the creator or managers can delete
    const { id } = ctx.params;
    const entity = await strapi.entityService.findOne('api::checklist.checklist', id, {
      populate: ['created_by']
    });

    if (!entity) {
      return ctx.notFound('Checklist not found');
    }

    // Check if user is the creator or a manager
    const isCreator = entity.created_by?.id === ctx.state.user.id;
    const isManager = ctx.state.user.role?.type === 'manager';

    if (!isCreator && !isManager) {
      return ctx.forbidden('You can only delete your own checklists');
    }

    const response = await super.delete(ctx);
    return response;
  }
}));
