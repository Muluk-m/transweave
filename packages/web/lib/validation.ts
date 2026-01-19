/**
 * Validation utilities for token keys and other entities
 */

/**
 * Token key validation regex
 * Rules:
 * - Must start with lowercase letter
 * - Can contain letters (a-z, A-Z) and numbers (0-9)
 * - Can use dot (.) to separate hierarchical levels
 * - Each level after dot must also start with lowercase letter
 * 
 * Examples:
 * - Valid: "login", "user.profile", "settings.account.email"
 * - Invalid: "Login", "user_profile", "settings.", ".settings", "1user"
 */
const TOKEN_KEY_REGEX = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/;

/**
 * Check if a token key is valid
 * @param key - The token key to validate
 * @returns true if valid, false otherwise
 */
export function isValidTokenKey(key: string): boolean {
  return TOKEN_KEY_REGEX.test(key);
}

/**
 * Validate token key and return error message if invalid
 * @param key - The token key to validate
 * @param t - Translation function
 * @returns Error message if invalid, undefined if valid
 */
export function validateTokenKey(
  key: string,
  t: (key: string) => string
): string | undefined {
  if (!key.trim()) {
    return t("validation.keyRequired");
  }
  if (!isValidTokenKey(key)) {
    return t("validation.keyInvalid");
  }
  return undefined;
}
