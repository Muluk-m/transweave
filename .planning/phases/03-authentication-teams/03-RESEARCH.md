# Phase 3: Authentication & Teams - Research

**Researched:** 2026-03-01
**Domain:** Username/password authentication, JWT session management, RBAC team management, first-run setup wizard
**Confidence:** HIGH

## Summary

Phase 3 replaces the current Feishu OAuth-only login with built-in username/password authentication and rebuilds the team management system to work cleanly on top of the Drizzle/repository layer established in Phase 2. The current codebase already has most of the pieces: `auth.service.ts` has `register()` and `login()` methods with PBKDF2 password hashing, `membership.service.ts` implements role-checking (`isMember`, `isOwner`, `isManagerOrOwner`), and the frontend has a `login()` path in `AuthContext`. What needs to change is: (1) remove all Feishu OAuth code from backend and frontend, (2) remove the hardcoded `joinDefaultTeam` with its MongoDB ObjectId, (3) remove the `isSuperAdmin` email-based check and replace with DB-backed admin role, (4) add a first-run setup wizard for empty databases, (5) add admin password reset capability, (6) rewrite the login page from Feishu-only to username/password form, and (7) migrate all service code to use the new repository layer instead of Mongoose models.

The technical risk is LOW because this phase is largely about removing code (Feishu OAuth, hardcoded IDs, superAdmin email list) and adapting existing patterns (register/login already exist) to the new data layer. The new features (first-run wizard, admin password reset) are straightforward CRUD operations. The existing RBAC system (owner/manager/member) already works conceptually and just needs to be rewired to repositories.

**Primary recommendation:** Migrate existing auth and team services to repository layer, strip Feishu code, add first-run setup endpoint, add admin password reset endpoint, rebuild login page with username/password form.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can register with username and password | Existing `AuthService.register()` already does this with PBKDF2 hashing. Needs migration to repository layer. Frontend `register()` in auth API exists. |
| AUTH-02 | User can log in with username and password and receive JWT token | Existing `AuthService.login()` already does this. JWT signed with `@nestjs/jwt` (15-day expiry). Needs repository migration only. |
| AUTH-03 | User session persists across browser refresh via stored JWT | Already works: `AuthContext` stores token in `localStorage`, `checkAuth()` calls `/api/auth/status` on mount, `apiClient` attaches Bearer token to all requests. No changes needed. |
| AUTH-04 | User can log out from any page | Already works: `AuthContext.logout()` clears `localStorage` and sets user to null. No changes needed. |
| AUTH-05 | First-run setup wizard creates initial admin user and team when database is empty | NEW: Need backend endpoint to check if DB is empty, endpoint to create admin + default team, frontend setup wizard page. Replace `joinDefaultTeam` with dynamic setup. |
| AUTH-06 | Admin can reset any user's password | NEW: Need `PUT /api/users/:id/reset-password` endpoint guarded by admin/owner role check. Admin concept replaces `isSuperAdmin` email list. |
| TEAM-01 | User can create teams | Existing `TeamController.createTeam()` works. Needs repository migration. Frontend `CreateTeamDialog` exists. |
| TEAM-02 | Team owner can invite members to team | Existing `TeamController.addMember()` works with role checks. Needs repository migration. Frontend `teamMembersDialog` exists. |
| TEAM-03 | Team supports role-based access: owner, manager, member | Already implemented in `Membership.role` enum and checked throughout `TeamController`. Schema carries forward. |
| TEAM-04 | Team owner/manager can change member roles | Existing `TeamController.updateMemberRole()` works. Currently restricted to owner only; requirement says owner/manager can change roles. |
| TEAM-05 | Team owner/manager can remove members from team | Existing `TeamController.removeMember()` works with `isManagerOrOwner` check. Needs repository migration. |
| TEAM-06 | User can view and switch between their teams | Existing `TeamController.findAllTeams()` returns user's teams. Frontend `teamsView` with team cards exists. Jotai `nowTeamAtom` handles selection. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/jwt | 11.x | JWT token signing/verification | Already in use. NestJS official package. Global module registration. |
| @nestjs/passport | 11.x | Passport.js integration for NestJS | Already in use. Provides AuthGuard and strategy pattern. |
| passport-jwt | 4.x | JWT extraction from Bearer header | Already in use. ExtractJwt.fromAuthHeaderAsBearerToken(). |
| Node.js crypto (built-in) | N/A | PBKDF2 password hashing | Already in use via `crypto.ts`. No external dependency needed. Uses timingSafeEqual for constant-time comparison. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 3.x | Request body validation | Already in project. Use for validating register/login/setup request shapes. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PBKDF2 (current) | bcrypt | bcrypt is more standard but current PBKDF2 with 100k iterations + sha512 is equally secure. Switching adds a dependency for zero gain. Keep PBKDF2. |
| localStorage JWT | httpOnly cookies | Cookies are more secure against XSS but require CSRF protection and complicate the API client. Current localStorage pattern is already working and typical for SPAs. Keep localStorage. |
| Hardcoded admin email list | DB-backed `isAdmin` flag on user | DB-backed is the only correct approach for OSS. Hardcoded emails are proprietary. |

