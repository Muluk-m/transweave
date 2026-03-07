'use client'

import {
    createTeam,
    deleteTeam,
    fetchMyTeams,
    getTeamById,
    getTeamMembers,
    updateTeam
} from "@/api/team";
import { useToast } from "@/components/ui/use-toast";
import { nowTeamAtom, teamsAtom } from "@/jotai";
import { Team } from "@/jotai/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

// Team operation hook
export const useHooks = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const t = useTranslations();
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamUrl, setNewTeamUrl] = useState("");
    const [teamDialogOpen, setTeamDialogOpen] = useState(false);
    const [teams, setTeams] = useAtom(teamsAtom);
    const [nowTeam, setNowTeam] = useAtom(nowTeamAtom);
    const [loading, setLoading] = useState(true);
    const [loadingTeamId, setLoadingTeamId] = useState<string | null>(null);
    
    // Load team list
    const loadTeams = async () => {
        try {
            setLoading(true);
            const teamsData = await fetchMyTeams();
            setTeams(teamsData);
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    };
    
    // Select team
    const handleSelectTeam = async (team: Team) => {
        try {
            setLoadingTeamId(team.id);
            const teamDetail = await getTeamById(team.id);
            setNowTeam(teamDetail);
            toast({
                title: t('teams.card.teamSelected'),
                description: team.name,
            });
        } catch (error) {
            toast({
                title: t('teams.card.selectFailed'),
                description: error instanceof Error ? error.message : t('teams.card.selectFailedDesc'),
                variant: "destructive"
            });
        } finally {
            setLoadingTeamId(null);
        }
    };

    // Create team
    const handleCreateTeam = async () => {
        if (!user) {
            toast({
                title: t('teams.card.error'),
                description: t('teams.card.notLoggedIn'),
                variant: "destructive"
            });
            return;
        }

        if (!newTeamName.trim()) {
            toast({
                title: t('teams.card.error'),
                description: t('teams.card.nameRequired'),
                variant: "destructive"
            });
            return;
        }

        try {
            setLoading(true);
            const newTeam = await createTeam({name: newTeamName, url: newTeamUrl});

            setTeams([...teams, newTeam]);
            setNewTeamName("");
            setNewTeamUrl("");
            setTeamDialogOpen(false);
            setNowTeam(newTeam);

            toast({
                title: t('teams.card.teamCreated'),
                description: newTeam.name,
            });
        } catch (error) {
            toast({
                title: t('teams.card.createFailed'),
                description: error instanceof Error ? error.message : t('teams.card.createFailedDesc'),
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Delete team
    const handleDeleteTeam = async (id: string) => {
        if (!confirm(t('teams.card.deleteDescription'))) {
            return;
        }

        try {
            setLoadingTeamId(id);
            await deleteTeam(id);

            const updatedTeams = teams.filter(team => team.id !== id);
            setTeams(updatedTeams);

            if (nowTeam && nowTeam.id === id) {
                setNowTeam(null);
            }

            toast({
                title: t('teams.card.teamDeleted'),
                description: t('teams.card.teamDeletedDesc'),
            });
        } catch (error) {
            toast({
                title: t('teams.card.deleteFailed'),
                description: error instanceof Error ? error.message : t('teams.card.deleteFailedDesc'),
                variant: "destructive"
            });
        } finally {
            setLoadingTeamId(null);
        }
    };

    // View team members
    const handleViewTeamMembers = async (teamId: string) => {
        try {
            setLoadingTeamId(teamId);
            await getTeamMembers(teamId);
            router.push(`/teams/${teamId}/members`);
        } catch (error) {
            toast({
                title: t('teams.card.membersFailed'),
                description: error instanceof Error ? error.message : t('teams.card.membersFailedDesc'),
                variant: "destructive"
            });
        } finally {
            setLoadingTeamId(null);
        }
    };

    return {
        teams,
        nowTeam,
        newTeamName,
        newTeamUrl,
        teamDialogOpen,
        loading,
        loadingTeamId,
        setNewTeamName,
        setNewTeamUrl,
        setTeamDialogOpen,
        handleSelectTeam,
        handleCreateTeam,
        handleDeleteTeam,
        handleViewTeamMembers,
        toast,
        router,
        loadTeams
    };
};
