export const DEFAULT_PAGE_SIZE = 10;

export function getPaginationMeta(response, fallbackLength = 0) {
  const pageSize = Number(response?.pageSize || response?.limit || DEFAULT_PAGE_SIZE);
  const totalRecords = Number(response?.totalRecords || response?.total || fallbackLength);
  const currentPage = Number(response?.currentPage || response?.page || 1);
  const totalPages = Number(response?.totalPages || Math.max(Math.ceil(totalRecords / pageSize), 1));

  return {
    currentPage,
    pageSize,
    totalRecords,
    totalPages,
  };
}

export function paginateClientRows(rows, page, pageSize = DEFAULT_PAGE_SIZE) {
  const safePage = Math.max(Number(page) || 1, 1);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