**Installation:**
No new packages needed. All dependencies already exist in the project.

## Architecture Patterns

### Recommended Project Structure

```
packages/
  server/src/
    service/
      auth.service.ts        # MODIFY: Remove Feishu, use repositories, add setup/reset
      user.service.ts         # MODIFY: Remove Feishu methods, use repositories
      team.service.ts         # MODIFY: Use repositories instead of Mongoose
      membership.service.ts   # MODIFY: Use repositories instead of Mongoose
    controller/
      auth.controller.ts      # MODIFY: Remove login_feishu, add setup endpoint
      team.controller.ts      # MODIFY: Remove isSuperAdmin, use DB admin check
      user.controller.ts      # MODIFY: Add admin password reset endpoint
    utils/
      crypto.ts               # KEEP: Already well-implemented
      superAdmin.ts            # DELETE: Replace with DB-backed admin role
  web/
    app/
      login/page.tsx           # REWRITE: Username/password form instead of Feishu button
      setup/page.tsx           # NEW: First-run setup wizard
    lib/auth/
      auth-context.tsx         # MODIFY: Remove loginWithFeishu, add setup check
    api/
      auth.ts                  # MODIFY: Remove loginWithFeishu, add setup API
```

### Pattern 1: Service Layer Migration to Repositories

**What:** Each service method that currently uses `@InjectModel` and Mongoose `Model<T>` calls is rewritten to use the repository classes from Phase 2.
**When to use:** Every service in this phase (AuthService, UserService, TeamService, MembershipService).
**Example:**

```typescript
// BEFORE (current)
@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }
}

// AFTER (Phase 3)
@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }
}
```

### Pattern 2: First-Run Setup Detection

**What:** On application startup or first API request, check if the `users` table is empty. If empty, the frontend shows a setup wizard instead of the login page.
**When to use:** AUTH-05 first-run setup requirement.
**Example:**

```typescript
// controller/auth.controller.ts
@Get('setup/status')
async getSetupStatus() {
  const userCount = await this.userService.getUserCount();
  return { needsSetup: userCount === 0 };
}

@Post('setup')
async runSetup(@Body() data: { name: string; email: string; password: string; teamName: string }) {
  const userCount = await this.userService.getUserCount();
  if (userCount > 0) {
    throw new BadRequestException('Setup already completed');
  }
  // Create admin user
  const admin = await this.authService.register({
    name: data.name,
    email: data.email,
    password: data.password,
    avatar: '',
  });
  // Create default team with admin as owner
  await this.teamService.createTeam({
    name: data.teamName,
    url: data.teamName.toLowerCase().replace(/\s+/g, '-'),
    userId: admin.id,
  });
  // Return JWT so user is logged in immediately
  return this.authService.login({ email: data.email, password: data.password });
}
```

### Pattern 3: Admin Role via Database

**What:** Replace the hardcoded `SUPER_ADMINS` email list with a database-backed admin check. The first user created during setup is automatically an admin. Add an `isAdmin` boolean column to the users table.
**When to use:** AUTH-06 admin password reset and any future admin-only operations.
**Example:**

```typescript
// In Drizzle schema (from Phase 2, may need adding)
// users table should have: isAdmin: boolean().default(false)

// service/user.service.ts
async isAdmin(userId: string): Promise<boolean> {
  const user = await this.userRepo.findById(userId);
  return user?.isAdmin ?? false;
}

// controller/user.controller.ts
@Put(':id/reset-password')
@UseGuards(AuthGuard)
async resetUserPassword(
  @Param('id') targetUserId: string,
  @Body() data: { newPassword: string },
  @CurrentUser() currentUser: UserPayload,
) {
  const admin = await this.userService.isAdmin(currentUser.userId);
  if (!admin) {
    throw new ForbiddenException('Only admins can reset passwords');
  }
  return this.userService.resetPassword(targetUserId, data.newPassword);
}
```

### Anti-Patterns to Avoid

