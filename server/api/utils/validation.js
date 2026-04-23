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

/**
 * Validate project update data (Phase 1 revamp, #39).
 * @param {Object} data - { body: string, linkUrl?: string }
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateProjectUpdate = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Update payload must be an object' };
  }
  const { body, linkUrl } = data;

  if (typeof body !== 'string') {
    return { valid: false, error: 'body is required and must be a string' };
  }
  if (!validateLength(body, 1, 2000)) {
    return { valid: false, error: 'body must be between 1 and 2000 characters' };
  }

  if (linkUrl !== undefined && linkUrl !== null && linkUrl !== '') {
    if (typeof linkUrl !== 'string' || !validateSimpleUrl(linkUrl)) {
      return { valid: false, error: 'linkUrl, when provided, must start with www or http' };
    }
  }

  return { valid: true };
};

/**
 * Validate funding-signal payload (Phase 1 revamp, #42).
 * @param {Object} data - { isSeeking, fundingType?, amountRange?, description? }
 * @returns {Object} - { valid: boolean, error: string }
 */
export const ALLOWED_FUNDING_TYPES = ['grant', 'bounty', 'pre_seed', 'seed', 'other'];

export const validateFundingSignal = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Funding signal payload must be an object' };
  }
  const { isSeeking, fundingType, amountRange, description } = data;

  if (typeof isSeeking !== 'boolean') {
    return { valid: false, error: 'isSeeking is required and must be a boolean' };
  }

  if (fundingType !== undefined && fundingType !== null && fundingType !== '') {
    if (!ALLOWED_FUNDING_TYPES.includes(fundingType)) {
      return {
        valid: false,
        error: `fundingType must be one of: ${ALLOWED_FUNDING_TYPES.join(', ')}`,
      };
    }
  }

  if (amountRange !== undefined && amountRange !== null) {
    if (typeof amountRange !== 'string' || amountRange.length > 100) {
      return { valid: false, error: 'amountRange must be a string (max 100 characters)' };
    }
  }

  if (description !== undefined && description !== null && description !== '') {
    if (typeof description !== 'string' || description.length > 500) {
      return { valid: false, error: 'description must be a string with 500 characters or fewer' };
    }
  }

  return { valid: true };
};

/**
 * Validate program payload (Phase 1 revamp, #46).
 * @param {Object} data
 * @param {Object} opts - { partial: boolean } — PATCH payloads only include changed fields.
 * @returns {Object} - { valid: boolean, error: string }
 */
export const ALLOWED_PROGRAM_TYPES = ['dogfooding', 'pitch_off', 'hackathon', 'm2_incubator'];
export const ALLOWED_PROGRAM_STATUSES = ['draft', 'open', 'closed', 'completed'];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const validateProgram = (data, { partial = false } = {}) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Program payload must be an object' };
  }
  const has = (k) => Object.prototype.hasOwnProperty.call(data, k);

  if (!partial || has('name')) {
    if (typeof data.name !== 'string' || !validateLength(data.name, 1, 200)) {
      return { valid: false, error: 'name is required (1–200 characters)' };
    }
  }
  if (!partial || has('slug')) {
    if (typeof data.slug !== 'string' || !SLUG_RE.test(data.slug) || data.slug.length > 100) {
      return { valid: false, error: 'slug must be kebab-case (a-z, 0-9, hyphens), 1–100 characters' };
    }
  }
  if (!partial || has('programType')) {
    if (!ALLOWED_PROGRAM_TYPES.includes(data.programType)) {
      return { valid: false, error: `programType must be one of: ${ALLOWED_PROGRAM_TYPES.join(', ')}` };
    }
  }
  if (!partial || has('status')) {
    if (!ALLOWED_PROGRAM_STATUSES.includes(data.status)) {
      return { valid: false, error: `status must be one of: ${ALLOWED_PROGRAM_STATUSES.join(', ')}` };
    }
  }

  if (has('description') && data.description !== null) {
    if (typeof data.description !== 'string' || data.description.length > 4000) {
      return { valid: false, error: 'description must be a string (max 4000 characters)' };
    }
  }
  if (has('location') && data.location !== null) {
    if (typeof data.location !== 'string' || data.location.length > 200) {
      return { valid: false, error: 'location must be a string (max 200 characters)' };
    }
  }
  if (has('maxApplicants') && data.maxApplicants !== null) {
    const n = Number(data.maxApplicants);
    if (!Number.isInteger(n) || n < 1) {
      return { valid: false, error: 'maxApplicants must be a positive integer' };
    }
  }

  const isoOrNull = (val) => {
    if (val === null || val === undefined || val === '') return true;
    if (typeof val !== 'string') return false;
    const d = new Date(val);
    return !Number.isNaN(d.getTime());
  };
  for (const key of ['applicationsOpenAt', 'applicationsCloseAt', 'eventStartsAt', 'eventEndsAt']) {
    if (has(key) && !isoOrNull(data[key])) {
      return { valid: false, error: `${key} must be a valid ISO date string or null` };
    }
  }

  if (has('applicationsOpenAt') && has('applicationsCloseAt') && data.applicationsOpenAt && data.applicationsCloseAt) {
    if (new Date(data.applicationsOpenAt).getTime() >= new Date(data.applicationsCloseAt).getTime()) {
      return { valid: false, error: 'applicationsOpenAt must be strictly before applicationsCloseAt' };
    }
  }
  if (has('eventStartsAt') && has('eventEndsAt') && data.eventStartsAt && data.eventEndsAt) {
    if (new Date(data.eventStartsAt).getTime() > new Date(data.eventEndsAt).getTime()) {
      return { valid: false, error: 'eventStartsAt must be on or before eventEndsAt' };
    }
  }

  return { valid: true };
};

