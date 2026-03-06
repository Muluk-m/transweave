import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { TeamService } from '../service/team.service';
import { MembershipService } from '../service/membership.service';
import { UserService } from '../service/user.service';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';
import { CreateTeamDto, UpdateTeamDto, InviteMemberDto, UpdateMemberRoleDto } from '../dto/team.dto';

@Controller('api/team')
export class TeamController {
  constructor(
    private teamService: TeamService,
    private membershipService: MembershipService,
    private userService: UserService,
  ) {}

  @Post('create')
  @UseGuards(AuthGuard)
  async createTeam(
    @Body() data: CreateTeamDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.teamService.createTeam({
      ...data,
      userId: user.userId,
    });
  }

  @Get('all')
  @UseGuards(AuthGuard)
  async findAllTeams(@CurrentUser() user: UserPayload) {
    const memberships = await this.membershipService.getUserMemberships(
      user.userId,
    );
    return memberships.map((membership) => membership.team);
  }

  @Get('all/superadmin')
  @UseGuards(AuthGuard)
  async findAllEntireTeams(
    @CurrentUser() user: UserPayload,
  ) {
    const isAdmin = await this.userService.isAdmin(user.userId);
    if (!isAdmin) {
      throw new UnauthorizedException();
    }
    return this.teamService.findAllTeams();
  }

  @Get('find/:id')
  @UseGuards(AuthGuard)
  async findTeamById(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const isMember = await this.membershipService.isMember(id, user.userId);
    if (!isMember) {
      throw new ForbiddenException('No permission to access this team');
    }
    return this.teamService.findTeamById(id);
  }

  @Put('update/:id')
  @UseGuards(AuthGuard)
  async updateTeam(
    @Param('id') id: string,
    @Body() data: UpdateTeamDto,
    @CurrentUser() user: UserPayload,
  ) {
    const isManagerOrOwner = await this.membershipService.isManagerOrOwner(
      id,
      user.userId,
    );
    if (!isManagerOrOwner) {
      throw new ForbiddenException('No permission to modify this team');
    }
    return this.teamService.updateTeam(id, data);
  }

  @Delete('delete/:id')
  @UseGuards(AuthGuard)
  async deleteTeam(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    const isOwner = await this.membershipService.isOwner(id, user.userId);
    if (!isOwner) {
      throw new ForbiddenException('No permission to delete this team');
    }
    return this.teamService.deleteTeam(id);
  }

  @Get('list')
  @UseGuards(AuthGuard)
  async findMyTeams(@CurrentUser() user: UserPayload) {
    return this.teamService.findTeamsByUserId(user.userId);
  }

  @Post('addmember/:id')
  @UseGuards(AuthGuard)
  async addMember(
    @Param('id') teamId: string,
    @Body() data: InviteMemberDto,
    @CurrentUser() user: UserPayload,
  ) {
    // Ensure only team owners or managers can add members
    const isManagerOrOwner = await this.membershipService.isManagerOrOwner(
      teamId,
      user.userId,
    );
    if (!isManagerOrOwner) {
      throw new ForbiddenException('No permission to add members to this team');
    }

    // Don't allow setting anyone as owner unless the operator is the owner
    if (data.role === 'owner') {
      const isOwner = await this.membershipService.isOwner(teamId, user.userId);
      if (!isOwner) {
        throw new ForbiddenException('Only team owners can set other owners');
      }
    }

    return this.membershipService.createMembership({
      teamId,
      userId: data.userId,
      role: data.role,
    });
  }

  // Update member role
  @Put('updatemember/:id/:memberId')
  @UseGuards(AuthGuard)
  async updateMemberRole(
    @Param('id') teamId: string,
    @Param('memberId') memberId: string,
    @Body() data: UpdateMemberRoleDto,
    @CurrentUser() user: UserPayload,
  ) {
    const callerRole = await this.membershipService.getUserRole(teamId, user.userId);
    const isAdmin = await this.userService.isAdmin(user.userId);

    if (callerRole !== 'owner' && callerRole !== 'manager' && !isAdmin) {
      throw new ForbiddenException('Only owners, managers, or admins can update roles');
    }
    if (data.role === 'owner' && callerRole !== 'owner' && !isAdmin) {
      throw new ForbiddenException('Only owners or admins can promote to owner');
    }

    return this.membershipService.updateMemberRole(teamId, memberId, data.role);
  }

  // Remove team member
  @Delete('removemembers/:id/:memberId')
  @UseGuards(AuthGuard)
  async removeMember(
    @Param('id') teamId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<void> {
    // Ensure only team owners or managers can remove members
    const isManagerOrOwner = await this.membershipService.isManagerOrOwner(
      teamId,
      user.userId,
    );
    if (!isManagerOrOwner) {
      throw new ForbiddenException(
        'No permission to remove members from this team',
      );
    }

    // Cannot remove team owners
    const memberRole = await this.membershipService.getUserRole(
      teamId,
      memberId,
    );
    if (memberRole === 'owner') {
      throw new ForbiddenException('Cannot remove team owners');
    }

    return this.membershipService.removeMember(teamId, memberId);
  }

  // Get team member list
  @Get('members/:id')
  @UseGuards(AuthGuard)
  async getTeamMembers(
    @Param('id') teamId: string,
    @CurrentUser() user: UserPayload,
  ) {
    // Verify if user is a team member
    const isMember = await this.membershipService.isMember(teamId, user.userId);
    if (!isMember) {
      throw new ForbiddenException(
        'No permission to access this team member list',
      );
    }

    return this.teamService.getTeamMembers(teamId);
  }

  // Check if user has permission for this team
  @Get('check/:id')
  @UseGuards(AuthGuard)
  async checkUserHasPermission(
    @Param('id') teamId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return await this.membershipService.isMember(teamId, user.userId);
  }
}
