'use strict';

/**
 * issue router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

const defaultRouter = createCoreRouter('api::issue.issue');

const customRouter = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/issues/reorder',
      handler: 'api::issue.issue.reorder',
      config: {
        auth: {
          scope: ['find']
        }
      }
    },
    {
      method: 'POST',
      path: '/issues/reset-order',
      handler: 'api::issue.issue.resetOrder',
      config: {
        auth: {
          scope: ['find']
        }
      }
    }
  ]
};

module.exports = {
  routes: [
    ...defaultRouter.routes,
    ...customRouter.routes
  ]
}; 