- **Hardcoded admin emails:** The current `superAdmin.ts` exports `SUPER_ADMINS = ['maqiqian@qiliangjia.com']`. This is proprietary and breaks for all other deployments. Must be replaced with DB-backed admin flag.
- **Hardcoded team IDs:** The current `joinDefaultTeam` method hardcodes MongoDB ObjectId `'680f557b932fa3656cbae929'`. This is meaningless in a new database. Must be removed entirely; first-run setup creates the default team dynamically.
- **Feishu-specific user fields in schema:** `feishuId` and `feishuUnionId` columns must not exist in the new Drizzle schema. The `loginProvider` enum should only contain `'local'` (future OAuth providers can be added later).
- **Registration returning user without JWT:** Current `register()` returns user data but no token, forcing a second `login()` call. The setup wizard should return a JWT directly to avoid the extra round-trip.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | Keep existing `crypto.ts` with PBKDF2 | Already well-implemented: 100k iterations, sha512, random salt, timing-safe comparison. No need to change. |
| JWT management | Custom token signing | `@nestjs/jwt` + `passport-jwt` | Already configured globally in `AppModule`. Token extraction, validation, and guard are all handled. |
| Input validation | Manual if/else checking | Zod schemas | Already in project. Define schemas for register, login, setup, password reset request bodies. |
| Role checking | Custom middleware | Keep existing `MembershipService` methods | `isMember()`, `isOwner()`, `isManagerOrOwner()` already exist and work. Just migrate to repositories. |

**Key insight:** This phase is mostly about removing proprietary code and adapting existing patterns. Almost nothing needs to be built from scratch.

## Common Pitfalls

### Pitfall 1: Incomplete Feishu Removal

**What goes wrong:** Removing the obvious Feishu code (OAuth endpoint, loginWithFeishu method) but missing references scattered across the codebase: the Feishu client ID on the login page, the Feishu OAuth redirect URL construction, the `loginWithFeishu` function in auth-context.tsx, the `loginWithFeishu` function in web/api/auth.ts, the `feishuId`/`feishuUnionId` fields in the user schema, and the `'feishu'` value in the `loginProvider` enum.
**Why it happens:** Feishu integration touches 6+ files across frontend and backend.
**How to avoid:** After removing Feishu code, run a comprehensive grep for: `feishu`, `Feishu`, `FEISHU`, `lark`, `open.feishu.cn`, `cli_a6123d158e73500e` (the hardcoded client ID), `feishuState`, `qiliangjia-i18n` (the OAuth state string). All must return zero matches.
**Warning signs:** The login page still imports `loginWithFeishu` from auth-context, or the user schema still has feishu columns.

### Pitfall 2: Hardcoded Team ID Breaks New Deployments

**What goes wrong:** The `joinDefaultTeam` method in `auth.service.ts:154` references MongoDB ObjectId `'680f557b932fa3656cbae929'`. If this code path is not removed, every Feishu login attempt tries to join a team that does not exist in the new database.
**Why it happens:** This was a quick hack for internal use. Easy to miss during migration.
**How to avoid:** Delete the entire `joinDefaultTeam` method. Replace the concept with the first-run setup wizard that creates the default team dynamically.
**Warning signs:** `grep -r '680f557b932fa3656cbae929'` returns any matches.

### Pitfall 3: SuperAdmin Email Check Persists

**What goes wrong:** The `isSuperAdmin()` function in `utils/superAdmin.ts` checks against `['maqiqian@qiliangjia.com']`. If not removed, the "get all teams as superadmin" endpoint (`GET /api/team/all/superadmin`) only works for one specific email that won't exist in any OSS deployment.
**Why it happens:** Internal admin pattern leaks into OSS code.
**How to avoid:** Delete `superAdmin.ts`. Replace `isSuperAdmin(user.email)` checks in `team.controller.ts` with `userService.isAdmin(user.userId)` backed by database.
**Warning signs:** `grep -r 'isSuperAdmin\|SUPER_ADMINS\|superAdmin' packages/` returns any matches.

### Pitfall 4: Register Without Auto-Login

**What goes wrong:** Current `register()` in `auth.service.ts` returns user data without a JWT token. The frontend `AuthContext.register()` works around this by calling `apiRegister()` then `apiLogin()` -- two separate HTTP requests. During setup wizard, this creates a race condition window.
**Why it happens:** Original design separated registration from login.
**How to avoid:** Have `register()` return both user data and JWT token (like `login()` already does). Update frontend to use the single response. Critical for the setup wizard which must atomically create admin + team + return token.
**Warning signs:** Frontend setup flow makes two sequential API calls for register+login.

