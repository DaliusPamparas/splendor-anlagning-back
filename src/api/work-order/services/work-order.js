'use strict';

/**
 * work-order service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::work-order.work-order');

