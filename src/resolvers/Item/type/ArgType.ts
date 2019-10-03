export type MutationArgInfo = {
  itemInfoInput: ItemInfoInput
}

export type ItemInfoInput = {
  createItemLevel: string
  groupInfo: GroupInfo
  variationInfo: VariationInfo
}

type GroupInfo = {
  brand: string
  isNewBrand: boolean
  originalPrice: number
  itemMinorType: string
  itemMajorType: string
  sourceWebsite: string
}

type VariationInfo = {
  groupId: number
  name: string
  salePrice: number
  imageUrl: string
  purchaseUrl: string
}

//-------------------------------

export type QueryArgInfo = {
  itemOption: ItemQuery
  pickkItemOption: PickkItemQuery
}

type QueryCommon = {
  start: number
  first: number
  sort: string
}

export type ItemQueryFilter = {
  itemMajorType: string
  itemMinorType: string
  itemId: number
}

export interface ItemQuery {
  filterCommon: QueryCommon
  itemFilter: ItemQueryFilter
  sortBy: string
}

export interface PickkItemQuery {
  filterCommon: QueryCommon
  userId: number
}
