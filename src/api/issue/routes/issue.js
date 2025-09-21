'use strict';

/**
 * issue router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

// Create default routes
const defaultRouter = createCoreRouter('api::issue.issue');

// Add custom migration route
const customRoutes = {
  routes: [
    {
      method: 'POST',
      path: '/issues/migrate-priority',
      handler: 'migrate-priority.migratePriority',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
};

// Merge default routes with custom routes
module.exports = {
  routes: [
    ...defaultRouter.routes,
    ...customRoutes.routes
  ]
}; 