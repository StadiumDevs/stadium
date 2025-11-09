/**
 * Validation utility functions for Stadium backend
 */

/**
 * Validate SS58 address format (Polkadot/Substrate)
 * @param {string} address - Wallet address to validate
 * @returns {boolean} - True if valid SS58 format
 */
export const validateSS58 = (address) => {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // SS58 addresses are 47-48 characters, alphanumeric (excluding 0, O, I, l)
  const ss58Regex = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/;
  return ss58Regex.test(address);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate GitHub URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid GitHub URL
 */
export const validateGitHubUrl = (url) => {
  if (!validateUrl(url)) return false;
  const urlRegex = /^https?:\/\/(www\.)?github\.com\/.+/i;
  return urlRegex.test(url);
};

/**
 * Validate video URL (YouTube or Loom)
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid video URL
 */
export const validateVideoUrl = (url) => {
  if (!validateUrl(url)) return false;
  const videoRegex = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|loom\.com)\/.+/i;
  return videoRegex.test(url);
};

/**
 * Sanitize string input (prevent XSS)
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  // Remove HTML tags and trim whitespace
  return input.trim().replace(/<[^>]*>/g, '');
};

/**
 * Validate string length
 * @param {string} str - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean} - True if valid length
 */
export const validateLength = (str, min, max) => {
  if (typeof str !== 'string') return false;
  const length = str.trim().length;
  return length >= min && length <= max;
};

/**
 * Validate team member object
 * @param {Object} member - Team member to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateTeamMember = (member) => {
  if (!member || typeof member !== 'object') {
    return { valid: false, error: 'Team member must be an object' };
  }
  
  if (!member.name || typeof member.name !== 'string') {
    return { valid: false, error: 'Team member must have a name' };
  }
  
  if (!validateLength(member.name, 1, 100)) {
    return { valid: false, error: 'Team member name must be 1-100 characters' };
  }
  
  if (member.walletAddress && !validateSS58(member.walletAddress)) {
    return { valid: false, error: `Invalid SS58 address format: ${member.walletAddress}` };
  }
  
  if (member.role && !validateLength(member.role, 0, 50)) {
    return { valid: false, error: 'Team member role must be less than 50 characters' };
  }
  
  // Validate social links
  const socialFields = ['twitter', 'github', 'linkedin', 'customUrl'];
  for (const field of socialFields) {
    if (member[field] && !validateLength(member[field], 0, 200)) {
      return { valid: false, error: `${field} must be less than 200 characters` };
    }
  }
  
  return { valid: true };
};

/**
 * Validate M2 Agreement data
 * @param {Object} data - M2 Agreement data
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateM2Agreement = (data) => {
  const { agreedFeatures, documentation, successCriteria } = data;
  
  if (!agreedFeatures || !Array.isArray(agreedFeatures) || agreedFeatures.length === 0) {
    return { valid: false, error: 'Core features are required and must be a non-empty array' };
  }
  
  if (agreedFeatures.length > 20) {
    return { valid: false, error: 'Maximum 20 core features allowed' };
  }
  
  for (const feature of agreedFeatures) {
    if (typeof feature !== 'string' || !validateLength(feature, 1, 500)) {
      return { valid: false, error: 'Each feature must be 1-500 characters' };
    }
  }
  
  if (!documentation || !Array.isArray(documentation) || documentation.length === 0) {
    return { valid: false, error: 'Documentation requirements are required and must be a non-empty array' };
  }
  
  if (documentation.length > 10) {
    return { valid: false, error: 'Maximum 10 documentation items allowed' };
  }
  
  for (const doc of documentation) {
    if (typeof doc !== 'string' || !validateLength(doc, 1, 500)) {
      return { valid: false, error: 'Each documentation item must be 1-500 characters' };
    }
  }
  
  if (!successCriteria || typeof successCriteria !== 'string') {
    return { valid: false, error: 'Success criteria is required and must be a string' };
  }
  
  if (!validateLength(successCriteria, 1, 2000)) {
    return { valid: false, error: 'Success criteria must be 1-2000 characters' };
  }
  
  return { valid: true };
};

/**
 * Validate simple URL format (starts with www or http)
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL format
 */
export const validateSimpleUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return url.startsWith('www') || url.startsWith('http://') || url.startsWith('https://');
};

/**
 * Validate M2 submission data
 * @param {Object} data - Submission data
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateM2Submission = (data) => {
  const { repoUrl, demoUrl, docsUrl, summary } = data;
  
  if (!repoUrl || !demoUrl || !docsUrl || !summary) {
    return { valid: false, error: 'All fields are required: repoUrl, demoUrl, docsUrl, summary' };
  }
  
  if (!validateSimpleUrl(repoUrl)) {
    return { valid: false, error: 'Repository URL must start with www or http' };
  }
  
  if (!validateSimpleUrl(demoUrl)) {
    return { valid: false, error: 'Demo URL must start with www or http' };
  }
  
  if (!validateSimpleUrl(docsUrl)) {
    return { valid: false, error: 'Documentation URL must start with www or http' };
  }
  
  if (!validateLength(summary, 10, 1000)) {
    return { valid: false, error: 'Summary must be between 10 and 1000 characters' };
  }
  
  return { valid: true };
};

