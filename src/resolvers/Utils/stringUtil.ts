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

export function GetFormatSql(filter: any): string {
  let filterSql = ""
  if (Object.prototype.hasOwnProperty.call(filter, "filterGeneral")) {
    if (
      Object.prototype.hasOwnProperty.call(filter.filterGeneral, "sortBy") &&
      Object.prototype.hasOwnProperty.call(filter.filterGeneral, "sort")
    )
      filterSql += ` ORDER BY "${filter.filterGeneral.sortBy}" ${filter.filterGeneral.sort} NULLS LAST`
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

export function ConvertListToOrderedPair(
  list: any,
  append: string = "",
  isNumber: boolean = true
): string {
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
