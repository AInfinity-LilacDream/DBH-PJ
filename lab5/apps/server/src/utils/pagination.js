export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function parsePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawPageSize = Number.parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawPageSize));

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
}

export function createPaginationMeta({ page, pageSize, total }) {
  const normalizedTotal = Number(total) || 0;
  const pages = Math.max(1, Math.ceil(normalizedTotal / pageSize));
  const normalizedPage = Math.min(Math.max(1, page), pages);

  return {
    page: normalizedPage,
    pageSize,
    total: normalizedTotal,
    pages
  };
}

export async function queryPage(dbQuery, { selectSql, params = [], orderBy, pagination }) {
  const { page, pageSize } = pagination;
  const countResult = await dbQuery(`SELECT COUNT(*)::int AS total FROM (${selectSql}) AS page_source`, params);
  const total = countResult.rows[0]?.total ?? 0;
  const pageMeta = createPaginationMeta({ page, pageSize, total });
  const offset = (pageMeta.page - 1) * pageSize;
  const dataResult = await dbQuery(
    `
      SELECT *
      FROM (${selectSql}) AS page_source
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, pageSize, offset]
  );

  return {
    rows: dataResult.rows,
    pagination: pageMeta
  };
}

export function isPagedResult(result) {
  return Boolean(result && Array.isArray(result.rows) && result.pagination);
}
