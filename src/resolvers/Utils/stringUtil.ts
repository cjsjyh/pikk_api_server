export function logWithDate(content: any) {
  console.log(`[${getDateTime()}] ` + content)
}

export function formatUrls(imageUrl: string[]): string[] {
  for (let i = 0; i < imageUrl.length; i++) {
    if (imageUrl[i][0] != "h") {
      let j = 0
      while (imageUrl[i][j] == "/") j += 1
      imageUrl[i] = imageUrl[i].substr(j, imageUrl[i].length)
      imageUrl[i] = "http://" + imageUrl[i]
    }
  }
  return imageUrl
}

export function formatUrl(imageUrl: string, domain: string = "http://"): string {
  if (imageUrl[0] != "h") {
    let i = 0
    while (imageUrl[i] == "/") i += 1
    imageUrl = imageUrl.substr(i, imageUrl.length)
    if (i == 1) imageUrl = domain + "/" + imageUrl
    else imageUrl = "http://" + imageUrl
  }
  return imageUrl
}

export function convertToWon(price: any, currency: "pound" | "dollar"): number {
  if (price == null) return null
  if (currency == "pound") return price * 1500
  else if (currency == "dollar") return price * 1175
}

export function hasNumber(myStr: string): boolean {
  return /\d/.test(myStr)
}

export function extractNumber(myStr: string): number {
  return Number(myStr.match(/\d+/g).join(""))
}

export function hasCurrency(myStr: string) {
  let currencyList = ["원", "won", "$"]
  let result = false
  currencyList.forEach(element => {
    if (myStr.includes(element) && !result) result = true
  })
  return result
}

export function replaceLastOccurence(myStr, pattern, replaceBy) {
  let pos = myStr.lastIndexOf(pattern)
  myStr = myStr.substring(0, pos) + replaceBy + myStr.substring(pos + 1)
  return myStr
}

export function getDateTime() {
  let today = new Date()
  let date = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate()
  let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds()
  let dateTime = date + " " + time
  return dateTime
}

export function getFormatDate(date, delimiter = "") {
  var year = date.getFullYear() //yyyy
  var month = 1 + date.getMonth() //M
  month = month >= 10 ? month : "0" + month //month 두자리로 저장
  var day = date.getDate() //d
  day = day >= 10 ? day : "0" + day //day 두자리로 저장
  return year + delimiter + month + delimiter + day
}

export function getFormatHour(secs, delimiter = "") {
  secs = Math.round(secs)
  var hours = Math.floor(secs / (60 * 60))

  var divisor_for_minutes = secs % (60 * 60)
  var minutes = Math.floor(divisor_for_minutes / 60)

  var divisor_for_seconds = divisor_for_minutes % 60
  var seconds = Math.ceil(divisor_for_seconds)

  return hours + delimiter + minutes + delimiter + seconds
}

export function strip(str) {
  return str.replace(/^\s+|\s+$/g, "")
}

export function GetFormatSql(filter: any, orderAddOn: string = ""): string {
  let filterSql = ""
  if (Object.prototype.hasOwnProperty.call(filter, "filterGeneral")) {
    if (Object.prototype.hasOwnProperty.call(filter.filterGeneral, "sortBy") && Object.prototype.hasOwnProperty.call(filter.filterGeneral, "sort")) {
      filterSql += ` ORDER BY "${filter.filterGeneral.sortBy}" ${filter.filterGeneral.sort} ${orderAddOn} NULLS LAST`
    }
    if (filter.filterGeneral.first > 30) filter.filterGeneral.first = 30
    filterSql += " LIMIT " + filter.filterGeneral.first + " OFFSET " + filter.filterGeneral.start
  } else {
    filterSql += " LIMIT 30 OFFSET 0"
  }
  return filterSql
}

export function ConvertListToString(list: any): string {
  let result = ""
  let isFirst = true
  list.forEach(item => {
    if (isFirst) isFirst = false
    else result += ", "
    result += String(item)
  })

  return result
}

export function ConvertListToOrderedPair(list: any, append: string = "", isNumber: boolean = true): string {
  let result = ""
  list.forEach((item, index) => {
    if (index != 0) result += ","
    if (isNumber) result += `(${item},${index + 1}${append}) `
    else result += `('${item}',${index + 1}${append}) `
  })
  return result
}

export function MakeMultipleQuery(isMultiple: boolean, before: string, append: string): string {
  let result = ""
  if (isMultiple) result = before + " and"
  else result = before + " where"
  result += append
  return result
}

export function MakeCacheNameByObject(obj: any): string {
  if (obj == undefined) return ""
  let result = ""
  for (let [key, value] of Object.entries(obj)) {
    if (typeof value === "object") {
      continue
    }
    result += String(value)
  }

  return result
}

export function IsNewImage(imageUrl: string): boolean {
  let removedUrl = imageUrl.replace("https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/", "")
  let folderName = removedUrl.split("/")[0]
  if (folderName.includes("_temp")) return true
  else return false
}

export function InsertImageIntoDeleteQueue(
  tableName: string,
  imageColumnName: string,
  filterColumnName: string,
  filterValue: number[],
  isMultiple: boolean = false
): string {
  let sql = ""
  if (isMultiple == false) {
    sql = `
      WITH aaa AS (
        INSERT INTO "IMAGE_DELETE"("imageUrl")
        SELECT "${imageColumnName}" as "imageUrl" FROM "${tableName}" WHERE "${tableName}"."${filterColumnName}" 
        IN (${ConvertListToString(filterValue)})
      )
      `
  } else {
    sql = `
    , bbb AS (
      INSERT INTO "IMAGE_DELETE"("imageUrl")
      SELECT "${imageColumnName}" as "imageUrl" FROM "${tableName}" WHERE "${tableName}"."${filterColumnName}" 
      IN (${ConvertListToString(filterValue)})
    )
    `
  }
  return sql
}
