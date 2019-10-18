//-------------------------------
// Mutation
//-------------------------------
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
  itemFinalType: string
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
// Query
//-------------------------------
export type QueryArgInfo = {
  itemOption: ItemQuery
  pickkItemOption: PickkItemQuery
  itemRankingOption: ItemRankingFilter
}

type ItemFilterGeneral = {
  start: number
  first: number
  sort: string
  sortBy: string
}

export type ItemQueryFilter = {
  itemMajorType: string
  itemMinorType: string
  itemFinalType: string
  itemId: number
}

export type ItemRankingFilter = {
  itemMajorType: string
  itemMinorType: string
  itemFinalType: string
}

export interface ItemQuery {
  filterGeneral: ItemFilterGeneral
  itemFilter: ItemQueryFilter
}

export interface PickkItemQuery {
  filterGeneral: ItemFilterGeneral
  userId: number
}
