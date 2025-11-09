/**
 * Date calculation helpers for M2 program
 */

/**
 * Calculate current week of M2 program based on hackathon end date
 * @param {Date|string} hackathonEndDate - End date of hackathon
 * @returns {number} - Current week number (1-7+)
 */
export const getCurrentWeek = (hackathonEndDate) => {
  if (!hackathonEndDate) return 0;
  
  const now = new Date();
  const endDate = new Date(hackathonEndDate);
  
  // Calculate days since hackathon ended
  const daysSince = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));
  
  // Week 1 starts the day after hackathon ends
  return Math.max(1, Math.floor(daysSince / 7) + 1);
};

/**
 * Check if submission window is open (Week 5-6)
 * @param {Date|string} hackathonEndDate - End date of hackathon
 * @returns {boolean} - True if in Week 5-6
 */
export const isSubmissionWindowOpen = (hackathonEndDate) => {
  const currentWeek = getCurrentWeek(hackathonEndDate);
  return currentWeek >= 5 && currentWeek <= 6;
};

/**
 * Check if still in editing phase (Week 1-4)
 * @param {Date|string} hackathonEndDate - End date of hackathon
 * @returns {boolean} - True if in Week 1-4
 */
export const canEditM2Agreement = (hackathonEndDate) => {
  const currentWeek = getCurrentWeek(hackathonEndDate);
  return currentWeek >= 1 && currentWeek <= 4;
};

/**
 * Check if program is still active (Week 1-6)
 * @param {Date|string} hackathonEndDate - End date of hackathon
 * @returns {boolean} - True if in Week 1-6
 */
export const isProgramActive = (hackathonEndDate) => {
  const currentWeek = getCurrentWeek(hackathonEndDate);
  return currentWeek >= 1 && currentWeek <= 6;
};

/**
 * Get program phase description
 * @param {Date|string} hackathonEndDate - End date of hackathon
 * @returns {string} - Phase description
 */
export const getProgramPhase = (hackathonEndDate) => {
  const currentWeek = getCurrentWeek(hackathonEndDate);
  
  if (currentWeek < 1) return 'Not started';
  if (currentWeek <= 4) return 'Building phase';
  if (currentWeek === 5 || currentWeek === 6) return 'Submission window';
  return 'Program completed';
};

/**
 * Calculate days until submission deadline
 * @param {Date|string} hackathonEndDate - End date of hackathon
 * @returns {number} - Days remaining (negative if passed)
 */
export const getDaysUntilDeadline = (hackathonEndDate) => {
  if (!hackathonEndDate) return -1;
  
  const now = new Date();
  const endDate = new Date(hackathonEndDate);
  
  // Submission deadline is 6 weeks (42 days) after hackathon ends
  const deadlineDate = new Date(endDate);
  deadlineDate.setDate(deadlineDate.getDate() + 42);
  
  const daysRemaining = Math.floor((deadlineDate - now) / (1000 * 60 * 60 * 24));
  return daysRemaining;
};

