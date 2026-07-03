export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function toPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const pageCount = Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      pageCount,
      hasNextPage: page < pageCount,
      hasPreviousPage: page > 1,
    },
  };
}