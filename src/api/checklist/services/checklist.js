'use strict';

/**
 * checklist service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::checklist.checklist', ({ strapi }) => ({
  // Custom service methods can be added here if needed

  async createDefaultChecklist() {
    // Create a default checklist if none exists
    const existingDefault = await strapi.entityService.findMany('api::checklist.checklist', {
      filters: { isDefault: true },
      limit: 1
    });

    if (existingDefault.length === 0) {
      const defaultChecklist = await strapi.entityService.create('api::checklist.checklist', {
        data: {
          name: 'Daglig Kontroll',
          description: 'Standard daglig kontroll för alla fordon',
          items: [
            { text: 'Kontrollera däck', required: true, order: 1 },
            { text: 'Kontrollera olja', required: true, order: 2 },
            { text: 'Kontrollera lampor', required: true, order: 3 }
          ],
          isDefault: true,
          assignedMachineTypes: ['Grävmaskin', 'Hjullastare', 'Lastbil', 'Traktor'],
          publishedAt: new Date()
        }
      });

      return defaultChecklist;
    }

    return existingDefault[0];
  },

  async getChecklistsForMachine(machineId) {
    // Get machine details
    const machine = await strapi.entityService.findOne('api::machine.machine', machineId);
    
    if (!machine) {
      return [];
    }

    // Find checklists assigned to this specific machine or to its machine type
    const checklists = await strapi.entityService.findMany('api::checklist.checklist', {
      filters: {
        $or: [
          { assignedMachines: { id: machineId } },
          { assignedMachineTypes: { $contains: machine.type } }
        ]
      },
      populate: ['assignedMachines', 'created_by']
    });

    return checklists;
  }
}));
