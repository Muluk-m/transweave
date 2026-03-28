"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getProjectTags } from "@/api/project";

export function useTokenFilters(projectId: string | undefined) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const fetchTags = useCallback(async () => {
    if (!projectId) return;
    try {
      const tags = await getProjectTags(projectId);
      setAllTags(tags);
    } catch {
      // Silently fail
    }
  }, [projectId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  const handleTagChange = (tag: string) => {
    setSelectedTag(tag === "all" ? null : tag);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return {
    selectedTag,
    selectedModule,
    setSelectedModule,
    selectedStatus,
    setSelectedStatus,
    searchTerm,
    allTags,
    debouncedSearch,
    fetchTags,
    handleTagChange,
    handleSearchChange,
  };
}
