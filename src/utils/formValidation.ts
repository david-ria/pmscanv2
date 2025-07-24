/**
 * Common form validation utilities
 * Standardizes validation patterns across forms
 */

export const validateRequired = (value: string | undefined | null, fieldName: string) => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validateRange = (value: number, min: number, max: number, fieldName: string) => {
  if (value < min || value > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }
  return null;
};

export const validatePositiveNumber = (value: number, fieldName: string) => {
  if (value <= 0) {
    return `${fieldName} must be a positive number`;
  }
  return null;
};

export const validateMinLength = (value: string, minLength: number, fieldName: string) => {
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters long`;
  }
  return null;
};

export const validateMaxLength = (value: string, maxLength: number, fieldName: string) => {
  if (value.length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }
  return null;
};

export const validateThresholds = (min: number | undefined, max: number | undefined, fieldName: string) => {
  if (min !== undefined && max !== undefined && min >= max) {
    return `${fieldName} minimum must be less than maximum`;
  }
  return null;
};

// Composite validation functions
export const validateName = (name: string) => {
  return validateRequired(name, 'Name') || validateMinLength(name, 2, 'Name') || validateMaxLength(name, 100, 'Name');
};

export const validateDescription = (description: string | undefined) => {
  if (description && description.length > 500) {
    return validateMaxLength(description, 500, 'Description');
  }
  return null;
};

// Security-focused validation functions
export const validateUserInput = (input: string, fieldName: string) => {
  // Prevent XSS and injection attempts
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return `${fieldName} contains potentially dangerous content`;
    }
  }
  
  return null;
};

export const validateSecureId = (id: string, fieldName: string) => {
  // UUID v4 format validation
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id)) {
    return `${fieldName} must be a valid UUID`;
  }
  return null;
};

export const sanitizeInput = (input: string): string => {
  // Basic HTML entity encoding to prevent XSS
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};