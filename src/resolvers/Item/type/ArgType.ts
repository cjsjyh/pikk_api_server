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

export type ItemEditInfoInput = {
  createItemLevel: string
  groupInfo: GroupEditInfo
  variationInfo: VariationEditInfo
}

export type GroupEditInfo = {
  brandId: number
  brand: string
  isNewBrand: boolean

  groupId: number
  originalPrice: number
  itemMinorType: string
  itemMajorType: string
  itemFinalType: string
  sourceWebsite: string
}

export type VariationEditInfo = {
  itemId: number

  groupId: number
  name: string
  salePrice: number
  imageUrl: string
  purchaseUrl: string
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

export type ItemSimpleFilterGeneral = {
  start: number
  first: number
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
  filterGeneral: ItemSimpleFilterGeneral
}

export interface ItemQuery {
  filterGeneral: ItemFilterGeneral
  itemFilter: ItemQueryFilter
}

export interface PickkItemQuery {
  filterGeneral: ItemFilterGeneral
  userId: number
}
