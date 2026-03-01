export const SUPER_ADMINS: string[] = []

export function isSuperAdmin(userEmail: string) {
  return SUPER_ADMINS.includes(userEmail);
}