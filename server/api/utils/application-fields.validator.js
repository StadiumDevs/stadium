/**
 * Per-program-type validator for `program_applications.application_fields`.
 * Spec reference: docs/stadium-revamp-phase-1-spec.md §5 Issue 8.
 *
 * Phase 1 ships only the `dogfooding` program type. POSTing an application
 * against a program whose `program_type` has no registered validator returns
 * a 400 with a distinct code so the admin UI can surface it clearly.
 *
 * Adding a new program type is a two-line change: register its schema in
 * `validators`, done.
 */

const dogfooding = (fields) => {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return { valid: false, error: 'application_fields must be an object' };
  }
  const { feedback_focus } = fields;
  if (typeof feedback_focus !== 'string') {
    return { valid: false, error: 'feedback_focus is required and must be a string' };
  }
  const trimmed = feedback_focus.trim();
  if (trimmed.length < 1 || trimmed.length > 500) {
    return { valid: false, error: 'feedback_focus must be 1–500 characters' };
  }
  // Return a canonicalised shape (trimmed string). Callers can use it to
  // persist the normalised value.
  return { valid: true, normalised: { feedback_focus: trimmed } };
};

const validators = {
  dogfooding,
};

export const validateApplicationFields = (programType, fields) => {
  const fn = validators[programType];
  if (!fn) {
    return {
      valid: false,
      code: 'unsupported_program_type_for_application',
      error: `No application-field validator registered for program_type "${programType}".`,
    };
  }
  return fn(fields);
};

export const SUPPORTED_APPLICATION_PROGRAM_TYPES = Object.keys(validators);
