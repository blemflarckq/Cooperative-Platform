export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}