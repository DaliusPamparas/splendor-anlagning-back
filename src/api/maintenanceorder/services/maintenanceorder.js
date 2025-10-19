'use strict';

/**
 * maintenance-order service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::maintenanceorder.maintenanceorder');

