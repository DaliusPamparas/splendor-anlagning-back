'use strict';

/**
 * Custom migration routes for issues
 */

module.exports = {
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
