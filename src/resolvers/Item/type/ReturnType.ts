//Return
export type ItemInfo = {
  avg: number

  id: number
  name: string
  brandEng: string
  brandKor: string
  originalPrice: number
  salePrice: number
  itemMinorType: string
  itemMajorType: string
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
