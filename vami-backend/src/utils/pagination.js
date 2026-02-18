export const buildPagination = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Number(query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const sort = { createdAt: -1 }; // newest first

  return {
    page,
    limit,
    skip,
    sort,
  };
};
