module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/maintenanceorders/:id/complete',
      handler: 'maintenanceorder.complete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/maintenanceorders/:id/schedule',
      handler: 'maintenanceorder.schedule',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/maintenanceorders/check-overdue',
      handler: 'maintenanceorder.checkOverdue',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/maintenanceorders/:id/calculate-priority',
      handler: 'maintenanceorder.calculatePriority',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

