'use strict';

/**
 * Custom issue routes for reordering
 */

module.exports = {
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