### Pitfall 5: Team Membership Role Update Permission Inconsistency

**What goes wrong:** Current `TeamController.updateMemberRole()` (line 150-158) only allows owners to update roles. But TEAM-04 says "Team owner/manager can change member roles." If the controller is migrated as-is, managers cannot change roles, violating the requirement.
**Why it happens:** Original controller was more restrictive than the OSS requirement specifies.
**How to avoid:** Change the permission check in `updateMemberRole` from `isOwner` to `isManagerOrOwner`. Add guard: managers can set role to 'member' or 'manager' but not 'owner'. Only owners can promote to 'owner'.
**Warning signs:** A manager tries to change a member's role and gets a 403 error.

## Code Examples

### Example 1: Clean Login Page (Username/Password Form)

```tsx
// packages/web/app/login/page.tsx
'use client'
import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push('/teams');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### Example 2: Setup Wizard Flow

```typescript
// Backend: auth.controller.ts
@Get('setup/status')
async getSetupStatus() {
  const count = await this.userService.getUserCount();
  return { needsSetup: count === 0 };
}

@Post('setup')
async initialSetup(@Body() data: {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  teamName: string;
}) {
  const count = await this.userService.getUserCount();
  if (count > 0) throw new BadRequestException('Already initialized');

  const hashedPassword = hashPassword(data.adminPassword);
  const admin = await this.userRepo.create({
    name: data.adminName,
    email: data.adminEmail,
    password: hashedPassword,
    isAdmin: true,
    loginProvider: 'local',
  });

  const team = await this.teamService.createTeam({
    name: data.teamName,
    url: data.teamName.toLowerCase().replace(/\s+/g, '-'),
    userId: admin.id,
  });

  const { token } = this.authService.createJwtToken(admin);
  return { token, user: this.authService.withoutPassword(admin) };
}
```

### Example 3: Admin Password Reset

```typescript
// Backend: user.controller.ts
@Put(':id/reset-password')
@UseGuards(AuthGuard)
async resetPassword(
  @Param('id') userId: string,
  @Body() data: { newPassword: string },
  @CurrentUser() admin: UserPayload,
) {
  const isAdmin = await this.userService.isAdmin(admin.userId);
  if (!isAdmin) throw new ForbiddenException('Admin access required');

  const hashed = hashPassword(data.newPassword);
  await this.userRepo.updatePassword(userId, hashed);
  return { success: true };
}
```

### Example 4: AuthContext Without Feishu

```tsx
// packages/web/lib/auth/auth-context.tsx (simplified)
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
  needsSetup: boolean;
};
// Remove: loginWithFeishu
// Add: needsSetup flag checked on mount via GET /api/auth/setup/status
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Feishu OAuth for all logins | Local username/password | This phase | Removes proprietary dependency |
| Hardcoded superAdmin email list | DB-backed `isAdmin` flag | This phase | Works for any deployment |
| Hardcoded default team ID | Dynamic first-run setup | This phase | New deployments can create their own team |
| Register returns no token | Register returns JWT | This phase | Single round-trip for registration |

**Deprecated/outdated:**
- `loginWithFeishu()` method and all Feishu OAuth code: Removed entirely
- `joinDefaultTeam()` with hardcoded ObjectId: Removed entirely
- `superAdmin.ts` with hardcoded email: Removed entirely
- `feishuId`, `feishuUnionId` user fields: Removed from schema

## Open Questions

1. **Should `isAdmin` be a user-level flag or a system role?**
   - What we know: The simplest approach is a boolean `isAdmin` on the users table. The first user created during setup gets `isAdmin: true`.
   - What's unclear: Whether future requirements will need more granular system-level roles (e.g., system admin vs team admin).
   - Recommendation: Use a simple `isAdmin` boolean for now. If granular system roles are needed later, add a `system_role` column. Keep it simple for v1.

2. **Should the setup wizard be a separate page or a modal?**
   - What we know: The setup wizard only appears once (when DB is empty). It needs: admin name, email, password, team name.
   - What's unclear: UX preference.
   - Recommendation: Separate `/setup` page. Simpler to implement, clearer UX, and the login page can redirect to it when `needsSetup` is true.

3. **Should managers be able to promote to manager role, or only owners?**
   - What we know: TEAM-04 says "owner/manager can change member roles." Current code only allows owners.
   - What's unclear: Whether managers should be able to promote others to manager.
   - Recommendation: Managers can change roles to 'member' or 'manager'. Only owners can set role to 'owner'. This matches the existing `isManagerOrOwner` pattern and prevents privilege escalation.

## Existing Code Inventory

