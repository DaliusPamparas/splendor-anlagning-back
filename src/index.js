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
      
      // Wait a bit for Strapi to fully initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const authenticatedRole = await strapi
        .service('plugin::users-permissions.role')
        .findOne(1, { populate: ['permissions'] });

      if (authenticatedRole) {
        console.log('📋 Found authenticated role:', authenticatedRole.name);
        console.log('📋 Current permissions count:', authenticatedRole.permissions?.length || 0);
        
        // Required permissions object format
        const requiredPermissions = {
          // Issues
          'api::issue.issue.create': { enabled: true },
          'api::issue.issue.find': { enabled: true },
          'api::issue.issue.findOne': { enabled: true },
          'api::issue.issue.update': { enabled: true },
          'api::issue.issue.delete': { enabled: true },
          
          // Machines
          'api::machine.machine.create': { enabled: true },
          'api::machine.machine.find': { enabled: true },
          'api::machine.machine.findOne': { enabled: true },
          'api::machine.machine.update': { enabled: true },
          'api::machine.machine.delete': { enabled: true },
          
          // Users
          'plugin::users-permissions.user.find': { enabled: true },
          'plugin::users-permissions.user.findOne': { enabled: true },
          'plugin::users-permissions.user.me': { enabled: true },
          'plugin::users-permissions.user.count': { enabled: true },
        };

        // Get current permissions and convert to proper format
        let currentPermissions = {};
        
        // Try different approaches to access permissions
        const permissions = authenticatedRole.permissions || [];
        
        if (Array.isArray(permissions)) {
          permissions.forEach(perm => {
            if (perm && perm.action) {
              currentPermissions[perm.action] = { enabled: true };
            }
          });
        } else if (typeof permissions === 'object') {
          currentPermissions = permissions;
        }

        // Merge permissions
        const finalPermissions = {
          ...currentPermissions,
          ...requiredPermissions
        };

        console.log('📝 Adding permissions:', Object.keys(requiredPermissions));
        console.log('📊 Total permissions after update:', Object.keys(finalPermissions).length);

        // Update the role
        const updateResult = await strapi.service('plugin::users-permissions.role').updateRole(1, {
          permissions: finalPermissions,
        });
        
        console.log('✅ GraphQL permissions set up successfully!');
        console.log('🎯 Update result:', updateResult ? 'Success' : 'Unknown');
        
        // Verify the update worked
        const updatedRole = await strapi
          .service('plugin::users-permissions.role')
          .findOne(1, { populate: ['permissions'] });
        console.log('🔍 Verification: Updated role has', updatedRole.permissions?.length || 0, 'permissions');
        
      } else {
        console.log('❌ Could not find authenticated role');
      }
    } catch (error) {
      console.error('❌ Error setting up permissions:', error);
      console.error('❌ Error stack:', error.stack);
      // Don't throw the error - let Strapi continue starting
    }
  },
};
