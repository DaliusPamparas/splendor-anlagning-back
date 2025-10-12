'use strict';

/**
 * Custom work-order routes
 */

module.exports = {
  routes: [
    {
      method: 'PUT',
      path: '/work-orders/:id/status',
      handler: 'api::work-order.work-order.updateStatus',
      config: {
        auth: {
          scope: ['find']
        }
      }
    },
    {
      method: 'POST',
      path: '/work-orders/:id/notes',
      handler: 'api::work-order.work-order.addNote',
      config: {
        auth: {
          scope: ['find']
        }
      }
    },
    {
      method: 'POST',
      path: '/work-orders/:id/approve',
      handler: 'api::work-order.work-order.approve',
      config: {
        auth: {
          scope: ['find']
        }
      }
    },
    {
      method: 'PUT',
      path: '/work-orders/:id/hours',
      handler: 'api::work-order.work-order.updateHours',
      config: {
        auth: {
          scope: ['find']
        }
      }
    },
    {
      method: 'POST',
      path: '/work-orders/:id/parts',
      handler: 'api::work-order.work-order.addParts',
      config: {
        auth: {
          scope: ['find']
        }
      }
    }
  ]
};

