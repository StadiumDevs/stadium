/**
 * Utility functions for project data handling
 */

/**
 * Generate a consistent project ID from project data
 * This creates a URL-friendly slug from the project name and team lead
 */
export function generateProjectId(project: { projectName: string; teamLead: string }): string {
  const nameSlug = project.projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  const teamSlug = project.teamLead
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  return `${nameSlug}-${teamSlug}`;
}

/**
 * Get the best available project identifier for routing
 * Priority: id > donationAddress > generatedId > fallback
 * Note: We prioritize existing IDs since the server already has proper project IDs
 */
export function getProjectRouteId(project: { 
  id?: string; 
  projectName: string; 
  teamLead: string; 
  donationAddress?: string 
}): string {
  // Use existing ID if available (this is the best option)
  if (project.id) {
    return project.id;
  }
  
  // Use donation address if available
  if (project.donationAddress && project.donationAddress.trim() !== '') {
    return project.donationAddress;
  }
  
  // Generate ID from project name and team lead as fallback
  const generatedId = generateProjectId(project);
  return generatedId;
}

/**
 * Generate a project URL using the best available identifier
 */
export function getProjectUrl(project: { 
  id?: string; 
  projectName: string; 
  teamLead: string; 
  donationAddress?: string 
}): string {
  const routeId = getProjectRouteId(project);
  return `/projects/${routeId}`;
}

/**
 * Calculate the current program week based on start date
 * Start date: November 17, 2025
 * Returns week number and label with date range
 */
export function getCurrentProgramWeek(): { weekNumber: number; weekLabel: string; dateRange: string } {
  const programStartDate = new Date('2025-11-17');
  const today = new Date();
  
  // Calculate difference in days
  const diffTime = today.getTime() - programStartDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Calculate current week (week 1 starts on Nov 17)
  const weekNumber = Math.floor(diffDays / 7) + 1;
  
  // Ensure week is at least 1
  const currentWeek = Math.max(1, weekNumber);
  
  // Calculate the start date of the current week
  const weekStartDate = new Date(programStartDate);
  weekStartDate.setDate(weekStartDate.getDate() + (currentWeek - 1) * 7);
  
  // Calculate the end date of the current week
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  
  // Format dates for week label (e.g., "Dec 9-15, 2025")
  const startMonth = weekStartDate.toLocaleString('default', { month: 'short' });
  const startDay = weekStartDate.getDate();
  const endDay = weekEndDate.getDate();
  const year = weekStartDate.getFullYear();
  
  // If same month, use format: "Dec 9-15, 2025"
  // If different months, use: "Nov 30-Dec 6, 2025"
  let dateRange: string;
  if (weekStartDate.getMonth() === weekEndDate.getMonth()) {
    dateRange = `${startMonth} ${startDay}-${endDay}, ${year}`;
  } else {
    const endMonth = weekEndDate.toLocaleString('default', { month: 'short' });
    dateRange = `${startMonth} ${startDay}-${endMonth} ${endDay}, ${year}`;
  }
  
  const weekLabel = `Week ${currentWeek} (${dateRange})`;
  
  return {
    weekNumber: currentWeek,
    weekLabel,
    dateRange,
  };
}
