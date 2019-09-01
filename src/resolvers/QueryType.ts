export type QueryCommon = {
  start: number
  first: number
  sort: sortDirection
  sortBy: sortableField
}

enum sortableField {
  score
}

enum sortDirection {
  ASCENDING,
  DESCENDING
}
