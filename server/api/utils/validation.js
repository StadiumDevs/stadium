/**
 * Validation utility functions for Stadium backend
 */
import { ALLOWED_CATEGORIES } from '../constants/allowedTech.js';

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

/** Wallet chains supported for sign-in and address storage. */
export const ALLOWED_WALLET_CHAINS = ['substrate', 'ethereum', 'solana'];

/**
 * Validate a wallet address for a given chain.
 * @param {string} chain - 'substrate' | 'ethereum' | 'solana'
 * @param {string} address
 * @returns {boolean} - True if the address is valid for the chain
 */
export const validateAddress = (chain, address) => {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  switch (chain) {
    case 'ethereum':
      return /^0x[a-fA-F0-9]{40}$/.test(trimmed);
    case 'solana':
      // base58 public key — 32-byte keys encode to 32-44 base58 characters.
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
    case 'substrate':
    default:
      return validateSS58(trimmed);
  }
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
  
  if (member.walletChain !== undefined && !ALLOWED_WALLET_CHAINS.includes(member.walletChain)) {
    return { valid: false, error: `Invalid walletChain: ${member.walletChain}` };
  }
  const memberWalletChain = member.walletChain || 'substrate';
  if (member.walletAddress && !validateAddress(memberWalletChain, member.walletAddress)) {
    return { valid: false, error: `Invalid ${memberWalletChain} address format: ${member.walletAddress}` };
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
 * Validate email address (Phase 2 revamp, #67).
 * @param {string} email
 * @returns {Object} - { valid: boolean, error?: string, normalised?: string }
 */
export const validateEmail = (email) => {
  if (typeof email !== 'string') return { valid: false, error: 'email must be a string' };
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > 254) {
    return { valid: false, error: 'email must be 1–254 characters' };
  }
  const emailRe = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
  if (!emailRe.test(trimmed)) {
    return { valid: false, error: 'email must be a valid email address' };
  }
  return { valid: true, normalised: trimmed };
};

/**
 * Validate project creation payload (Phase 2 revamp, #80).
 * @param {Object} data
 * @returns {Object} - { valid: boolean, errors: Record<string,string> }
 */
export const validateProject = (data) => {
  const errors = {};

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: { _root: 'Project payload must be an object' } };
  }

  // projectName is required
  if (!data.projectName || typeof data.projectName !== 'string' || !validateLength(data.projectName, 1, 200)) {
    errors.projectName = 'projectName is required (1–200 characters)';
  }

  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string' || !validateLength(data.description, 0, 5000)) {
      errors.description = 'description must be a string (max 5000 characters)';
    }
  }

  for (const urlField of ['projectRepo', 'demoUrl', 'slidesUrl', 'liveUrl']) {
    if (data[urlField] !== undefined && data[urlField] !== null && data[urlField] !== '') {
      if (!validateSimpleUrl(data[urlField])) {
        errors[urlField] = `${urlField} must start with www or http`;
      }
    }
  }

  if (data.donationChain !== undefined && !ALLOWED_WALLET_CHAINS.includes(data.donationChain)) {
    errors.donationChain = `donationChain must be one of: ${ALLOWED_WALLET_CHAINS.join(', ')}`;
  }
  if (data.donationAddress !== undefined && data.donationAddress !== null && data.donationAddress !== '') {
    const donationChain = data.donationChain || 'substrate';
    if (!validateAddress(donationChain, data.donationAddress)) {
      errors.donationAddress = `donationAddress must be a valid ${donationChain} address`;
    }
  }

  if (data.categories !== undefined && data.categories !== null) {
    if (!Array.isArray(data.categories)) {
      errors.categories = 'categories must be an array';
    } else {
      const bad = data.categories.filter(c => !ALLOWED_CATEGORIES.includes(String(c)));
      if (bad.length > 0) {
        errors.categories = `Invalid categories: ${bad.join(', ')}`;
      }
    }
  }

  if (data.teamMembers !== undefined && data.teamMembers !== null) {
    if (!Array.isArray(data.teamMembers)) {
      errors.teamMembers = 'teamMembers must be an array';
    } else {
      for (let i = 0; i < data.teamMembers.length; i++) {
        const result = validateTeamMember(data.teamMembers[i]);
        if (!result.valid) {
          errors[`teamMembers[${i}]`] = result.error;
        }
      }
    }
  }

  if (data.hackathon !== undefined && data.hackathon !== null) {
    if (typeof data.hackathon !== 'object' || Array.isArray(data.hackathon)) {
      errors.hackathon = 'hackathon must be an object';
    } else if (data.hackathon.name !== undefined && data.hackathon.name !== null) {
      if (typeof data.hackathon.name !== 'string' || !validateLength(data.hackathon.name, 1, 200)) {
        errors['hackathon.name'] = 'hackathon.name must be a string (1–200 characters)';
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
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

// --- Program content (templatable, typed sections rendered as panels) ---

export const ALLOWED_CONTENT_TYPES = [
  'text', 'steps', 'schedule', 'lineup', 'stats', 'feedback', 'cta',
];

const isStr = (v, min, max) =>
  typeof v === 'string' && v.length >= min && v.length <= max;
const isOptStr = (v, max) =>
  v === undefined || v === null || (typeof v === 'string' && v.length <= max);
const isHttpUrl = (v, max) =>
  typeof v === 'string' && v.length <= max && /^https?:\/\//i.test(v);
const isArr = (v, max) => Array.isArray(v) && v.length <= max;

const validateSection = (s, i) => {
  const where = `content[${i}]`;
  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    return `${where} must be an object`;
  }
  if (!ALLOWED_CONTENT_TYPES.includes(s.type)) {
    return `${where}.type must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`;
  }
  if (!isOptStr(s.title, 200)) return `${where}.title must be a string (max 200)`;

  switch (s.type) {
    case 'text':
      if (!isStr(s.body, 1, 6000)) return `${where}.body is required (1–6000 chars)`;
      return null;
    case 'steps':
      if (!isArr(s.items, 50)) return `${where}.items must be an array (max 50)`;
      if (!s.items.every((it) => isStr(it, 1, 500))) {
        return `${where}.items must be strings (1–500 chars)`;
      }
      return null;
    case 'schedule':
      if (!isArr(s.rows, 50)) return `${where}.rows must be an array (max 50)`;
      for (const r of s.rows) {
        if (!r || typeof r !== 'object') return `${where}.rows[] must be objects`;
        if (!isStr(r.time, 1, 60)) return `${where}.rows[].time is required (1–60 chars)`;
        if (!isStr(r.label, 1, 200)) return `${where}.rows[].label is required (1–200 chars)`;
      }
      return null;
    case 'lineup':
      if (!isArr(s.items, 50)) return `${where}.items must be an array (max 50)`;
      for (const it of s.items) {
        if (!it || typeof it !== 'object') return `${where}.items[] must be objects`;
        if (!isStr(it.name, 1, 200)) return `${where}.items[].name is required (1–200 chars)`;
        if (!isOptStr(it.blurb, 2000)) return `${where}.items[].blurb must be a string (max 2000)`;
        if (it.tryItems !== undefined) {
          if (!isArr(it.tryItems, 30) || !it.tryItems.every((t) => isStr(t, 1, 500))) {
            return `${where}.items[].tryItems must be an array of strings (max 30, 1–500 chars)`;
          }
        }
        if (it.links !== undefined) {
          if (!isArr(it.links, 20)) return `${where}.items[].links must be an array (max 20)`;
          for (const l of it.links) {
            if (!l || typeof l !== 'object') return `${where}.items[].links[] must be objects`;
            if (!isStr(l.label, 1, 120)) return `${where}.items[].links[].label is required (1–120 chars)`;
            if (!isHttpUrl(l.url, 500)) return `${where}.items[].links[].url must be an http(s) URL (max 500)`;
          }
        }
      }
      return null;
    case 'stats':
      if (!isArr(s.items, 20)) return `${where}.items must be an array (max 20)`;
      for (const it of s.items) {
        if (!it || typeof it !== 'object') return `${where}.items[] must be objects`;
        if (!isStr(it.label, 1, 120)) return `${where}.items[].label is required (1–120 chars)`;
        if (!isStr(it.value, 1, 60)) return `${where}.items[].value is required (1–60 chars)`;
      }
      return null;
    case 'feedback':
      if (!isArr(s.items, 100)) return `${where}.items must be an array (max 100)`;
      for (const it of s.items) {
        if (!it || typeof it !== 'object') return `${where}.items[] must be objects`;
        if (!isStr(it.quote, 1, 2000)) return `${where}.items[].quote is required (1–2000 chars)`;
        if (!isOptStr(it.product, 120)) return `${where}.items[].product must be a string (max 120)`;
        if (!isOptStr(it.rating, 20)) return `${where}.items[].rating must be a string (max 20)`;
        if (it.recommend !== undefined && typeof it.recommend !== 'boolean') {
          return `${where}.items[].recommend must be a boolean`;
        }
      }
      return null;
    case 'cta':
      if (!isStr(s.label, 1, 200)) return `${where}.label is required (1–200 chars)`;
      if (!isHttpUrl(s.url, 500)) return `${where}.url must be an http(s) URL (max 500)`;
      return null;
    default:
      return `${where}.type is not supported`;
  }
};

export const validateProgramContent = (content) => {
  if (content === null || content === undefined) return { valid: true };
  if (!Array.isArray(content)) {
    return { valid: false, error: 'content must be an array or null' };
  }
  if (content.length > 40) {
    return { valid: false, error: 'content may have at most 40 sections' };
  }
  for (let i = 0; i < content.length; i += 1) {
    const err = validateSection(content[i], i);
    if (err) return { valid: false, error: err };
  }
  return { valid: true };
};

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
  if (has('eventUrl') && data.eventUrl !== null && data.eventUrl !== '') {
    if (typeof data.eventUrl !== 'string' || data.eventUrl.length > 500) {
      return { valid: false, error: 'eventUrl must be a string (max 500 characters)' };
    }
    if (!/^https?:\/\//i.test(data.eventUrl)) {
      return { valid: false, error: 'eventUrl must start with http:// or https://' };
    }
  }
  if (has('content')) {
    const c = validateProgramContent(data.content);
    if (!c.valid) return c;
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

// --- Sponsors (per-program) ---

// Open-ended profile vocabulary — the team can write anything but these are the
// expected canonical values. Validator only enforces shape, not the dictionary.
export const SUGGESTED_SPONSOR_PROFILES = [
  'developer',
  'designer',
  'marketer',
  'artist',
  'researcher',
  'founder',
  'other',
];

export const validateSponsor = (data, { partial = false } = {}) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Sponsor payload must be an object' };
  }
  const has = (k) => Object.prototype.hasOwnProperty.call(data, k);

  if (!partial || has('name')) {
    if (typeof data.name !== 'string' || !validateLength(data.name, 1, 200)) {
      return { valid: false, error: 'name is required (1–200 characters)' };
    }
  }
  if (has('submissionTarget') && data.submissionTarget !== null && data.submissionTarget !== '') {
    const n = Number(data.submissionTarget);
    if (!Number.isInteger(n) || n < 0 || n > 100000) {
      return { valid: false, error: 'submissionTarget must be a non-negative integer (max 100000)' };
    }
  }
  if (has('targetProfiles') && data.targetProfiles !== null) {
    if (!Array.isArray(data.targetProfiles)) {
      return { valid: false, error: 'targetProfiles must be an array of strings' };
    }
    if (data.targetProfiles.length > 20) {
      return { valid: false, error: 'targetProfiles allows at most 20 entries' };
    }
    for (const p of data.targetProfiles) {
      if (typeof p !== 'string' || !validateLength(p, 1, 60)) {
        return { valid: false, error: 'targetProfiles entries must be strings 1–60 chars' };
      }
    }
  }
  for (const key of ['applicationInstructions', 'followUpNotes']) {
    if (has(key) && data[key] !== null && data[key] !== '') {
      if (typeof data[key] !== 'string' || data[key].length > 4000) {
        return { valid: false, error: `${key} must be a string (max 4000 characters)` };
      }
    }
  }
  if (has('applyUrl') && data.applyUrl !== null && data.applyUrl !== '') {
    if (typeof data.applyUrl !== 'string' || data.applyUrl.length > 500) {
      return { valid: false, error: 'applyUrl must be a string (max 500 characters)' };
    }
    if (!/^https?:\/\//i.test(data.applyUrl)) {
      return { valid: false, error: 'applyUrl must start with http:// or https://' };
    }
  }
  return { valid: true };
};

// --- Project continuations ('What's next, milestone 3?' form) ---

export const validateContinuation = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Continuation payload must be an object' };
  }
  if (typeof data.currentStatus !== 'string' || !validateLength(data.currentStatus, 1, 4000)) {
    return { valid: false, error: 'currentStatus is required (1–4000 characters)' };
  }
  if (data.wantSupport !== undefined && typeof data.wantSupport !== 'boolean') {
    return { valid: false, error: 'wantSupport must be a boolean' };
  }
  if (data.supportFor !== undefined && data.supportFor !== null) {
    if (typeof data.supportFor !== 'string' || data.supportFor.length > 4000) {
      return { valid: false, error: 'supportFor must be a string (max 4000 characters)' };
    }
  }
  if (data.nextStepUrl !== undefined && data.nextStepUrl !== null && data.nextStepUrl !== '') {
    if (typeof data.nextStepUrl !== 'string' || data.nextStepUrl.length > 500) {
      return { valid: false, error: 'nextStepUrl must be a string (max 500 characters)' };
    }
    if (!/^https?:\/\//i.test(data.nextStepUrl)) {
      return { valid: false, error: 'nextStepUrl must start with http:// or https://' };
    }
  }
  return { valid: true };
};
