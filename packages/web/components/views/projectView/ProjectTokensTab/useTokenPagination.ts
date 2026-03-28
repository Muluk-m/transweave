"use client";
import { useQueryState } from "nuqs";
import { parseAsInteger } from "nuqs";
import { getSortingStateParser } from "@/lib/parsers";
import type { Token } from "@/jotai/types";

export function useTokenPagination() {
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [sorting] = useQueryState(
    "sort",
    getSortingStateParser<Token>().withDefault([
      { id: "createdAt", desc: true },
    ])
  );

  return {
    page,
    setPage,
    perPage,
    sorting,
  };
}
