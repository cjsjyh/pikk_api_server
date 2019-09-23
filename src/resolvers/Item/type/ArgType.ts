import { ItemInfo } from "./ReturnType"

export type MutationArgInfo = {
  itemInfo: ItemInfo
}

export type ItemInfoInput = {
  name: string
  brand: string
  originalPrice: number
  salePrice: number
  itemMinorType: string
  itemMajorType: string
  purchaseUrl: string
  itemImg: any
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
