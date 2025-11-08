/**
 * Utility functions for project data handling
 */

/**
 * TypeScript types for M2 program weeks
 */
export interface M2Week {
  week: number
  start: string
  end: string
  label: string
}

export interface ProgramWeek {
  weekNumber: number
  weekLabel: string
  dateRange: string
}

/**
 * M2 Program constants
 */
export const M2_PROGRAM_START = new Date('2025-11-17')

/**
 * Week boundaries for M2 program
 */
export const M2_WEEKS: M2Week[] = [
  { week: 0, start: '2025-11-17', end: '2025-11-24', label: 'Nov 17-24' },
  { week: 1, start: '2025-11-25', end: '2025-12-01', label: 'Nov 25-Dec 1' },
  { week: 2, start: '2025-12-02', end: '2025-12-08', label: 'Dec 2-8' },
  { week: 3, start: '2025-12-09', end: '2025-12-15', label: 'Dec 9-15' },
  { week: 4, start: '2025-12-16', end: '2025-12-22', label: 'Dec 16-22' },
  { week: 5, start: '2025-12-23', end: '2025-12-29', label: 'Dec 23-29' },
  { week: 6, start: '2025-12-30', end: '2026-01-05', label: 'Dec 30-Jan 5' },
]

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
 * Get current M2 program week
 * @returns { weekNumber: number, weekLabel: string, dateRange: string }
 */
export function getCurrentProgramWeek(): ProgramWeek {
  const today = new Date();
  const currentWeek = M2_WEEKS.find(w => {
    const start = new Date(w.start);
    const end = new Date(w.end);
    return today >= start && today <= end;
  });
  
  if (!currentWeek) {
    // After program ends
    return { 
      weekNumber: 6, 
      weekLabel: 'Program Ended', 
      dateRange: M2_WEEKS[6].label 
    };
  }
  
  return {
    weekNumber: currentWeek.week,
    weekLabel: `Week ${currentWeek.week} (${currentWeek.label})`,
    dateRange: currentWeek.label
  };
}

/**
 * Calculate which week a project is in based on last update
 * @param lastUpdateDate - Date of last update
 * @returns Week number (1-6)
 */
export function getProjectWeek(lastUpdateDate: Date): number {
  const daysSinceStart = Math.floor(
    (lastUpdateDate.getTime() - M2_PROGRAM_START.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weekNumber = Math.floor(daysSinceStart / 7) + 1;
  return Math.min(Math.max(weekNumber, 1), 6);
}

/**
 * Get days since last update
 * @param lastUpdateDate - Date of last update
 * @returns Number of days
 */
export function getDaysSinceUpdate(lastUpdateDate: Date): number {
  const today = new Date();
  return Math.floor((today.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * M2 Timeline data structure
 */
export interface M2Timeline {
  currentWeek: number
  canSubmit: boolean
  canEditRoadmap: boolean
  week5OpenDate: Date
  deadlineDate: Date
  daysUntilSubmissionOpens: number
  daysUntilDeadline: number
  isPastDeadline: boolean
}

/**
 * Calculate M2 program timeline based on hackathon end date
 * This function is used for dynamic week calculation per project
 * @param hackathonEndDate - The date when the hackathon ended
 * @returns M2Timeline object with current week, submission windows, etc.
 */
export function calculateM2Timeline(hackathonEndDate: Date | string | undefined): M2Timeline {
  // Handle case where hackathonEndDate is not set
  if (!hackathonEndDate) {
    const now = new Date()
    const fallbackWeek5 = new Date(now)
    fallbackWeek5.setDate(fallbackWeek5.getDate() + 28)
    const fallbackDeadline = new Date(now)
    fallbackDeadline.setDate(fallbackDeadline.getDate() + 42)
    
    return {
      currentWeek: 1,
      canSubmit: false,
      canEditRoadmap: true,
      week5OpenDate: fallbackWeek5,
      deadlineDate: fallbackDeadline,
      daysUntilSubmissionOpens: 28,
      daysUntilDeadline: 42,
      isPastDeadline: false,
    }
  }
  
  const now = new Date()
  const endDate = new Date(hackathonEndDate)
  
  // Calculate days since hackathon ended
  const daysSinceHackathon = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Calculate current week (Week 1 starts the day after hackathon ends)
  const currentWeek = Math.floor(daysSinceHackathon / 7) + 1
  
  // Week 5 opens 28 days after hackathon (4 weeks * 7 days)
  const week5OpenDate = new Date(endDate)
  week5OpenDate.setDate(week5OpenDate.getDate() + 28)
  
  // Week 6 ends 42 days after hackathon (6 weeks * 7 days)
  const deadlineDate = new Date(endDate)
  deadlineDate.setDate(deadlineDate.getDate() + 42)
  
  // Submission window is Weeks 5-6
  const canSubmit = currentWeek >= 5 && currentWeek <= 6
  
  // Roadmap editing is Weeks 1-4
  const canEditRoadmap = currentWeek >= 1 && currentWeek <= 4
  
  // Calculate days until key dates
  const daysUntilSubmissionOpens = Math.max(0, Math.floor((week5OpenDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const daysUntilDeadline = Math.max(0, Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  
  const isPastDeadline = currentWeek > 6
  
  return {
    currentWeek: Math.max(1, Math.min(currentWeek, 7)), // Clamp between 1-7
    canSubmit,
    canEditRoadmap,
    week5OpenDate,
    deadlineDate,
    daysUntilSubmissionOpens,
    daysUntilDeadline,
    isPastDeadline,
  }
}
