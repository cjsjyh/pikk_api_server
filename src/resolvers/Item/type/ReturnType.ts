//Return
export type ItemInfo = {
  avg: number

  brandId: number
  brandEng: string
  brandKor: string

  id: number
  groupId: number
  name: string
  originalPrice: number
  salePrice: number
  itemMinorType: string
  itemMajorType: string
  itemFinalType: string
  imageUrl: string
  purchaseUrl: string
  averageScore: number

  pickCount: number
}

export type SimpleItemInfo = {
  brandEng: string
  brandKor: string
  imageUrl: string
}
