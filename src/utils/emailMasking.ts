/**
 * Utility functions for email masking and privacy protection
 */

/**
 * Mask an email address for display to non-owners
 * Example: "john.doe@example.com" -> "j***@example.com"
 * 
 * @param email - The email address to mask
 * @returns Masked email string
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  const [localPart, domain] = email.split('@');
  if (!domain) return email; // Invalid email format
  
  // Show first character of local part, mask the rest
  const maskedLocal = localPart.length > 0 
    ? `${localPart[0]}***` 
    : '***';
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Get display email based on whether it's the user's own email
 * Returns full email if not null (own profile), or masked version if provided
 * 
 * @param email - The email from the profile (null if not own profile)
 * @param fallbackEmail - Optional fallback email to mask and show
 * @returns Display string or empty string
 */
export function getDisplayEmail(
  email: string | null | undefined,
  fallbackEmail?: string | null
): string {
  // If email is not null, it means it's the user's own profile (RLS allows it)
  if (email) return email;
  
  // If a fallback is provided, mask it
  if (fallbackEmail) return maskEmail(fallbackEmail);
  
  return '';
}
