'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    try {
      // Set up GraphQL permissions for authenticated users
      console.log('🔧 Setting up GraphQL permissions for authenticated users...');
      
      const authenticatedRole = await strapi
        .service('plugin::users-permissions.role')
        .findOne(1, { populate: ['permissions'] });

      if (authenticatedRole) {
        console.log('📋 Found authenticated role:', authenticatedRole.name);
        
        // GraphQL permissions for Issues
        const requiredPermissions = {
          // Issues
          'api::issue.issue.create': { enabled: true },
          'api::issue.issue.find': { enabled: true },
          'api::issue.issue.findOne': { enabled: true },
          'api::issue.issue.update': { enabled: true },
          'api::issue.issue.delete': { enabled: true },
          
          // Machines
          'api::machine.machine.find': { enabled: true },
          'api::machine.machine.findOne': { enabled: true },
          
          // Users
          'plugin::users-permissions.user.find': { enabled: true },
          'plugin::users-permissions.user.findOne': { enabled: true },
          'plugin::users-permissions.user.me': { enabled: true },
          'plugin::users-permissions.user.count': { enabled: true },
        };

        // Get current permissions (handle different possible structures)
        let currentPermissions = {};
        if (authenticatedRole.permissions && typeof authenticatedRole.permissions === 'object') {
          if (Array.isArray(authenticatedRole.permissions)) {
            // Convert array to object if needed
            authenticatedRole.permissions.forEach(perm => {
              if (perm.action) {
                currentPermissions[perm.action] = { enabled: true };
              }
            });
          } else {
            currentPermissions = authenticatedRole.permissions;
          }
        }

        // Merge required permissions with current permissions
        const updatedPermissions = {
          ...currentPermissions,
          ...requiredPermissions
        };

        // Update the role with new permissions
        await strapi.service('plugin::users-permissions.role').updateRole(1, {
          permissions: updatedPermissions,
        });
        
        console.log('✅ GraphQL permissions set up successfully!');
        console.log('📝 Permissions added:', Object.keys(requiredPermissions));
      } else {
        console.log('❌ Could not find authenticated role');
      }
    } catch (error) {
      console.error('❌ Error setting up permissions:', error.message);
      // Don't throw the error - let Strapi continue starting
    }
  },
};
