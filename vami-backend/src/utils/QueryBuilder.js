export class QueryBuilder {
  constructor({ baseFilters = {}, search, searchFields = [] }) {
    this.query = { ...baseFilters };

    if (search && searchFields.length > 0) {
      this.query.$or = searchFields.map((field) => ({
        [field]: { $regex: search, $options: "i" },
      }));
    }
  }

  build() {
    return this.query;
  }
}
