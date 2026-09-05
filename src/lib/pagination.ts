export const paginate = (page: number, pageSize: number) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});
