'use strict';

/**
 * issue controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::issue.issue', ({ strapi }) => ({
  /**
   * Reorder issues with manager/mechanic permissions
   */
  async reorder(ctx) {
    try {
      console.log('🔄 Reorder request received:', {
        body: ctx.request.body,
        user: ctx.state.user?.id || 'No user',
        headers: Object.keys(ctx.headers),
      });

      const { reorderedIssues } = ctx.request.body;
      const user = ctx.state.user;

      // For master token requests, we might not have user context
      if (!user) {
        console.log('⚠️ No user context - checking if master token request');
        // If no user but we have authorization header, assume master token (manager permissions)
        if (ctx.headers.authorization) {
          console.log('🔑 Master token detected - proceeding with manager permissions');
          // Create a mock manager user for the request
          ctx.state.user = { 
            id: 'master-token',
            role: { type: 'manager' }
          };
        } else {
          return ctx.unauthorized('Authentication required');
        }
      }

      if (!reorderedIssues || !Array.isArray(reorderedIssues)) {
        return ctx.badRequest('reorderedIssues array is required');
      }

      // Update user reference after potential mock user creation
      const currentUser = ctx.state.user;
      const isManager = currentUser.role?.type === 'manager';

      // Check if issues are currently manager-controlled
      const managerControlledIssues = await strapi.db.query('api::issue.issue').findMany({
        where: { manager_ordered: true },
        limit: 1
      });

      const isManagerControlled = managerControlledIssues.length > 0;

      // Permission check: only manager can reorder if manager-controlled
      if (isManagerControlled && !isManager) {
        return ctx.forbidden('Only managers can reorder when manager-controlled');
      }

      // Update sort orders for all issues
      const updatePromises = reorderedIssues.map((issueUpdate, index) => {
        const updateData = {
          sort_order: (index + 1) * 10, // Give space between orders
        };

        // If manager is reordering, mark all issues as manager-controlled
        if (isManager) {
          updateData.manager_ordered = true;
        }

        return strapi.entityService.update('api::issue.issue', issueUpdate.id, {
          data: updateData
        });
      });

      await Promise.all(updatePromises);

      // If manager reordered, mark ALL issues as manager-controlled (even ones not in this batch)
      if (isManager) {
        await strapi.db.query('api::issue.issue').updateMany({
          data: { manager_ordered: true }
        });
      }

      ctx.send({ 
        success: true, 
        managerControlled: isManager,
        message: isManager 
          ? 'Ordning uppdaterad - nu styrd av chef'
          : 'Ordning ändrad lokalt'
      });

    } catch (error) {
      ctx.internalServerError('Failed to reorder issues', { error: error.message });
    }
  },

  /**
   * Reset to default ordering (manager only)
   */
  async resetOrder(ctx) {
    try {
      console.log('🔄 Reset order request received');
      
      let user = ctx.state.user;

      // Handle master token requests
      if (!user && ctx.headers.authorization) {
        console.log('🔑 Master token detected for reset - proceeding with manager permissions');
        ctx.state.user = { 
          id: 'master-token',
          role: { type: 'manager' }
        };
        user = ctx.state.user;
      }

      if (!user || user.role?.type !== 'manager') {
        return ctx.forbidden('Only managers can reset ordering');
      }

      // Reset all issues to default ordering
      await strapi.db.query('api::issue.issue').updateMany({
        data: { 
          sort_order: 0,
          manager_ordered: false 
        }
      });

      ctx.send({ 
        success: true,
        message: 'Ordning återställd till standard'
      });

    } catch (error) {
      ctx.internalServerError('Failed to reset ordering', { error: error.message });
    }
  },

  /**
   * Add valuation to an issue
   */
  async addValuation(ctx) {
    try {
      const { id } = ctx.params;
      let user = ctx.state.user;

      // Handle master token requests
      if (!user && ctx.headers.authorization) {
        console.log('🔑 Master token detected for addValuation - proceeding with manager permissions');
        ctx.state.user = { 
          id: 'master-token',
          role: { type: 'manager' }
        };
        user = ctx.state.user;
      }

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Check if user is mechanic or manager
      const userRole = user.role?.type;
      if (userRole !== 'mechanic' && userRole !== 'manager') {
        return ctx.forbidden('Only mechanics and managers can add valuations');
      }

      // Get the issue
      const issue = await strapi.entityService.findOne('api::issue.issue', id);
      if (!issue) {
        return ctx.notFound('Issue not found');
      }

      // Check if issue is in correct status
      if (issue.status !== 'reported') {
        return ctx.badRequest('Valuation can only be added to reported issues');
      }

      // Get valuation data from request body
      const {
        diagnosedProblem,
        estimatedHours,
        estimatedLaborCost,
        estimatedParts = [],
        assignedMechanicId,
        hourlyRate,
        valuationAddedBy // Optional: ID of user adding valuation
      } = ctx.request.body;

      // Validate required fields
      if (!diagnosedProblem || !estimatedHours || !assignedMechanicId) {
        return ctx.badRequest('diagnosedProblem, estimatedHours, and assignedMechanicId are required');
      }

      // Get system settings for approval threshold
      const settings = await strapi.entityService.findMany('api::system-setting.system-setting');
      const approvalThreshold = settings?.approval_threshold || 5000;
      const autoApprove = settings?.auto_approve_under_threshold !== false;

      // Calculate estimated labor cost if not provided
      const laborCost = estimatedLaborCost || (estimatedHours * (hourlyRate || settings?.default_mechanic_hourly_rate || 1000));

      // Calculate total parts cost
      const partsCost = estimatedParts.reduce((sum, part) => sum + (part.cost * (part.quantity || 1)), 0);

      // Calculate total cost
      const totalCost = laborCost + partsCost;

      // Determine if approval is required
      const requiresApproval = totalCost >= approvalThreshold;

      // Prepare update data
      const updateData = {
        diagnosed_problem: diagnosedProblem,
        estimated_hours: estimatedHours,
        estimated_labor_cost: laborCost,
        estimated_parts: estimatedParts,
        estimated_total_cost: totalCost,
        assigned_mechanic: assignedMechanicId,
        valuation_added_at: new Date(),
        requires_approval: requiresApproval,
      };

      // Only set valuation_added_by if we have a real user ID (not master-token)
      if (valuationAddedBy) {
        updateData.valuation_added_by = valuationAddedBy;
      } else if (user.id !== 'master-token') {
        updateData.valuation_added_by = user.id;
      }

      // Set status and approval based on threshold
      if (requiresApproval) {
        updateData.status = 'pending_approval';
        updateData.approval_status = 'pending';
      } else if (autoApprove) {
        updateData.status = 'approved';
        updateData.approval_status = 'auto_approved';
      } else {
        updateData.status = 'assessed';
      }

      // Update the issue
      const updatedIssue = await strapi.entityService.update('api::issue.issue', id, {
        data: updateData,
        populate: ['valuation_added_by', 'assigned_mechanic', 'machine', 'created_by']
      });

      ctx.send({
        success: true,
        issue: updatedIssue,
        message: requiresApproval 
          ? 'Valuation added - approval required'
          : 'Valuation added and auto-approved'
      });

    } catch (error) {
      console.error('Error adding valuation:', error);
      ctx.internalServerError('Failed to add valuation', { error: error.message });
    }
  },

  /**
   * Approve an issue (manager only)
   */
  async approve(ctx) {
    try {
      const { id } = ctx.params;
      let user = ctx.state.user;

      // Handle master token requests
      if (!user && ctx.headers.authorization) {
        console.log('🔑 Master token detected for approve');
        ctx.state.user = { 
          id: 'master-token',
          role: { type: 'manager' }
        };
        user = ctx.state.user;
      }

      if (!user || user.role?.type !== 'manager') {
        return ctx.forbidden('Only managers can approve issues');
      }

      // Get the issue
      const issue = await strapi.entityService.findOne('api::issue.issue', id);
      if (!issue) {
        return ctx.notFound('Issue not found');
      }

      // Check if issue requires approval
      if (issue.status !== 'pending_approval') {
        return ctx.badRequest('Issue is not pending approval');
      }

      const { notes, approvedBy } = ctx.request.body;

      // Prepare update data
      const updateData = {
        status: 'approved',
        approval_status: 'approved',
        approved_at: new Date(),
        approval_notes: notes || null
      };

      // Only set approved_by if we have a real user ID
      if (approvedBy) {
        updateData.approved_by = approvedBy;
      } else if (user.id !== 'master-token') {
        updateData.approved_by = user.id;
      }

      // Update issue
      const updatedIssue = await strapi.entityService.update('api::issue.issue', id, {
        data: updateData,
        populate: ['approved_by', 'assigned_mechanic', 'machine', 'created_by']
      });

      ctx.send({
        success: true,
        issue: updatedIssue,
        message: 'Issue approved'
      });

    } catch (error) {
      console.error('Error approving issue:', error);
      ctx.internalServerError('Failed to approve issue', { error: error.message });
    }
  },

  /**
   * Reject an issue (manager only)
   */
  async reject(ctx) {
    try {
      const { id } = ctx.params;
      let user = ctx.state.user;

      // Handle master token requests
      if (!user && ctx.headers.authorization) {
        console.log('🔑 Master token detected for reject');
        ctx.state.user = { 
          id: 'master-token',
          role: { type: 'manager' }
        };
        user = ctx.state.user;
      }

      if (!user || user.role?.type !== 'manager') {
        return ctx.forbidden('Only managers can reject issues');
      }

      // Get the issue
      const issue = await strapi.entityService.findOne('api::issue.issue', id);
      if (!issue) {
        return ctx.notFound('Issue not found');
      }

      // Check if issue is pending approval
      if (issue.status !== 'pending_approval') {
        return ctx.badRequest('Issue is not pending approval');
      }

      const { reason, approvedBy } = ctx.request.body;

      if (!reason) {
        return ctx.badRequest('Rejection reason is required');
      }

      // Prepare update data
      const updateData = {
        status: 'rejected',
        approval_status: 'rejected',
        rejection_reason: reason,
        approved_at: new Date()
      };

      // Only set approved_by if we have a real user ID
      if (approvedBy) {
        updateData.approved_by = approvedBy;
      } else if (user.id !== 'master-token') {
        updateData.approved_by = user.id;
      }

      // Update issue
      const updatedIssue = await strapi.entityService.update('api::issue.issue', id, {
        data: updateData,
        populate: ['approved_by', 'assigned_mechanic', 'machine', 'created_by']
      });

      ctx.send({
        success: true,
        issue: updatedIssue,
        message: 'Issue rejected'
      });

    } catch (error) {
      console.error('Error rejecting issue:', error);
      ctx.internalServerError('Failed to reject issue', { error: error.message });
    }
  },

  /**
   * Start work on an issue
   */
  async startWork(ctx) {
    try {
      const { id } = ctx.params;
      let user = ctx.state.user;

      // Handle master token requests
      if (!user && ctx.headers.authorization) {
        console.log('🔑 Master token detected for startWork');
        ctx.state.user = { 
          id: 'master-token',
          role: { type: 'manager' }
        };
        user = ctx.state.user;
      }

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Get the issue
      const issue = await strapi.entityService.findOne('api::issue.issue', id, {
        populate: ['assigned_mechanic']
      });

      if (!issue) {
        return ctx.notFound('Issue not found');
      }

      // Check if issue is approved
      if (issue.status !== 'approved') {
        return ctx.badRequest('Issue must be approved before starting work');
      }

      // Get actual user ID from request body if using master token
      const { requestingUserId } = ctx.request.body;
      const actualUserId = user.id === 'master-token' && requestingUserId ? requestingUserId : user.id;

      // Check if user is the assigned mechanic (or a manager)
      const isAssignedMechanic = issue.assigned_mechanic?.id === actualUserId;
      const isManager = user.role?.type === 'manager';

      if (!isAssignedMechanic && !isManager) {
        return ctx.forbidden('Only the assigned mechanic can start work on this issue');
      }

      // Update issue
      const updatedIssue = await strapi.entityService.update('api::issue.issue', id, {
        data: {
          status: 'in_progress',
          work_started_at: new Date(),
          work_notes: []
        },
        populate: ['assigned_mechanic', 'machine', 'created_by']
      });

      ctx.send({
        success: true,
        issue: updatedIssue,
        message: 'Work started'
      });

    } catch (error) {
      console.error('Error starting work:', error);
      ctx.internalServerError('Failed to start work', { error: error.message });
    }
  },

  /**
   * Add a work note
   */
  async addWorkNote(ctx) {
    try {
      const { id } = ctx.params;
      let user = ctx.state.user;

      // Handle master token requests
      if (!user && ctx.headers.authorization) {
        console.log('🔑 Master token detected for addWorkNote');
        ctx.state.user = { 
          id: 'master-token',
          role: { type: 'manager' }
        };
        user = ctx.state.user;
      }

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Get the issue
      const issue = await strapi.entityService.findOne('api::issue.issue', id, {
        populate: ['assigned_mechanic']
      });

      if (!issue) {
        return ctx.notFound('Issue not found');
      }

      // Check if issue is in progress
      if (issue.status !== 'in_progress') {
        return ctx.badRequest('Can only add notes to issues in progress');
      }

      // Get actual user ID and author name from request body if using master token
      const { note, requestingUserId, authorName } = ctx.request.body;
      const actualUserId = user.id === 'master-token' && requestingUserId ? requestingUserId : user.id;

      // Check if user is the assigned mechanic (or a manager)
      const isAssignedMechanic = issue.assigned_mechanic?.id === actualUserId;
      const isManager = user.role?.type === 'manager';

      if (!isAssignedMechanic && !isManager) {
        return ctx.forbidden('Only the assigned mechanic can add work notes');
      }

      if (!note) {
        return ctx.badRequest('Note text is required');
      }

      // Get existing notes or initialize empty array
      const existingNotes = issue.work_notes || [];

      // Add new note
      const newNote = {
        timestamp: new Date().toISOString(),
        author: authorName || 'Unknown',
        authorId: actualUserId,
        note: note
      };

      const updatedNotes = [...existingNotes, newNote];

      // Update issue
      const updatedIssue = await strapi.entityService.update('api::issue.issue', id, {
        data: {
          work_notes: updatedNotes
        },
        populate: ['assigned_mechanic', 'machine', 'created_by']
      });

      ctx.send({
        success: true,
        issue: updatedIssue,
        message: 'Note added'
      });

    } catch (error) {
      console.error('Error adding work note:', error);
      ctx.internalServerError('Failed to add work note', { error: error.message });
    }
  },

  /**
   * Complete work on an issue
   */
  async completeWork(ctx) {
    try {
      const { id } = ctx.params;
      let user = ctx.state.user;

      // Handle master token requests
      if (!user && ctx.headers.authorization) {
        console.log('🔑 Master token detected for completeWork');
        ctx.state.user = { 
          id: 'master-token',
          role: { type: 'manager' }
        };
        user = ctx.state.user;
      }

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Get the issue
      const issue = await strapi.entityService.findOne('api::issue.issue', id, {
        populate: ['assigned_mechanic']
      });

      if (!issue) {
        return ctx.notFound('Issue not found');
      }

      // Check if issue is in progress
      if (issue.status !== 'in_progress') {
        return ctx.badRequest('Issue must be in progress to complete');
      }

      // Get actual user ID from request body if using master token
      const { actualHours, actualParts = [], varianceExplanation, requestingUserId } = ctx.request.body;
      const actualUserId = user.id === 'master-token' && requestingUserId ? requestingUserId : user.id;

      // Check if user is the assigned mechanic (or a manager)
      const isAssignedMechanic = issue.assigned_mechanic?.id === actualUserId;
      const isManager = user.role?.type === 'manager';

      if (!isAssignedMechanic && !isManager) {
        return ctx.forbidden('Only the assigned mechanic can complete work');
      }

      // Extract actualLaborCost separately (other fields already extracted above)
      const { actualLaborCost } = ctx.request.body;

      if (!actualHours) {
        return ctx.badRequest('actualHours is required');
      }

      // Calculate actual costs
      const partsCost = actualParts.reduce((sum, part) => sum + (part.cost * (part.quantity || 1)), 0);
      
      // Calculate labor cost - use provided cost or calculate from estimated hourly rate
      let laborCost = actualLaborCost;
      if (!laborCost && issue.estimated_hours && issue.estimated_hours > 0 && issue.estimated_labor_cost) {
        const hourlyRate = issue.estimated_labor_cost / issue.estimated_hours;
        laborCost = actualHours * hourlyRate;
      } else if (!laborCost) {
        // Fallback to a default or 0 if no estimates exist
        laborCost = 0;
      }
      
      const totalCost = laborCost + partsCost;

      // Calculate variances - handle missing estimates
      const costVariance = issue.estimated_total_cost ? totalCost - issue.estimated_total_cost : 0;
      const timeVariance = issue.estimated_hours ? actualHours - issue.estimated_hours : 0;

      // Update issue
      const updatedIssue = await strapi.entityService.update('api::issue.issue', id, {
        data: {
          status: 'completed',
          work_completed_at: new Date(),
          actual_hours: actualHours,
          actual_labor_cost: laborCost,
          actual_parts: actualParts,
          actual_total_cost: totalCost,
          cost_variance: costVariance,
          time_variance: timeVariance,
          variance_explanation: varianceExplanation || null
        },
        populate: ['assigned_mechanic', 'machine', 'created_by', 'approved_by']
      });

      ctx.send({
        success: true,
        issue: updatedIssue,
        message: 'Work completed',
        variances: {
          cost: costVariance,
          time: timeVariance
        }
      });

    } catch (error) {
      console.error('Error completing work:', error);
      ctx.internalServerError('Failed to complete work', { error: error.message });
    }
  },

  /**
   * Close an issue (manager only)
   */
  async closeIssue(ctx) {
    try {
      const { id } = ctx.params;
      let user = ctx.state.user;

      // Handle master token requests
      if (!user && ctx.headers.authorization) {
        console.log('🔑 Master token detected for closeIssue');
        ctx.state.user = { 
          id: 'master-token',
          role: { type: 'manager' }
        };
        user = ctx.state.user;
      }

      if (!user || user.role?.type !== 'manager') {
        return ctx.forbidden('Only managers can close issues');
      }

      // Get the issue
      const issue = await strapi.entityService.findOne('api::issue.issue', id);
      if (!issue) {
        return ctx.notFound('Issue not found');
      }

      // Check if issue is completed
      if (issue.status !== 'completed') {
        return ctx.badRequest('Issue must be completed before closing');
      }

      // Update issue
      const updatedIssue = await strapi.entityService.update('api::issue.issue', id, {
        data: {
          status: 'closed'
        },
        populate: ['assigned_mechanic', 'machine', 'created_by', 'approved_by']
      });

      ctx.send({
        success: true,
        issue: updatedIssue,
        message: 'Issue closed'
      });

    } catch (error) {
      console.error('Error closing issue:', error);
      ctx.internalServerError('Failed to close issue', { error: error.message });
    }
  }
})); 