Files that need modification in this phase:

### Backend - Remove Feishu + Migrate to Repositories

| File | Action | Details |
|------|--------|---------|
| `packages/server/src/service/auth.service.ts` | MODIFY | Remove `getFeishuAccessToken()`, `loginWithFeishu()`, `joinDefaultTeam()`. Remove `HttpService` dependency. Add `register()` returning JWT. Add setup methods. Migrate to repositories. |
| `packages/server/src/service/user.service.ts` | MODIFY | Remove `findUserByFeishuId()`. Remove `@InjectModel`. Add `getUserCount()`, `resetPassword()`, `isAdmin()`. Use `UserRepository`. |
| `packages/server/src/service/team.service.ts` | MODIFY | Remove `@InjectModel`. Remove `MongooseService`. Use repositories. Remove transaction code (use Drizzle transactions). |
| `packages/server/src/service/membership.service.ts` | MODIFY | Remove `@InjectModel`. Remove `MongooseService`. Use repositories. |
| `packages/server/src/controller/auth.controller.ts` | MODIFY | Remove `loginWithFeishu` endpoint. Add `GET setup/status` and `POST setup` endpoints. |
| `packages/server/src/controller/team.controller.ts` | MODIFY | Replace `isSuperAdmin(user.email)` with `userService.isAdmin(user.userId)`. Remove `import { isSuperAdmin }`. |
| `packages/server/src/controller/user.controller.ts` | MODIFY | Add `PUT :id/reset-password` endpoint with admin guard. |
| `packages/server/src/utils/superAdmin.ts` | DELETE | Replaced by DB-backed admin check. |
| `packages/server/src/app.module.ts` | MODIFY | Remove `HttpModule` import if no other service needs it. Update provider list. |

### Frontend - Remove Feishu + Add Setup

| File | Action | Details |
|------|--------|---------|
| `packages/web/app/login/page.tsx` | REWRITE | Replace Feishu OAuth button with email/password form. Remove `feishuClientId`, `feishuState`, `onFeishuLogin`. Add redirect to `/setup` when `needsSetup`. |
| `packages/web/app/setup/page.tsx` | NEW | Setup wizard with form: admin name, email, password, team name. Only accessible when DB is empty. |
| `packages/web/lib/auth/auth-context.tsx` | MODIFY | Remove `loginWithFeishu` from context type and implementation. Add `needsSetup` state. Add `checkSetup()` call on mount. |
| `packages/web/api/auth.ts` | MODIFY | Remove `loginWithFeishu()` function. Add `checkSetupStatus()` and `runSetup()` functions. |

### Schema Changes (from Phase 2 Drizzle schema)

| Change | Details |
|--------|---------|
| Add `isAdmin` column to users table | `boolean().default(false).notNull()` |
| Remove `feishuId` column | Was on Mongoose User schema, must not appear in Drizzle schema |
| Remove `feishuUnionId` column | Was on Mongoose User schema, must not appear in Drizzle schema |
| `loginProvider` enum | Only `'local'` value. Extensible later for OAuth providers. |

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `packages/server/src/service/auth.service.ts` -- Current auth implementation with register/login/Feishu OAuth
- Codebase inspection: `packages/server/src/controller/auth.controller.ts` -- Current auth endpoints
- Codebase inspection: `packages/server/src/controller/team.controller.ts` -- Current team management with RBAC
- Codebase inspection: `packages/server/src/service/membership.service.ts` -- Current role-checking methods
- Codebase inspection: `packages/server/src/utils/superAdmin.ts` -- Hardcoded admin email list
- Codebase inspection: `packages/server/src/utils/crypto.ts` -- PBKDF2 password hashing (well-implemented)
- Codebase inspection: `packages/web/app/login/page.tsx` -- Current Feishu-only login page
- Codebase inspection: `packages/web/lib/auth/auth-context.tsx` -- Current frontend auth state management
- Codebase inspection: `packages/web/api/auth.ts` -- Current frontend auth API calls

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- Architecture patterns including Pattern 4 (Pluggable Auth)
- `.planning/research/SUMMARY.md` -- Project research identifying Feishu removal and setup wizard needs
- `.planning/codebase/ARCHITECTURE.md` -- Current auth flow documentation
- `.planning/codebase/INTEGRATIONS.md` -- Feishu OAuth integration details

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already in use, no new dependencies needed
- Architecture: HIGH -- Patterns established by existing code and Phase 2 repository layer
- Pitfalls: HIGH -- All pitfalls identified from actual code inspection (grep verified)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable domain, no fast-moving dependencies)
