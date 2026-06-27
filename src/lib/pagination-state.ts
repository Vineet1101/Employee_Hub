import { useEffect, useState } from "react";
import { DEFAULT_PAGE_SIZE, type PageSize } from "@/components/ListPagination";

export function usePaginationState(initialPageSize: PageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(initialPageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  return { page, setPage, pageSize, setPageSize };
}
