export const parseQuery = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Number(query.limit) || 10, 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    search: query.search?.trim() || null,
    filters: {
      standard: query.standard ? Number(query.standard) : undefined,
      age: query.age ? Number(query.age) : undefined,
    },
  };
};
