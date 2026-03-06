import { Team } from '@/jotai/types';

function getUserRole(team: Team, userId: string): string | null {
  const membership = team.memberships?.find((m) => m.userId === userId);
  return membership?.role ?? null;
}

export function canDeleteTeam(team: Team, userId: string): boolean {
  return getUserRole(team, userId) === 'owner';
}

export function canEditTeam(team: Team, userId: string): boolean {
  const role = getUserRole(team, userId);
  return role === 'owner' || role === 'admin';
}

export function canManageMembers(team: Team, userId: string): boolean {
  const role = getUserRole(team, userId);
  return role === 'owner' || role === 'admin';
}
