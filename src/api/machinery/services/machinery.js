'use strict';

/**
 * machinery service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::machinery.machinery');
