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
    },
    {
      method: 'POST',
      path: '/issues/:id/add-valuation',
      handler: 'api::issue.issue.addValuation',
      config: {
        auth: {
          scope: ['find']
        }
      }
    },
    {
      method: 'POST',
      path: '/issues/:id/approve',
      handler: 'api::issue.issue.approve',
      config: {
        auth: {
          scope: ['find']
        }
      }
    },
    {
      method: 'POST',
      path: '/issues/:id/reject',
      handler: 'api::issue.issue.reject',
      config: {
        auth: {
          scope: ['find']
        }
      }
    },
    {
      method: 'POST',
      path: '/issues/:id/start-work',
      handler: 'api::issue.issue.startWork',
      config: {
        auth: {
          scope: ['find']
        }
      }
    },
    {
      method: 'POST',
      path: '/issues/:id/add-work-note',
      handler: 'api::issue.issue.addWorkNote',
      config: {
        auth: {
          scope: ['find']
        }
      }
    },
    {
      method: 'POST',
      path: '/issues/:id/complete-work',
      handler: 'api::issue.issue.completeWork',
      config: {
        auth: {
          scope: ['find']
        }
      }
    },
    {
      method: 'POST',
      path: '/issues/:id/close',
      handler: 'api::issue.issue.closeIssue',
      config: {
        auth: {
          scope: ['find']
        }
      }
    }
  ]
};
