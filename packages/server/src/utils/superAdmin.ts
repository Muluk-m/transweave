export const SUPER_ADMINS = ['maqiqian@qiliangjia.com']

export function isSuperAdmin(userEmail: string) {
  return SUPER_ADMINS.includes(userEmail);
}