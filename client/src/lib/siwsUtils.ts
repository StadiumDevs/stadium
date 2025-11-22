/**
 * SIWS (Sign In With Substrate) utility functions for generating context-specific statements
 */

export interface SiwsContext {
  action: 'update-team' | 'submit-deliverable' | 'update-project' | 'register-address' | 'admin-action' | 'create-project' | 'delete-project' | 'review-project' | 'approve-project' | 'reject-project';
  projectId?: string;
  projectTitle?: string;
  additionalContext?: string;
}

/**
 * Generate a context-specific SIWS statement
 */
export function generateSiwsStatement(context: SiwsContext): string {
  const baseDomain = 'Stadium';
  
  switch (context.action) {
    case 'update-team':
      return `Update team members for ${context.projectTitle || 'project'} on ${baseDomain}`;
    
    case 'submit-deliverable':
      return `Submit milestone deliverables for ${context.projectTitle || 'project'} on ${baseDomain}`;
    
    case 'update-project':
      return `Update project details for ${context.projectTitle || 'project'} on ${baseDomain}`;
    
    case 'create-project':
      return `Create new project on ${baseDomain}`;
    
    case 'delete-project':
      return `Delete project ${context.projectTitle || ''} on ${baseDomain}`;
    
    case 'review-project':
      return `Review project ${context.projectTitle || ''} on ${baseDomain}`;
    
    case 'approve-project':
      return `Approve project ${context.projectTitle || ''} on ${baseDomain}`;
    
    case 'reject-project':
      return `Reject project ${context.projectTitle || ''} on ${baseDomain}`;
    
    case 'register-address':
      return `Register team address for ${baseDomain}`;
    
    case 'admin-action':
      return `Perform administrative action on ${baseDomain}`;
    
    default:
      return `Sign in to ${baseDomain}`;
  }
}

/**
 * Generate a more detailed statement with additional context
 */
export function generateDetailedSiwsStatement(context: SiwsContext): string {
  const baseStatement = generateSiwsStatement(context);
  
  if (context.additionalContext) {
    return `${baseStatement} - ${context.additionalContext}`;
  }
  
  return baseStatement;
}

/**
 * Validate that a statement matches the expected format for a given action
 */
export function validateSiwsStatement(statement: string, expectedAction: SiwsContext['action']): boolean {
  const expectedStatement = generateSiwsStatement({ action: expectedAction });
  return statement === expectedStatement;
}

/**
 * Generate an admin-specific SIWS statement
 */
export function generateAdminStatement(action: 'review' | 'approve' | 'reject' | 'delete', projectTitle?: string): string {
  const baseDomain = 'Stadium';
  
  switch (action) {
    case 'review':
      return `Review project ${projectTitle || ''} on ${baseDomain}`;
    case 'approve':
      return `Approve project ${projectTitle || ''} on ${baseDomain}`;
    case 'reject':
      return `Reject project ${projectTitle || ''} on ${baseDomain}`;
    case 'delete':
      return `Delete project ${projectTitle || ''} on ${baseDomain}`;
    default:
      return `Perform administrative action on ${baseDomain}`;
  }
}

/**
 * Check if an action requires admin privileges
 */
export function isAdminAction(action: SiwsContext['action']): boolean {
  const adminActions: SiwsContext['action'][] = [
    'review-project',
    'approve-project', 
    'reject-project',
    'delete-project',
    'admin-action'
  ];
  return adminActions.includes(action);
}
